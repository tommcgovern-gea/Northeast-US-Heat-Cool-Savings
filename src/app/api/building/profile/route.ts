import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload || payload.role !== "BUILDING") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const user = await db.getUserById(payload.userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        email: user.email,
        phone: user.phone || "",
        preference: user.preference || "email",
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ message: "Error fetching profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload || payload.role !== "BUILDING") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim() || null;
    const preference = body?.preference;

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }

    if (phone) {
      const phoneRe = /^\+?[1-9]\d{9,14}$/;
      if (!phoneRe.test(phone)) {
        return NextResponse.json({ message: "Phone must be in E.164 format (e.g. +1234567890)" }, { status: 400 });
      }
    }

    if (preference && !["email", "sms", "both"].includes(preference)) {
      return NextResponse.json({ message: "Preference must be email, sms, or both" }, { status: 400 });
    }

    if ((preference === "sms" || preference === "both") && !phone) {
      return NextResponse.json({ message: "Phone number is required for SMS or Both communication preference" }, { status: 400 });
    }

    const dbUser = await db.getUserById(payload.userId);
    if (!dbUser || !dbUser.is_active) {
      return NextResponse.json({ message: "Account is inactive" }, { status: 403 });
    }

    const existing = await db.getUserByEmail(email);
    if (existing && existing.id !== payload.userId) {
      return NextResponse.json({ message: "Email is already in use by another account" }, { status: 409 });
    }

    const updated = await db.updateUser(payload.userId, {
      email,
      phone,
      preference: preference || dbUser.preference || "email",
    });

    const buildingIds = ((updated?.building_ids || dbUser.building_ids || []) as string[]).filter(Boolean);
    for (const bid of buildingIds) {
      await db.upsertRecipientForBuilding({
        buildingId: bid,
        name: updated?.name || dbUser.name || "",
        email,
        phone,
        preference: preference || dbUser.preference || "email",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        email: updated?.email || email,
        phone: updated?.phone || phone,
        preference: updated?.preference || preference || dbUser.preference || "email",
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ message: "Error updating profile" }, { status: 500 });
  }
}
