require('dotenv').config();
const { Pool } = require('pg');

async function main(){
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const client = await pool.connect();
  try {
    // Cek semua store_profiles yang ada
    console.log("=== SEMUA STORE PROFILES ===");
    const profiles = await client.query('SELECT user_id, store_name, owner_name FROM store_profiles');
    console.table(profiles.rows);

    // Cek user dari tabel auth (better-auth)
    console.log("\n=== SEMUA USER (better-auth) ===");
    const users = await client.query('SELECT id, name, email, "createdAt" FROM "user"');
    console.table(users.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
