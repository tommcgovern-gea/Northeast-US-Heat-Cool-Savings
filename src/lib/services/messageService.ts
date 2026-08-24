import { db, sql, toRows } from "@/lib/db/client";
import { sendSMS } from "./smsService";
import { sendEmail } from "./emailService";
import { formatSmsBody } from "@/lib/smsBody";
import {
  templateService,
  TemplateVariables,
  resolveSeasonalInstruction,
  resolveTemplateType,
  messageTypeForAlert,
} from "./templateService";
import crypto from "crypto";

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

/** Queue item: recipientId = contacts in recipients table (cron targets). userId kept for older messages. */
export interface MessageQueueItem {
  alertLogId: string;
  buildingId: string;
  userId?: string;
  recipientId?: string;
  messageType: "alert" | "daily_summary" | "warning";
  content: string;
  uploadToken?: string;
}

export interface MessageResult {
  messageId: string;
  channel: "email" | "sms";
  success: boolean;
  error?: string;
}

function inferEmailSubject(content: string, messageType: string): string {
  if (messageType === "warning") return "Compliance Warning";
  const lower = (content || "").toLowerCase();
  if (lower.includes("special temperature setting alert")) {
    return "Special Temperature Setting Alert";
  }
  if (lower.includes("setpoint settings")) {
    return "Alert for Temperature Setting Change";
  }
  if (lower.includes("daily temperature setting message")) {
    return "Daily Temperature Setting Message";
  }
  if (messageType === "alert") return "Special Temperature Setting Alert";
  return "Daily Temperature Setting Message";
}

export class MessageService {
  private async deliverMessage(msg: any): Promise<boolean> {
    let success = false;
    let deliveryStatus = "pending";

    let email: string | null = null;
    let phone: string | null = null;
    let buildingName: string | null = null;
    if (msg.building_id) {
      const bResult = await sql`SELECT name FROM buildings WHERE id = ${msg.building_id} LIMIT 1`;
      const bRow = toRows(bResult)[0];
      if (bRow) buildingName = bRow.name;
    }
    if (msg.user_id) {
      const userResult =
        await sql`SELECT * FROM users WHERE id = ${msg.user_id}`;
      const u = toRows(userResult)[0];
      if (u) {
        email = u.email;
        phone = u.phone;
      }
    } else if (msg.recipient_id) {
      const recipientResult =
        await sql`SELECT * FROM recipients WHERE id = ${msg.recipient_id}`;
      const r = toRows(recipientResult)[0];
      if (r) {
        email = r.email;
        phone = r.phone;
      }
    }

    if (msg.channel === "sms" && phone) {
      const smsBody = formatSmsBody(msg.content, msg.id);
      const smsResult = await sendSMS(phone, smsBody);
      success = smsResult.success;
      deliveryStatus = success
        ? "delivered"
        : smsResult.error
          ? `failed: ${smsResult.error}`.slice(0, 50)
          : "failed";
      if (!success && smsResult.error) {
        console.error(`SMS failed to ${phone}:`, smsResult.error);
      }
    }

    if (msg.channel === "email" && email) {
      const subject = inferEmailSubject(msg.content, msg.message_type);
      const fullSubject = buildingName ? `${subject} – ${buildingName}` : subject;
      const emailResult = await sendEmail({
        to: email,
        subject: fullSubject,
        text: msg.content,
      });
      success = emailResult.success;
      deliveryStatus = success ? "delivered" : "failed";
    }

    await sql`
      UPDATE messages
      SET delivered = ${success}, delivery_status = ${deliveryStatus}, sent_at = NOW()
      WHERE id = ${msg.id}
    `;

    return success;
  }

  async generateUploadToken(
    messageId: string,
    buildingId: string,
  ): Promise<string> {
    const payload = `${messageId}:${buildingId}:${Date.now()}`;
    const token = crypto.createHash("sha256").update(payload).digest("hex");
    return token.substring(0, 32);
  }

