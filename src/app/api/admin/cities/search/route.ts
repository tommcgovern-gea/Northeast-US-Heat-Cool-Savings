import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload } from "@/lib/auth";
import { searchCitiesByName } from "@/lib/controllers/citiesController";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const user = verifyToken(token) as TokenPayload;
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const query = req.nextUrl.searchParams.get("q");
    if (!query || query.length < 1) {
      return NextResponse.json([]);
    }

    const suggestions = await searchCitiesByName(query);
    const seen = new Set<string>();
    const unique = suggestions.filter((s) => {
      const key = s.displayName || s.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json(unique);
  } catch (error) {
    console.error("Error searching cities:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
