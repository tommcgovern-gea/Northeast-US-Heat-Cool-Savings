import { NextRequest } from "next/server";
import { dailySummary } from "@/lib/controllers/cronController";

export async function POST(req: NextRequest) {
  return dailySummary(req);
}
