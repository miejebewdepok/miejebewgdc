import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const globalForDatabase = globalThis as typeof globalThis & {
  __warungosPool?: Pool;
};

function createPool() {
  let connStr =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    "postgresql://postgres:postgres@127.0.0.1:5432/warungos";

  // Self-healing database connection adapter for Supabase pooler.
  // Session mode (port 5432) strictly limits total clients to 15, causing serverless Vercel
  // functions to fail with EMAXCONNSESSION. Redirecting to Transaction mode (port 6543)
  // allows hundreds of concurrent serverless functions to share connections seamlessly.
  if (connStr.includes("pooler.supabase.com:5432")) {
    connStr = connStr.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
  }

  return new Pool({
    connectionString: connStr,
    max: 1, // Share 1 connection per serverless function to prevent database exhaustion
    idleTimeoutMillis: 1000, // Close idle connections after 1s of inactivity to free up slots
  });
}

export const pool = globalForDatabase.__warungosPool ?? createPool();

// Always cache the pool in globalThis to reuse connections across serverless warm starts
globalForDatabase.__warungosPool = pool;


export const db = drizzle({ client: pool, schema });
