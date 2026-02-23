import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
export type UserRole = "ADMIN" | "STAFF" | "BUILDING";

export interface TokenPayload {
  userId: string;
  role: UserRole;
  buildingId?: string | null;
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