import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { verifyToken, TokenPayload } from "@/lib/auth";

// GET /api/recipients?buildingId=xxx
export const getRecipients = async (req: NextRequest) => {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token) as TokenPayload;

    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }

    const buildingId = req.nextUrl.searchParams.get("buildingId");

    if (!buildingId) {
      return NextResponse.json({ message: "buildingId query param is required" }, { status: 400 });
    }

    const buildings = await db.getBuildings(undefined, buildingId);
    if (buildings.length === 0) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    // Building user sees only their own building's recipients
    if (user.role === "BUILDING" && user.buildingId !== buildingId) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    } else if (user.role !== "ADMIN" && user.role !== "STAFF" && user.role !== "BUILDING") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const recipients = await db.getRecipients(buildingId, true); // Include inactive for admin
    const responseData = recipients.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      preference: r.preference,
      isActive: r.is_active,
    }));

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching recipients:", error);
    return NextResponse.json({ message: "Error fetching recipients" }, { status: 500 });
  }
};

// POST /api/recipients  — body: { buildingId, name, email?, phone?, preference? }
export const createRecipient = async (req: NextRequest) => {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token) as TokenPayload;

    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    if (!body.buildingId) {
      return NextResponse.json({ message: "buildingId is required" }, { status: 400 });
    }

    const buildings = await db.getBuildings(undefined, body.buildingId);
    if (buildings.length === 0) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    if (!body.name) {
      return NextResponse.json({ message: "name is required" }, { status: 400 });
    }

    if (!body.email && !body.phone) {
      return NextResponse.json({ message: "At least one of email or phone must be provided" }, { status: 400 });
    }

    const newRecipient = await db.createRecipient({
      building_id: body.buildingId,
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      preference: body.preference || (body.email && body.phone ? "both" : body.email ? "email" : "sms"),
      is_active: true,
    });

    return NextResponse.json({
      id: newRecipient.id,
      name: newRecipient.name,
      email: newRecipient.email,
      phone: newRecipient.phone,
      preference: newRecipient.preference,
      isActive: newRecipient.is_active,
      createdAt: newRecipient.created_at,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating recipient:", error);
    return NextResponse.json({ message: "Error creating recipient" }, { status: 500 });
  }
};

// PUT /api/recipients/:id  — body: { name?, email?, phone?, preference?, isActive? }
export const updateRecipient = async (req: NextRequest, recipientId: string) => {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token) as TokenPayload;

    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.preference !== undefined) updateData.preference = body.preference;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;

    const updated = await db.updateRecipient(recipientId, updateData);

    if (!updated) {
      return NextResponse.json({ message: "Recipient not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      preference: updated.preference,
      isActive: updated.is_active,
      updatedAt: updated.updated_at,
    });
  } catch (error) {
    console.error("Error updating recipient:", error);
    return NextResponse.json({ message: "Error updating recipient" }, { status: 500 });
  }
};

// DELETE /api/recipients/:id
export const deleteRecipient = async (req: NextRequest, recipientId: string) => {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token) as TokenPayload;

    if (user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const success = await db.deleteRecipient(recipientId);

    if (!success) {
      return NextResponse.json({ message: "Recipient not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipient:", error);
    return NextResponse.json({ message: "Error deleting recipient" }, { status: 500 });
  }
};
