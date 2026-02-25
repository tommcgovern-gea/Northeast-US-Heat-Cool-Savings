import { NextRequest } from "next/server";
import { getEnergyRecords } from "@/lib/controllers/energyController";

export async function GET(req: NextRequest, props: { params: Promise<{ buildingId: string }> }) {
  const params = await props.params;
  return getEnergyRecords(req, params.buildingId);
}
