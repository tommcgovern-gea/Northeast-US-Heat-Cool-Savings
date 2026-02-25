import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload, UserRole } from "@/lib/auth";
import { mockUsers } from "@/lib/mock-users";
import { mockBuildings } from "@/lib/mock-buildings";

/* ─────────── helper: extract & verify admin token ─────────── */
function authenticateAdmin(req: NextRequest): {
  user?: TokenPayload;
  errorResponse?: NextResponse;
} {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return {
      errorResponse: NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.split(" ")[1];
  const user = verifyToken(token) as TokenPayload;

  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { message: "Invalid token" },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      errorResponse: NextResponse.json(
        { message: "Forbidden – Admin only" },
        { status: 403 }
      ),
    };
  }

  return { user };
}

/* ═══════════════════════════════════════════════════════════════
   GET /api/users   –  list all users (Admin only)
   ═══════════════════════════════════════════════════════════════ */
export const getUsers = async (req: NextRequest) => {
  try {
    const { user, errorResponse } = authenticateAdmin(req);
    if (errorResponse) return errorResponse;

    const responseData = mockUsers.map((u) => {
      const building = u.buildingId
        ? mockBuildings.find((b) => b.id === u.buildingId)
        : undefined;

      return {
        id: u.id,
        email: u.email,
        role: u.role,
        buildingId: u.buildingId ?? null,
        buildingName: building?.name ?? null,
        createdAt: u.createdAt,
      };
    });

    return NextResponse.json(responseData);
  } catch {
    return NextResponse.json(
      { message: "Error fetching users" },
      { status: 500 }
    );
  }
};

/* ═══════════════════════════════════════════════════════════════
   POST /api/users  –  create a new user (Admin only)
   Body: { email, password, role, buildingId? }
   ═══════════════════════════════════════════════════════════════ */
export const createUser = async (req: NextRequest) => {
  try {
    const { user, errorResponse } = authenticateAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { email, password, role, buildingId } = body as {
      email?: string;
      password?: string;
      role?: UserRole;
      buildingId?: string;
    };

    // --- validation ---
    if (!email || !password || !role) {
      return NextResponse.json(
        { message: "Missing required fields: email, password, role" },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = ["ADMIN", "STAFF", "BUILDING"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { message: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // buildingId is required when role is BUILDING
    if (role === "BUILDING" && !buildingId) {
      return NextResponse.json(
        { message: "buildingId is required when role is BUILDING" },
        { status: 400 }
      );
    }

    // check for duplicate email
    if (mockUsers.find((u) => u.email === email)) {
      return NextResponse.json(
        { message: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // validate buildingId exists if provided
    if (buildingId && !mockBuildings.find((b) => b.id === buildingId)) {
      return NextResponse.json(
        { message: "Building not found" },
        { status: 404 }
      );
    }

    // --- create user (password "hashed" server-side, mock) ---
    const newUser = {
      id: Date.now().toString(),
      email,
      password,                        // In production: bcrypt.hash(password)
      role,
      buildingId: buildingId ?? undefined,
      buildingName: buildingId
        ? mockBuildings.find((b) => b.id === buildingId)?.name
        : undefined,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    mockUsers.push(newUser);

    return NextResponse.json(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        buildingId: newUser.buildingId ?? null,
        createdAt: newUser.createdAt,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { message: "Error creating user" },
      { status: 500 }
    );
  }
};

/* ═══════════════════════════════════════════════════════════════
   PUT /api/users/:id  –  update user or reset password (Admin only)
   Body: { email?, password?, role?, buildingId?, isActive? }
   ═══════════════════════════════════════════════════════════════ */
export const updateUser = async (req: NextRequest, id: string) => {
  try {
    const { user, errorResponse } = authenticateAdmin(req);
    if (errorResponse) return errorResponse;

    const targetUser = mockUsers.find((u) => u.id === id);
    if (!targetUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { email, password, role, buildingId, isActive } = body as {
      email?: string;
      password?: string;
      role?: UserRole;
      buildingId?: string;
      isActive?: boolean;
    };

    // validate role if provided
    if (role) {
      const validRoles: UserRole[] = ["ADMIN", "STAFF", "BUILDING"];
      if (!validRoles.includes(role)) {
        return NextResponse.json(
          { message: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // If changing to BUILDING role, buildingId must be present
    const effectiveRole = role ?? targetUser.role;
    if (effectiveRole === "BUILDING") {
      const effectiveBuildingId = buildingId ?? targetUser.buildingId;
      if (!effectiveBuildingId) {
        return NextResponse.json(
          { message: "buildingId is required when role is BUILDING" },
          { status: 400 }
        );
      }
    }

    // check duplicate email (excluding self)
    if (email && mockUsers.find((u) => u.email === email && u.id !== id)) {
      return NextResponse.json(
        { message: "A user with this email already exists" },
        { status: 409 }
      );
    }

    // validate buildingId if provided
    if (buildingId && !mockBuildings.find((b) => b.id === buildingId)) {
      return NextResponse.json(
        { message: "Building not found" },
        { status: 404 }
      );
    }

    // --- apply updates ---
    if (email !== undefined) targetUser.email = email;
    if (password !== undefined) targetUser.password = password; // In production: bcrypt
    if (role !== undefined) targetUser.role = role;
    if (buildingId !== undefined) {
      targetUser.buildingId = buildingId;
      targetUser.buildingName =
        mockBuildings.find((b) => b.id === buildingId)?.name ?? undefined;
    }
    if (isActive !== undefined) targetUser.isActive = isActive;
    targetUser.updatedAt = new Date().toISOString();

    return NextResponse.json({
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      buildingId: targetUser.buildingId ?? null,
      updatedAt: targetUser.updatedAt,
    });
  } catch {
    return NextResponse.json(
      { message: "Error updating user" },
      { status: 500 }
    );
  }
};
