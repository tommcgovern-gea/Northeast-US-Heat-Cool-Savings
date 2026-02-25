import { db } from '@/lib/db/client';
import { sendSMS } from './smsService';
import { sendEmail } from './emailService';
import { templateService, TemplateVariables } from './templateService';
import crypto from 'crypto';
import { sql } from '@neondatabase/serverless';

export interface MessageQueueItem {
  alertLogId: string;
  buildingId: string;
  recipientId: string;
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
      const recipients = await db.getRecipients(item.buildingId);
      const recipient = recipients.find(r => r.id === item.recipientId);

      if (!recipient || !recipient.is_active) continue;

      const channels: ('email' | 'sms')[] = [];
      if (recipient.preference === 'email' || recipient.preference === 'both') {
        if (recipient.email) channels.push('email');
      }
      if (recipient.preference === 'sms' || recipient.preference === 'both') {
        if (recipient.phone) channels.push('sms');
      }

      for (const channel of channels) {
        const messageId = crypto.randomUUID();
        const uploadToken = item.messageType !== 'warning' 
          ? await this.generateUploadToken(messageId, item.buildingId)
          : undefined;

        const content = uploadToken 
          ? `${item.content}\n\nUpload compliance photo: ${process.env.NEXT_PUBLIC_APP_URL}/upload?token=${messageId}`
          : item.content;
        
        await sql`
          INSERT INTO messages (
            id, alert_log_id, building_id, recipient_id, message_type, 
            channel, content, delivered, created_at
          ) VALUES (
            ${messageId},
            ${item.alertLogId || null},
            ${item.buildingId},
            ${item.recipientId},
            ${item.messageType},
            ${channel},
            ${content},
            false,
            NOW()
          )
        `;

        messageIds.push(messageId);
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

    const messages = result.rows;
    let sent = 0;
    let failed = 0;

    for (const msg of messages) {
      try {
        let success = false;
        let deliveryStatus = 'pending';
        let error: string | undefined;

        if (msg.channel === 'sms') {
          const recipientResult = await sql`
            SELECT * FROM recipients WHERE id = ${msg.recipient_id}
          `;
          const recipient = recipientResult.rows[0];
          
          if (recipient?.phone) {
            const smsResult = await sendSMS(recipient.phone, msg.content);
            success = smsResult.success;
            deliveryStatus = success ? 'delivered' : 'failed';
            error = smsResult.error;
          }
        } else if (msg.channel === 'email') {
          const recipientResult = await sql`
            SELECT * FROM recipients WHERE id = ${msg.recipient_id}
          `;
          const recipient = recipientResult.rows[0];
          
          if (recipient?.email) {
            const subject = msg.message_type === 'alert' 
              ? 'Temperature Alert - Action Required'
              : msg.message_type === 'warning'
              ? 'Compliance Warning'
              : 'Daily Temperature Summary';
            
            const emailResult = await sendEmail({
              to: recipient.email,
              subject,
              text: msg.content,
            });
            success = emailResult.success;
            deliveryStatus = success ? 'delivered' : 'failed';
            error = emailResult.error;
          }
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
    const alertLog = await sql`
      SELECT * FROM alert_logs WHERE id = ${alertLogId}
    `;

    if (alertLog.rows.length === 0) return [];

    const alert = alertLog.rows[0];
    const buildings = await db.getBuildings(cityId);
    const activeBuildings = buildings.filter(b => b.is_active && !b.is_paused);

    const messageItems: MessageQueueItem[] = [];

    for (const building of activeBuildings) {
      const recipients = await db.getRecipients(building.id);
      
      for (const recipient of recipients) {
        if (!recipient.is_active) continue;

        const messageType = alert.alert_type === 'sudden_fluctuation' 
          ? 'alert' 
          : 'daily_summary';

        const tempData = alert.temperature_data;
        const city = await db.getCityById(cityId);
        
        let template = await templateService.getTemplate(cityId, messageType);
        let templateContent = '';
        
        if (template) {
          templateContent = template.content;
        } else {
          templateContent = await templateService.getDefaultTemplate(messageType);
        }

        const messageId = crypto.randomUUID();
        const uploadUrl = `${process.env.NEXT_PUBLIC_APP_URL}/upload?token=${messageId}`;

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
          uploadUrl,
        };

        const content = await templateService.renderTemplate(templateContent, variables);

        messageItems.push({
          alertLogId,
          buildingId: building.id,
          recipientId: recipient.id,
          messageType,
          content,
        });
      }
    }

    return await this.queueMessages(messageItems);
  }
}

export const messageService = new MessageService();
