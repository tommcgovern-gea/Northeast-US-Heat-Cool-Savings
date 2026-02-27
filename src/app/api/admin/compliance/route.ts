import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { complianceService } from '@/lib/services/complianceService';
import { db } from '@/lib/db/client';
import { sql } from '@/lib/db/client';

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
      const complianceRate = await complianceService.getBuildingComplianceRate(buildingId, days);
      
      const messagesResult = await sql`
        SELECT m.*, COUNT(p.id) as upload_count
        FROM messages m
        LEFT JOIN photo_uploads p ON p.message_id = m.id
        WHERE m.building_id = ${buildingId}
          AND m.message_type IN ('alert', 'daily_summary')
          AND m.sent_at >= NOW() - INTERVAL '${days} days'
          AND m.delivered = true
        GROUP BY m.id
        ORDER BY m.sent_at DESC
        LIMIT 50
      `;

      return NextResponse.json({
        buildingId,
        complianceRate,
        days,
        messages: messagesResult.rows.map(msg => ({
          id: msg.id,
          messageType: msg.message_type,
          sentAt: msg.sent_at,
          delivered: msg.delivered,
          deliveryStatus: msg.delivery_status,
          hasUpload: parseInt(msg.upload_count) > 0,
        })),
      });
    }

    const buildings = await db.getBuildings();
    const complianceData = await Promise.all(
      buildings.map(async (building) => {
        const rate = await complianceService.getBuildingComplianceRate(building.id, days);
        return {
          buildingId: building.id,
          buildingName: building.name,
          complianceRate: rate,
        };
      })
    );

    const overallRate = complianceData.length > 0
      ? complianceData.reduce((sum, b) => sum + b.complianceRate, 0) / complianceData.length
      : 100;

    return NextResponse.json({
      overallComplianceRate: Math.round(overallRate * 10) / 10,
      buildings: complianceData,
      days,
    });
  } catch (error) {
    console.error('Error fetching compliance data:', error);
    return NextResponse.json(
      { message: 'Error fetching compliance data' },
      { status: 500 }
    );
  }
}
