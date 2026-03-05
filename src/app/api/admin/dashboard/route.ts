import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { complianceService } from '@/lib/services/complianceService';
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

    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');

    const cities = await db.getCities();
    const buildings = await db.getBuildings();
    const activeBuildings = buildings.filter(b => b.is_active && !b.is_paused);
    const pausedBuildings = buildings.filter(b => b.is_paused);

    const totalMessagesResult = await sql`
      SELECT COUNT(*) as total
      FROM messages
      WHERE sent_at >= NOW() - (INTERVAL '1 day' * ${days})
        AND delivered = true
    `;
    const totalMessagesRows = toRows(totalMessagesResult);
    const totalMessages = parseInt(String(totalMessagesRows[0]?.total ?? 0), 10);

    const totalAlertsResult = await sql`
      SELECT COUNT(*) as total
      FROM alert_logs
      WHERE triggered_at >= NOW() - (INTERVAL '1 day' * ${days})
    `;
    const totalAlertsRows = toRows(totalAlertsResult);
    const totalAlerts = parseInt(String(totalAlertsRows[0]?.total ?? 0), 10);

    const failedMessagesResult = await sql`
      SELECT COUNT(*) as total
      FROM messages
      WHERE sent_at >= NOW() - (INTERVAL '1 day' * ${days})
        AND (delivered = false OR delivery_status = 'failed')
    `;
    const failedMessagesRows = toRows(failedMessagesResult);
    const failedMessages = parseInt(String(failedMessagesRows[0]?.total ?? 0), 10);

    const complianceData = await Promise.all(
      activeBuildings.map(async (building) => {
        let rate: number | null = null;
        try {
          rate = await complianceService.getBuildingComplianceRate(building.id, days);
        } catch {
          // Tables may not exist
        }
        return {
          buildingId: building.id,
          buildingName: building.name,
          complianceRate: rate,
        };
      })
    );

    const buildingsWithData = complianceData.filter((b) => b.complianceRate != null);
    const overallComplianceRate =
      buildingsWithData.length > 0
        ? buildingsWithData.reduce((sum, b) => sum + (b.complianceRate ?? 0), 0) / buildingsWithData.length
        : null;

    const recentAlertsResult = await sql`
      SELECT 
        al.*,
        c.name as city_name
      FROM alert_logs al
      JOIN cities c ON c.id = al.city_id
      ORDER BY al.triggered_at DESC
      LIMIT 20
    `;

    const energyReportsResult = await sql`
      SELECT 
        er.*,
        b.name as building_name
      FROM energy_reports er
      JOIN buildings b ON b.id = er.building_id
      ORDER BY er.year DESC, er.month DESC
      LIMIT 10
    `;

    const totalEnergySavingsResult = await sql`
      SELECT 
        SUM(savings_kbtu) as total_savings,
        AVG(savings_percentage) as avg_savings_percentage
      FROM energy_reports
      WHERE year >= EXTRACT(YEAR FROM NOW()) - 1
    `;

    const cityStats = await Promise.all(
      cities.map(async (city) => {
        const cityBuildings = buildings.filter(b => b.city_id === city.id);
        const cityAlertsResult = await sql`
          SELECT COUNT(*) as total
          FROM alert_logs
          WHERE city_id = ${city.id}
            AND triggered_at >= NOW() - (INTERVAL '1 day' * ${days})
        `;
        const cityAlertsRows = toRows(cityAlertsResult);
        const cityTotalAlerts = parseInt(String(cityAlertsRows[0]?.total ?? 0), 10);

        return {
          cityId: city.id,
          cityName: city.name,
          buildingCount: cityBuildings.length,
          activeBuildingCount: cityBuildings.filter(b => b.is_active && !b.is_paused).length,
          totalAlerts: cityTotalAlerts,
        };
      })
    );

    const recentAlertsRows = toRows(recentAlertsResult);
    const energyReportsRows = toRows(energyReportsResult);
    const totalEnergyRows = toRows(totalEnergySavingsResult);
    const energyFirst = totalEnergyRows[0];

    return NextResponse.json({
      overview: {
        totalCities: cities.length,
        totalBuildings: buildings.length,
        activeBuildings: activeBuildings.length,
        pausedBuildings: pausedBuildings.length,
        totalMessages,
        totalAlerts,
        failedMessages,
        overallComplianceRate: overallComplianceRate != null ? Math.round(overallComplianceRate * 10) / 10 : null,
        days,
      },
      cityStats,
      buildingCompliance: complianceData,
      recentAlerts: recentAlertsRows.map((alert: any) => ({
        id: alert.id,
        cityName: alert.city_name,
        alertType: alert.alert_type,
        triggeredAt: alert.triggered_at,
        processed: alert.processed,
      })),
      energyReports: energyReportsRows.map((report: any) => ({
        id: report.id,
        buildingName: report.building_name,
        month: report.month,
        year: report.year,
        savingsPercentage: Number(report.savings_percentage),
        savingsKBTU: Number(report.savings_kbtu),
        pdfUrl: report.pdf_url,
        generatedAt: report.generated_at,
      })),
      energySavings: {
        totalSavingsKBTU: energyFirst?.total_savings != null ? Number(energyFirst.total_savings) : 0,
        avgSavingsPercentage: energyFirst?.avg_savings_percentage != null ? Number(energyFirst.avg_savings_percentage) : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching admin dashboard:', error);
    return NextResponse.json(
      { message: 'Error fetching dashboard data' },
      { status: 500 }
    );
  }
}
