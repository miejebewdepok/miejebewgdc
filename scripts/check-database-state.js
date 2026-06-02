const { Pool } = require("pg");
require("dotenv").config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log("=== STORE PROFILES IN DATABASE ===");
    const profiles = await client.query(
      "SELECT user_id, store_name, owner_name, created_at FROM store_profiles"
    );
    console.table(profiles.rows);

    console.log("\n=== PRODUCTS IN DATABASE BY USER_ID ===");
    const prods = await client.query(
      "SELECT user_id, COUNT(*) as count FROM products GROUP BY user_id"
    );
    console.table(prods.rows);

    console.log("\n=== LATEST 10 TRANSACTIONS BY USER_ID ===");
    const txs = await client.query(
      "SELECT id, user_id, total, created_at FROM transactions ORDER BY created_at DESC LIMIT 10"
    );
    console.table(txs.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
