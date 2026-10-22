import { type Config } from "drizzle-kit";

import { env } from "~/env";

const sslConfig =
  env.POSTGRES_SSL === "false" || env.POSTGRES_SSL === "disable"
    ? undefined
    : { rejectUnauthorized: false };

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.POSTGRES_URL,
    ssl: sslConfig,
  },
  tablesFilter: ["8slp_*"], // also in schema.ts
} satisfies Config;
