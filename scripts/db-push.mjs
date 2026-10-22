/**
 * Apply schema changes during Vercel builds without drizzle-kit push.
 * drizzle-kit introspects the DB and can hang forever on pooled PgBouncer URLs
 * at "Pulling schema from database".
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const OVERALL_TIMEOUT_MS = 60_000;
const CONNECT_TIMEOUT_SEC = 15;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const drizzleDir = path.join(__dirname, "..", "drizzle");

function requireDatabaseUrl() {
  const url = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "Missing POSTGRES_URL_NON_POOLING (preferred) or POSTGRES_URL for db:push",
    );
  }
  if (!process.env.POSTGRES_URL_NON_POOLING) {
    console.warn(
      "POSTGRES_URL_NON_POOLING is unset; using POSTGRES_URL (pooled URLs may hang or fail)",
    );
  }
  return url;
}

function sslOption() {
  const mode = process.env.POSTGRES_SSL ?? "true";
  if (mode === "false" || mode === "disable") return false;
  return { rejectUnauthorized: false };
}

const bootstrapSql = `
CREATE TABLE IF NOT EXISTS "8slp_users" (
  "email" varchar(255) PRIMARY KEY NOT NULL,
  "eightUserId" varchar(255) NOT NULL,
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "8slp_userTemperatureProfiles" (
  "email" varchar(255) PRIMARY KEY NOT NULL REFERENCES "8slp_users"("email"),
  "bedTime" time NOT NULL,
  "wakeupTime" time NOT NULL,
  "initialSleepLevel" integer NOT NULL,
  "midStageSleepLevel" integer NOT NULL,
  "midStageSleepLevelStartTime" time DEFAULT '23:00' NOT NULL,
  "finalSleepLevel" integer NOT NULL,
  "finalSleepLevelStartTime" time DEFAULT '06:00' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "timezone" varchar(50) NOT NULL
);
`;

async function applyMigrations(sql) {
  await sql.unsafe(bootstrapSql);

  const files = (await readdir(drizzleDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const fullPath = path.join(drizzleDir, file);
    const contents = await readFile(fullPath, "utf8");
    console.log(`Applying ${file}...`);
    await sql.unsafe(contents);
  }
}

async function main() {
  const url = requireDatabaseUrl();
  const sql = postgres(url, {
    ssl: sslOption(),
    max: 1,
    connect_timeout: CONNECT_TIMEOUT_SEC,
    idle_timeout: 20,
    max_lifetime: 60,
  });

  try {
    await applyMigrations(sql);
    console.log("Database schema is up to date.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const timedOut = new Promise((_, reject) => {
  setTimeout(() => {
    reject(
      new Error(
        `db:push timed out after ${OVERALL_TIMEOUT_MS / 1000}s (check POSTGRES_URL_NON_POOLING)`,
      ),
    );
  }, OVERALL_TIMEOUT_MS);
});

try {
  await Promise.race([main(), timedOut]);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
