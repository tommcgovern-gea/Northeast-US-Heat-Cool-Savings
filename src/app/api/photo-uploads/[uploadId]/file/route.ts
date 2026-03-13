import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import {
  verifyToken,
  TokenPayload,
  canAccessBuilding,
  verifyUploadLinkToken,
} from "@/lib/auth";
import { sql, toRows } from "@/lib/db/client";

/** Serves a private uploaded file. Accepts Bearer token or short-lived ?t= link token. */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await props.params;
    const linkToken = req.nextUrl.searchParams.get("t");
    const authHeader = req.headers.get("authorization");
    const sessionToken = authHeader?.split(" ")[1];

    let allowed = false;
    if (linkToken) {
      const payload = verifyUploadLinkToken(linkToken);
      if (payload && payload.uploadId === uploadId) allowed = true;
    }
    if (!allowed && sessionToken) {
      const user = verifyToken(sessionToken) as TokenPayload | null;
      if (!user) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }
      const rows = await sql`
        SELECT id, building_id, file_url, file_name FROM photo_uploads WHERE id = ${uploadId} LIMIT 1
      `;
      const upload = toRows(rows)[0];
      if (!upload?.file_url) {
        return NextResponse.json({ message: "Upload not found" }, { status: 404 });
      }
      if (user.role === "BUILDING" && !canAccessBuilding(user, upload.building_id)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
      allowed = true;
    }
    if (!allowed) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const rows = await sql`
      SELECT id, file_url, file_name FROM photo_uploads WHERE id = ${uploadId} LIMIT 1
    `;
    const upload = toRows(rows)[0];
    if (!upload?.file_url) {
      return NextResponse.json({ message: "Upload not found" }, { status: 404 });
    }

    const result = await get(upload.file_url, { access: "private" });
    if (!result || (result as any).statusCode !== 200 || !(result as any).stream) {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    const blob = result as { stream: ReadableStream; blob: { contentType?: string } };
    const contentType = blob.blob?.contentType || "application/octet-stream";
    const fileName = upload.file_name || "download";

    return new NextResponse(blob.stream, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${fileName.replace(/"/g, '\\"')}"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("Error serving upload file:", error);
    return NextResponse.json(
      { message: "Error loading file" },
      { status: 500 }
    );
  }
}