  async queueMessages(items: MessageQueueItem[]): Promise<string[]> {
    const messageIds: string[] = [];

    for (const item of items) {
      const isUser = item.userId != null;
      if (isUser) {
        const users = await db.getBuildingUsers(item.buildingId);
        const target = users.find((u) => u.id === item.userId);
        if (!target || !target.is_active) continue;
        const channels: ("email" | "sms")[] = [];
        if (target.preference === "email" || target.preference === "both")
          if (target.email) channels.push("email");
        if (target.preference === "sms" || target.preference === "both")
          if (target.phone) channels.push("sms");
        for (const channel of channels) {
          const messageId = crypto.randomUUID();
          const uploadUrl = `${appBaseUrl()}/upload?token=${messageId}`;
          let content = item.content;
          if (content.includes("__UPLOAD_URL__"))
            content = content.replace("__UPLOAD_URL__", uploadUrl);
          await sql`
            INSERT INTO messages (id, alert_log_id, building_id, user_id, message_type, channel, content, delivered, sent_at, created_at)
            VALUES (${messageId}, ${item.alertLogId || null}, ${item.buildingId}, ${item.userId}, ${item.messageType}, ${channel}, ${content}, false, NOW(), NOW())
          `;
          messageIds.push(messageId);
        }
      } else if (item.recipientId != null) {
        const recipients = await db.getRecipients(item.buildingId);
        const target = recipients.find((r) => r.id === item.recipientId);
        if (!target || !target.is_active) continue;
        const channels: ("email" | "sms")[] = [];
        if (target.preference === "email" || target.preference === "both")
          if (target.email) channels.push("email");
        if (target.preference === "sms" || target.preference === "both")
          if (target.phone) channels.push("sms");
        for (const channel of channels) {
          const messageId = crypto.randomUUID();
          const uploadUrl = `${appBaseUrl()}/upload?token=${messageId}`;
          let content = item.content;
          if (content.includes("__UPLOAD_URL__"))
            content = content.replace("__UPLOAD_URL__", uploadUrl);
          await sql`
            INSERT INTO messages (id, alert_log_id, building_id, recipient_id, message_type, channel, content, delivered, sent_at, created_at)
            VALUES (${messageId}, ${item.alertLogId || null}, ${item.buildingId}, ${item.recipientId}, ${item.messageType}, ${channel}, ${content}, false, NOW(), NOW())
          `;
          messageIds.push(messageId);
        }
      }
    }

    return messageIds;
  }

  async sendPendingMessages(): Promise<{
    processed: number;
    sent: number;
    failed: number;
  }> {
    const result = await sql`
      SELECT * FROM messages 
      WHERE delivered = false 
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at ASC
      LIMIT 100
    `;

    const messages = toRows(result);
    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      try {
        const success = await this.deliverMessage(msg);

        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error: any) {
        console.error(`Error processing message ${msg.id}:`, error);
        await sql`
          UPDATE messages SET delivery_status = ${"error"} WHERE id = ${msg.id}
        `;
        failed++;
      }
    }

    return {
      processed: messages.length,
      sent,
      failed,
    };
  }

  async sendMessageById(
    messageId: string,
  ): Promise<{ success: boolean; message?: string }> {
    const result =
      await sql`SELECT * FROM messages WHERE id = ${messageId} LIMIT 1`;
    const msg = toRows(result)[0];
    if (!msg) {
      return { success: false, message: "Message not found" };
    }
    const success = await this.deliverMessage(msg);
    return {
      success,
      message: success ? "Message delivered" : "Message delivery failed",
    };
  }

  async createMessagesFromAlert(
    alertLogId: string,
    cityId: string,
    filter?: {
      buildingId?: string;
      userId?: string;
      email?: string;
    },
  ): Promise<string[]> {
    const alertLogResult = await sql`
      SELECT * FROM alert_logs WHERE id = ${alertLogId}
    `;
    const alertLogRows = toRows(alertLogResult);
    if (alertLogRows.length === 0) return [];

    const alert = alertLogRows[0];
    let buildings = await db.getBuildings(cityId);
    let activeBuildings = buildings.filter((b) => b.is_active && !b.is_paused);
    if (filter?.buildingId) {
      activeBuildings = activeBuildings.filter(
        (b) => b.id === filter.buildingId,
      );
    }

    const emailNorm = filter?.email?.trim().toLowerCase();
    const messageItems: MessageQueueItem[] = [];

    for (const building of activeBuildings) {
      const buildingRecipients = await db.getRecipients(building.id);

      const tempData = alert.temperature_data ?? {};
      const city = await db.getCityById(cityId);
      const stableThreshold = 4;
      const templateType = resolveTemplateType(
        alert.alert_type,
        tempData,
        stableThreshold,
      );
      const messageType = messageTypeForAlert(alert.alert_type);
      const templateContent = await templateService.resolveTemplateContent(
        cityId,
        templateType,
      );
      const signedChange =
        tempData.change ??
        (tempData.futureTemp != null && tempData.currentTemp != null
          ? Number(tempData.futureTemp) - Number(tempData.currentTemp)
          : tempData.temperatureChange);
      const direction = Number(signedChange) >= 0 ? "increase" : "decrease";
      const baseVariables: TemplateVariables = {
        cityName: city?.name || "",
        buildingName: building.name,
        uploadUrl: "__UPLOAD_URL__",
        seasonalInstruction: resolveSeasonalInstruction(direction, tempData),
      };

      for (const r of buildingRecipients) {
        if (!r.is_active) continue;
        if (filter?.userId) {
          const u = await db.getUserById(filter.userId);
          if (
            !u?.email ||
            (r.email || "").toLowerCase() !== u.email.toLowerCase()
          ) {
            continue;
          }
        }
        if (emailNorm && (r.email || "").toLowerCase() !== emailNorm) continue;
        const firstName = (r.name || "").trim().split(/\s+/)[0] || "there";
        const content = await templateService.renderTemplate(templateContent, {
          ...baseVariables,
          firstName,
        });
        messageItems.push({
          alertLogId,
          buildingId: building.id,
          recipientId: r.id,
          messageType,
          content,
        });
      }
    }

    return await this.queueMessages(messageItems);
  }
}

export const messageService = new MessageService();
