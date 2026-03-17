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
    const pageParam = req.nextUrl.searchParams.get('page') || '1';
    const page = Math.max(1, parseInt(pageParam, 10));
    const limitParam = req.nextUrl.searchParams.get('limit') || '10';
    const limit = parseInt(limitParam, 10) === 20 ? 20 : 10;
    const offset = (page - 1) * limit;

    const countResult = await sql`
      SELECT COUNT(*) as total
      FROM messages m
      WHERE m.sent_at >= NOW() - (INTERVAL '1 day' * ${days})
    `;
    const total = parseInt(String(toRows(countResult)[0]?.total ?? 0), 10);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const result = await sql`
      SELECT m.id, m.message_type, m.sent_at, m.delivered, m.delivery_status,
             b.name as building_name
      FROM messages m
      JOIN buildings b ON b.id = m.building_id
      WHERE m.sent_at >= NOW() - (INTERVAL '1 day' * ${days})
      ORDER BY m.sent_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
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
      total,
      page,
      limit,
      totalPages,
      days,
    });
  } catch (error) {
    console.error('Dashboard messages error:', error);
    return NextResponse.json({ message: 'Error fetching messages' }, { status: 500 });
  }
}
