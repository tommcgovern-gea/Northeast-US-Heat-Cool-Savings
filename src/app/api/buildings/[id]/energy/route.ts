import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { energyService } from '@/lib/services/energyService';
import { sql } from '@/lib/db/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    return NextResponse.json({
      buildingId: params.id,
      utilityHistory: utilityHistory.map(u => ({
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
      baselines: baselinesResult.rows.map(b => ({
        id: b.id,
        month: b.month,
        baselineType: b.baseline_type,
        avgConsumptionPerDegreeDay: Number(b.avg_consumption_per_degree_day),
        baselinePeriodStart: b.baseline_period_start,
        baselinePeriodEnd: b.baseline_period_end,
        dataPoints: b.data_points,
        calculatedAt: b.calculated_at,
      })),
      recentReports: recentReportsResult.rows.map(r => ({
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
  } catch (error) {
    console.error('Error fetching energy data:', error);
    return NextResponse.json(
      { message: 'Error fetching energy data' },
      { status: 500 }
    );
  }
}
