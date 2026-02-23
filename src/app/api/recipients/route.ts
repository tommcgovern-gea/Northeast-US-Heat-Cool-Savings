import { NextRequest } from "next/server";
import { getRecipients, createRecipient } from "@/lib/controllers/recipientsController";

export async function GET(req: NextRequest) {
  return getRecipients(req);
}

export async function POST(req: NextRequest) {
  return createRecipient(req);
}
