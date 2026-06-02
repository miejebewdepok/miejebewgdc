require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

const GDC_USER = 'yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn';   // Cabang 1 GDC
const DEPOK_USER = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5'; // Cabang 2 Depok

function uid(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const now = new Date().toISOString();

// ── CABANG 1 — MIE JEBEW GDC (18 Menu) ──
const GDC_PRODUCTS = [
  // ── Mie Pedas ──
  { name: "Mie Jebew",         category: "Mie Pedas",    buyPrice: 5500,  sellPrice: 12000, stock: 100, minStock: 5, desc: "Mie pedas khas Jebew dengan level 0-5" },
  { name: "Spaghetti Goreng",  category: "Mie Pedas",    buyPrice: 6000,  sellPrice: 14000, stock: 100, minStock: 5, desc: "Spaghetti goreng porsi Single/Double" },

  // ── Lumpia Beef ──
  { name: "Lumpia Beef",       category: "Lumpia Beef",   buyPrice: 4500,  sellPrice: 8000,  stock: 50,  minStock: 5, desc: "Lumpia isi daging sapi pilihan" },

  // ── Kebab ──
  { name: "Kebab",             category: "Kebab",         buyPrice: 5000,  sellPrice: 12000, stock: 50,  minStock: 5, desc: "Kebab ukuran Reguler/Large dengan varian isi" },

  // ── Snack ──
  { name: "Lumpia Udang",      category: "Snack",         buyPrice: 3500,  sellPrice: 8000,  stock: 50,  minStock: 5, desc: "Lumpia udang renyah" },
  { name: "Udang Keju",        category: "Snack",         buyPrice: 4000,  sellPrice: 8000,  stock: 50,  minStock: 5, desc: "Udang keju goreng krispi" },
  { name: "Chicken Katsu",     category: "Snack",         buyPrice: 5000,  sellPrice: 10000, stock: 50,  minStock: 5, desc: "Chicken katsu renyah" },
  { name: "Risoles",           category: "Snack",         buyPrice: 2500,  sellPrice: 5000,  stock: 50,  minStock: 5, desc: "Risoles isi ragout" },

  // ── Qalla Coffee ──
  { name: "Americano",         category: "Qalla Coffee",  buyPrice: 3000,  sellPrice: 10000, stock: 100, minStock: 5, desc: "Espresso + air panas" },
  { name: "Cappuccino",        category: "Qalla Coffee",  buyPrice: 4000,  sellPrice: 12000, stock: 100, minStock: 5, desc: "Espresso + steamed milk + foam" },
  { name: "Cafe Latte",        category: "Qalla Coffee",  buyPrice: 4000,  sellPrice: 12000, stock: 100, minStock: 5, desc: "Espresso + susu segar" },
  { name: "Es Kopi Susu",      category: "Qalla Coffee",  buyPrice: 4500,  sellPrice: 12000, stock: 100, minStock: 5, desc: "Kopi susu kekinian" },

  // ── Qalla Tea ──
  { name: "Jasmine Tea",       category: "Qalla Tea",     buyPrice: 2000,  sellPrice: 8000,  stock: 100, minStock: 5, desc: "Teh melati premium" },
  { name: "Lemon Tea",         category: "Qalla Tea",     buyPrice: 2500,  sellPrice: 8000,  stock: 100, minStock: 5, desc: "Teh lemon segar" },
  { name: "Lychee Tea",        category: "Qalla Tea",     buyPrice: 2500,  sellPrice: 10000, stock: 100, minStock: 5, desc: "Teh leci manis" },
  { name: "Honey Lemonade",    category: "Qalla Tea",     buyPrice: 3000,  sellPrice: 10000, stock: 100, minStock: 5, desc: "Lemonade madu segar" },

  // ── Qalla Juice ──
  { name: "Strawberry Juice",  category: "Qalla Juice",   buyPrice: 3500,  sellPrice: 12000, stock: 100, minStock: 5, desc: "Jus stroberi segar" },
  { name: "Mango Juice",       category: "Qalla Juice",   buyPrice: 3500,  sellPrice: 12000, stock: 100, minStock: 5, desc: "Jus mangga segar" },
];

// ── CABANG 2 — MIE JEBEW DEPOK (8 Menu) ──
const DEPOK_PRODUCTS = [
  // ── Mie Tek Tek ──
  { name: "Mie Tek Tek Jebew", category: "Mie Tek Tek",      buyPrice: 5500,  sellPrice: 12000, stock: 100, minStock: 5, desc: "Mie tek tek khas Jebew Depok dengan level 0-5" },

  // ── Pangsit ──
  { name: "Pangsit Goreng",    category: "Pangsit",           buyPrice: 3000,  sellPrice: 7000,  stock: 50,  minStock: 5, desc: "Pangsit goreng renyah" },
  { name: "Pangsit Rebus",     category: "Pangsit",           buyPrice: 3000,  sellPrice: 7000,  stock: 50,  minStock: 5, desc: "Pangsit rebus kuah gurih" },

  // ── Tea Series ──
  { name: "Es Teh Manis",      category: "Tea Series",        buyPrice: 1500,  sellPrice: 5000,  stock: 100, minStock: 5, desc: "Es teh manis segar" },
  { name: "Es Teh Tawar",      category: "Tea Series",        buyPrice: 1000,  sellPrice: 3000,  stock: 100, minStock: 5, desc: "Es teh tawar tanpa gula" },
  { name: "Teh Hangat",        category: "Tea Series",        buyPrice: 1000,  sellPrice: 3000,  stock: 100, minStock: 5, desc: "Teh hangat manis" },

  // ── Delight Series ──
  { name: "Chocolatte",        category: "Delight Series",    buyPrice: 3500,  sellPrice: 8000,  stock: 100, minStock: 5, desc: "Minuman coklat khas" },
  { name: "Chocolatte Slush",  category: "Delight Series",    buyPrice: 4000,  sellPrice: 10000, stock: 100, minStock: 5, desc: "Slush coklat dingin" },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("═══════════════════════════════════════════════════");
    console.log("   CLEAN AND SEED AUTHENTIC MENU PRODUCTS");
    console.log("═══════════════════════════════════════════════════\n");

    // 1. Bersihkan database secara total untuk user GDC dan Depok
    console.log("🧹 Menghapus produk lama Cabang GDC & Depok...");
    await client.query("DELETE FROM products WHERE user_id = $1 OR user_id = $2", [GDC_USER, DEPOK_USER]);
    console.log("✓ Database berhasil dikosongkan untuk kedua cabang.\n");

    // 2. Masukkan produk Cabang 1 GDC
    console.log("🍜 [1] Memasukkan menu asli Cabang 1 (GDC)...");
    let gdcCount = 0;
    for (const p of GDC_PRODUCTS) {
      const id = uid("prd");
      await client.query(
        `INSERT INTO products (id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, GDC_USER, p.name, p.category, p.buyPrice, p.sellPrice, p.stock, p.minStock, p.desc, now, now]
      );
      console.log(`   ✅ [${p.category}] ${p.name} — Rp${p.sellPrice.toLocaleString('id-ID')}`);
      gdcCount++;
    }
    console.log(`   → Total: ${gdcCount} produk Cabang GDC berhasil dimasukkan.\n`);

    // 3. Masukkan produk Cabang 2 Depok
    console.log("🍜 [2] Memasukkan menu asli Cabang 2 (Depok)...");
    let depokCount = 0;
    for (const p of DEPOK_PRODUCTS) {
      const id = uid("prd");
      await client.query(
        `INSERT INTO products (id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [id, DEPOK_USER, p.name, p.category, p.buyPrice, p.sellPrice, p.stock, p.minStock, p.desc, now, now]
      );
      console.log(`   ✅ [${p.category}] ${p.name} — Rp${p.sellPrice.toLocaleString('id-ID')}`);
      depokCount++;
    }
    console.log(`   → Total: ${depokCount} produk Cabang Depok berhasil dimasukkan.\n`);

    // 4. Verifikasi hasil akhir
    console.log("═══════════════════════════════════════════════════");
    console.log("   VERIFIKASI HASIL AKHIR");
    console.log("═══════════════════════════════════════════════════\n");

    const finalGdc = await client.query(
      `SELECT category, COUNT(*) as jumlah FROM products WHERE user_id = $1 GROUP BY category ORDER BY category`,
      [GDC_USER]
    );
    console.log("Cabang 1 (GDC):");
    console.table(finalGdc.rows);

    const finalDepok = await client.query(
      `SELECT category, COUNT(*) as jumlah FROM products WHERE user_id = $1 GROUP BY category ORDER BY category`,
      [DEPOK_USER]
    );
    console.log("Cabang 2 (Depok):");
    console.table(finalDepok.rows);

    console.log("\n✅ SELESAI! Menu kasir untuk kedua cabang sudah bersih dan terisi dengan benar.");
    console.log("   Cabang 1 (GDC) HANYA menampilkan: Mie Pedas, Lumpia Beef, Kebab, Snack, Qalla Coffee, Qalla Tea, & Qalla Juice.\n");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
