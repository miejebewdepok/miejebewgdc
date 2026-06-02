const { Pool } = require("pg");
require("dotenv").config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("=== MEMULAI ROLLBACK DATABASE SUPABASE ===");

    // 1. Ambil ID dari user-user asing berdasarkan email
    console.log("\n[1] Mencari ID user asing yang terdaftar...");
    const emailsToDrop = [
      "abyan.arieef@gmail.com",
      "coogie.case@gmail.com",
      "opiq.opie@gmail.com"
    ];
    
    const userRes = await client.query(
      `SELECT id, email FROM "user" WHERE email = ANY($1)`,
      [emailsToDrop]
    );
    const foreignUserIds = userRes.rows.map(r => r.id);
    console.log("User asing yang ditemukan:", userRes.rows);

    // 2. Hapus data transaksi demo_user agar tidak menggangu database
    console.log("\n[2] Menghapus transaksi & item transaksi untuk 'demo_user'...");
    
    // Hapus transaction_items terlebih dahulu (foreign key constraint)
    const delTxItemsRes = await client.query(`
      DELETE FROM transaction_items 
      WHERE transaction_id IN (
        SELECT id FROM transactions WHERE user_id = 'demo_user'
      )
    `);
    console.log(`- Terhapus ${delTxItemsRes.rowCount} baris dari transaction_items.`);

    const delTxRes = await client.query(
      "DELETE FROM transactions WHERE user_id = 'demo_user'"
    );
    console.log(`- Terhapus ${delTxRes.rowCount} baris dari transactions.`);

    // 3. Hapus produk demo dari 'demo_user' dan produk demo bahan baku GDC
    console.log("\n[3] Menghapus produk demo (demo_user dan GDC)...");
    
    // GDC = yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn
    const delProductsRes = await client.query(
      "DELETE FROM products WHERE user_id = 'demo_user' OR user_id = 'yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn'"
    );
    console.log(`- Terhapus ${delProductsRes.rowCount} produk dari products.`);

    // 4. Hapus store_profiles asing
    console.log("\n[4] Menghapus store_profiles asing...");
    const allowedUserIds = [
      "rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5", // Depok
      "yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn", // GDC
      "w1mO4c2BLPll5WYnyq0ioeiEpQT9iIj6"  // GDC Crew
    ];
    const delProfilesRes = await client.query(
      `DELETE FROM store_profiles WHERE user_id = 'demo_user' OR (user_id = ANY($1) AND NOT (user_id = ANY($2)))`,
      [foreignUserIds, allowedUserIds]
    );
    console.log(`- Terhapus ${delProfilesRes.rowCount} baris dari store_profiles.`);

    // 5. Hapus data auth untuk user-user asing (session, account, user)
    if (foreignUserIds.length > 0) {
      console.log("\n[5] Menghapus data autentikasi (better-auth) user asing...");
      
      const delSessionRes = await client.query(
        `DELETE FROM session WHERE "userId" = ANY($1)`,
        [foreignUserIds]
      );
      console.log(`- Terhapus ${delSessionRes.rowCount} baris dari session.`);

      const delAccountRes = await client.query(
        `DELETE FROM account WHERE "userId" = ANY($1)`,
        [foreignUserIds]
      );
      console.log(`- Terhapus ${delAccountRes.rowCount} baris dari account.`);

      const delUserRes = await client.query(
        `DELETE FROM "user" WHERE id = ANY($1)`,
        [foreignUserIds]
      );
      console.log(`- Terhapus ${delUserRes.rowCount} baris dari "user".`);
    } else {
      console.log("\n[5] Tidak ada user asing untuk dihapus dari tabel auth.");
    }

    // 6. DROP tabel-tabel yang diinjeksi oleh Rania Finance
    console.log("\n[6] Menghapus tabel-tabel Rania Finance (DROP TABLE)...");
    const tablesToDrop = ["fnb_sales", "journal_entries", "user_profiles"];
    for (const table of tablesToDrop) {
      try {
        await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`- Tabel "${table}" berhasil di-DROP.`);
      } catch (e) {
        console.error(`- Gagal men-DROP tabel "${table}":`, e.message);
      }
    }

    console.log("\n=== ROLLBACK DATABASE BERHASIL SELESAI ===");

  } catch (error) {
    console.error("Terjadi error selama eksekusi rollback:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
