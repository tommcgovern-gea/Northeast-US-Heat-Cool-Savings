import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload, canAccessBuilding, signReportLinkToken } from '@/lib/auth';
import { sql, toRows } from '@/lib/db/client';

/** Returns a short-lived token to open the report PDF in a new tab. */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ reportId: string }> }
) {
  try {
    const params = await props.params;
    const reportId = params.reportId;

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const user = verifyToken(token) as TokenPayload | null;
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rows = await sql`
      SELECT id, building_id FROM energy_reports WHERE id = ${reportId} LIMIT 1
    `;
    const report = toRows(rows)[0];
    if (!report) {
      return NextResponse.json({ message: 'Report not found' }, { status: 404 });
    }

    if (user.role === 'BUILDING' && !canAccessBuilding(user, report.building_id)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const linkToken = signReportLinkToken(reportId);
    return NextResponse.json({ token: linkToken });
  } catch (error: any) {
    console.error('Error generating report link token:', error);
    return NextResponse.json(
      { message: 'Error generating link' },
      { status: 500 }
    );
  }
}
