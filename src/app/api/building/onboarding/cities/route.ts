import { NextRequest } from "next/server";
import {
  createCityOnboarding,
  listCities,
} from "@/lib/controllers/buildingOnboardingController";

export async function GET(req: NextRequest) {
  return listCities(req);
}

export async function POST(req: NextRequest) {
  return createCityOnboarding(req);
}
