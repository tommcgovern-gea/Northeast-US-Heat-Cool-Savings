import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import {
  verifyUploadLinkToken,
  verifyToken,
  TokenPayload,
  canAccessBuilding,
} from "@/lib/auth";
import { sql, toRows } from "@/lib/db/client";

function contentTypeForFileName(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".xlsx")) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (lower.endsWith(".xls")) return "application/vnd.ms-excel";
  return "application/octet-stream";
}

/** Serves a private blob upload. Accepts session Bearer token or short-lived ?t= link token. */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ uploadId: string }> },
) {
  try {
    const { uploadId } = await props.params;
    const linkToken = req.nextUrl.searchParams.get("t");
    const sessionToken = req.headers.get("authorization")?.split(" ")[1];

    let allowed = false;
    if (linkToken) {
      const payload = verifyUploadLinkToken(linkToken);
      if (payload?.uploadId === uploadId) allowed = true;
    }

    const rows = await sql`
      SELECT id, building_id, file_url, file_name
      FROM photo_uploads
      WHERE id = ${uploadId}
      LIMIT 1
    `;
    const upload = toRows(rows)[0] as
      | {
          id: string;
          building_id: string;
          file_url: string;
          file_name: string;
        }
      | undefined;

    if (!upload?.file_url) {
      return NextResponse.json({ message: "Upload not found" }, { status: 404 });
    }

    if (!allowed && sessionToken) {
      const user = verifyToken(sessionToken) as TokenPayload | null;
      if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      if (user.role === "BUILDING" && !canAccessBuilding(user, upload.building_id)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
      allowed = true;
    }

    if (!allowed) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const result = await get(upload.file_url, { access: "private" });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ message: "File not found in storage" }, { status: 404 });
    }

    const contentType =
      result.blob.contentType || contentTypeForFileName(upload.file_name);
    const safeName = upload.file_name.replace(/[^\w.\- ]+/g, "_");

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Error loading upload file:", error);
    return NextResponse.json({ message: "Error loading file" }, { status: 500 });
  }
}
