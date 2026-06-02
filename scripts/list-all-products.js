require('dotenv').config();
const { Pool } = require('pg');

async function main(){
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, "user_id", name FROM products');
    console.log('All products:', res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
