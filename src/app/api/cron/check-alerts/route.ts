import { NextRequest } from "next/server";
import { checkAlerts } from "@/lib/controllers/cronController";

export async function GET(req: NextRequest) {
  return checkAlerts(req);
}
export async function POST(req: NextRequest) {
  return checkAlerts(req);
}
