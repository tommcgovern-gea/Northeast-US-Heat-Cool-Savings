import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { sql } from '@/lib/db/client';

export async function POST(
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

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const isPaused = body.isPaused !== undefined ? body.isPaused : true;

    await sql`
      UPDATE buildings
      SET is_paused = ${isPaused}, updated_at = NOW()
      WHERE id = ${params.id}
    `;

    const building = await db.getBuildings(undefined, params.id);
    
    if (building.length === 0) {
      return NextResponse.json({ message: 'Building not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: building[0].id,
      isPaused: isPaused,
      message: isPaused ? 'Building paused' : 'Building activated',
    });
  } catch (error) {
    console.error('Error pausing/activating building:', error);
    return NextResponse.json(
      { message: 'Error updating building status' },
      { status: 500 }
    );
  }
}
