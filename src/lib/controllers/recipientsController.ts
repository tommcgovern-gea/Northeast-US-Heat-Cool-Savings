import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { verifyToken, TokenPayload, canAccessBuilding } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET /api/recipients?buildingId=xxx — returns BUILDING users only (users table).
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

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      if (user.role !== "BUILDING" || !canAccessBuilding(user, buildingId)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    const recipients = await db.getBuildingUsers(buildingId, true);
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

// POST /api/recipients  — body: { buildingId?, buildingIds?, name, email?, phone?, preference?, password? }
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

    const rawIds = Array.isArray(body.buildingIds) ? (body.buildingIds as string[]) : body.buildingId ? [String(body.buildingId)] : [];
    const buildingIds: string[] = [...new Set(rawIds)].filter(Boolean);
    if (buildingIds.length === 0) {
      return NextResponse.json({ message: "At least one building is required" }, { status: 400 });
    }

    for (const bid of buildingIds) {
      const buildings = await db.getBuildings(undefined, bid);
      if (buildings.length === 0) {
        return NextResponse.json({ message: `Building not found: ${bid}` }, { status: 404 });
      }
    }

    if (!body.name) {
      return NextResponse.json({ message: "name is required" }, { status: 400 });
    }

    if (!body.email && !body.phone) {
      return NextResponse.json({ message: "At least one of email or phone must be provided" }, { status: 400 });
    }

    if (body.password && !body.email) {
      return NextResponse.json({ message: "Email is required when setting building portal password" }, { status: 400 });
    }

    const email = body.email?.trim() || null;
    if (!email) {
      return NextResponse.json({ message: "Email is required to create a building user (portal login)" }, { status: 400 });
    }

    const existingUser = await db.getUserByEmail(email);

    let targetUser: any;

    if (existingUser && existingUser.role === "BUILDING") {
      for (const bid of buildingIds) {
        await db.addBuildingToUser(existingUser.id, bid);
      }
      targetUser = await db.updateUser(existingUser.id, {
        name: body.name,
        phone: body.phone || null,
        preference: body.preference || (body.email && body.phone ? "both" : "email"),
      }) || existingUser;
    } else if (existingUser) {
      return NextResponse.json({ message: "Email already used by an admin or staff account" }, { status: 400 });
    } else {
      const password_hash = body.password
        ? await bcrypt.hash(body.password, 10)
        : await bcrypt.hash(Math.random().toString(36).slice(2), 10);
      targetUser = await db.createUser({
        email,
        password_hash,
        role: "BUILDING",
        building_ids: buildingIds,
        name: body.name,
        phone: body.phone || null,
        preference: body.preference || (body.email && body.phone ? "both" : "email"),
        is_active: true,
      });
    }

    return NextResponse.json({
      id: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      phone: targetUser.phone,
      preference: targetUser.preference || "email",
      isActive: targetUser.is_active !== false,
      createdAt: targetUser.created_at,
      portalLoginCreated: !!body.password,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating recipient:", error);
    return NextResponse.json({ message: "Error creating recipient" }, { status: 500 });
  }
};

// GET /api/recipients/:id — returns BUILDING user details including buildingIds for edit form.
export const getRecipientById = async (req: NextRequest, recipientId: string) => {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token) as TokenPayload;

    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const u = await db.getUserById(recipientId);
    if (!u || u.role !== "BUILDING") return NextResponse.json({ message: "Recipient not found" }, { status: 404 });
    const raw = (u.building_ids && u.building_ids.length) ? (u.building_ids as string[]) : [];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const buildingIds = raw.filter((id) => typeof id === "string" && uuidRegex.test(id.trim()));
    return NextResponse.json({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      preference: u.preference || "email",
      isActive: u.is_active !== false,
      buildingIds,
    });
  } catch (error) {
    console.error("Error fetching recipient:", error);
    return NextResponse.json({ message: "Error fetching recipient" }, { status: 500 });
  }
};

// PUT /api/recipients/:id — body: { name?, email?, phone?, preference?, isActive?, buildingIds? }
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

    if (Array.isArray(body.buildingIds) && body.buildingIds.length > 0) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const raw = body.buildingIds as string[];
      const buildingIds = [...new Set(raw)].filter((id) => typeof id === "string" && id.trim().length > 0);
      const invalid = buildingIds.filter((id) => !uuidRegex.test(id));
      if (invalid.length > 0) {
        return NextResponse.json({ message: `Invalid building ID format: ${invalid[0]}` }, { status: 400 });
      }
      for (const bid of buildingIds) {
        const b = await db.getBuildings(undefined, bid);
        if (b.length === 0) {
          return NextResponse.json({ message: `Building not found: ${bid}` }, { status: 404 });
        }
      }
      updateData.building_ids = buildingIds;
    }

    const updated = await db.updateUser(recipientId, updateData);
    if (!updated) return NextResponse.json({ message: "Recipient not found" }, { status: 404 });
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
    const message = error instanceof Error ? error.message : "Error updating recipient";
    return NextResponse.json({ message }, { status: 500 });
  }
};

// DELETE /api/recipients/:id?buildingId=xxx — id is BUILDING user id. With buildingId: remove building from user; else delete user.
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

    const buildingId = req.nextUrl.searchParams.get("buildingId");

    if (buildingId) {
      const updated = await db.removeBuildingFromUser(recipientId, buildingId);
      if (!updated) return NextResponse.json({ message: "Recipient not found or building not in list" }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    const success = await db.deleteUser(recipientId);
    if (!success) return NextResponse.json({ message: "Recipient not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting recipient:", error);
    return NextResponse.json({ message: "Error deleting recipient" }, { status: 500 });
  }
};
