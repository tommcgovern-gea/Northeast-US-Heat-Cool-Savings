import { NextRequest } from "next/server";
import { getBuildingDashboard } from "@/lib/controllers/dashboardController";

export async function GET(req: NextRequest, props: { params: Promise<{ buildingId: string }> }) {
  const params = await props.params;
  return getBuildingDashboard(req, params.buildingId);
}
