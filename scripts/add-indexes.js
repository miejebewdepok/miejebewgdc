import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const statements = [
  "CREATE INDEX IF NOT EXISTS transactions_user_created_idx ON transactions (user_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS transaction_items_transaction_id_idx ON transaction_items (transaction_id)",
  "CREATE INDEX IF NOT EXISTS expenses_user_created_idx ON expenses (user_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS debts_user_created_idx ON debts (user_id, created_at DESC)",
  "CREATE INDEX IF NOT EXISTS saved_bills_user_created_idx ON saved_bills (user_id, created_at DESC)",
];

try {
  const client = await pool.connect();
  for (const sql of statements) {
    await client.query(sql);
  }
  client.release();
  console.log("OK add indexes");
} catch (e) {
  console.error("FAIL add indexes", e);
  process.exit(1);
} finally {
  await pool.end();
}
