const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ ERROR: DATABASE_URL tidak ditemukan di .env");
  process.exit(1);
}

const GDC_USER = 'yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn';   // Cabang 1 GDC
const DEPOK_USER = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5'; // Cabang 2 Depok

async function run() {
  const masterBackupPath = path.join(__dirname, '../src/db/authentic_products_backup.json');
  const gdcBackupPath = path.join(__dirname, '../src/db/backup/gdc-products-backup.json');
  const depokBackupPath = path.join(__dirname, '../src/db/backup/depok-products-backup.json');

  const client = new Client({ connectionString });
  await client.connect();

  console.log("\n⚡ Memulai Pemulihan Database Transaksional...");
  await client.query("BEGIN");

  try {
    // 1. Bersihkan produk untuk Cabang GDC dan Depok secara spesifik
    console.log("🧹 Menghapus produk lama khusus Cabang GDC & Depok...");
    await client.query(
      "DELETE FROM products WHERE user_id = $1 OR user_id = $2",
      [GDC_USER, DEPOK_USER]
    );
    console.log("✅ Database Cabang GDC & Depok bersih.");

    if (fs.existsSync(masterBackupPath)) {
      // Rekonstruksi presisi tinggi dari master backup (authentic_products_backup.json)
      console.log(`📖 Membaca master backup dari: src/db/authentic_products_backup.json`);
      const allProducts = JSON.parse(fs.readFileSync(masterBackupPath, 'utf8'));
      
      console.log(`🍜 Memasukkan kembali ${allProducts.length} produk asli dengan ID asli dan gambar...`);
      for (const p of allProducts) {
        await client.query(
          `INSERT INTO products (id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, image_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            p.id, 
            p.user_id, 
            p.name, 
            p.category, 
            p.buy_price ?? p.buyPrice ?? 0, 
            p.sell_price ?? p.sellPrice ?? 0, 
            p.stock ?? 0, 
            p.minimum_stock ?? p.minStock ?? 5, 
            p.description ?? p.desc ?? "", 
            p.image_url ?? p.imageUrl ?? null, 
            p.created_at ?? new Date().toISOString(), 
            p.updated_at ?? new Date().toISOString()
          ]
        );
        console.log(`   ✅ [${p.category}] ${p.name} (ID: ${p.id}) — Rp${(p.sell_price ?? p.sellPrice).toLocaleString('id-ID')}`);
      }
    } else {
      // Fallback ke backup lama jika master tidak ada
      console.log("⚠️ Master backup tidak ditemukan. Menggunakan fallback backup lama (ID acak)...");
      
      if (!fs.existsSync(gdcBackupPath) || !fs.existsSync(depokBackupPath)) {
        throw new Error("File backup lama GDC atau Depok tidak ditemukan!");
      }

      const gdcProducts = JSON.parse(fs.readFileSync(gdcBackupPath, 'utf8'));
      const depokProducts = JSON.parse(fs.readFileSync(depokBackupPath, 'utf8'));
      const crypto = require('crypto');
      const uid = (prefix) => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();

      // Masukkan produk Cabang 1 GDC
      console.log("\n🍜 Memasukkan menu asli Cabang 1 (GDC)...");
      for (const p of gdcProducts) {
        const id = uid("prd");
        await client.query(
          `INSERT INTO products (id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, image_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [id, GDC_USER, p.name, p.category, p.buyPrice, p.sellPrice, p.stock, p.minStock, p.desc, p.image_url ?? null, now, now]
        );
        console.log(`   ✅ [${p.category}] ${p.name} — Rp${p.sellPrice.toLocaleString('id-ID')}`);
      }

      // Masukkan produk Cabang 2 Depok
      console.log("\n🍜 Memasukkan menu asli Cabang 2 (Depok)...");
      for (const p of depokProducts) {
        const id = uid("prd");
        await client.query(
          `INSERT INTO products (id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, image_url, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [id, DEPOK_USER, p.name, p.category, p.buyPrice, p.sellPrice, p.stock, p.minStock, p.desc, p.image_url ?? null, now, now]
        );
        console.log(`   ✅ [${p.category}] ${p.name} — Rp${p.sellPrice.toLocaleString('id-ID')}`);
      }
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

