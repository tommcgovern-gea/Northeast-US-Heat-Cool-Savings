import { NextRequest } from "next/server";
import { getBuildingUploads } from "@/lib/controllers/uploadController";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return getBuildingUploads(req, { params });
}
