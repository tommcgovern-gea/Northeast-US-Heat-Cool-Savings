import { NextRequest } from "next/server";
import { getBuildings, createBuilding } from "@/lib/controllers/buildingsController";

export async function GET(req: NextRequest) {
  return getBuildings(req);
}

export async function POST(req: NextRequest) {
  return createBuilding(req);
}
