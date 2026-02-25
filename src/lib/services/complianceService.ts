import { db } from '@/lib/db/client';
import { messageService } from './messageService';
import crypto from 'crypto';

export interface ComplianceStatus {
  buildingId: string;
  messageId: string;
  isCompliant: boolean;
  hoursSinceMessage: number;
  hasUpload: boolean;
  uploadTime?: string;
}

export class ComplianceService {
  async checkCompliance(messageId: string): Promise<ComplianceStatus | null> {
    const { sql } = await import('@vercel/postgres');
    const messageResult = await sql`
      SELECT * FROM messages WHERE id = ${messageId}
    `;

    if (messageResult.rows.length === 0) return null;

    const message = messageResult.rows[0];
    const sentAt = message.sent_at ? new Date(message.sent_at) : new Date(message.created_at);
    const now = new Date();
    const hoursSinceMessage = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);

    const uploadResult = await sql`
      SELECT * FROM photo_uploads WHERE message_id = ${messageId} LIMIT 1
    `;

    const hasUpload = uploadResult.rows.length > 0;
    const upload = uploadResult.rows[0];
    const uploadTime = upload ? new Date(upload.uploaded_at).toISOString() : undefined;

    const complianceWindow = 2;
    const isCompliant = hasUpload && hoursSinceMessage <= complianceWindow;

    return {
      buildingId: message.building_id,
      messageId,
      isCompliant,
      hoursSinceMessage: Math.round(hoursSinceMessage * 10) / 10,
      hasUpload,
      uploadTime,
    };
  }

  async checkAndSendWarnings(): Promise<number> {
    const { sql } = await import('@vercel/postgres');
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const messagesResult = await sql`
      SELECT m.* FROM messages m
      LEFT JOIN photo_uploads p ON p.message_id = m.id
      WHERE m.delivered = true
        AND m.message_type IN ('alert', 'daily_summary')
        AND m.sent_at < ${twoHoursAgo.toISOString()}
        AND p.id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM messages w 
          WHERE w.building_id = m.building_id 
            AND w.message_type = 'warning'
            AND w.created_at > m.sent_at
        )
      ORDER BY m.sent_at ASC
    `;

    const messages = messagesResult.rows;
    let warningsSent = 0;

    for (const message of messages) {
      const recipientResult = await sql`
        SELECT * FROM recipients WHERE id = ${message.recipient_id}
      `;
      const recipient = recipientResult.rows[0];

      if (!recipient || !recipient.is_active) continue;

      const warningContent = `⚠️ COMPLIANCE WARNING\n\n` +
        `You have not uploaded a compliance photo for the message sent ${Math.round((Date.now() - new Date(message.sent_at).getTime()) / (1000 * 60 * 60) * 10) / 10} hours ago.\n\n` +
        `Please upload your photo immediately. Failure to comply may void your guarantee.\n\n` +
        `Upload link: ${process.env.NEXT_PUBLIC_APP_URL}/upload?token=${message.id}`;

      const warningMessageId = crypto.randomUUID();
      
      await sql`
        INSERT INTO messages (
          id, building_id, recipient_id, message_type, 
          channel, content, delivered, created_at
        ) VALUES (
          ${warningMessageId},
          ${message.building_id},
          ${message.recipient_id},
          ${'warning'},
          ${recipient.preference},
          ${warningContent},
          false,
          NOW()
        )
      `;

      warningsSent++;
    }

    if (warningsSent > 0) {
      await messageService.sendPendingMessages();
    }

    return warningsSent;
  }

  async getBuildingComplianceRate(buildingId: string, days: number = 30): Promise<number> {
    const { sql } = await import('@vercel/postgres');
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const messagesResult = await sql`
      SELECT m.id, m.sent_at FROM messages m
      WHERE m.building_id = ${buildingId}
        AND m.message_type IN ('alert', 'daily_summary')
        AND m.sent_at >= ${startDate.toISOString()}
        AND m.delivered = true
    `;

    const messages = messagesResult.rows;
    if (messages.length === 0) return 100;

    let compliantCount = 0;

    for (const message of messages) {
      const compliance = await this.checkCompliance(message.id);
      if (compliance?.isCompliant) {
        compliantCount++;
      }
    }

    return Math.round((compliantCount / messages.length) * 100 * 10) / 10;
  }

  async markUploadCompliant(uploadId: string): Promise<void> {
    const { sql } = await import('@vercel/postgres');
    const uploadResult = await sql`
      SELECT * FROM photo_uploads WHERE id = ${uploadId}
    `;

    if (uploadResult.rows.length === 0) return;

    const upload = uploadResult.rows[0];
    const messageResult = await sql`
      SELECT * FROM messages WHERE id = ${upload.message_id}
    `;

    if (messageResult.rows.length === 0) return;

    const message = messageResult.rows[0];
    const sentAt = message.sent_at ? new Date(message.sent_at) : new Date(message.created_at);
    const uploadTime = new Date(upload.uploaded_at);
    const hoursSinceMessage = (uploadTime.getTime() - sentAt.getTime()) / (1000 * 60 * 60);

    const isCompliant = hoursSinceMessage <= upload.compliance_window_hours;

    await sql`
      UPDATE photo_uploads SET is_compliant = ${isCompliant} WHERE id = ${uploadId}
    `;
  }
}

export const complianceService = new ComplianceService();
