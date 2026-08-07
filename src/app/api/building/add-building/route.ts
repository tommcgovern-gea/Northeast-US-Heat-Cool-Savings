import { NextRequest, NextResponse } from "next/server";
import { db, sql, toRows } from "@/lib/db/client";
import { verifyToken, signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
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
    const buildingName = String(body?.buildingName || "").trim();
    const buildingAddress = String(body?.buildingAddress || "").trim();
    const cityId = String(body?.cityId || "").trim();

    if (!buildingName || !buildingAddress || !cityId) {
      return NextResponse.json({ message: "Building name, address, and city are required" }, { status: 400 });
    }

    const dbUser = await db.getUserById(payload.userId);
    if (!dbUser || !dbUser.is_active) {
      return NextResponse.json({ message: "Account is inactive" }, { status: 403 });
    }

    const city = await db.getCityById(cityId);
    if (!city) {
      return NextResponse.json({ message: "City not found" }, { status: 400 });
    }

    const normalizedName = buildingName.trim().replace(/\s+/g, " ");
    const normalizedAddress = buildingAddress.trim().replace(/\s+/g, " ");

    const existingBuilding = await sql`
      SELECT id FROM buildings
      WHERE city_id = ${cityId}
        AND LOWER(REGEXP_REPLACE(BTRIM(name), '\\s+', ' ', 'g')) = LOWER(${normalizedName})
        AND LOWER(REGEXP_REPLACE(BTRIM(address), '\\s+', ' ', 'g')) = LOWER(${normalizedAddress})
      LIMIT 1
    `;
    const dupRow = toRows(existingBuilding)[0] as { id: string } | undefined;
    let buildingId: string;

    if (dupRow) {
      buildingId = dupRow.id;
    } else {
      const created = await db.createBuilding({
        city_id: cityId,
        name: normalizedName,
        address: normalizedAddress,
        is_active: true,
        is_paused: false,
      });
      buildingId = created.id;
    }

    const currentIds = ((dbUser.building_ids || []) as string[]).filter(Boolean);
    if (currentIds.includes(buildingId)) {
      return NextResponse.json({ message: "This building is already linked to your account" }, { status: 409 });
    }

    await db.addBuildingToUser(payload.userId, buildingId);

    await db.upsertRecipientForBuilding({
      buildingId,
      name: dbUser.name || normalizedName,
      email: dbUser.email,
      phone: dbUser.phone || null,
      preference: dbUser.preference || "email",
    });

    const updatedIds = [...currentIds, buildingId];
    const newToken = signToken({
      userId: payload.userId,
      role: "BUILDING",
      buildingId,
      buildingIds: updatedIds,
    });

    return NextResponse.json({
      success: true,
      token: newToken,
      building: {
        id: buildingId,
        name: normalizedName,
        address: normalizedAddress,
        cityName: city.name,
      },
      message: dupRow ? "Linked existing building to your account" : "New building added to your account",
    });
  } catch (error) {
    console.error("Error adding building:", error);
    return NextResponse.json({ message: "Error adding building" }, { status: 500 });
  }
}
