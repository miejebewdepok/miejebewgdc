const { Pool } = require("pg");
require("dotenv").config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    // 1. Produk per user
    console.log("=== PRODUK PER USER ===");
    const prodsByUser = await client.query(
      "SELECT user_id, COUNT(*) as count FROM products GROUP BY user_id"
    );
    console.table(prodsByUser.rows);

    // 2. Cek apakah ada riwayat transaksi Cabang 2 yang bisa kita pakai untuk rekonstruksi
    console.log("\n=== TRANSAKSI CABANG 2 (rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5) ===");
    const depokTxs = await client.query(
      "SELECT id, total, payment_method, created_at FROM transactions WHERE user_id = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5' ORDER BY created_at DESC LIMIT 10"
    );
    console.table(depokTxs.rows);

    // 3. Cek apakah ada riwayat transaksi Cabang 1 (GDC)
    console.log("\n=== TRANSAKSI CABANG 1 GDC (yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn) ===");
    const gdcTxs = await client.query(
      "SELECT id, total, payment_method, created_at FROM transactions WHERE user_id = 'yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn' ORDER BY created_at DESC LIMIT 10"
    );
    console.table(gdcTxs.rows);

    // 4. Cek item transaksi unik untuk merekonstruksi produk-produk yang pernah ada
    console.log("\n=== PRODUK UNIK DARI RIWAYAT TRANSAKSI CABANG 2 ===");
    const depokProducts = await client.query(`
      SELECT DISTINCT ti.product_id, ti.product_name, ti.unit_price, ti.cost_price
      FROM transaction_items ti 
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.user_id = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5'
      ORDER BY ti.product_name
    `);
    console.table(depokProducts.rows);

    // 5. Cek item transaksi unik untuk GDC
    console.log("\n=== PRODUK UNIK DARI RIWAYAT TRANSAKSI GDC ===");
    const gdcProducts = await client.query(`
      SELECT DISTINCT ti.product_id, ti.product_name, ti.unit_price, ti.cost_price
      FROM transaction_items ti 
      JOIN transactions t ON ti.transaction_id = t.id
      WHERE t.user_id = 'yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn'
      ORDER BY ti.product_name
    `);
    console.table(gdcProducts.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
