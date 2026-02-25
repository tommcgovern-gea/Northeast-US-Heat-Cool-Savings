import { NextRequest } from "next/server";
import { getEnergySavings } from "@/lib/controllers/energyController";

export async function GET(req: NextRequest, props: { params: Promise<{ buildingId: string }> }) {
  const params = await props.params;
  return getEnergySavings(req, params.buildingId);
}
