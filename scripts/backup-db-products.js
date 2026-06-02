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
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("⚡ Terhubung ke Supabase database...");

    // 1. BACKUP PRODUCTS
    console.log("\n📦 Menarik data produk dari database...");
    const productsRes = await client.query(
      "SELECT * FROM products WHERE user_id = $1 OR user_id = $2 ORDER BY user_id, category, name",
      [GDC_USER, DEPOK_USER]
    );
    const allProducts = productsRes.rows;
    console.log(`✅ Berhasil mengambil ${allProducts.length} produk dari database.`);

    const gdcProductsRaw = allProducts.filter(p => p.user_id === GDC_USER);
    const depokProductsRaw = allProducts.filter(p => p.user_id === DEPOK_USER);

    // Tulis raw backup (authentic_products_backup.json)
    const masterBackupPath = path.join(__dirname, '../src/db/authentic_products_backup.json');
    fs.writeFileSync(masterBackupPath, JSON.stringify(allProducts, null, 2), 'utf8');
    console.log(`💾 Master backup ditulis ke: src/db/authentic_products_backup.json (${allProducts.length} produk)`);

    // Tulis branch raw backups
    const gdcRawPath = path.join(__dirname, `../src/db/backup/branch-${GDC_USER}-backup.json`);
    const depokRawPath = path.join(__dirname, `../src/db/backup/branch-${DEPOK_USER}-backup.json`);
    fs.writeFileSync(gdcRawPath, JSON.stringify(gdcProductsRaw, null, 2), 'utf8');
    fs.writeFileSync(depokRawPath, JSON.stringify(depokProductsRaw, null, 2), 'utf8');
    console.log(`💾 GDC raw backup ditulis ke: src/db/backup/branch-${GDC_USER}-backup.json (${gdcProductsRaw.length} produk)`);
    console.log(`💾 Depok raw backup ditulis ke: src/db/backup/branch-${DEPOK_USER}-backup.json (${depokProductsRaw.length} produk)`);

    // Format ke format camelCase lama untuk script restore-products-from-backup.js
    const formatToOldSchema = (rawProducts) => {
      return rawProducts.map(p => ({
        name: p.name,
        category: p.category,
        buyPrice: p.buy_price,
        sellPrice: p.sell_price,
        stock: p.stock,
        minStock: p.minimum_stock,
        desc: p.description,
        image_url: p.image_url // ditambahkan agar tidak hilang
      }));
    };

    const gdcOldFormat = formatToOldSchema(gdcProductsRaw);
    const depokOldFormat = formatToOldSchema(depokProductsRaw);

    const gdcOldPath = path.join(__dirname, '../src/db/backup/gdc-products-backup.json');
    const depokOldPath = path.join(__dirname, '../src/db/backup/depok-products-backup.json');
    fs.writeFileSync(gdcOldPath, JSON.stringify(gdcOldFormat, null, 2), 'utf8');
    fs.writeFileSync(depokOldPath, JSON.stringify(depokOldFormat, null, 2), 'utf8');
    console.log(`💾 GDC old-format backup ditulis ke: src/db/backup/gdc-products-backup.json`);
    console.log(`💾 Depok old-format backup ditulis ke: src/db/backup/depok-products-backup.json`);

    // 2. BACKUP STORE PROFILES (Penting untuk QRIS, printer, dll.)
    console.log("\n🏠 Menarik data profil toko (store_profiles)...");
    const profilesRes = await client.query(
      "SELECT * FROM store_profiles WHERE user_id = $1 OR user_id = $2 OR user_id = 'w1mO4c2BLPll5WYnyq0ioeiEpQT9iIj6'",
      [GDC_USER, DEPOK_USER]
    );
    const allProfiles = profilesRes.rows;
    const profilesBackupPath = path.join(__dirname, '../src/db/backup/store-profiles-backup.json');
    fs.writeFileSync(profilesBackupPath, JSON.stringify(allProfiles, null, 2), 'utf8');
    console.log(`💾 Profil toko ditulis ke: src/db/backup/store-profiles-backup.json (${allProfiles.length} profil)`);

    console.log("\n🎉 SELURUH PROSES BACKUP SELESAI DENGAN AMAN DAN SUKSES!");
  } catch (err) {
    console.error("❌ Terjadi error saat melakukan backup:", err);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
