import { NextRequest, NextResponse } from "next/server";
import { db, sql } from "@/lib/db/client";
import { verifyToken, TokenPayload } from "@/lib/auth";
import { complianceService } from "@/lib/services/complianceService";

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

    let buildings: any[];

    if (user.role === "BUILDING" && user.buildingId) {
      buildings = await db.getBuildings(undefined, user.buildingId);
    } else if (user.role === "ADMIN" || user.role === "STAFF") {
      buildings = await db.getBuildings();
    } else {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const list = Array.isArray(buildings) ? buildings : [];
    const responseData = await Promise.all(
      list.map(async (b) => {
        const recipients = await db.getRecipients(b.id);
        let complianceRate: number | null = null;
        try {
          complianceRate = await complianceService.getBuildingComplianceRate(b.id, 30);
        } catch {
          // Tables may not exist yet
        }
        const city = await db.getCityById(b.city_id);

        return {
          id: b.id,
          name: b.name,
          address: b.address,
          cityId: b.city_id,
          cityName: city?.name || 'Unknown',
          isActive: b.is_active,
          isPaused: b.is_paused,
          recipientCount: recipients.length,
          complianceRate: complianceRate != null ? Math.round(complianceRate * 10) / 10 : null,
        };
      })
    );

    return NextResponse.json(responseData);
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
    
    // validate required fields
    if (!body.name || !body.address || !body.cityId) {
        return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const newBuilding = await db.createBuilding({
      city_id: body.cityId,
      name: body.name,
      address: body.address,
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

    if (user.role === "BUILDING" && user.buildingId !== building.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const city = await db.getCityById(building.city_id);
    const recipients = await db.getRecipients(building.id);
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

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.isPaused !== undefined) updateData.is_paused = body.isPaused;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(updateData).forEach(([key, value]) => {
      updates.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    });

    if (updates.length === 0) {
      const buildings = await db.getBuildings(undefined, id);
      if (buildings.length === 0) {
        return NextResponse.json({ message: "Building not found" }, { status: 404 });
      }
      const building = buildings[0];
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
