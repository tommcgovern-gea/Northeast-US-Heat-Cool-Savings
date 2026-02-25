import { NextRequest } from "next/server";
import { getEnergyReportPdf } from "@/lib/controllers/energyController";

export async function GET(req: NextRequest, props: { params: Promise<{ buildingId: string }> }) {
  const params = await props.params;
  return getEnergyReportPdf(req, params.buildingId);
}
