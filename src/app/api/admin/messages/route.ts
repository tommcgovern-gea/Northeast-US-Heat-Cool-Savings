import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { sql } from '@vercel/postgres';

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
          r.name as recipient_name,
          r.email,
          r.phone,
          COUNT(p.id) as upload_count
        FROM messages m
        JOIN buildings b ON b.id = m.building_id
        JOIN recipients r ON r.id = m.recipient_id
        LEFT JOIN photo_uploads p ON p.message_id = m.id
        WHERE m.building_id = ${buildingId}
        GROUP BY m.id, b.name, r.name, r.email, r.phone
        ORDER BY m.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      query = sql`
        SELECT 
          m.*,
          b.name as building_name,
          r.name as recipient_name,
          r.email,
          r.phone,
          COUNT(p.id) as upload_count
        FROM messages m
        JOIN buildings b ON b.id = m.building_id
        JOIN recipients r ON r.id = m.recipient_id
        LEFT JOIN photo_uploads p ON p.message_id = m.id
        GROUP BY m.id, b.name, r.name, r.email, r.phone
        ORDER BY m.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    const result = await query;

    const totalResult = buildingId
      ? await sql`SELECT COUNT(*) as total FROM messages WHERE building_id = ${buildingId}`
      : await sql`SELECT COUNT(*) as total FROM messages`;

    return NextResponse.json({
      messages: result.rows.map(msg => ({
        id: msg.id,
        messageType: msg.message_type,
        channel: msg.channel,
        content: msg.content.substring(0, 200) + (msg.content.length > 200 ? '...' : ''),
        buildingName: msg.building_name,
        recipientName: msg.recipient_name,
        email: msg.email,
        phone: msg.phone,
        sentAt: msg.sent_at,
        delivered: msg.delivered,
        deliveryStatus: msg.delivery_status,
        hasUpload: parseInt(msg.upload_count) > 0,
        createdAt: msg.created_at,
      })),
      total: parseInt(totalResult.rows[0].total),
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
