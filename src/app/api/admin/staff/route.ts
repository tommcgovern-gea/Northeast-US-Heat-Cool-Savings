import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifyToken, TokenPayload } from "@/lib/auth";
import { db } from "@/lib/db/client";

function requireAdmin(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  const user = verifyToken(token) as TokenPayload | null;
  return user?.role === "ADMIN" ? user : null;
}

/** GET /api/admin/staff — list staff users (admin only). */
export async function GET(req: NextRequest) {
  try {
    if (!requireAdmin(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const list = await db.getStaffUsers();
    return NextResponse.json(list);
  } catch (error) {
    console.error("Error fetching staff users:", error);
    return NextResponse.json({ message: "Error fetching staff" }, { status: 500 });
  }
}

/** POST /api/admin/staff — create staff user (admin only). */
export async function POST(req: NextRequest) {
  try {
    if (!requireAdmin(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const body = await req.json();
    const { email, password, name, phone } = body;
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters" }, { status: 400 });
    }
    const existing = await db.getUserByEmail(email.trim());
    if (existing) {
      return NextResponse.json({ message: "A user with this email already exists" }, { status: 409 });
    }
    const password_hash = await bcrypt.hash(password, 10);
    await db.createUser({
      email: email.trim(),
      password_hash,
      role: "STAFF",
      name: typeof name === "string" ? name.trim() || null : null,
      phone: typeof phone === "string" ? phone.trim() || null : null,
      is_active: true,
    });
    return NextResponse.json({ message: "Staff created" }, { status: 201 });
  } catch (error) {
    console.error("Error creating staff:", error);
    return NextResponse.json({ message: "Error creating staff" }, { status: 500 });
  }
}
