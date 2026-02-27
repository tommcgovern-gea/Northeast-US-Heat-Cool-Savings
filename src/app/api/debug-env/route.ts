import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    hasUrl: !!process.env.POSTGRES_URL,
    urlStart: process.env.POSTGRES_URL ? process.env.POSTGRES_URL.substring(0, 10) : 'none'
  });
}
