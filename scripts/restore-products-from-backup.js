const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("No DATABASE_URL or SUPABASE_DB_URL found");
  process.exit(1);
}

async function run() {
  const backupPath = path.join(__dirname, '../src/db/authentic_products_backup.json');
  if (!fs.existsSync(backupPath)) {
    console.error(`Backup file not found at ${backupPath}`);
    process.exit(1);
  }
  
  const products = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  console.log(`Read ${products.length} products from backup.`);
  
  const client = new Client({ connectionString });
  await client.connect();
  
  console.log("Starting transactional restore...");
  await client.query("BEGIN");
  
  try {
    // Delete existing products
    await client.query("DELETE FROM products");
    console.log("Cleared existing products from database.");
    
    // Insert backed up products
    for (const p of products) {
      await client.query(
        `INSERT INTO products (
          id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, image_url, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          p.id,
          p.user_id,
          p.name,
          p.category,
          p.buy_price,
          p.sell_price,
          p.stock,
          p.minimum_stock,
          p.description,
          p.image_url,
          p.created_at,
          p.updated_at
        ]
      );
    }
    
    await client.query("COMMIT");
    console.log("Successfully restored all products from permanent JSON backup!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to restore products, transaction rolled back:", err);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
