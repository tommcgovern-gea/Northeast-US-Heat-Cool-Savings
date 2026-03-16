import { NextRequest } from "next/server";
import { sendPendingMessages } from "@/lib/controllers/cronController";

export async function GET(req: NextRequest) {
  return sendPendingMessages(req);
}
export async function POST(req: NextRequest) {
  return sendPendingMessages(req);
}
