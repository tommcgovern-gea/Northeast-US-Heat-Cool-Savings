import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";
import { db } from "@/lib/db/client";

type AuthResult =
  | { user: TokenPayload; error?: undefined }
  | { user?: undefined; error: NextResponse };

/** Verify JWT + confirm user is still active in DB. Returns user or an error response. */
export async function requireAuth(
  req: NextRequest,
  allowedRoles: TokenPayload["role"][]
): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token) as TokenPayload | null;

  if (!payload) {
    return { error: NextResponse.json({ message: "Invalid token" }, { status: 401 }) };
  }

  if (!allowedRoles.includes(payload.role)) {
    return { error: NextResponse.json({ message: "Forbidden" }, { status: 403 }) };
  }

  const dbUser = await db.getUserById(payload.userId);
  if (!dbUser || dbUser.is_active === false) {
    return { error: NextResponse.json({ message: "Account is inactive" }, { status: 403 }) };
  }

  return { user: payload };
}
