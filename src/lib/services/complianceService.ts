import { db } from '@/lib/db/client';
import { messageService } from './messageService';
import crypto from 'crypto';

/** Normalize sql result: Neon returns array; pg-style returns { rows }. */
function toRows(result: any): any[] {
  return Array.isArray(result) ? result : (result?.rows ?? []);
}

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
    const { sql } = await import('@/lib/db/client');
    const messageResult = await sql`
      SELECT * FROM messages WHERE id = ${messageId}
    `;

    if (toRows(messageResult).length === 0) return null;

    const message = toRows(messageResult)[0];
    const sentAt = message.sent_at ? new Date(message.sent_at) : new Date(message.created_at);
    const now = new Date();
    const hoursSinceMessage = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);

    const uploadResult = await sql`
      SELECT * FROM photo_uploads WHERE message_id = ${messageId} LIMIT 1
    `;

    const uploadRows = toRows(uploadResult);
    const hasUpload = uploadRows.length > 0;
    const upload = uploadRows[0];
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
    const { sql } = await import('@/lib/db/client');
    const windowMs = 2 * 60 * 60 * 1000; // 2 hours
    const cutoffTime = new Date(Date.now() - windowMs);

    const messagesResult = await sql`
      SELECT m.* FROM messages m
      LEFT JOIN photo_uploads p ON p.message_id = m.id
      WHERE m.message_type IN ('alert', 'daily_summary')
        AND m.sent_at IS NOT NULL
        AND m.sent_at < ${cutoffTime.toISOString()}
        AND p.id IS NULL
        AND m.delivered = true
        AND NOT EXISTS (
          SELECT 1 FROM messages w 
          WHERE w.building_id = m.building_id 
            AND w.message_type = 'warning'
            AND w.created_at > m.sent_at
        )
      ORDER BY m.sent_at ASC
    `;

    const messages = toRows(messagesResult);
    let warningsSent = 0;

    for (const message of messages) {
      const recipientResult = await sql`
        SELECT * FROM recipients WHERE id = ${message.recipient_id}
      `;
      const recipient = toRows(recipientResult)[0];

      if (!recipient || !recipient.is_active) continue;

      const warningContent = `⚠️ COMPLIANCE WARNING\n\n` +
        `You have not uploaded compliance documentation (photo or BMS record) for the message sent ${Math.round((Date.now() - new Date(message.sent_at).getTime()) / (1000 * 60 * 60) * 10) / 10} hours ago.\n\n` +
        `Please upload immediately. Failure to comply may void your guarantee.\n\n` +
        `Upload link: ${process.env.NEXT_PUBLIC_APP_URL}/upload?token=${message.id}`;

      const channels: ('email' | 'sms')[] = [];
      if (recipient.preference === 'email' || recipient.preference === 'both') {
        if (recipient.email) channels.push('email');
      }
      if (recipient.preference === 'sms' || recipient.preference === 'both') {
        if (recipient.phone) channels.push('sms');
      }

      for (const ch of channels) {
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
            ${ch},
            ${warningContent},
            false,
            NOW()
          )
        `;
        warningsSent++;
      }
    }

    if (warningsSent > 0) {
      await messageService.sendPendingMessages();
    }

    return warningsSent;
  }

  async getBuildingComplianceRate(buildingId: string, days: number = 30): Promise<number | null> {
    const { sql } = await import('@/lib/db/client');
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const messagesResult = await sql`
      SELECT m.id, m.sent_at FROM messages m
      WHERE m.building_id = ${buildingId}
        AND m.message_type IN ('alert', 'daily_summary')
        AND m.sent_at >= ${startDate.toISOString()}
        AND m.delivered = true
    `;

    const messages = toRows(messagesResult);
    if (messages.length === 0) return null;

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
    const { sql } = await import('@/lib/db/client');
    const uploadResult = await sql`
      SELECT * FROM photo_uploads WHERE id = ${uploadId}
    `;

    const uploadRows = toRows(uploadResult);
    if (uploadRows.length === 0) return;

    const upload = uploadRows[0];
    const messageResult = await sql`
      SELECT * FROM messages WHERE id = ${upload.message_id}
    `;

    if (toRows(messageResult).length === 0) return;

    const message = toRows(messageResult)[0];
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
