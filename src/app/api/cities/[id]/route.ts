import { NextRequest } from "next/server";
import { getCity, updateCity, deleteCity } from "@/lib/controllers/citiesController";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return getCity(req, params.id);
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return updateCity(req, params.id);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return deleteCity(req, params.id);
}