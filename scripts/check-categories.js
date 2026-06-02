require('dotenv').config();
const { Pool } = require('pg');

const DEMO_USER = 'demo_user';

async function main(){
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const client = await pool.connect();
  try {
    // Lihat semua kategori yang ada di demo_user
    const cats = await client.query(
      `SELECT DISTINCT category FROM products WHERE user_id = $1 ORDER BY category`,
      [DEMO_USER]
    );
    console.log('=== SEMUA KATEGORI DI demo_user ===');
    cats.rows.forEach(r => console.log(' -', r.category));

    // Lihat produk yang namanya mirip Mie Tek Tek, Pangsit, Tea, Delight
    console.log('\n=== PRODUK YANG RELEVAN ===');
    const relevant = await client.query(
      `SELECT name, category FROM products WHERE user_id = $1 AND (
        category ILIKE '%mie%' OR category ILIKE '%tek%' OR
        category ILIKE '%pangsit%' OR category ILIKE '%tea%' OR
        category ILIKE '%delight%' OR
        name ILIKE '%mie tek tek%' OR name ILIKE '%pangsit%' OR 
        name ILIKE '%tea%' OR name ILIKE '%delight%'
      ) ORDER BY category, name`,
      [DEMO_USER]
    );
    console.table(relevant.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
