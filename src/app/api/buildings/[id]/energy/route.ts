import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
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

    if (user.role === 'BUILDING' && user.buildingId !== params.id) {
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

    const utilityHistory = await energyService.getBuildingUtilityHistory(params.id, 36);
    const building = await db.getBuildings(undefined, params.id);
    const cityId = building?.[0]?.city_id;
    const degreeDays = cityId
      ? await energyService.getCityDegreeDaysHistory(cityId, 24)
      : [];

    const baselinesResult = await sql`
      SELECT * FROM energy_baselines
      WHERE building_id = ${params.id}
      ORDER BY month
    `;

    const recentReportsResult = await sql`
      SELECT * FROM energy_reports
      WHERE building_id = ${params.id}
      ORDER BY year DESC, month DESC
      LIMIT 12
    `;

    const baselinesRows = toRows(baselinesResult);
    const recentReportsRows = toRows(recentReportsResult);

    return NextResponse.json({
      buildingId: params.id,
      degreeDays: degreeDays.map((dd: any) => ({
        id: dd.id,
        month: dd.month,
        year: dd.year,
        hdd: Number(dd.heating_degree_days),
        cdd: Number(dd.cooling_degree_days),
      })),
      utilityHistory: (utilityHistory ?? []).map(u => ({
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
