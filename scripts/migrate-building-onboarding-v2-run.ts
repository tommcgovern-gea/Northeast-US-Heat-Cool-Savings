/**
 * Run: npx tsx scripts/migrate-building-onboarding-v2-run.ts
 */
import path from "path";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const { sql } = await import("../src/lib/db/client");
  const sqlFile = path.join(__dirname, "migrate-building-onboarding-v2.sql");
  const text = fs.readFileSync(sqlFile, "utf8");
  const statements = text
    .split(";")
    .map((s) => s.replace(/--[^\n]*/g, "").trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await sql(stmt);
    console.log("OK:", stmt.slice(0, 60).replace(/\s+/g, " ") + "...");
  }
  console.log("Migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
