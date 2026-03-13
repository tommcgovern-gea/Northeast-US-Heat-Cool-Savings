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
