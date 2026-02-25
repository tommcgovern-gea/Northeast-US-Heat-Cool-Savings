import { NextRequest } from "next/server";
import { uploadEnergyData } from "@/lib/controllers/energyController";

export async function POST(req: NextRequest, props: { params: Promise<{ buildingId: string }> }) {
  const params = await props.params;
  return uploadEnergyData(req, params.buildingId);
}
