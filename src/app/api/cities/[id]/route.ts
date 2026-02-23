import { NextRequest } from "next/server";
import { updateCity, deleteCity } from "@/lib/controllers/citiesController";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return updateCity(req, params.id);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return deleteCity(req, params.id);
}