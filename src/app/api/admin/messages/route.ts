import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { sql } from '@/lib/db/client';

function toRows(result: any): any[] {
  return Array.isArray(result) ? result : (result?.rows ?? []);
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token) as TokenPayload;

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const buildingId = req.nextUrl.searchParams.get('buildingId');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0');

    let query;
    let params: any[] = [];

    if (buildingId) {
      query = sql`
        SELECT 
          m.*,
          b.name as building_name,
          COALESCE(u.name, r.name) as recipient_name,
          COALESCE(u.email, r.email) as email,
          COALESCE(u.phone, r.phone) as phone,
          COUNT(p.id) as upload_count
        FROM messages m
        JOIN buildings b ON b.id = m.building_id
        LEFT JOIN users u ON u.id = m.user_id
        LEFT JOIN recipients r ON r.id = m.recipient_id
        LEFT JOIN photo_uploads p ON p.message_id = m.id
        WHERE m.building_id = ${buildingId}
        GROUP BY m.id, b.name, u.name, u.email, u.phone, r.name, r.email, r.phone
        ORDER BY m.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      query = sql`
        SELECT 
          m.*,
          b.name as building_name,
          COALESCE(u.name, r.name) as recipient_name,
          COALESCE(u.email, r.email) as email,
          COALESCE(u.phone, r.phone) as phone,
          COUNT(p.id) as upload_count
        FROM messages m
        JOIN buildings b ON b.id = m.building_id
        LEFT JOIN users u ON u.id = m.user_id
        LEFT JOIN recipients r ON r.id = m.recipient_id
        LEFT JOIN photo_uploads p ON p.message_id = m.id
        GROUP BY m.id, b.name, u.name, u.email, u.phone, r.name, r.email, r.phone
        ORDER BY m.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const result = await query;
    const rows = toRows(result);

    const totalResult = buildingId
      ? await sql`SELECT COUNT(*) as total FROM messages WHERE building_id = ${buildingId}`
      : await sql`SELECT COUNT(*) as total FROM messages`;

    const totalRows = toRows(totalResult);
    const totalCount = totalRows[0]?.total ?? 0;

    return NextResponse.json({
      messages: rows.map((msg: any) => ({
        id: msg.id,
        messageType: msg.message_type,
        channel: msg.channel,
        content: msg.content ? (String(msg.content).substring(0, 200) + (String(msg.content).length > 200 ? '...' : '')) : '',
        buildingName: msg.building_name,
        recipientName: msg.recipient_name,
        email: msg.email,
        phone: msg.phone,
        sentAt: msg.sent_at,
        delivered: msg.delivered,
        deliveryStatus: msg.delivery_status,
        hasUpload: parseInt(String(msg.upload_count), 10) > 0,
        createdAt: msg.created_at,
      })),
      total: parseInt(String(totalCount), 10),
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { message: 'Error fetching messages' },
      { status: 500 }
    );
  }
}
