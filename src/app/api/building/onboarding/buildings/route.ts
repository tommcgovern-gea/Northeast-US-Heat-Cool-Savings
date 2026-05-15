import { NextRequest } from "next/server";
import { listBuildings } from "@/lib/controllers/buildingOnboardingController";

export async function GET(req: NextRequest) {
  return listBuildings(req);
}
