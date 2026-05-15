import { NextRequest } from "next/server";
import { searchCities } from "@/lib/controllers/buildingOnboardingController";

export async function GET(req: NextRequest) {
  return searchCities(req);
}
