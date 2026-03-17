import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { complianceService } from '@/lib/services/complianceService';
import { db, sql, toRows } from '@/lib/db/client';

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
    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');

    if (buildingId) {
      let complianceRate: number | null = null;
      try {
        complianceRate = await complianceService.getBuildingComplianceRate(buildingId, days);
      } catch {
        // Tables may not exist
      }

      const pageParam = req.nextUrl.searchParams.get('page') || '1';
      const page = Math.max(1, parseInt(pageParam, 10));
      const limitParam = req.nextUrl.searchParams.get('limit') || '10';
      const limit = Math.min(100, Math.max(1, parseInt(limitParam, 10)));
      const offset = (page - 1) * limit;

      const countResult = await sql`
        SELECT COUNT(*) as total
        FROM messages m
        WHERE m.building_id = ${buildingId}
          AND m.message_type IN ('alert', 'daily_summary')
          AND m.sent_at >= NOW() - make_interval(days => ${days})
          AND m.delivered = true
      `;
      const total = parseInt(String(toRows(countResult)[0]?.total ?? 0), 10);

      const messagesResult = await sql`
        SELECT m.*, COUNT(p.id) as upload_count
        FROM messages m
        LEFT JOIN photo_uploads p ON p.message_id = m.id
        WHERE m.building_id = ${buildingId}
          AND m.message_type IN ('alert', 'daily_summary')
          AND m.sent_at >= NOW() - make_interval(days => ${days})
          AND m.delivered = true
        GROUP BY m.id
        ORDER BY m.sent_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;

      const messageRows = toRows(messagesResult);
      return NextResponse.json({
        buildingId,
        complianceRate,
        days,
        messages: messageRows.map((msg: any) => ({
          id: msg.id,
          messageType: msg.message_type,
          sentAt: msg.sent_at,
          delivered: msg.delivered,
          deliveryStatus: msg.delivery_status,
          hasUpload: parseInt(msg.upload_count) > 0,
        })),
        total,
        page,
        limit,
      });
    }

    const buildings = await db.getBuildings();
    const [rateMap, overallRate] = await Promise.all([
      complianceService.getBuildingComplianceRatesBatch(buildings.map((b) => b.id), days),
      complianceService.getGlobalComplianceRate(days),
    ]);
    const complianceData = buildings.map((building) => ({
      buildingId: building.id,
      buildingName: building.name,
      complianceRate: rateMap.get(building.id) ?? null,
    }));

    return NextResponse.json({
      overallComplianceRate: overallRate,
      buildings: complianceData,
      days,
    });
  } catch (error: any) {
    console.error('Error fetching compliance data:', error);
    const msg = error?.message?.includes('does not exist')
      ? 'Compliance tables not found. Ensure schema includes messages and photo_uploads.'
      : 'Error fetching compliance data';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
