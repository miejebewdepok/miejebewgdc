require('dotenv').config();
const { Pool } = require('pg');

const DEPOK_USER = 'rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5';

// Hanya kategori ini yang boleh ada di Cabang 2 Depok
const ALLOWED_CATEGORIES = ['Mie Tek Tek', 'Pangsit', 'Tea Series', 'Delight Series'];

async function main(){
  const pool = new Pool({connectionString: process.env.DATABASE_URL});
  const client = await pool.connect();
  try {
    // Cek semua produk Depok terlebih dahulu
    const all = await client.query(
      `SELECT id, name, category FROM products WHERE user_id = $1 ORDER BY category, name`,
      [DEPOK_USER]
    );
    console.log(`Total produk Cabang 2 Depok: ${all.rows.length}`);

    // Pisahkan yang akan disimpan dan dihapus
    const toKeep = all.rows.filter(p => ALLOWED_CATEGORIES.includes(p.category));
    const toDelete = all.rows.filter(p => !ALLOWED_CATEGORIES.includes(p.category));

    console.log(`\nAkan DISIMPAN (${toKeep.length} produk):`);
    toKeep.forEach(p => console.log(`  ✅ [${p.category}] ${p.name}`));

    console.log(`\nAkan DIHAPUS (${toDelete.length} produk):`);
    toDelete.forEach(p => console.log(`  ❌ [${p.category}] ${p.name}`));

    if (toDelete.length === 0) {
      console.log('\nTidak ada produk yang perlu dihapus.');
      return;
    }

    // Hapus produk yang tidak diizinkan
    const idsToDelete = toDelete.map(p => p.id);
    await client.query(
      `DELETE FROM products WHERE user_id = $1 AND id = ANY($2::text[])`,
      [DEPOK_USER, idsToDelete]
    );

    console.log(`\n✅ Berhasil menghapus ${toDelete.length} produk dari Cabang 2 Depok.`);

    // Verifikasi akhir
    const remaining = await client.query(
      `SELECT category, COUNT(*) as jumlah FROM products WHERE user_id = $1 GROUP BY category ORDER BY category`,
      [DEPOK_USER]
    );
    console.log('\n=== PRODUK TERSISA DI CABANG 2 DEPOK ===');
    console.table(remaining.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
