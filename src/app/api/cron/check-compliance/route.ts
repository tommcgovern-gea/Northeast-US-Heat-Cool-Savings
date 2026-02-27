import { NextRequest, NextResponse } from 'next/server';
import { complianceService } from '@/lib/services/complianceService';

const CRON_SECRET = process.env.CRON_SECRET;

function verifyCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret');
  return !!CRON_SECRET && secret === CRON_SECRET;
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const warningsSent = await complianceService.checkAndSendWarnings();

    return NextResponse.json({
      warningsSent,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error checking compliance:', error);
    return NextResponse.json(
      { message: 'Error checking compliance' },
      { status: 500 }
    );
  }
}
