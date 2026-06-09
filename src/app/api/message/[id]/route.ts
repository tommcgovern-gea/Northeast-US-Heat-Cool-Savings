import { NextRequest, NextResponse } from "next/server";
import { sql, toRows } from "@/lib/db/client";
import {
  extractUploadTokenFromUrl,
  parseMessagePlainText,
} from "@/lib/messageContent";
import { uploadPageUrl } from "@/lib/smsBody";

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await props.params;

    const messageResult = await sql`
      SELECT m.*, b.name AS building_name
      FROM messages m
      LEFT JOIN buildings b ON b.id = m.building_id
      WHERE m.id = ${id}
      LIMIT 1
    `;

    const rows = toRows(messageResult);
    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Message not found" },
        { status: 404 },
      );
    }

    const message = rows[0];
    const parsed = parseMessagePlainText(message.content || "");
    const tokenFromUrl = extractUploadTokenFromUrl(parsed.uploadUrl);
    const uploadToken = tokenFromUrl || message.id;
    const uploadUrl = parsed.uploadUrl || uploadPageUrl(uploadToken);

    return NextResponse.json({
      valid: true,
      content: message.content,
      body: parsed.body,
      uploadHeading: parsed.uploadHeading,
      messageType: message.message_type,
      buildingName: message.building_name || "Building",
      sentAt: message.sent_at || message.created_at,
      uploadUrl,
      uploadToken,
    });
  } catch (error: unknown) {
    console.error("Error loading message view:", error);
    return NextResponse.json(
      {
        message: "Error loading message",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
