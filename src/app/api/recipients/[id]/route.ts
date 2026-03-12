import { NextRequest } from "next/server";
import { getRecipientById, updateRecipient, deleteRecipient } from "@/lib/controllers/recipientsController";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return getRecipientById(req, params.id);
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return updateRecipient(req, params.id);
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return deleteRecipient(req, params.id);
}
