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

/**
 * Verifies JWT and confirms the user is still active in the DB.
 * Use in place of verifyToken for routes where session invalidation matters.
 */
export async function verifyTokenActive(
  token: string,
  getUserById: (id: string) => Promise<{ is_active?: boolean | null } | null>
): Promise<TokenPayload | null> {
  const payload = verifyToken(token);
  if (!payload) return null;
  const dbUser = await getUserById(payload.userId);
  if (!dbUser || dbUser.is_active === false) return null;
  return payload;
}

export function canAccessBuilding(user: TokenPayload, buildingId: string): boolean {
  if (user.role !== "BUILDING") return true;
  if (user.buildingId === buildingId) return true;
  if (user.buildingIds && user.buildingIds.includes(buildingId)) return true;
  return false;
}

/** Short-lived token for viewing a report PDF (e.g. open in new tab). */
export function signReportLinkToken(reportId: string): string {
  return jwt.sign(
    { reportId, purpose: "report-pdf" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

export function verifyReportLinkToken(token: string): { reportId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { reportId?: string; purpose?: string };
    if (payload?.purpose === "report-pdf" && payload?.reportId) return { reportId: payload.reportId };
    return null;
  } catch {
    return null;
  }
}

/** Short-lived token for viewing an uploaded file (e.g. open in new tab). */
export function signUploadLinkToken(uploadId: string): string {
  return jwt.sign(
    { uploadId, purpose: "upload-file" },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

export function verifyUploadLinkToken(token: string): { uploadId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { uploadId?: string; purpose?: string };
    if (payload?.purpose === "upload-file" && payload?.uploadId) return { uploadId: payload.uploadId };
    return null;
  } catch {
    return null;
  }
}

/** Short-lived token for password reset links. */
export function signPasswordResetToken(userId: string, passwordHash: string): string {
  return jwt.sign(
    { userId, purpose: "password-reset", ph: passwordHash.slice(0, 12) },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

export function verifyPasswordResetToken(token: string): { userId: string; ph: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: string; purpose?: string; ph?: string };
    if (payload?.purpose === "password-reset" && payload?.userId && payload?.ph) {
      return { userId: payload.userId, ph: payload.ph };
    }
    return null;
  } catch {
    return null;
  }
}
