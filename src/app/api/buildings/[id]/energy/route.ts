import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload, canAccessBuilding } from '@/lib/auth';
import { energyService } from '@/lib/services/energyService';
import { sql, toRows } from '@/lib/db/client';
import { db } from '@/lib/db/client';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token) as TokenPayload;

    if (!user) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    if (user.role === 'BUILDING' && !canAccessBuilding(user, params.id)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const month = req.nextUrl.searchParams.get('month');
    const year = req.nextUrl.searchParams.get('year');

    if (month && year) {
      const comparison = await energyService.calculateMonthlyComparison(
        params.id,
        parseInt(month),
        parseInt(year)
      );

      if (!comparison) {
        return NextResponse.json(
          { message: 'No data available for this period' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        buildingId: params.id,
        month: parseInt(month),
        year: parseInt(year),
        comparison,
      });
    }

    const utilityPage = Math.max(1, parseInt(req.nextUrl.searchParams.get('utilityPage') || '1', 10));
    const utilityLimit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('utilityLimit') || '10', 10)));
    const degreeDaysPage = Math.max(1, parseInt(req.nextUrl.searchParams.get('degreeDaysPage') || '1', 10));
    const degreeDaysLimit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get('degreeDaysLimit') || '10', 10)));

    const [utilityFull, buildingList] = await Promise.all([
      energyService.getBuildingUtilityHistory(params.id, 500),
      db.getBuildings(undefined, params.id),
    ]);
    const building = buildingList?.[0];
    const cityId = building?.city_id;

    const monthsWithEnoughData = new Set<number>();
    const byMonth = new Map<number, Set<number>>();
    for (const u of utilityFull ?? []) {
      if (!byMonth.has(u.month)) byMonth.set(u.month, new Set());
      byMonth.get(u.month)!.add(u.year);
    }
    byMonth.forEach((years, month) => {
      if (years.size >= 3) monthsWithEnoughData.add(month);
    });
    for (const month of monthsWithEnoughData) {
      await energyService.calculateBaseline(params.id, month);
    }

    const [utilityPaginated, degreeDaysPaginated, baselinesResult, recentReportsResult] = await Promise.all([
      energyService.getBuildingUtilityHistoryPaginated(params.id, utilityPage, utilityLimit),
      cityId
        ? energyService.getCityDegreeDaysHistoryPaginated(cityId, degreeDaysPage, degreeDaysLimit)
        : Promise.resolve({ items: [], total: 0 }),
      sql`SELECT * FROM energy_baselines WHERE building_id = ${params.id} ORDER BY month`,
      sql`SELECT * FROM energy_reports WHERE building_id = ${params.id} ORDER BY year DESC, month DESC LIMIT 12`,
    ]);

    const baselinesRows = toRows(baselinesResult);
    const recentReportsRows = toRows(recentReportsResult);

    return NextResponse.json({
      buildingId: params.id,
      degreeDays: degreeDaysPaginated.items.map((dd: any) => ({
        id: dd.id,
        month: dd.month,
        year: dd.year,
        hdd: Number(dd.heating_degree_days),
        cdd: Number(dd.cooling_degree_days),
      })),
      degreeDaysTotal: degreeDaysPaginated.total,
      degreeDaysPage,
      degreeDaysLimit,
      utilityHistory: utilityPaginated.items.map(u => ({
        id: u.id,
        month: u.month,
        year: u.year,
        electricKWH: u.electric_kwh ? Number(u.electric_kwh) : null,
        gasTherms: u.gas_therms ? Number(u.gas_therms) : null,
        fuelOilGallons: u.fuel_oil_gallons ? Number(u.fuel_oil_gallons) : null,
        districtSteamMBTU: u.district_steam_mbtu ? Number(u.district_steam_mbtu) : null,
        totalKBTU: Number(u.total_kbtu),
        uploadedAt: u.created_at,
      })),
      utilityTotal: utilityPaginated.total,
      utilityPage,
      utilityLimit,
      baselines: baselinesRows.map((b: any) => ({
        id: b.id,
        month: b.month,
        baselineType: b.baseline_type,
        avgConsumptionPerDegreeDay: Number(b.avg_consumption_per_degree_day),
        baselinePeriodStart: b.baseline_period_start,
        baselinePeriodEnd: b.baseline_period_end,
        dataPoints: b.data_points,
        calculatedAt: b.calculated_at,
      })),
      recentReports: recentReportsRows.map((r: any) => ({
        id: r.id,
        month: r.month,
        year: r.year,
        savingsPercentage: Number(r.savings_percentage),
        savingsKBTU: Number(r.savings_kbtu),
        pdfUrl: r.pdf_url,
        generatedAt: r.generated_at,
        emailedTo: r.emailed_to,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching energy data:', error);
    const msg = error?.message?.includes('does not exist')
      ? 'Energy tables not found. Run: psql $POSTGRES_URL < src/lib/db/schema-milestone4.sql'
      : 'Error fetching energy data';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
