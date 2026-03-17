import { NextRequest, NextResponse } from "next/server";
import { verifyUploadLinkToken } from "@/lib/auth";
import { sql, toRows } from "@/lib/db/client";

/** Serves an uploaded file by redirecting to its blob URL. Uses short-lived ?t= link token. */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await props.params;
    const linkToken = req.nextUrl.searchParams.get("t");

    if (!linkToken) {
      return NextResponse.json({ message: "Missing token" }, { status: 400 });
    }

    const payload = verifyUploadLinkToken(linkToken);
    if (!payload || payload.uploadId !== uploadId) {
      return NextResponse.json({ message: "Invalid or expired link" }, { status: 403 });
    }

    const rows = await sql`
      SELECT file_url
      FROM photo_uploads
      WHERE id = ${uploadId}
      LIMIT 1
    `;
    const upload = toRows(rows)[0];

    if (!upload?.file_url) {
      return NextResponse.json({ message: "Upload not found" }, { status: 404 });
    }

    // Just redirect the browser to the stored blob URL
    return NextResponse.redirect(upload.file_url);
  } catch (error) {
    console.error("Error loading upload file:", error);
    return NextResponse.json(
      { message: "Error loading file" },
      { status: 500 }
    );
  }
}
