import { NextRequest } from "next/server";
import { completeOnboarding } from "@/lib/controllers/buildingOnboardingController";

export async function POST(req: NextRequest) {
  return completeOnboarding(req);
}
