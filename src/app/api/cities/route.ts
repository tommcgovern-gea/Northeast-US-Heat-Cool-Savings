import { NextRequest } from "next/server";
import { getCities, createCity } from "@/lib/controllers/citiesController";

export async function GET(req: NextRequest) {
  return getCities(req);
}

export async function POST(req: NextRequest) {
  return createCity(req);
}