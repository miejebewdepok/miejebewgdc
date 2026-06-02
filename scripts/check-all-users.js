require('dotenv').config();
const { Pool } = require('pg');

async function main(){
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const client = await pool.connect();
  try {
    console.log('=== SEMUA TABEL DI DATABASE ===');
    const tables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    tables.rows.forEach(r => console.log(' -', r.tablename));

    console.log('\n=== CEK TABEL USER (better-auth) ===');
    // better-auth biasanya pakai tabel "user" (lowercase)
    try {
      const users = await client.query(`SELECT id, email, name FROM "user" ORDER BY email`);
      console.log('Users di tabel "user":');
      console.table(users.rows);
    } catch(e) {
      console.log('Tidak ada tabel "user":', e.message);
    }

    // Coba "users" (plural)
    try {
      const users = await client.query(`SELECT id, email, name FROM users ORDER BY email`);
      console.log('Users di tabel "users":');
      console.table(users.rows);
    } catch(e) {
      console.log('Tidak ada tabel "users":', e.message);
    }

    // Cek store_profiles untuk lihat semua user_id yang terdaftar
    console.log('\n=== STORE PROFILES (semua user_id) ===');
    const profiles = await client.query(`SELECT user_id, store_name, owner_name FROM store_profiles ORDER BY store_name`);
    console.table(profiles.rows);

    // Cek semua produk di database dengan semua user_id
    console.log('\n=== PRODUK PER USER_ID (semua) ===');
    const prods = await client.query(`SELECT user_id, category, COUNT(*) as jml FROM products GROUP BY user_id, category ORDER BY user_id, category`);
    console.table(prods.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
