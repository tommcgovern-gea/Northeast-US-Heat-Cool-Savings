import { NextRequest } from "next/server";
import { getComplianceReport } from "@/lib/controllers/dashboardController";

export async function GET(req: NextRequest) {
  return getComplianceReport(req);
}
