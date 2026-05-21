import { NextResponse } from "next/server";

/** Building onboarding no longer lists preloaded buildings. */
export async function GET() {
  return NextResponse.json({ message: "Not available" }, { status: 404 });
}
