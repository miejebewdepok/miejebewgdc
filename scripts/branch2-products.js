const { Pool } = require('pg');
require('dotenv').config();

async function main(){
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const client = await pool.connect();
  try {
    const userId = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5';
    const res = await client.query('SELECT id, name, category, sellPrice, stock FROM products WHERE "userId" = $1', [userId]);
    console.log('Products for branch2:', res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);
