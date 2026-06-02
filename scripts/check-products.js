const { Pool } = require("pg");
require("dotenv").config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log("=== JUMLAH PRODUK PER USER ID ===");
    const res = await client.query(
      "SELECT user_id, COUNT(*) as count FROM products GROUP BY user_id"
    );
    console.table(res.rows);

    console.log("\n=== CONTOH PRODUK UNTUK CABANG 2 (DEPOK) ===");
    const depokProducts = await client.query(
      "SELECT id, name, category, sell_price, stock FROM products WHERE user_id = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5' LIMIT 10"
    );
    console.table(depokProducts.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
