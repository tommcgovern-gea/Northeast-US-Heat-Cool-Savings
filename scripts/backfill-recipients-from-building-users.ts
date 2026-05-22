/**
 * One-time: create recipients rows for existing BUILDING users (portal signups before dual-write).
 * Run: npx tsx scripts/backfill-recipients-from-building-users.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const { db, sql, toRows } = await import("@/lib/db/client");

  const users = await sql`
    SELECT id, email, name, phone, preference, building_ids
    FROM users
    WHERE role = 'BUILDING'
      AND email IS NOT NULL
      AND TRIM(email) != ''
      AND building_ids IS NOT NULL
  `;

  let created = 0;
  for (const u of toRows(users) as Array<{
    email: string;
    name: string | null;
    phone: string | null;
    preference: string;
    building_ids: string[];
  }>) {
    const bids = (u.building_ids || []).filter(Boolean);
    const pref =
      u.preference === "sms" || u.preference === "both"
        ? u.preference
        : "email";
    for (const buildingId of bids) {
      const b = await db.getBuildings(undefined, buildingId);
      if (b.length === 0) continue;
      await db.upsertRecipientForBuilding({
        buildingId,
        name: u.name || u.email,
        email: u.email,
        phone: u.phone,
        preference: pref as "email" | "sms" | "both",
      });
      created++;
    }
  }

  const count = await sql`SELECT COUNT(*)::int AS n FROM recipients`;
  console.log(`Upserted ${created} building+email pairs. recipients table rows: ${toRows(count)[0]?.n}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
