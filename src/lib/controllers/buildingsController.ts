import { NextRequest, NextResponse } from "next/server";
import { db, sql } from "@/lib/db/client";
import { verifyToken, TokenPayload, canAccessBuilding } from "@/lib/auth";
import { complianceService } from "@/lib/services/complianceService";

const normalizeBuildingText = (value: string): string =>
  value.trim().replace(/\s+/g, " ");

export const getBuildings = async (req: NextRequest) => {
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

    const dbUser = await db.getUserById(user.userId);
    if (!dbUser || dbUser.is_active === false) {
      return NextResponse.json({ message: "Account is inactive" }, { status: 403 });
    }

    let buildings: any[];
    let total = 0;

    // Pagination is opt-in via ?page= so existing callers (dropdowns/selectors
    // elsewhere) that need the full list keep getting a plain array back.
    const pageParam = req.nextUrl.searchParams.get("page");
    const paginate = pageParam !== null && (user.role === "ADMIN" || user.role === "STAFF");
    const page = Math.max(1, parseInt(pageParam || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "10", 10)));
    const offset = (page - 1) * limit;

    if (user.role === "ADMIN" || user.role === "STAFF") {
      if (paginate) {
        const totalRows = await sql`
          SELECT COUNT(*) FROM buildings b
          WHERE EXISTS (SELECT 1 FROM recipients r WHERE r.building_id = b.id)
        `;
        total = parseInt(String((totalRows as any[])[0].count), 10);
        buildings = await sql`
          SELECT b.* FROM buildings b
          WHERE EXISTS (SELECT 1 FROM recipients r WHERE r.building_id = b.id)
          ORDER BY b.name
          LIMIT ${limit} OFFSET ${offset}
        `;
      } else {
        buildings = await db.getBuildings();
      }
    } else if (user.role === "BUILDING") {
      const buildingIds = (user.buildingIds && user.buildingIds.length) ? user.buildingIds : (user.buildingId ? [user.buildingId] : []);
      if (buildingIds.length === 0) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
      buildings = [];
      for (const bid of buildingIds) {
        const b = await db.getBuildings(undefined, bid);
        if (b.length) buildings.push(b[0]);
      }
    } else {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const list = Array.isArray(buildings) ? buildings : [];
    const buildingIds = list.map((b) => b.id);
    const cityIds = Array.from(new Set(list.map((b) => b.city_id).filter(Boolean)));

    // Batched instead of N-per-building queries (was firing 3 concurrent DB
    // round trips per building via Promise.all, which starts failing once the
    // building count grows — see complianceService.getBuildingComplianceRatesBatch).
    // Recipient list/count comes from the `recipients` table (people who actually
    // receive alerts) rather than `users` (portal login accounts) — a building can
    // have real recipients with no portal login, and previously those buildings
    // were silently hidden from this list for ADMIN/STAFF.
    const [recipientRows, complianceMap, cityRows] = await Promise.all([
      buildingIds.length
        ? sql`
            SELECT building_id, name, email, phone, preference
            FROM recipients
            WHERE building_id = ANY(${buildingIds}) AND is_active = true
            ORDER BY name
          `
        : Promise.resolve([]),
      complianceService.getBuildingComplianceRatesBatch(buildingIds, 30).catch(() => new Map()),
      cityIds.length ? sql`SELECT id, name FROM cities WHERE id = ANY(${cityIds})` : Promise.resolve([]),
    ]);

    const recipientsByBuilding = new Map<string, { name: string; email: string | null }[]>();
    for (const row of recipientRows as any[]) {
      const arr = recipientsByBuilding.get(row.building_id) || [];
      arr.push({ name: row.name, email: row.email });
      recipientsByBuilding.set(row.building_id, arr);
    }
    const cityNameById = new Map<string, string>();
    for (const row of cityRows as any[]) {
      cityNameById.set(row.id, row.name);
    }

    const responseData = list.map((b) => {
      const complianceRate = complianceMap.get(b.id) ?? null;
      const recipients = recipientsByBuilding.get(b.id) || [];
      return {
        id: b.id,
        name: b.name,
        address: b.address,
        cityId: b.city_id,
        cityName: cityNameById.get(b.city_id) || 'Unknown',
        isActive: b.is_active,
        isPaused: b.is_paused,
        recipientCount: recipients.length,
        recipients,
        complianceRate: complianceRate != null ? Math.round(complianceRate * 10) / 10 : null,
      };
    });

    const filtered = (user.role === "ADMIN" || user.role === "STAFF") && !paginate
      ? responseData.filter((b) => b.recipientCount > 0)
      : responseData;

    if (paginate) {
      return NextResponse.json({
        items: filtered,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      });
    }
    return NextResponse.json(filtered);
  } catch (error) {
    console.error("Error fetching buildings:", error);
    return NextResponse.json({ message: "Error fetching buildings" }, { status: 500 });
  }
};

