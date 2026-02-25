import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { sql } from '@neondatabase/serverless';
import crypto from 'crypto';

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

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { message: 'File must be an image' },
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
      SELECT m.*, r.building_id 
      FROM messages m
      JOIN recipients r ON r.id = m.recipient_id
      WHERE m.id = ${token}
        OR m.content LIKE ${`%token: ${token}%`}
      LIMIT 1
    `;

    if (messageResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    const message = messageResult.rows[0];
    const buildingId = message.building_id;
    const recipientId = message.recipient_id;

    const fileName = `${crypto.randomUUID()}-${file.name}`;
    const blob = await put(fileName, file, {
      access: 'public',
      contentType: file.type,
    });

    const uploadId = crypto.randomUUID();
    await sql`
      INSERT INTO photo_uploads (
        id, message_id, building_id, recipient_id,
        file_url, file_name, uploaded_at, is_compliant, compliance_window_hours
      ) VALUES (
        ${uploadId},
        ${message.id},
        ${buildingId},
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
        ? 'Photo uploaded successfully and is compliant'
        : 'Photo uploaded but outside compliance window',
    });
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { message: 'Error uploading photo', error: error.message },
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
    SELECT m.*, r.building_id, b.name as building_name
    FROM messages m
    JOIN recipients r ON r.id = m.recipient_id
    JOIN buildings b ON b.id = r.building_id
    WHERE m.id = ${token}
    LIMIT 1
  `;

  if (messageResult.rows.length === 0) {
    return NextResponse.json(
      { message: 'Invalid or expired token' },
      { status: 404 }
    );
  }

  const message = messageResult.rows[0];
  
  return NextResponse.json({
    valid: true,
    buildingName: message.building_name,
    messageType: message.message_type,
    sentAt: message.sent_at || message.created_at,
  });
}
