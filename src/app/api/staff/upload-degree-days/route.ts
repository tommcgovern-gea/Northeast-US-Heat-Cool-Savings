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
