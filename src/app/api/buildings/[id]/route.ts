import { NextRequest } from 'next/server';
import { getBuildingById, updateBuilding } from '@/lib/controllers/buildingsController';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return getBuildingById(req, params.id);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return updateBuilding(req, params.id);
}
