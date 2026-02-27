import { NextRequest } from 'next/server';
import { getBuildingById, updateBuilding, deleteBuilding } from '@/lib/controllers/buildingsController';

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return getBuildingById(req, params.id);
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return updateBuilding(req, params.id);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return deleteBuilding(req, params.id);
}
