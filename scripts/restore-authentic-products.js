require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

const GDC_USER = 'yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn';   // Cabang 1 GDC
const DEPOK_USER = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5'; // Cabang 2 Depok

function uid(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const now = new Date().toISOString();

// ── AUTHENTIC CABANG 1 (GDC) PRODUCTS ──
const GDC_PRODUCTS = [
  // Mie Pedas
  {
    name: 'Mie Iblis Level 3 (Manis Pedas)',
    buyPrice: 9000,
    sellPrice: 14500,
    category: 'Mie Pedas',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&q=80&w=600',
    stock: 100,
    minStock: 5,
    desc: 'Mie pedas manis gurih khas dengan taburan ayam cincang dan pangsit krispi.'
  },
  {
    name: 'Mie Setan Level 5 (Asin Pedas Gurih)',
    buyPrice: 10000,
    sellPrice: 16000,
    category: 'Mie Pedas',
    image: 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&q=80&w=600',
    stock: 100,
    minStock: 5,
    desc: 'Mie pedas asin gurih khas dengan taburan ayam cincang dan pangsit krispi.'
  },
  {
    name: 'Mie Angel (Gurih Tanpa Cabai)',
    buyPrice: 8000,
    sellPrice: 12000,
    category: 'Mie Pedas',
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&q=80&w=600',
    stock: 100,
    minStock: 5,
    desc: 'Mie gurih tidak pedas cocok untuk anak-anak dan yang tidak suka pedas.'
  },
  {
    name: 'Mie Gila Level 10 (Sangat Pedas)',
    buyPrice: 11000,
    sellPrice: 18000,
    category: 'Mie Pedas',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&q=80&w=600',
    stock: 100,
    minStock: 5,
    desc: 'Mie ekstra pedas level 10 untuk pecinta tantangan pedas ekstrem.'
  },
  // Dimsum
  {
    name: 'Dimsum Udang Rambutan (Isi 3)',
    buyPrice: 8000,
    sellPrice: 13000,
    category: 'Dimsum',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=120&w=600',
    stock: 100,
    minStock: 5,
    desc: 'Dimsum udang dibalut kulit renyah berbentuk rambutan.'
  },
  {
    name: 'Dimsum Udang Keju (Isi 3)',
    buyPrice: 8000,
    sellPrice: 13000,
    category: 'Dimsum',
    image: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?auto=format&fit=crop&q=120&w=600',
    stock: 100,
    minStock: 5,
    desc: 'Dimsum udang dengan lelehan keju gurih di dalamnya.'
  },
  {
    name: 'Pangsit Goreng Gacoan (Isi 3)',
    buyPrice: 7000,
    sellPrice: 11500,
    category: 'Dimsum',
    image: 'https://images.unsplash.com/photo-1607532941433-304659e8198a?auto=format&fit=crop&q=120&w=600',
    stock: 100,
    minStock: 5,
    desc: 'Pangsit goreng renyah isi daging ayam bumbu gurih.'
  },
  // Minuman Dingin
  {
    name: 'Es Genderuwo Jelly Segar',
    buyPrice: 5000,
    sellPrice: 10000,
    category: 'Minuman Dingin',
    image: 'https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&q=80&w=600',
    stock: 100,
    minStock: 5,
    desc: 'Es segar rasa manis buah dengan paduan aneka jelly lembut.'
  },
  {
    name: 'Es Pocong Buah Tropis',
    buyPrice: 4500,
    sellPrice: 9000,
    category: 'Minuman Dingin',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=600',
    stock: 100,
    minStock: 5,
    desc: 'Es buah segar rasa manis sirup dan paduan nata de coco.'
  },
  {
    name: 'Es Sundel Bolong Susu Selasih',
    buyPrice: 5000,
    sellPrice: 9500,
    category: 'Minuman Dingin',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&q=80&w=600',
    stock: 100,
    minStock: 5,
    desc: 'Es susu segar manis dengan tambahan biji selasih.'
  },
  // Snack
  {
    name: 'Ceker Setan Kuah Merah (Isi 4)',
    buyPrice: 8000,
    sellPrice: 12500,
    category: 'Snack',
    image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&q=80&w=600',
    stock: 100,
    minStock: 5,
    desc: 'Ceker ayam empuk dengan kuah pedas setan membara.'
  },
  {
    name: 'Lumpia Goreng Pedas Krispi',
    buyPrice: 7000,
    sellPrice: 11000,
    category: 'Snack',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=600',
    stock: 100,
    minStock: 5,
    desc: 'Lumpia goreng krispi isi sayuran dan bumbu pedas mantap.'
  }
];

// ── AUTHENTIC CABANG 2 (DEPOK) PRODUCTS ──
const DEPOK_PRODUCTS = [
  // Mie Tek Tek
  { 
    name: "Mie Tek Tek Jebew", 
    category: "Mie Tek Tek",      
    buyPrice: 7000,  
    sellPrice: 12000, 
    stock: 100, 
    minStock: 5, 
    desc: "Mie tek-tek goreng/kuah pedas jebew khas Depok." 
  },
  // Pangsit
  { 
    name: "Pangsit Goreng",    
    category: "Pangsit",           
    buyPrice: 4000,  
    sellPrice: 7000,  
    stock: 100,  
    minStock: 5, 
    desc: "Pangsit goreng renyah isi ayam." 
  },
  { 
    name: "Pangsit Rebus",     
    category: "Pangsit",           
    buyPrice: 4000,  
    sellPrice: 7000,  
    stock: 100,  
    minStock: 5, 
    desc: "Pangsit rebus kuah gurih hangat." 
  },
  // Tea Series
  { 
    name: "Es Teh Manis",      
    category: "Tea Series",        
    buyPrice: 1500,  
    sellPrice: 5000,  
    stock: 100, 
    minStock: 5, 
    desc: "Es teh manis segar pelepas dahaga." 
  },
  { 
    name: "Es Teh Tawar",      
    category: "Tea Series",        
    buyPrice: 1000,  
    sellPrice: 3000,  
    stock: 100, 
    minStock: 5, 
    desc: "Es teh tawar dingin segar." 
  },
  { 
    name: "Teh Hangat",        
    category: "Tea Series",        
    buyPrice: 1000,  
    sellPrice: 3000,  
    stock: 100, 
    minStock: 5, 
    desc: "Teh hangat manis harum." 
  },
  // Delight Series
  { 
    name: "Chocolatte",        
    category: "Delight Series",    
    buyPrice: 4000,  
    sellPrice: 8000,  
    stock: 100, 
    minStock: 5, 
    desc: "Minuman coklat dingin nikmat." 
  },
  { 
    name: "Chocolatte Slush",  
    category: "Delight Series",    
    buyPrice: 4500,  
    sellPrice: 10000, 
    stock: 100, 
    minStock: 5, 
    desc: "Slush coklat dingin segar diblender." 
  }
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("═══════════════════════════════════════════════════");
    console.log("   RESTORE AUTHENTIC PRODUCTS MIE JEBEW");
    console.log("═══════════════════════════════════════════════════\n");

    // ── Hapus semua produk dari kedua cabang terlebih dahulu agar bersih ──
    console.log("🧹 Membersihkan produk tidak sesuai di database...");
    await client.query("DELETE FROM products WHERE user_id = $1 OR user_id = $2", [GDC_USER, DEPOK_USER]);
    console.log("✅ Database bersih.\n");

    // ── Seed Cabang 1 GDC ──
    console.log("🍜 [1] Mengisi produk asli Cabang 1 (GDC)...");
    let gdcInserted = 0;
    for (const p of GDC_PRODUCTS) {
      const id = uid("prd");
      await client.query(
        `INSERT INTO products (id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, image_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [id, GDC_USER, p.name, p.category, p.buyPrice, p.sellPrice, p.stock, p.minStock, p.desc, p.image, now, now]
      );
      console.log(`   ✅ [${p.category}] ${p.name} — Rp${p.sellPrice.toLocaleString('id-ID')}`);
      gdcInserted++;
    }
    console.log(`   → Total: ${gdcInserted} produk asli GDC berhasil ditambahkan.\n`);

    // ── Seed Cabang 2 Depok ──
    console.log("🍜 [2] Mengisi produk asli Cabang 2 (Depok)...");
    let depokInserted = 0;
    for (const p of DEPOK_PRODUCTS) {
      const id = uid("prd");
      await client.query(
        `INSERT INTO products (id, user_id, name, category, buy_price, sell_price, stock, minimum_stock, description, image_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [id, DEPOK_USER, p.name, p.category, p.buyPrice, p.sellPrice, p.stock, p.minStock, p.desc, null, now, now]
      );
      console.log(`   ✅ [${p.category}] ${p.name} — Rp${p.sellPrice.toLocaleString('id-ID')}`);
      depokInserted++;
    }
    console.log(`   → Total: ${depokInserted} produk asli Depok berhasil ditambahkan.\n`);

    console.log("═══════════════════════════════════════════════════");
    console.log("✨ SELESAI! Produk asli kedua cabang berhasil dipulihkan dengan rapi!");
    console.log("═══════════════════════════════════════════════════\n");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
