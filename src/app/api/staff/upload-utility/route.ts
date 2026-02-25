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
    const {
      buildingId,
      month,
      year,
      electricKWH,
      gasTherms,
      fuelOilGallons,
      districtSteamMBTU,
      totalKBTU,
    } = body;

    if (!buildingId || !month || !year || !totalKBTU) {
      return NextResponse.json(
        { message: 'buildingId, month, year, and totalKBTU are required' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { message: 'Month must be between 1 and 12' },
        { status: 400 }
      );
    }

    const utilityData = await energyService.uploadUtilityData(
      buildingId,
      month,
      year,
      {
        electricKWH,
        gasTherms,
        fuelOilGallons,
        districtSteamMBTU,
        totalKBTU,
      },
      user.userId
    );

    await energyService.calculateBaseline(buildingId, month);

    return NextResponse.json({
      id: utilityData.id,
      buildingId: utilityData.building_id,
      month: utilityData.month,
      year: utilityData.year,
      electricKWH: utilityData.electric_kwh,
      gasTherms: utilityData.gas_therms,
      fuelOilGallons: utilityData.fuel_oil_gallons,
      districtSteamMBTU: utilityData.district_steam_mbtu,
      totalKBTU: Number(utilityData.total_kbtu),
      uploadedAt: utilityData.created_at,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading utility data:', error);
    return NextResponse.json(
      { message: 'Error uploading utility data', error: error.message },
      { status: 500 }
    );
  }
}
