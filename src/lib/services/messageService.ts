import { db, sql, toRows } from '@/lib/db/client';
import { sendSMS } from './smsService';
import { sendEmail } from './emailService';
import { templateService, TemplateVariables } from './templateService';
import crypto from 'crypto';

/** Queue item: userId = BUILDING user (users table). recipientId kept for backward compat when sending old messages. */
export interface MessageQueueItem {
  alertLogId: string;
  buildingId: string;
  userId?: string;
  recipientId?: string;
  messageType: 'alert' | 'daily_summary' | 'warning';
  content: string;
  uploadToken?: string;
}

export interface MessageResult {
  messageId: string;
  channel: 'email' | 'sms';
  success: boolean;
  error?: string;
}

export class MessageService {
  async generateUploadToken(messageId: string, buildingId: string): Promise<string> {
    const payload = `${messageId}:${buildingId}:${Date.now()}`;
    const token = crypto.createHash('sha256').update(payload).digest('hex');
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
        const channels: ('email' | 'sms')[] = [];
        if (target.preference === 'email' || target.preference === 'both') if (target.email) channels.push('email');
        if (target.preference === 'sms' || target.preference === 'both') if (target.phone) channels.push('sms');
        for (const channel of channels) {
          const messageId = crypto.randomUUID();
          const uploadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/upload?token=${messageId}`;
          const needsUploadLink = item.messageType !== 'warning';
          let content = item.content;
          if (needsUploadLink) content = content.includes('__UPLOAD_URL__') ? content.replace('__UPLOAD_URL__', uploadUrl) : `${content}\n\nUpload photo or BMS record: ${uploadUrl}`;
          await sql`
            INSERT INTO messages (id, alert_log_id, building_id, user_id, message_type, channel, content, delivered, created_at)
            VALUES (${messageId}, ${item.alertLogId || null}, ${item.buildingId}, ${item.userId}, ${item.messageType}, ${channel}, ${content}, false, NOW())
          `;
          messageIds.push(messageId);
        }
      } else if (item.recipientId != null) {
        const recipients = await db.getRecipients(item.buildingId);
        const target = recipients.find((r) => r.id === item.recipientId);
        if (!target || !target.is_active) continue;
        const channels: ('email' | 'sms')[] = [];
        if (target.preference === 'email' || target.preference === 'both') if (target.email) channels.push('email');
        if (target.preference === 'sms' || target.preference === 'both') if (target.phone) channels.push('sms');
        for (const channel of channels) {
          const messageId = crypto.randomUUID();
          const uploadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/upload?token=${messageId}`;
          const needsUploadLink = item.messageType !== 'warning';
          let content = item.content;
          if (needsUploadLink) content = content.includes('__UPLOAD_URL__') ? content.replace('__UPLOAD_URL__', uploadUrl) : `${content}\n\nUpload photo or BMS record: ${uploadUrl}`;
          await sql`
            INSERT INTO messages (id, alert_log_id, building_id, recipient_id, message_type, channel, content, delivered, created_at)
            VALUES (${messageId}, ${item.alertLogId || null}, ${item.buildingId}, ${item.recipientId}, ${item.messageType}, ${channel}, ${content}, false, NOW())
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
        let success = false;
        let deliveryStatus = 'pending';
        let error: string | undefined;

        let email: string | null = null;
        let phone: string | null = null;
        if (msg.user_id) {
          const userResult = await sql`SELECT * FROM users WHERE id = ${msg.user_id}`;
          const u = toRows(userResult)[0];
          if (u) {
            email = u.email;
            phone = u.phone;
          }
        } else if (msg.recipient_id) {
          const recipientResult = await sql`SELECT * FROM recipients WHERE id = ${msg.recipient_id}`;
          const r = toRows(recipientResult)[0];
          if (r) {
            email = r.email;
            phone = r.phone;
          }
        }

        if (msg.channel === 'sms' && phone) {
          const smsResult = await sendSMS(phone, msg.content);
          success = smsResult.success;
          deliveryStatus = success ? 'delivered' : (smsResult.error ? `failed: ${smsResult.error}`.slice(0, 50) : 'failed');
          error = smsResult.error;
        }
        if (msg.channel === 'email' && email) {
          const subject =
            msg.message_type === 'alert'
              ? 'Temperature Alert - Action Required'
              : msg.message_type === 'warning'
                ? 'Compliance Warning'
                : 'Daily Temperature Summary';
          const emailResult = await sendEmail({
            to: email,
            subject,
            text: msg.content,
          });
          success = emailResult.success;
          deliveryStatus = success ? 'delivered' : 'failed';
          error = emailResult.error;
        }

        await sql`
          UPDATE messages 
          SET delivered = ${success}, delivery_status = ${deliveryStatus}, sent_at = NOW()
          WHERE id = ${msg.id}
        `;

        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error: any) {
        console.error(`Error processing message ${msg.id}:`, error);
        await sql`
          UPDATE messages SET delivery_status = ${'error'} WHERE id = ${msg.id}
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

  async createMessagesFromAlert(alertLogId: string, cityId: string): Promise<string[]> {
    const alertLogResult = await sql`
      SELECT * FROM alert_logs WHERE id = ${alertLogId}
    `;
    const alertLogRows = toRows(alertLogResult);
    if (alertLogRows.length === 0) return [];

    const alert = alertLogRows[0];
    const buildings = await db.getBuildings(cityId);
    const activeBuildings = buildings.filter(b => b.is_active && !b.is_paused);

    const messageItems: MessageQueueItem[] = [];

    for (const building of activeBuildings) {
      const buildingUsers = await db.getBuildingUsers(building.id);

      const messageType = alert.alert_type === 'sudden_fluctuation' ? 'alert' : 'daily_summary';
      const tempData = alert.temperature_data;
      const city = await db.getCityById(cityId);
      let template = await templateService.getTemplate(cityId, messageType);
      let templateContent = template?.content ?? await templateService.getDefaultTemplate(messageType);
      const variables: TemplateVariables = {
        temperatureChange: tempData.change || tempData.temperatureChange,
        timeWindow: tempData.timeWindow,
        currentTemp: tempData.currentTemp,
        futureTemp: tempData.futureTemp,
        averageTemp: tempData.averageTemp,
        minTemp: tempData.minTemp,
        maxTemp: tempData.maxTemp,
        cityName: city?.name || '',
        buildingName: building.name,
        uploadUrl: '__UPLOAD_URL__',
      };
      const content = await templateService.renderTemplate(templateContent, variables);

      for (const u of buildingUsers) {
        if (!u.is_active) continue;
        messageItems.push({ alertLogId, buildingId: building.id, userId: u.id, messageType, content });
      }
    }

    return await this.queueMessages(messageItems);
  }
}

export const messageService = new MessageService();
