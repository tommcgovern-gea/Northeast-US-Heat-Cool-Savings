#!/usr/bin/env npx tsx
/**
 * Local cron simulator for check-compliance.
 * Polls the API every 2 minutes (compliance window is 2 hours).
 *
 * Usage:
 *   Terminal 1: npm run dev
 *   Terminal 2: npm run cron:compliance
 *
 * Full test: 1) Dashboard → Daily Summary + Send Pending
 *            2) Wait 2 hours (no upload)
 *            3) Script will send warnings on next poll
 */
import 'dotenv/config';

const CRON_SECRET = process.env.CRON_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

async function runCheckCompliance(): Promise<void> {
  if (!CRON_SECRET) {
    console.error('CRON_SECRET not set in .env');
    process.exit(1);
  }

  try {
    const res = await fetch(`${APP_URL}/api/cron/check-compliance`, {
      method: 'POST',
      headers: { 'x-cron-secret': CRON_SECRET },
    });
    const data = await res.json();
    const time = new Date().toLocaleTimeString();
    if (res.ok) {
      console.log(`[${time}] OK – warningsSent: ${data.warningsSent ?? 0}`);
    } else {
      console.error(`[${time}] Failed (${res.status}):`, data.message || data);
    }
  } catch (err: any) {
    console.error(`[${new Date().toLocaleTimeString()}] Error:`, err.message);
  }
}

console.log(`Compliance cron simulator – calling ${APP_URL}/api/cron/check-compliance every ${INTERVAL_MS / 60000} min`);
console.log('Press Ctrl+C to stop.\n');

runCheckCompliance(); // Run immediately
const id = setInterval(runCheckCompliance, INTERVAL_MS);

process.on('SIGINT', () => {
  clearInterval(id);
  process.exit(0);
});
