import { NextRequest } from "next/server";
import { getUsers, createUser } from "@/lib/controllers/usersController";

export async function GET(req: NextRequest) {
  return getUsers(req);
}

export async function POST(req: NextRequest) {
  return createUser(req);
}
