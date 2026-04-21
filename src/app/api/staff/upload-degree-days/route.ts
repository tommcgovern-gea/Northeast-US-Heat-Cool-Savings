import { NextRequest, NextResponse } from 'next/server';
import { energyService } from '@/lib/services/energyService';
import { requireAuth } from '@/lib/requireAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req, ["ADMIN", "STAFF"]);
    if (auth.error) return auth.error;
    const user = auth.user;

    const body = await req.json();
    const { cityId, month, year, heatingDegreeDays, coolingDegreeDays } = body;

    if (!cityId || !month || !year || heatingDegreeDays === undefined || coolingDegreeDays === undefined) {
      return NextResponse.json(
        { message: 'cityId, month, year, heatingDegreeDays, and coolingDegreeDays are required' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { message: 'Month must be between 1 and 12' },
        { status: 400 }
      );
    }

    const degreeDays = await energyService.uploadDegreeDays(
      cityId,
      month,
      year,
      heatingDegreeDays,
      coolingDegreeDays,
      user.userId
    );

    return NextResponse.json({
      id: degreeDays.id,
      cityId: degreeDays.city_id,
      month: degreeDays.month,
      year: degreeDays.year,
      heatingDegreeDays: Number(degreeDays.heating_degree_days),
      coolingDegreeDays: Number(degreeDays.cooling_degree_days),
      uploadedAt: degreeDays.created_at,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading degree days:', error);
    return NextResponse.json(
      { message: 'Error uploading degree days', error: error.message },
      { status: 500 }
    );
  }
}
