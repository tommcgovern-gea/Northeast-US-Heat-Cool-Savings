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

    const pageParam = req.nextUrl.searchParams.get('page') || '1';
    const page = Math.max(1, parseInt(pageParam, 10));
    const limitParam = req.nextUrl.searchParams.get('limit') || '10';
    const limit = parseInt(limitParam, 10) === 20 ? 20 : 10;
    const offset = (page - 1) * limit;

    const countResult = await sql`
      SELECT COUNT(*) as total FROM alert_logs
    `;
    const total = parseInt(String(toRows(countResult)[0]?.total ?? 0), 10);
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const result = await sql`
      SELECT al.id, al.alert_type, al.triggered_at, al.processed, c.name as city_name
      FROM alert_logs al
      JOIN cities c ON c.id = al.city_id
      ORDER BY al.triggered_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;
    const rows = toRows(result);

    return NextResponse.json({
      recentAlerts: rows.map((alert: any) => ({
        id: alert.id,
        cityName: alert.city_name,
        alertType: alert.alert_type,
        triggeredAt: alert.triggered_at,
        processed: alert.processed,
      })),
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    console.error('Dashboard alerts error:', error);
    return NextResponse.json({ message: 'Error fetching alerts' }, { status: 500 });
  }
}
