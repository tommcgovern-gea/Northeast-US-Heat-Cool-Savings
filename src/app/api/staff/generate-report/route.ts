import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';
import { reportService } from '@/lib/services/reportService';
import { sql } from '@/lib/db/client';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const user = verifyToken(token) as TokenPayload;

    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { buildingId, month, year, emailTo } = body;

    if (!buildingId || !month || !year) {
      return NextResponse.json(
        { message: 'buildingId, month, and year are required' },
        { status: 400 }
      );
    }

    if (month < 1 || month > 12) {
      return NextResponse.json(
        { message: 'Month must be between 1 and 12' },
        { status: 400 }
      );
    }

    const reportData = await reportService.generateMonthlyReport(buildingId, month, year);

    if (!reportData) {
      return NextResponse.json(
        { message: 'No data available for this period' },
        { status: 404 }
      );
    }

    const pdfUrl = await reportService.generatePDF(reportData);
    const reportId = await reportService.saveReport(buildingId, month, year, reportData, pdfUrl);

    let emailSent = false;
    if (emailTo) {
      emailSent = await reportService.sendReportEmail(reportData, pdfUrl, emailTo);
      
      if (emailSent) {
        await sql`
          UPDATE energy_reports
          SET emailed_to = array_append(emailed_to, ${emailTo})
          WHERE id = ${reportId}
        `;
      }
    }

    return NextResponse.json({
      reportId,
      buildingId,
      buildingName: reportData.buildingName,
      month,
      year,
      pdfUrl,
      emailSent,
      comparison: reportData.comparison,
    });
  } catch (error: any) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { message: 'Error generating report', error: error.message },
      { status: 500 }
    );
  }
}
