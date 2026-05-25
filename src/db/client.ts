import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const globalForDatabase = globalThis as typeof globalThis & {
  __warungosPool?: Pool;
};

function createPool() {
  return new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      process.env.POSTGRES_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/warungos",
    max: 2, // Limit pool size to prevent exceeding Supabase connection limits (max 15)
    idleTimeoutMillis: 10000, // Close idle connections quickly to free up slots
  });
}

export const pool = globalForDatabase.__warungosPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.__warungosPool = pool;
}

export const db = drizzle({ client: pool, schema });
