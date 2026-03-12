import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
export type UserRole = "ADMIN" | "STAFF" | "BUILDING";

export interface TokenPayload {
  userId: string;
  role: UserRole;
  /** @deprecated use buildingIds */
  buildingId?: string | null;
  buildingIds?: string[] | null;
}

export function signToken(payload: TokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export function canAccessBuilding(user: TokenPayload, buildingId: string): boolean {
  if (user.role !== "BUILDING") return true;
  if (user.buildingId === buildingId) return true;
  if (user.buildingIds && user.buildingIds.includes(buildingId)) return true;
  return false;
}