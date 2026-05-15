import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { signOnboardingToken } from "@/lib/auth";

export async function verifyAccessCode(req: Request) {
  try {
    const body = await req.json();
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!code) {
      return NextResponse.json(
        { message: "Access code is required" },
        { status: 400 },
      );
    }

    const match = await db.findUnusedAccessCode(code);
    if (!match) {
      return NextResponse.json(
        { message: "Invalid or already used access code." },
        { status: 401 },
      );
    }

    const onboardingToken = signOnboardingToken(match.id);
    return NextResponse.json({ ok: true, onboardingToken, accessCodeId: match.id });
  } catch (error) {
    console.error("Access code verification error:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 },
    );
  }
}
