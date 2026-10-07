// Applies supabase/migrations/*.sql to the hosted database.
// Usage: npm run db:push   (reads DATABASE_URL from .env.local)
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL is empty. Paste the Session pooler URI from Supabase → Connect into .env.local.");
  process.exit(1);
}

const bin = resolve("node_modules/.bin/supabase");
const result = spawnSync(bin, ["db", "push", "--db-url", dbUrl, ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
