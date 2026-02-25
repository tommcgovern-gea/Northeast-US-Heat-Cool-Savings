import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { verifyToken, TokenPayload } from '@/lib/auth';

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

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const city = await db.getCityById(params.id);
    if (!city) {
      return NextResponse.json({ message: 'City not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: city.id,
      name: city.name,
      alertTempDelta: Number(city.alert_temp_delta),
      alertWindowHours: city.alert_window_hours,
      nwsOffice: city.nws_office,
      nwsGridX: city.nws_grid_x,
      nwsGridY: city.nws_grid_y,
    });
  } catch (error) {
    console.error('Error fetching city config:', error);
    return NextResponse.json({ message: 'Error fetching configuration' }, { status: 500 });
  }
}

export async function PUT(
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

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const updateData: any = {};

    if (body.alertTempDelta !== undefined) {
      if (typeof body.alertTempDelta !== 'number' || body.alertTempDelta < 0) {
        return NextResponse.json({ message: 'Invalid alertTempDelta' }, { status: 400 });
      }
      updateData.alert_temp_delta = body.alertTempDelta;
    }

    if (body.alertWindowHours !== undefined) {
      if (typeof body.alertWindowHours !== 'number' || body.alertWindowHours < 1) {
        return NextResponse.json({ message: 'Invalid alertWindowHours' }, { status: 400 });
      }
      updateData.alert_window_hours = body.alertWindowHours;
    }

    if (body.nwsOffice !== undefined) updateData.nws_office = body.nwsOffice;
    if (body.nwsGridX !== undefined) updateData.nws_grid_x = body.nwsGridX;
    if (body.nwsGridY !== undefined) updateData.nws_grid_y = body.nwsGridY;

    const updatedCity = await db.updateCity(params.id, updateData);

    if (!updatedCity) {
      return NextResponse.json({ message: 'City not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: updatedCity.id,
      name: updatedCity.name,
      alertTempDelta: Number(updatedCity.alert_temp_delta),
      alertWindowHours: updatedCity.alert_window_hours,
      nwsOffice: updatedCity.nws_office,
      nwsGridX: updatedCity.nws_grid_x,
      nwsGridY: updatedCity.nws_grid_y,
    });
  } catch (error) {
    console.error('Error updating city config:', error);
    return NextResponse.json({ message: 'Error updating configuration' }, { status: 500 });
  }
}
