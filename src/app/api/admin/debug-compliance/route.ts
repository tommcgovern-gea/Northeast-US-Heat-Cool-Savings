import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { sql } from '@/lib/db/client';

function toRows(result: any): any[] {
  return Array.isArray(result) ? result : (result?.rows ?? []);
}

/** Debug why check-compliance returns 0 warnings. Admin only. */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const user = verifyToken(authHeader.split(' ')[1]) as TokenPayload;
    if (user?.role !== 'ADMIN') return NextResponse.json({ message: 'Forbidden' }, { status: 403 });

    const windowMs = process.env.NODE_ENV === 'development' ? 2 * 60 * 1000 : 2 * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - windowMs);

    const [totalMessages, alertMessages, oldNoUpload, withRecipients] = await Promise.all([
      sql`SELECT COUNT(*) as c FROM messages`,
      sql`SELECT COUNT(*) as c FROM messages WHERE message_type IN ('alert','daily_summary') AND sent_at IS NOT NULL`,
      sql`
        SELECT m.id, m.message_type, m.sent_at, m.delivered, b.name as building_name
        FROM messages m
        LEFT JOIN photo_uploads p ON p.message_id = m.id
        JOIN buildings b ON b.id = m.building_id
        WHERE m.message_type IN ('alert','daily_summary')
          AND m.sent_at IS NOT NULL
          AND m.sent_at < ${cutoffTime.toISOString()}
          AND p.id IS NULL
        LIMIT 10
      `,
      sql`
        SELECT r.id, r.name, r.email, r.phone, r.preference, r.is_active
        FROM recipients r
        LIMIT 5
      `,
    ]);

    return NextResponse.json({
      cutoffTime: cutoffTime.toISOString(),
      windowMinutes: windowMs / 60000,
      totalMessages: toRows(totalMessages)[0]?.c ?? 0,
      alertDailySummaryWithSentAt: toRows(alertMessages)[0]?.c ?? 0,
      candidatesOldNoUpload: toRows(oldNoUpload),
      sampleRecipients: toRows(withRecipients),
      hint: 'Warnings need: alert/daily_summary, sent_at < cutoff, no upload, recipient with email or phone',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
