const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ ERROR: DATABASE_URL tidak ditemukan di .env");
  process.exit(1);
}

const GDC_USER = 'yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn';   // Cabang 1 GDC
const DEPOK_USER = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5'; // Cabang 2 Depok

function uid(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

async function run() {
  const gdcBackupPath = path.join(__dirname, '../src/db/backup/gdc-products-backup.json');
  const depokBackupPath = path.join(__dirname, '../src/db/backup/depok-products-backup.json');

  if (!fs.existsSync(gdcBackupPath) || !fs.existsSync(depokBackupPath)) {
    console.error("❌ ERROR: File backup JSON GDC atau Depok tidak ditemukan!");
    process.exit(1);
  }

  const gdcProducts = JSON.parse(fs.readFileSync(gdcBackupPath, 'utf8'));
  const depokProducts = JSON.parse(fs.readFileSync(depokBackupPath, 'utf8'));

  console.log(`📖 Membaca ${gdcProducts.length} produk GDC dari backup.`);
  console.log(`📖 Membaca ${depokProducts.length} produk Depok dari backup.`);

  const client = new Client({ connectionString });
  await client.connect();

  console.log("\n⚡ Memulai Pemulihan Database Transaksional Aman...");
  await client.query("BEGIN");

  try {
    // 1. Bersihkan produk untuk Cabang GDC dan Depok secara spesifik
    console.log("🧹 Menghapus produk lama khusus Cabang GDC & Depok...");
    await client.query(
      "DELETE FROM products WHERE user_id = $1 OR user_id = $2",
      [GDC_USER, DEPOK_USER]
    );
    console.log("✅ Database Cabang GDC & Depok bersih.");

    const now = new Date().toISOString();

    // 2. Masukkan produk Cabang 1 GDC
    console.log("\n🍜 Memasukkan menu asli Cabang 1 (GDC)...");
    for (const p of gdcProducts) {
      const id = uid("prd");
      await client.query(
        `INSERT INTO products (id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, GDC_USER, p.name, p.category, p.buyPrice, p.sellPrice, p.stock, p.minStock, p.desc, now, now]
      );
      console.log(`   ✅ [${p.category}] ${p.name} — Rp${p.sellPrice.toLocaleString('id-ID')}`);
    }

    // 3. Masukkan produk Cabang 2 Depok
    console.log("\n🍜 Memasukkan menu asli Cabang 2 (Depok)...");
    for (const p of depokProducts) {
      const id = uid("prd");
      await client.query(
        `INSERT INTO products (id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, DEPOK_USER, p.name, p.category, p.buyPrice, p.sellPrice, p.stock, p.minStock, p.desc, now, now]
      );
      console.log(`   ✅ [${p.category}] ${p.name} — Rp${p.sellPrice.toLocaleString('id-ID')}`);
    }

    await client.query("COMMIT");
    console.log("\n🎉 SUKSES! Seluruh produk GDC & Depok berhasil dipulihkan secara permanen dari berkas backup JSON!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ GAGAL memulihkan produk, transaksi dibatalkan (rollback):", err);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
