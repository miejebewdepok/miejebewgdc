require('dotenv').config();
const { Pool } = require('pg');

// User IDs for the two branches
const BRANCH1_USER = 'yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn'; // GDC
const BRANCH2_USER = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5'; // Depok

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    // Fetch all products from branch 1 (GDC)
    const res = await client.query(
      `SELECT id, name, category, buy_price, sell_price, stock, minimum_stock, description, image_url, created_at, updated_at FROM products WHERE "user_id" = $1`,
      [BRANCH1_USER]
    );
    const rows = res.rows;
    console.log(`Found ${rows.length} products in branch 1`);
    if (rows.length === 0) {
      console.log('No products to copy, aborting.');
      return;
    }
    // Insert copies for branch 2 with new IDs
    for (const p of rows) {
      const newId = `copy-${p.id}`; // simple prefixed ID, adjust if needed
      await client.query(
        `INSERT INTO products (id, "user_id", name, category, buy_price, sell_price, stock, minimum_stock, description, image_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO NOTHING`,
        [newId, BRANCH2_USER, p.name, p.category, p.buy_price, p.sell_price, p.stock, p.minimum_stock, p.description, p.image_url, p.created_at, p.updated_at]
      );
    }
    console.log('Copied products to branch 2.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => console.error('Error:', err));
