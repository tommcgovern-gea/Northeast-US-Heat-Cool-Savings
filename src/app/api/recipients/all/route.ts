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

    const countResult = await sql`
      SELECT COUNT(*) AS total
      FROM (
        SELECT DISTINCT u.id
        FROM users u
        JOIN buildings b ON b.id = ANY(u.building_ids)
        WHERE u.role = 'BUILDING' AND u.building_ids IS NOT NULL
      ) sub
    `;
    const total = parseInt(String(toRows(countResult)[0]?.total ?? 0), 10);

    const result = await sql`
      SELECT u.id, u.name, u.email, u.phone, COALESCE(u.preference, 'email') AS preference, COALESCE(u.is_active, true) AS is_active
      FROM users u
      WHERE u.role = 'BUILDING'
        AND u.building_ids IS NOT NULL
      ORDER BY u.name
      LIMIT ${limit} OFFSET ${offset}
    `;

    const rows = toRows(result);

    return NextResponse.json({
      items: rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        preference: r.preference || "email",
        isActive: !!r.is_active,
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
