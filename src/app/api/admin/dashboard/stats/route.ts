import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { complianceService } from '@/lib/services/complianceService';
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
    const cities = await db.getCities();
    const buildings = await db.getBuildings();
    const activeBuildings = buildings.filter((b) => b.is_active && !b.is_paused);
    const pausedBuildings = buildings.filter((b) => b.is_paused);

    const [totalMessagesResult, totalAlertsResult, failedMessagesResult] = await Promise.all([
      sql`
        SELECT COUNT(*) as total FROM messages
        WHERE sent_at >= NOW() - (INTERVAL '1 day' * ${days}) AND delivered = true
      `,
      sql`
        SELECT COUNT(*) as total FROM alert_logs
        WHERE triggered_at >= NOW() - (INTERVAL '1 day' * ${days})
      `,
      sql`
        SELECT COUNT(*) as total FROM messages
        WHERE sent_at >= NOW() - (INTERVAL '1 day' * ${days})
          AND (delivered = false OR delivery_status = 'failed')
      `,
    ]);

    const totalMessages = parseInt(String(toRows(totalMessagesResult)[0]?.total ?? 0), 10);
    const totalAlerts = parseInt(String(toRows(totalAlertsResult)[0]?.total ?? 0), 10);
    const failedMessages = parseInt(String(toRows(failedMessagesResult)[0]?.total ?? 0), 10);

    const complianceData = await Promise.all(
      activeBuildings.map(async (building) => {
        let rate: number | null = null;
        try {
          rate = await complianceService.getBuildingComplianceRate(building.id, days);
        } catch {
          // ignore
        }
        return { buildingId: building.id, complianceRate: rate };
      })
    );
    const withRate = complianceData.filter((b) => b.complianceRate != null);
    const overallComplianceRate =
      withRate.length > 0
        ? withRate.reduce((sum, b) => sum + (b.complianceRate ?? 0), 0) / withRate.length
        : null;

    return NextResponse.json({
      overview: {
        totalCities: cities.length,
        totalBuildings: buildings.length,
        activeBuildings: activeBuildings.length,
        pausedBuildings: pausedBuildings.length,
        totalMessages,
        totalAlerts,
        failedMessages,
        overallComplianceRate:
          overallComplianceRate != null ? Math.round(overallComplianceRate * 10) / 10 : null,
        days,
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      {
        message: 'Error fetching stats',
        ...(process.env.NODE_ENV === 'development' && { error: err }),
      },
      { status: 500 }
    );
  }
}
