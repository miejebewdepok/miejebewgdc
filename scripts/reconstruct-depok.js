require('dotenv').config();
const { Pool } = require('pg');

const DEPOK_USER = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5';

async function main(){
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const client = await pool.connect();
  try {
    // Ambil semua nama produk unik dari transaction_items Cabang 2
    const items = await client.query(`
      SELECT DISTINCT 
        ti.product_name,
        ti.unit_price,
        ti.cost_price,
        ti.product_id
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.user_id = $1
      ORDER BY ti.product_name
    `, [DEPOK_USER]);

    console.log(`\nProduk dari riwayat transaksi Cabang 2: ${items.rows.length}`);
    if (items.rows.length > 0) {
      console.table(items.rows);
    } else {
      console.log('Tidak ada riwayat transaksi Cabang 2.\n');
    }

    // Cek apakah ada produk yang punya ID depok- (dari seed sebelumnya)
    const depokSeeded = await client.query(
      `SELECT id, name, category FROM products WHERE id LIKE 'depok-%'`
    );
    console.log(`\nProduk dengan prefix 'depok-' (sebelumnya diseed): ${depokSeeded.rows.length}`);
    if (depokSeeded.rows.length > 0) console.table(depokSeeded.rows);

    // Cek semua transaksi yang ada di database
    console.log('\n=== SEMUA TRANSAKSI DI DATABASE ===');
    const allTx = await client.query(`SELECT user_id, COUNT(*) FROM transactions GROUP BY user_id`);
    console.table(allTx.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
