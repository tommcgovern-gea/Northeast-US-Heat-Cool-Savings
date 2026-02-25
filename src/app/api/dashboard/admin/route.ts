import { NextRequest } from "next/server";
import { getAdminDashboard } from "@/lib/controllers/dashboardController";

export async function GET(req: NextRequest) {
  return getAdminDashboard(req);
}