export const createBuilding = async (req: NextRequest) => {
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
    const normalizedName = typeof body.name === "string" ? normalizeBuildingText(body.name) : "";
    const normalizedAddress =
      typeof body.address === "string" ? normalizeBuildingText(body.address) : "";

    // validate required fields
    if (!normalizedName || !normalizedAddress || !body.cityId) {
        return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const existing = await sql`
      SELECT id FROM buildings
      WHERE city_id = ${body.cityId}
        AND LOWER(REGEXP_REPLACE(BTRIM(name), '\s+', ' ', 'g')) = LOWER(${normalizedName})
        AND LOWER(REGEXP_REPLACE(BTRIM(address), '\s+', ' ', 'g')) = LOWER(${normalizedAddress})
      LIMIT 1
    `;
    if (existing.length > 0) {
      return NextResponse.json(
        { message: "A building with this name and address already exists." },
        { status: 409 }
      );
    }

    const newBuilding = await db.createBuilding({
      city_id: body.cityId,
      name: normalizedName,
      address: normalizedAddress,
      is_active: true,
      is_paused: false,
    });

    return NextResponse.json({
        id: newBuilding.id,
        name: newBuilding.name,
        address: newBuilding.address,
        cityId: newBuilding.city_id,
        isActive: newBuilding.is_active,
        isPaused: newBuilding.is_paused,
        createdAt: newBuilding.created_at
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error creating building" }, { status: 500 });
  }
};

export const getBuildingById = async (req: NextRequest, id: string) => {
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

    const buildings = await db.getBuildings(undefined, id);
    
    if (buildings.length === 0) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    const building = buildings[0];

    if (user.role !== "ADMIN" && user.role !== "STAFF" && user.role === "BUILDING" && !canAccessBuilding(user, building.id)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const city = await db.getCityById(building.city_id);
    const recipients = await db.getBuildingUsers(building.id);
    const complianceRate = await complianceService.getBuildingComplianceRate(building.id, 30);

    return NextResponse.json({
        id: building.id,
        name: building.name,
        address: building.address,
        cityId: building.city_id,
        cityName: city?.name || 'Unknown',
        recipients: recipients.map(r => ({
          id: r.id,
          name: r.name,
          email: r.email,
          phone: r.phone,
          preference: r.preference,
          isActive: r.is_active,
        })),
        complianceRate: complianceRate != null ? Math.round(complianceRate * 10) / 10 : null,
        isPaused: building.is_paused,
        isActive: building.is_active,
    });
  } catch (error) {
    console.error("Error fetching building details:", error);
    return NextResponse.json({ message: "Error fetching building details" }, { status: 500 });
  }
};

export const updateBuilding = async (req: NextRequest, id: string) => {
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
    const { sql } = await import('@/lib/db/client');
    const buildings = await db.getBuildings(undefined, id);
    if (buildings.length === 0) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }
    const existingBuilding = buildings[0];

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = normalizeBuildingText(String(body.name));
    if (body.address !== undefined) updateData.address = normalizeBuildingText(String(body.address));
    if (body.isPaused !== undefined) updateData.is_paused = body.isPaused;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;

    const duplicateName =
      updateData.name !== undefined ? updateData.name : existingBuilding.name;
    const duplicateAddress =
      updateData.address !== undefined ? updateData.address : existingBuilding.address;
    const duplicate = await sql`
      SELECT id FROM buildings
      WHERE city_id = ${existingBuilding.city_id}
        AND id <> ${id}
        AND LOWER(REGEXP_REPLACE(BTRIM(name), '\s+', ' ', 'g')) = LOWER(${duplicateName})
        AND LOWER(REGEXP_REPLACE(BTRIM(address), '\s+', ' ', 'g')) = LOWER(${duplicateAddress})
      LIMIT 1
    `;
    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "A building with this name and address already exists." },
        { status: 409 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      updates.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    if (updates.length === 0) {
      const building = existingBuilding;
      return NextResponse.json({
        id: building.id,
        name: building.name,
        address: building.address,
        isPaused: building.is_paused,
        isActive: building.is_active,
      });
    }

    values.push(id);
    updates.push(`updated_at = NOW()`);
    const query = `UPDATE buildings SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    
const result = await (sql as any)(query, values);
    const rows = Array.isArray(result) ? result : (result?.rows ?? []);

    if (rows.length === 0) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    const building = rows[0];

    return NextResponse.json({
        id: building.id,
        name: building.name,
        address: building.address,
        isPaused: building.is_paused,
        isActive: building.is_active,
        updatedAt: building.updated_at
    });
  } catch (error) {
    console.error("Error updating building:", error);
    return NextResponse.json({ message: "Error updating building" }, { status: 500 });
  }
};

export const deleteBuilding = async (req: NextRequest, id: string) => {
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

    const result = await sql`DELETE FROM buildings WHERE id = ${id} RETURNING id`;

    if (result.length === 0) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting building:", error);
    return NextResponse.json({ message: "Error deleting building" }, { status: 500 });
  }
};
