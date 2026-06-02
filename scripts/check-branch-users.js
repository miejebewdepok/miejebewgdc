// Script untuk cek data transaksi & user di Kasir database
const { Pool } = require("pg");
require("dotenv").config({ path: ".env" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    // Cek semua users dari store_profiles
    console.log("\n=== STORE PROFILES (Users) ===");
    const profiles = await client.query(
      "SELECT user_id, store_name, owner_name FROM store_profiles ORDER BY created_at"
    );
    console.table(profiles.rows);

    // Cek 10 transaksi terbaru beserta userId-nya
    console.log("\n=== 10 TRANSAKSI TERBARU ===");
    const txs = await client.query(
      "SELECT id, user_id, total, created_at FROM transactions ORDER BY created_at DESC LIMIT 10"
    );
    console.table(txs.rows);

    // Hitung jumlah transaksi per userId
    console.log("\n=== TRANSAKSI PER USER ===");
    const counts = await client.query(
      "SELECT user_id, COUNT(*) as jumlah FROM transactions GROUP BY user_id ORDER BY jumlah DESC"
    );
    console.table(counts.rows);

    // Tampilkan mapping branch
    console.log("\n=== MAPPING BRANCH ===");
    const DEPOK_USER_ID = "rWTVcmMLeOWLWyHDJnNNLEwrlYs26fc5";
    const GDC_MASTER_USER_ID = "yY2uZ9lhPK8Xt8RmHixiKTn1PNwbKjMn";
    counts.rows.forEach(r => {
      const branch = r.user_id === DEPOK_USER_ID 
        ? "Cabang 2 (Depok)" 
        : r.user_id === GDC_MASTER_USER_ID 
        ? "Cabang 1 (GDC)"
        : "UNKNOWN!";
      console.log(`  userId: ${r.user_id} → ${branch} (${r.jumlah} transaksi)`);
    });

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
