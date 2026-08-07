import { NextRequest, NextResponse } from "next/server";
import { verifyOnboardingToken } from "@/lib/auth";
import { checkVerification } from "@/lib/services/smsService";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const session = verifyOnboardingToken(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!phone || !code) {
      return NextResponse.json(
        { error: "Phone and verification code are required" },
        { status: 400 }
      );
    }

    const result = await checkVerification(phone, code);

    if (!result.success) {
      return NextResponse.json(
        { ok: false, verified: false, error: result.error || "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, verified: true });
  } catch (error) {
    console.error("Error verifying code:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
