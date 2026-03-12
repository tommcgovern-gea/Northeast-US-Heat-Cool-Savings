import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { sql } from '@/lib/db/client';

function toRows(result: any): any[] {
  return Array.isArray(result) ? result : (result?.rows ?? []);
}

async function requireAdmin(req: NextRequest): Promise<TokenPayload | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token) as TokenPayload;
  return user?.role === 'ADMIN' ? user : null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAdmin(req);
    if (!user) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');

    const result = await sql`
      SELECT m.id, m.message_type, m.sent_at, m.delivered, m.delivery_status,
             b.name as building_name
      FROM messages m
      JOIN buildings b ON b.id = m.building_id
      WHERE m.sent_at >= NOW() - (INTERVAL '1 day' * ${days})
      ORDER BY m.sent_at DESC
      LIMIT ${limit}
    `;
    const rows = toRows(result);

    return NextResponse.json({
      recentMessages: rows.map((m: any) => ({
        id: m.id,
        messageType: m.message_type,
        sentAt: m.sent_at,
        delivered: m.delivered,
        deliveryStatus: m.delivery_status,
        buildingName: m.building_name,
      })),
      days,
    });
  } catch (error) {
    console.error('Dashboard messages error:', error);
    return NextResponse.json({ message: 'Error fetching messages' }, { status: 500 });
  }
}
