const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ ERROR: DATABASE_URL tidak ditemukan di .env");
  process.exit(1);
}

const tables = [
  'user',
  'session',
  'account',
  'verification',
  'store_profiles',
  'products',
  'transactions',
  'transaction_items',
  'debts',
  'expenses',
  'ai_chats',
  'ai_messages',
  'saved_bills',
  'customer_promo_claims'
];

async function run() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("⚡ Terhubung ke Supabase database...");

    const backupDir = path.join(__dirname, '../src/db/backup');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dbBackup = {};

    for (const table of tables) {
      console.log(`📦 Menarik data dari tabel "${table}"...`);
      try {
        const res = await client.query(`SELECT * FROM "${table}"`);
        dbBackup[table] = res.rows;
        console.log(`✅ Berhasil mengambil ${res.rows.length} baris dari tabel "${table}".`);
      } catch (err) {
        console.warn(`⚠️ Gagal menarik tabel "${table}":`, err.message);
      }
    }

    // Save full database snapshot with timestamp
    const fullBackupPath = path.join(backupDir, `full-db-backup-${timestamp}.json`);
    fs.writeFileSync(fullBackupPath, JSON.stringify(dbBackup, null, 2), 'utf8');
    console.log(`\n💾 Snapshot lengkap disimpan ke: src/db/backup/full-db-backup-${timestamp}.json`);

    // Also update a standard "latest" snapshot file so we have a fixed file path in git
    const latestBackupPath = path.join(backupDir, `latest-db-backup.json`);
    fs.writeFileSync(latestBackupPath, JSON.stringify(dbBackup, null, 2), 'utf8');
    console.log(`💾 Snapshot terbaru diupdate di: src/db/backup/latest-db-backup.json`);

    // Implement retention policy: keep only the last 5 time-stamped backups
    try {
      const files = fs.readdirSync(backupDir);
      const backupFiles = files
        .filter(file => (file.startsWith('full-db-backup-') || file.startsWith('full-database-backup-')) && file.endsWith('.json'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          time: fs.statSync(path.join(backupDir, file)).mtime.getTime()
        }))
        .sort((a, b) => a.time - b.time); // sort oldest first

      const maxBackups = 5;
      if (backupFiles.length > maxBackups) {
        const toDeleteCount = backupFiles.length - maxBackups;
        console.log(`\n🧹 Retention policy: Menghapus ${toDeleteCount} backup lama...`);
        for (let i = 0; i < toDeleteCount; i++) {
          fs.unlinkSync(backupFiles[i].path);
          console.log(`🗑️ Dihapus: src/db/backup/${backupFiles[i].name}`);
        }
      }
    } catch (e) {
      console.warn("⚠️ Gagal menjalankan retention policy backup:", e.message);
    }

    console.log("\n🎉 SELURUH PROSES BACKUP DATABASE SELESAI DENGAN SUKSES!");
  } catch (err) {
    console.error("❌ Terjadi error sistem saat melakukan backup:", err);
  } finally {
    await client.end();
  }
}

run().catch(console.error);
