import { NextRequest, NextResponse } from "next/server";
import { verifyToken, TokenPayload, canAccessBuilding, signUploadLinkToken } from "@/lib/auth";
import { sql, toRows } from "@/lib/db/client";

/** Returns a short-lived URL to view the uploaded file (for opening in new tab). */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await props.params;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token) as TokenPayload | null;
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const rows = await sql`
      SELECT id, building_id FROM photo_uploads WHERE id = ${uploadId} LIMIT 1
    `;
    const upload = toRows(rows)[0];
    if (!upload) {
      return NextResponse.json({ message: "Upload not found" }, { status: 404 });
    }
    if (user.role === "BUILDING" && !canAccessBuilding(user, upload.building_id)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const linkToken = signUploadLinkToken(uploadId);
    const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    const url = `${base}/api/photo-uploads/${uploadId}/file?t=${linkToken}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Error creating upload file token:", error);
    return NextResponse.json(
      { message: "Error creating link" },
      { status: 500 }
    );
  }
}
