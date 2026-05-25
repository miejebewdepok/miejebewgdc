
import pkg from 'pg';
const { Client } = pkg;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  try {
    await client.query(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "amount_paid" integer;`);
    await client.query(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "change" integer;`);
    await client.query(`CREATE TABLE IF NOT EXISTS "saved_bills" (
      "id" text PRIMARY KEY,
      "user_id" text NOT NULL,
      "name" text NOT NULL,
      "items" jsonb NOT NULL,
      "created_at" timestamp with time zone NOT NULL
    );`);
    console.log("Success");
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
