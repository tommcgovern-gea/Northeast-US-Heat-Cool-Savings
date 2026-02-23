import { NextRequest } from "next/server";
import { sendPendingMessages } from "@/lib/controllers/cronController";

export async function POST(req: NextRequest) {
  return sendPendingMessages(req);
}
