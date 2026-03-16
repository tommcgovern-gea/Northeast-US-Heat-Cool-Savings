/**
 * Create a BUILDING user for the building portal.
 * Run from project root: BUILDING_EMAIL=... BUILDING_PASSWORD=... npx tsx scripts/create-building-user.ts
 * Optional: BUILDING_ID=<uuid> to link to a specific building; otherwise uses first building in DB.
 */
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const email = process.env.BUILDING_EMAIL;
const password = process.env.BUILDING_PASSWORD;
const buildingId = process.env.BUILDING_ID;

async function main() {
  const { db, sql } = await import('../src/lib/db/client');
  if (!email || !password) {
    console.error('Set BUILDING_EMAIL and BUILDING_PASSWORD (env or .env).');
    process.exit(1);
  }

  let buildingIds: string[] = [];
  if (buildingId) {
    const buildings = await db.getBuildings(undefined, buildingId);
    if (buildings.length === 0) {
      console.error('BUILDING_ID not found:', buildingId);
      process.exit(1);
    }
    buildingIds = [buildingId];
  } else {
    const buildings = await db.getBuildings();
    if (buildings.length === 0) {
      console.error('No buildings in DB. Create a building first or set BUILDING_ID.');
      process.exit(1);
    }
    buildingIds = [buildings[0].id];
    console.log('Using first building:', buildings[0].name, buildings[0].id);
  }

  const password_hash = await bcrypt.hash(password, 10);
  const existing = await db.getUserByEmail(email);
  if (existing) {
    await sql`
      UPDATE users
      SET password_hash = ${password_hash}, updated_at = NOW()
      WHERE id = ${existing.id}
    `;
    console.log('Building user password updated:', email);
    process.exit(0);
  }

  const user = await db.createUser({
    email,
    password_hash,
    role: 'BUILDING',
    building_ids: buildingIds,
    name: 'Building User',
    is_active: true,
  });
  console.log('Building user created:', user.id, email, 'buildings:', buildingIds);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
