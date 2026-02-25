import { NextRequest } from "next/server";
import { updateUser } from "@/lib/controllers/usersController";

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  return updateUser(req, params.id);
}
