import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/client";
import { sendEmail } from "@/lib/services/emailService";
import { signPasswordResetToken, verifyPasswordResetToken } from "@/lib/auth";

function getBaseUrl(req: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) return envUrl.replace(/\/$/, "");
  const origin = req.headers.get("origin");
  if (origin) return origin.replace(/\/$/, "");
  return "http://localhost:3000";
}

export async function requestPasswordReset(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const genericResponse = {
      message:
        "If an account with that email exists, a password reset link has been sent.",
    };

    if (!email) {
      return NextResponse.json(genericResponse);
    }

    const user = await db.getUserByEmail(email);
    if (!user || !user.password_hash) {
      return NextResponse.json(genericResponse);
    }

    const token = signPasswordResetToken(user.id, user.password_hash);
    const resetUrl = `${getBaseUrl(req)}/reset-password?token=${encodeURIComponent(token)}`;

    await sendEmail({
      to: user.email,
      subject: "Reset your password",
      text: `Use this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
      html: `<p>Use this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`,
    });

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return NextResponse.json(
      { message: "Unable to process password reset request." },
      { status: 500 },
    );
  }
}

export async function resetPassword(req: Request) {
  try {
    const body = await req.json();
    const token = String(body?.token || "");
    const password = String(body?.password || "");

    if (!token || !password) {
      return NextResponse.json(
        { message: "Token and password are required." },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    const payload = verifyPasswordResetToken(token);
    if (!payload) {
      return NextResponse.json({ message: "Invalid or expired reset link." }, { status: 400 });
    }

    const user = await db.getUserById(payload.userId);
    if (!user || !user.password_hash || user.password_hash.slice(0, 12) !== payload.ph) {
      return NextResponse.json({ message: "Invalid or expired reset link." }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    await db.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [
      password_hash,
      user.id,
    ]);

    return NextResponse.json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json({ message: "Unable to reset password." }, { status: 500 });
  }
}
