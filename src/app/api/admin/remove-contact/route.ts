import { NextRequest, NextResponse } from "next/server";
import { verifyTokenActive } from "@/lib/auth";
import { db, sql, toRows } from "@/lib/db/client";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload = await verifyTokenActive(authHeader.slice(7), db.getUserById);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const value = String(body?.emailOrPhone || "").trim().toLowerCase();
    if (!value) {
      return NextResponse.json({ message: "Email or phone is required" }, { status: 400 });
    }

    const isPhone = /^[\d\s\-().+]+$/.test(value);
    const searchPattern = `%${value}%`;

    let results: Array<{ buildingId: string; buildingName: string; userId: string; email: string | null; phone: string | null }> = [];

    if (isPhone) {
      const phoneClean = value.replace(/[\s\-().]/g, "");
      const phonePattern = `%${phoneClean}%`;
      const users = await sql`
        SELECT u.id AS user_id, u.email, u.phone, b.id AS building_id, b.name AS building_name
        FROM users u
        JOIN buildings b ON b.id = ANY(u.building_ids)
        WHERE u.role = 'BUILDING'
          AND (REPLACE(REPLACE(REPLACE(REPLACE(u.phone, ' ', ''), '-', ''), '(', ''), ')', '') LIKE ${phonePattern}
            OR u.phone LIKE ${searchPattern}
            OR u.email LIKE ${searchPattern})
        ORDER BY b.name
      `;
      results = toRows(users).map((r: any) => ({
        buildingId: r.building_id,
        buildingName: r.building_name,
        userId: r.user_id,
        email: r.email,
        phone: r.phone,
      }));
    } else {
      const users = await sql`
        SELECT u.id AS user_id, u.email, u.phone, b.id AS building_id, b.name AS building_name
        FROM users u
        JOIN buildings b ON b.id = ANY(u.building_ids)
        WHERE u.role = 'BUILDING'
          AND LOWER(u.email) LIKE ${searchPattern}
        ORDER BY b.name
      `;
      results = toRows(users).map((r: any) => ({
        buildingId: r.building_id,
        buildingName: r.building_name,
        userId: r.user_id,
        email: r.email,
        phone: r.phone,
      }));
    }

    if (body.confirm) {
      if (results.length === 0) {
        return NextResponse.json({ message: "No matching contacts found" }, { status: 404 });
      }

      const userIds = [...new Set(results.map((r) => r.userId))];
      for (const uid of userIds) {
        await db.updateUser(uid, { is_active: false });
      }

      const buildingIds = [...new Set(results.map((r) => r.buildingId))];
      for (const bid of buildingIds) {
        const buildingRecipients = await db.getRecipients(bid, true);
        for (const r of buildingRecipients) {
          const emailMatch = r.email && value.includes(r.email.toLowerCase());
          const phoneMatch = r.phone && r.phone.replace(/[\s\-().]/g, "").includes(value.replace(/[\s\-().]/g, ""));
          if (emailMatch || phoneMatch) {
            await db.updateRecipient(r.id, { is_active: false });
          }
        }
      }

      return NextResponse.json({
        success: true,
        removedFromBuildings: results.length,
        message: `Removed from ${[...new Set(results.map(r => r.buildingName))].join(", ")}`,
      });
    }

    const grouped = new Map<string, typeof results>();
    for (const r of results) {
      const key = `${r.email}|${r.phone}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(r);
    }

    const matches = Array.from(grouped.entries()).map(([key, entries]) => ({
      email: entries[0]?.email || null,
      phone: entries[0]?.phone || null,
      buildings: entries.map((e) => ({ id: e.buildingId, name: e.buildingName })),
      userId: entries[0]?.userId,
    }));

    return NextResponse.json({
      found: matches.length > 0,
      matches,
      totalBuildings: results.length,
    });
  } catch (error) {
    console.error("Error removing contact:", error);
    return NextResponse.json({ message: "Error removing contact" }, { status: 500 });
  }
}
