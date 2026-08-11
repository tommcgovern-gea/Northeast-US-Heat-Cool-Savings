import { NextRequest, NextResponse } from "next/server";
import { sql, toRows } from "@/lib/db/client";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(authHeader.slice(7));
    if (!payload || (payload.role !== "ADMIN" && payload.role !== "STAFF")) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "10", 10)));
    const offset = (page - 1) * limit;

    const userRows = toRows(await sql`
      SELECT id, name, email, phone, COALESCE(preference, 'email') AS preference,
             COALESCE(is_active, true) AS is_active, building_ids
      FROM users
      WHERE role = 'BUILDING' AND building_ids IS NOT NULL
    `);

    const recipientRows = toRows(await sql`
      SELECT DISTINCT ON (LOWER(email))
        id, name, email, phone, COALESCE(preference, 'email') AS preference,
        COALESCE(is_active, true) AS is_active
      FROM recipients
      ORDER BY LOWER(email), created_at DESC
    `);

    const emailMap = new Map<string, any>();

    for (const u of userRows) {
      const email = ((u as any).email || "").toLowerCase();
      emailMap.set(email, {
        id: (u as any).id,
        name: (u as any).name,
        email,
        phone: (u as any).phone,
        preference: (u as any).preference,
        isActive: !!(u as any).is_active,
        buildingIds: (u as any).building_ids || [],
      });
    }

    for (const r of recipientRows) {
      const email = ((r as any).email || "").toLowerCase();
      if (emailMap.has(email)) {
        emailMap.get(email).isActive = !!(r as any).is_active;
      } else {
        emailMap.set(email, {
          id: (r as any).id,
          name: (r as any).name,
          email,
          phone: (r as any).phone,
          preference: (r as any).preference,
          isActive: !!(r as any).is_active,
          buildingIds: [],
        });
      }
    }

    const allItems = Array.from(emailMap.values());
    allItems.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    const total = allItems.length;
    const paginatedItems = allItems.slice(offset, offset + limit);

    const buildingIds = new Set<string>();
    for (const item of paginatedItems) {
      for (const bid of item.buildingIds) {
        buildingIds.add(bid);
      }
    }

    const buildingDetails = new Map<string, { id: string; name: string; cityName: string }>();
    if (buildingIds.size > 0) {
      const bRows = toRows(await sql`
        SELECT b.id, b.name, c.name AS city_name
        FROM buildings b
        LEFT JOIN cities c ON c.id = b.city_id
        WHERE b.id = ANY(${Array.from(buildingIds)})
      `);
      for (const b of bRows) {
        buildingDetails.set((b as any).id, {
          id: (b as any).id,
          name: (b as any).name,
          cityName: (b as any).city_name,
        });
      }
    }

    const recipientBuildingIds = new Set<string>();
    const recipientEmails = paginatedItems.map((item: any) => item.email);
    if (recipientEmails.length > 0) {
      const rBuildings = toRows(await sql`
        SELECT DISTINCT LOWER(email) AS email, building_id
        FROM recipients
        WHERE LOWER(email) = ANY(${recipientEmails})
      `);
      for (const rb of rBuildings) {
        const email = (rb as any).email;
        const bid = (rb as any).building_id;
        recipientBuildingIds.add(bid);
        const item = paginatedItems.find((i: any) => i.email === email);
        if (item && !item.buildingIds.includes(bid)) {
          item.buildingIds.push(bid);
        }
      }
    }

    for (const bid of recipientBuildingIds) {
      if (!buildingDetails.has(bid)) {
        const bRows = toRows(await sql`
          SELECT b.id, b.name, c.name AS city_name
          FROM buildings b
          LEFT JOIN cities c ON c.id = b.city_id
          WHERE b.id = ${bid}
        `);
        if (bRows.length > 0) {
          buildingDetails.set((bRows[0] as any).id, {
            id: (bRows[0] as any).id,
            name: (bRows[0] as any).name,
            cityName: (bRows[0] as any).city_name,
          });
        }
      }
    }

    return NextResponse.json({
      items: paginatedItems.map((item: any) => ({
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        preference: item.preference || "email",
        isActive: !!item.isActive,
        buildings: item.buildingIds
          .map((bid: string) => buildingDetails.get(bid))
          .filter(Boolean),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching all recipients:", error);
    return NextResponse.json({ message: "Error fetching recipients" }, { status: 500 });
  }
}
