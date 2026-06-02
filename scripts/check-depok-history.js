require('dotenv').config();
const { Pool } = require('pg');

const DEPOK_USER = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5';

async function main(){
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const client = await pool.connect();
  try {
    // Cek apakah ada riwayat transaksi untuk Depok
    const txs = await client.query(
      `SELECT COUNT(*) as total FROM transactions WHERE user_id = $1`,
      [DEPOK_USER]
    );
    console.log('Total transaksi Depok:', txs.rows[0].total);

    // Coba ambil nama produk dari transaction_items yang pernah dijual
    const items = await client.query(`
      SELECT DISTINCT ti.product_name, ti.unit_price
      FROM transaction_items ti
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.user_id = $1
      ORDER BY ti.product_name
    `, [DEPOK_USER]);
    
    if (items.rows.length > 0) {
      console.log('\nProduk yang pernah dijual di Depok:');
      console.table(items.rows);
    } else {
      console.log('Tidak ada riwayat transaksi Depok ditemukan.');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
