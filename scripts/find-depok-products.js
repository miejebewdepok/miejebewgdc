require('dotenv').config();
const { Pool } = require('pg');

const DEPOK_USER = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5';
const TARGET_CATEGORIES = ['Mie Tek Tek', 'Pangsit', 'Tea Series', 'Delight Series'];

async function main(){
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const client = await pool.connect();
  try {
    console.log('=== CEK SEMUA PRODUK DI SELURUH DATABASE ===\n');

    // Cari semua produk dengan kategori yang sesuai di semua user
    const relevant = await client.query(
      `SELECT user_id, id, name, category, sell_price, stock 
       FROM products 
       WHERE category = ANY($1::text[])
       ORDER BY category, name`,
      [TARGET_CATEGORIES]
    );
    console.log(`Produk dengan kategori Mie Tek Tek/Pangsit/Tea Series/Delight Series: ${relevant.rows.length}`);
    if (relevant.rows.length > 0) console.table(relevant.rows);

    // Cari semua kategori unik yang ada di database
    console.log('\n=== SEMUA KATEGORI YANG ADA DI DATABASE ===');
    const cats = await client.query(
      `SELECT user_id, category, COUNT(*) as jumlah 
       FROM products 
       GROUP BY user_id, category 
       ORDER BY user_id, category`
    );
    console.table(cats.rows);

    // Cari produk di semua user untuk memahami isi database
    console.log('\n=== TOTAL PRODUK PER USER ===');
    const perUser = await client.query(
      `SELECT user_id, COUNT(*) as total FROM products GROUP BY user_id`
    );
    console.table(perUser.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
