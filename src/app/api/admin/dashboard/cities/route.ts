import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { db } from '@/lib/db/client';
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

    const cityStats = await Promise.all(
      cities.map(async (city) => {
        const cityBuildings = buildings.filter((b) => b.city_id === city.id);
        const [cityAlertsResult, tempTrendResult] = await Promise.all([
          sql`
            SELECT COUNT(*) as total FROM alert_logs
            WHERE city_id = ${city.id}
              AND triggered_at >= NOW() - (INTERVAL '1 day' * ${days})
          `,
          sql`
            SELECT recorded_at, temperature_f FROM temperature_snapshots
            WHERE city_id = ${city.id}
              AND recorded_at >= NOW() - INTERVAL '7 days'
            ORDER BY recorded_at ASC
            LIMIT 100
          `,
        ]);
        const cityTotalAlerts = parseInt(String(toRows(cityAlertsResult)[0]?.total ?? 0), 10);
        const tempRows = toRows(tempTrendResult);

        return {
          cityId: city.id,
          cityName: city.name,
          buildingCount: cityBuildings.length,
          activeBuildingCount: cityBuildings.filter((b) => b.is_active && !b.is_paused).length,
          totalAlerts: cityTotalAlerts,
          temperatureTrend: tempRows.map((r: any) => ({
            at: r.recorded_at,
            tempF: Number(r.temperature_f),
          })),
        };
      })
    );

    return NextResponse.json({ cityStats });
  } catch (error) {
    console.error('Dashboard cities error:', error);
    return NextResponse.json({ message: 'Error fetching cities' }, { status: 500 });
  }
}
