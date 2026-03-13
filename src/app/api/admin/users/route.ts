import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";
import { db } from "@/lib/db/client";

/** GET /api/admin/users — list BUILDING users for "add existing user" (admin only). */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.split(" ")[1];
    const user = verifyToken(token) as TokenPayload | null;
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const list = await db.getBuildingRoleUsers();
    return NextResponse.json(list);
  } catch (error) {
    console.error("Error fetching admin users:", error);
    return NextResponse.json({ message: "Error fetching users" }, { status: 500 });
  }
}
