require('dotenv').config();
const { Pool } = require('pg');

const DEMO_USER = 'demo_user';
const GDC_USER = 'yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn';
const DEPOK_USER = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5';

async function main(){
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const client = await pool.connect();
  try {
    // Ambil semua produk dari demo_user
    const res = await client.query(
      `SELECT id, name, category, buy_price, sell_price, stock, minimum_stock, description, image_url, created_at, updated_at FROM products WHERE user_id = $1`,
      [DEMO_USER]
    );
    const rows = res.rows;
    console.log(`Ditemukan ${rows.length} produk di demo_user.`);

    if (rows.length === 0) {
      console.log('Tidak ada produk di demo_user, berhenti.');
      return;
    }

    // Cek berapa produk sudah ada di masing-masing cabang
    const gdcCount = await client.query('SELECT COUNT(*) FROM products WHERE user_id = $1', [GDC_USER]);
    const depokCount = await client.query('SELECT COUNT(*) FROM products WHERE user_id = $1', [DEPOK_USER]);
    console.log(`GDC sudah punya: ${gdcCount.rows[0].count} produk`);
    console.log(`Depok sudah punya: ${depokCount.rows[0].count} produk`);

    // Copy ke Cabang 2 Depok jika belum ada
    if (parseInt(depokCount.rows[0].count) === 0) {
      console.log('\nMenyalin produk ke Cabang 2 (Depok)...');
      for (const p of rows) {
        const newId = `depok-${p.id}`;
        await client.query(
          `INSERT INTO products (id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, image_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING`,
          [newId, DEPOK_USER, p.name, p.category, p.buy_price, p.sell_price, p.stock, p.minimum_stock, p.description, p.image_url, p.created_at, p.updated_at]
        );
      }
      console.log(`✅ Berhasil menyalin ${rows.length} produk ke Cabang 2 Depok.`);
    } else {
      console.log('Cabang 2 Depok sudah punya produk, tidak perlu disalin.');
    }

    // Copy ke Cabang 1 GDC jika belum ada
    if (parseInt(gdcCount.rows[0].count) === 0) {
      console.log('\nMenyalin produk ke Cabang 1 (GDC)...');
      for (const p of rows) {
        const newId = `gdc-${p.id}`;
        await client.query(
          `INSERT INTO products (id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, image_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING`,
          [newId, GDC_USER, p.name, p.category, p.buy_price, p.sell_price, p.stock, p.minimum_stock, p.description, p.image_url, p.created_at, p.updated_at]
        );
      }
      console.log(`✅ Berhasil menyalin ${rows.length} produk ke Cabang 1 GDC.`);
    } else {
      console.log('Cabang 1 GDC sudah punya produk, tidak perlu disalin.');
    }

    // Verifikasi hasil
    const gdcFinal = await client.query('SELECT COUNT(*) FROM products WHERE user_id = $1', [GDC_USER]);
    const depokFinal = await client.query('SELECT COUNT(*) FROM products WHERE user_id = $1', [DEPOK_USER]);
    console.log(`\n=== HASIL AKHIR ===`);
    console.log(`GDC: ${gdcFinal.rows[0].count} produk`);
    console.log(`Depok: ${depokFinal.rows[0].count} produk`);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
