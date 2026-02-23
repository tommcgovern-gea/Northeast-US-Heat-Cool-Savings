import { NextRequest } from "next/server";
import { getForecast } from "@/lib/controllers/weatherController";

export async function GET(req: NextRequest, props: { params: Promise<{ cityId: string }> }) {
  const params = await props.params;
  return getForecast(req, params.cityId);
}
