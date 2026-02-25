import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { energyService } from '@/lib/services/energyService';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token) as TokenPayload;

    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { buildingId, month } = body;

    if (!buildingId || !month) {
      return NextResponse.json(
        { message: 'buildingId and month are required' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { message: 'Month must be between 1 and 12' },
        { status: 400 }
      );
    }

    const baselines = await energyService.calculateBaseline(buildingId, month);

    return NextResponse.json({
      buildingId,
      month,
      heating: baselines.heating ? {
        id: baselines.heating.id,
        avgConsumptionPerDegreeDay: Number(baselines.heating.avg_consumption_per_degree_day),
        baselinePeriodStart: baselines.heating.baseline_period_start,
        baselinePeriodEnd: baselines.heating.baseline_period_end,
        dataPoints: baselines.heating.data_points,
        calculatedAt: baselines.heating.calculated_at,
      } : null,
      cooling: baselines.cooling ? {
        id: baselines.cooling.id,
        avgConsumptionPerDegreeDay: Number(baselines.cooling.avg_consumption_per_degree_day),
        baselinePeriodStart: baselines.cooling.baseline_period_start,
        baselinePeriodEnd: baselines.cooling.baseline_period_end,
        dataPoints: baselines.cooling.data_points,
        calculatedAt: baselines.cooling.calculated_at,
      } : null,
    });
  } catch (error: any) {
    console.error('Error calculating baseline:', error);
    return NextResponse.json(
      { message: 'Error calculating baseline', error: error.message },
      { status: 500 }
    );
  }
}
