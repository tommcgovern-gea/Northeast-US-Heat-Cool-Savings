import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { verifyToken, TokenPayload, canAccessBuilding, verifyReportLinkToken } from '@/lib/auth';
import { sql, toRows } from '@/lib/db/client';

/** Serves a private report PDF. Accepts session Bearer token or short-lived ?t= link token. */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ reportId: string }> }
) {
  try {
    const params = await props.params;
    const reportId = params.reportId;
    const linkToken = req.nextUrl.searchParams.get('t');
    const authHeader = req.headers.get('authorization');
    const sessionToken = authHeader?.split(' ')[1];

    let allowed = false;
    if (linkToken) {
      const payload = verifyReportLinkToken(linkToken);
      if (payload && payload.reportId === reportId) allowed = true;
    }
    if (!allowed && sessionToken) {
      const user = verifyToken(sessionToken) as TokenPayload | null;
      if (!user) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }
      const rows = await sql`
        SELECT id, building_id, pdf_url FROM energy_reports WHERE id = ${reportId} LIMIT 1
      `;
      const report = toRows(rows)[0];
      if (!report?.pdf_url) {
        return NextResponse.json({ message: 'Report not found' }, { status: 404 });
      }
      if (user.role === 'BUILDING' && !canAccessBuilding(user, report.building_id)) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      allowed = true;
    }
    if (!allowed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rows = await sql`
      SELECT id, building_id, pdf_url FROM energy_reports WHERE id = ${reportId} LIMIT 1
    `;
    const report = toRows(rows)[0];
    if (!report?.pdf_url) {
      return NextResponse.json({ message: 'Report not found' }, { status: 404 });
    }

    const result = await get(report.pdf_url, { access: 'private' });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ message: 'Report file not found' }, { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        'Content-Type': result.blob.contentType || 'application/pdf',
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error: any) {
    console.error('Error serving report PDF:', error);
    return NextResponse.json(
      { message: 'Error loading report' },
      { status: 500 }
    );
  }
}
