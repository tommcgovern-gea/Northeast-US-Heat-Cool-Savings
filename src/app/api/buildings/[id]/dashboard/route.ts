import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { db } from '@/lib/db/client';
import { complianceService } from '@/lib/services/complianceService';
import { sql } from '@neondatabase/serverless';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token) as TokenPayload;

    if (!user) {
      return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
    }

    const building = await db.getBuildings(undefined, params.id);
    
    if (building.length === 0) {
      return NextResponse.json({ message: 'Building not found' }, { status: 404 });
    }

    const buildingData = building[0];

    if (user.role === 'BUILDING' && user.buildingId !== params.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const days = parseInt(req.nextUrl.searchParams.get('days') || '30');

    const complianceRate = await complianceService.getBuildingComplianceRate(params.id, days);

    const messagesResult = await sql`
      SELECT 
        m.*,
        COUNT(p.id) as upload_count,
        MAX(p.uploaded_at) as last_upload
      FROM messages m
      LEFT JOIN photo_uploads p ON p.message_id = m.id
      WHERE m.building_id = ${params.id}
        AND m.message_type IN ('alert', 'daily_summary')
        AND m.sent_at >= NOW() - INTERVAL '${days} days'
      GROUP BY m.id
      ORDER BY m.sent_at DESC
      LIMIT 50
    `;

    const alertsResult = await sql`
      SELECT COUNT(*) as total_alerts
      FROM messages
      WHERE building_id = ${params.id}
        AND message_type = 'alert'
        AND sent_at >= NOW() - INTERVAL '${days} days'
        AND delivered = true
    `;

    const recipientsResult = await sql`
      SELECT COUNT(*) as total_recipients
      FROM recipients
      WHERE building_id = ${params.id}
        AND is_active = true
    `;

    const recentUploadsResult = await sql`
      SELECT p.*, m.message_type, m.sent_at
      FROM photo_uploads p
      JOIN messages m ON m.id = p.message_id
      WHERE p.building_id = ${params.id}
      ORDER BY p.uploaded_at DESC
      LIMIT 10
    `;

    const energyReportResult = await sql`
      SELECT * FROM energy_reports
      WHERE building_id = ${params.id}
      ORDER BY year DESC, month DESC
      LIMIT 1
    `;

    const latestEnergyReport = energyReportResult.rows.length > 0 ? {
      month: energyReportResult.rows[0].month,
      year: energyReportResult.rows[0].year,
      savingsPercentage: Number(energyReportResult.rows[0].savings_percentage),
      savingsKBTU: Number(energyReportResult.rows[0].savings_kbtu),
      pdfUrl: energyReportResult.rows[0].pdf_url,
    } : null;

    return NextResponse.json({
      building: {
        id: buildingData.id,
        name: buildingData.name,
        address: buildingData.address,
        isActive: buildingData.is_active,
        isPaused: buildingData.is_paused,
        cityId: buildingData.city_id,
      },
      stats: {
        complianceRate: Math.round(complianceRate * 10) / 10,
        totalAlerts: parseInt(alertsResult.rows[0].total_alerts),
        totalRecipients: parseInt(recipientsResult.rows[0].total_recipients),
        days,
      },
      messages: messagesResult.rows.map(msg => ({
        id: msg.id,
        messageType: msg.message_type,
        sentAt: msg.sent_at,
        delivered: msg.delivered,
        deliveryStatus: msg.delivery_status,
        hasUpload: parseInt(msg.upload_count) > 0,
        lastUpload: msg.last_upload,
      })),
      recentUploads: recentUploadsResult.rows.map(upload => ({
        id: upload.id,
        fileName: upload.file_name,
        uploadedAt: upload.uploaded_at,
        isCompliant: upload.is_compliant,
        messageType: upload.message_type,
        sentAt: upload.sent_at,
      })),
      latestEnergyReport,
    });
  } catch (error) {
    console.error('Error fetching building dashboard:', error);
    return NextResponse.json(
      { message: 'Error fetching dashboard data' },
      { status: 500 }
    );
  }
}
