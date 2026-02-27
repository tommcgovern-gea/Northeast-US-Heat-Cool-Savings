import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { db } from "@/lib/db/client";
import bcrypt from "bcryptjs";

export const login = async (req: Request) => {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await db.getUserByEmail(email);

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      buildingId: user.building_id || null,
    });

    return NextResponse.json({
      token,
      role: user.role,
      buildingId: user.building_id || null,
      email: user.email,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
};
