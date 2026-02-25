import { NextRequest } from "next/server";
import { getMessages } from "@/lib/controllers/messagesController";

export async function GET(req: NextRequest) {
  return getMessages(req);
}
