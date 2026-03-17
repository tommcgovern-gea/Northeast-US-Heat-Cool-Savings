import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";
import { db } from "@/lib/db/client";

function requireAdmin(req: NextRequest): TokenPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  const user = verifyToken(token) as TokenPayload | null;
  return user?.role === "ADMIN" ? user : null;
}

/** PATCH /api/admin/staff/[id] — update staff user (admin only). */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    if (!requireAdmin(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const { id } = await props.params;
    const user = await db.getUserById(id);
    if (!user) {
      return NextResponse.json({ message: "Staff user not found" }, { status: 404 });
    }
    if (user.role !== "STAFF") {
      return NextResponse.json({ message: "User is not a staff member" }, { status: 400 });
    }
    const body = await req.json();
    const { email, name, phone, is_active } = body;
    const updates: { email?: string; name?: string | null; phone?: string | null; is_active?: boolean } = {};
    if (email !== undefined) {
      const newEmail = typeof email === "string" ? email.trim() : "";
      if (!newEmail) {
        return NextResponse.json({ message: "Email is required" }, { status: 400 });
      }
      const existing = await db.getUserByEmail(newEmail);
      if (existing && existing.id !== id) {
        return NextResponse.json({ message: "A user with this email already exists" }, { status: 409 });
      }
      updates.email = newEmail;
    }
    if (name !== undefined) updates.name = typeof name === "string" ? name.trim() || null : null;
    if (phone !== undefined) updates.phone = typeof phone === "string" ? phone.trim() || null : null;
    if (typeof is_active === "boolean") updates.is_active = is_active;
    const updated = await db.updateUser(id, updates);
    return updated
      ? NextResponse.json(updated)
      : NextResponse.json({ message: "Update failed" }, { status: 500 });
  } catch (error) {
    console.error("Error updating staff:", error);
    return NextResponse.json({ message: "Error updating staff" }, { status: 500 });
  }
}

/** DELETE /api/admin/staff/[id] — delete staff user (admin only). */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    if (!requireAdmin(req)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }
    const { id } = await props.params;
    const user = await db.getUserById(id);
    if (!user) {
      return NextResponse.json({ message: "Staff user not found" }, { status: 404 });
    }
    if (user.role !== "STAFF") {
      return NextResponse.json({ message: "User is not a staff member" }, { status: 400 });
    }
    const deleted = await db.deleteUser(id);
    return deleted
      ? NextResponse.json({ message: "Staff deleted" })
      : NextResponse.json({ message: "Delete failed" }, { status: 500 });
  } catch (error) {
    console.error("Error deleting staff:", error);
    return NextResponse.json({ message: "Error deleting staff" }, { status: 500 });
  }
}
