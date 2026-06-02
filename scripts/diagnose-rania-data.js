const { Pool } = require("pg");
require("dotenv").config();

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log("=== MEMERIKSA DATA RANIA FINANCE DI DATABASE ===");

    // 1. fnb_sales
    try {
      const fnbRes = await client.query("SELECT COUNT(*) FROM fnb_sales");
      console.log(`- Jumlah baris di fnb_sales: ${fnbRes.rows[0].count}`);
      if (parseInt(fnbRes.rows[0].count) > 0) {
        const samples = await client.query("SELECT * FROM fnb_sales LIMIT 5");
        console.log("  Contoh data fnb_sales:");
        console.table(samples.rows);
      }
    } catch (e) {
      console.log(`- Gagal membaca fnb_sales: ${e.message}`);
    }

    // 2. journal_entries
    try {
      const journalRes = await client.query("SELECT COUNT(*) FROM journal_entries");
      console.log(`- Jumlah baris di journal_entries: ${journalRes.rows[0].count}`);
      if (parseInt(journalRes.rows[0].count) > 0) {
        const samples = await client.query("SELECT * FROM journal_entries LIMIT 5");
        console.log("  Contoh data journal_entries:");
        console.table(samples.rows);
      }
    } catch (e) {
      console.log(`- Gagal membaca journal_entries: ${e.message}`);
    }

    // 3. user_profiles
    try {
      const profileRes = await client.query("SELECT COUNT(*) FROM user_profiles");
      console.log(`- Jumlah baris di user_profiles: ${profileRes.rows[0].count}`);
      if (parseInt(profileRes.rows[0].count) > 0) {
        const samples = await client.query("SELECT * FROM user_profiles LIMIT 5");
        console.log("  Contoh data user_profiles:");
        console.table(samples.rows);
      }
    } catch (e) {
      console.log(`- Gagal membaca user_profiles: ${e.message}`);
    }

    // 4. Memeriksa relasi user dengan data kasir
    console.log("\n=== MEMERIKSA DATA TRANSAKSI KASIR ===");
    const tables = ["transactions", "expenses", "debts", "saved_bills"];
    for (const table of tables) {
      try {
        const countRes = await client.query(`SELECT COUNT(*) FROM "${table}"`);
        console.log(`- Jumlah baris di ${table}: ${countRes.rows[0].count}`);
        if (parseInt(countRes.rows[0].count) > 0) {
          const userGroup = await client.query(`
            SELECT user_id, COUNT(*) as jml FROM "${table}" GROUP BY user_id
          `);
          console.log(`  Pengelompokan user_id di ${table}:`);
          console.table(userGroup.rows);
        }
      } catch (e) {
        console.log(`- Gagal membaca ${table}: ${e.message}`);
      }
    }

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
