require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const GDC_USER = 'yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn';   // Cabang 1 GDC
const dbJsonPath = 'e:\\KASIR MIE JEBEW\\Rania Finance\\db.json';

const now = new Date().toISOString();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("═══════════════════════════════════════════════════");
    console.log("   RESTORE GDC ORIGINAL PRODUCTS (RAW MATERIALS)");
    console.log("═══════════════════════════════════════════════════\n");

    if (!fs.existsSync(dbJsonPath)) {
      console.error(`❌ db.json tidak ditemukan di: ${dbJsonPath}`);
      return;
    }

    // 1. Baca dan parse db.json
    console.log("📖 Membaca data dari db.json...");
    const dbData = JSON.parse(fs.readFileSync(dbJsonPath, 'utf8'));
    const sourceProducts = dbData.products || [];
    console.log(`✓ Ditemukan ${sourceProducts.length} produk asli di db.json.\n`);

    if (sourceProducts.length === 0) {
      console.log("⚠ Tidak ada produk untuk di-restore.");
      return;
    }

    // 2. Hapus produk GDC saat ini
    console.log("🧹 Membersihkan produk GDC saat ini di database...");
    const delRes = await client.query("DELETE FROM products WHERE user_id = $1", [GDC_USER]);
    console.log(`✓ Berhasil menghapus ${delRes.rowCount} produk GDC sebelumnya.\n`);

    // 3. Masukkan kembali 98 produk asli
    console.log("🍜 Memasukkan kembali 98 produk asli ke GDC...");
    let inserted = 0;
    for (const p of sourceProducts) {
      // Petakan kolom dari camelCase ke snake_case
      const id = p.id;
      const name = p.name;
      const category = p.category;
      const buyPrice = p.buyPrice || 0;
      const sellPrice = p.sellPrice || 0;
      const stock = p.stock || 0;
      const minStock = p.minimumStock || 2;
      const desc = p.description || "";
      const imgUrl = p.imageUrl || null;

      await client.query(
        `INSERT INTO products (id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, image_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE 
         SET user_id = EXCLUDED.user_id,
             name = EXCLUDED.name,
             category = EXCLUDED.category,
             buy_price = EXCLUDED.buy_price,
             sell_price = EXCLUDED.sell_price,
             stock = EXCLUDED.stock,
             minimum_stock = EXCLUDED.minimum_stock,
             description = EXCLUDED.description,
             image_url = EXCLUDED.image_url,
             updated_at = EXCLUDED.updated_at`,
        [id, GDC_USER, name, category, buyPrice, sellPrice, stock, minStock, desc, imgUrl, now, now]
      );
      inserted++;
    }

    console.log(`\n✓ Sukses memulihkan ${inserted} produk asli ke Cabang GDC!`);
    console.log("═══════════════════════════════════════════════════\n");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
