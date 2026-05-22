import { NextResponse } from "next/server";

/** Building onboarding no longer lists preloaded cities. */
export async function GET() {
  return NextResponse.json({ message: "Not available" }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({ message: "Not available" }, { status: 404 });
}
