import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";

const sslMode = env.POSTGRES_SSL;
const sslConfig =
  sslMode === "true" || sslMode === "require"
    ? { rejectUnauthorized: false }
    : false;

const client = postgres(process.env.POSTGRES_URL!, {
  ssl: sslConfig,
  max: 1,
});

export const db = drizzle(client, { schema });
