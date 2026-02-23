import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { mockUsers } from "@/lib/mock-users";

export const login = async (req: Request) => {
  try {
    const body = await req.json();
    const { email, password } = body;

    const user = mockUsers.find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      buildingId: user.buildingId || null,
    });

    return NextResponse.json({
      token,
      role: user.role,
      buildingId: user.buildingId || null,
    });
  } catch {
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    );
  }
};
