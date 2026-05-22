
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
    console.log("Success");
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
  }
}

run();
