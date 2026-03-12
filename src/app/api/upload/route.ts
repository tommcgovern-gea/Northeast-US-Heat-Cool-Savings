import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { sql, toRows } from '@/lib/db/client';
import crypto from 'crypto';

const ALLOWED_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|pdf|xlsx|xls)$/i;

function isAllowedFile(file: File): boolean {
  const mimeOk = file.type.startsWith('image/') ||
    file.type === 'application/pdf' ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.type === 'application/vnd.ms-excel';
  const extOk = ALLOWED_EXTENSIONS.test(file.name);
  return mimeOk || extOk;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get('token') as string;
    const file = formData.get('file') as File;

    if (!token || !file) {
      return NextResponse.json(
        { message: 'Token and file are required' },
        { status: 400 }
      );
    }

    if (!isAllowedFile(file)) {
      return NextResponse.json(
        { message: 'File must be a photo (image), BMS trending record (Excel), or PDF' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    const messageResult = await sql`
      SELECT * FROM messages
      WHERE id = ${token}
        OR content LIKE ${`%token: ${token}%`}
      LIMIT 1
    `;

    const msgRows = toRows(messageResult);
    if (msgRows.length === 0) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    const message = msgRows[0];
    const buildingId = message.building_id;
    const userId = message.user_id ?? null;
    const recipientId = message.recipient_id ?? null;

    const fileName = `${crypto.randomUUID()}-${file.name}`;
    const blob = await put(fileName, file, {
      access: 'public',
      contentType: file.type,
    });

    const uploadId = crypto.randomUUID();
    await sql`
      INSERT INTO photo_uploads (
        id, message_id, building_id, user_id, recipient_id,
        file_url, file_name, uploaded_at, is_compliant, compliance_window_hours
      ) VALUES (
        ${uploadId},
        ${message.id},
        ${buildingId},
        ${userId},
        ${recipientId},
        ${blob.url},
        ${file.name},
        NOW(),
        false,
        2
      )
    `;

    const sentAt = message.sent_at ? new Date(message.sent_at) : new Date(message.created_at);
    const uploadTime = new Date();
    const hoursSinceMessage = (uploadTime.getTime() - sentAt.getTime()) / (1000 * 60 * 60);
    const isCompliant = hoursSinceMessage <= 2;

    await sql`
      UPDATE photo_uploads 
      SET is_compliant = ${isCompliant}
      WHERE id = ${uploadId}
    `;

    return NextResponse.json({
      success: true,
      uploadId,
      isCompliant,
      hoursSinceMessage: Math.round(hoursSinceMessage * 10) / 10,
      message: isCompliant
        ? 'File uploaded successfully and is compliant'
        : 'File uploaded but outside compliance window',
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { message: 'Error uploading file', error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  
  if (!token) {
    return NextResponse.json(
      { message: 'Token is required' },
      { status: 400 }
    );
  }

  const messageResult = await sql`
    SELECT m.*, b.name as building_name
    FROM messages m
    LEFT JOIN buildings b ON b.id = m.building_id
    WHERE m.id = ${token}
    LIMIT 1
  `;

  const rows = toRows(messageResult);
  if (rows.length === 0) {
    return NextResponse.json(
      { message: 'Invalid or expired token' },
      { status: 404 }
    );
  }

  const message = rows[0];
  
  return NextResponse.json({
    valid: true,
    buildingName: message.building_name || 'Building',
    messageType: message.message_type,
    sentAt: message.sent_at || message.created_at,
  });
}
