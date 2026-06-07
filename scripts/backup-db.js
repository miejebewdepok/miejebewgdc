require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const BACKUP_FILE = path.join(BACKUP_DIR, `db-backup-${TIMESTAMP}.sql`);

if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

const connStr = process.env.DATABASE_URL || process.env.BETTER_AUTH_DB_URL;
if (!connStr) {
  console.error('No DATABASE_URL or BETTER_AUTH_DB_URL found in .env');
  process.exit(1);
}

const pool = new Pool({
  connectionString: connStr,
  ssl: { rejectUnauthorized: false },
  max: 4,
  idleTimeoutMillis: 1000,
});

(async () => {
  try {
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected');

    // Get all user tables
    const tablesRes = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    const tables = tablesRes.rows.map(r => r.tablename);
    console.log(`📋 Found tables: ${tables.join(', ')}`);

    let sql = `-- Database Backup: ${TIMESTAMP}\n-- Source: ${connStr.replace(/\/\/.*@/, '//***@')}\n\n`;

    for (const table of tables) {
      console.log(`📦 Backing up table: ${table}`);
      const rows = await client.query(`SELECT * FROM "${table}"`);
      
      if (rows.rows.length === 0) {
        sql += `-- Table ${table}: 0 rows\n\n`;
        continue;
      }

      sql += `-- Table ${table}: ${rows.rows.length} rows\n`;
      
      for (const row of rows.rows) {
        const columns = Object.keys(row).map(k => `"${k}"`).join(', ');
        const values = Object.values(row).map(v => {
          if (v === null) return 'NULL';
          if (typeof v === 'number') return v;
          if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
          if (v instanceof Date) return `'${v.toISOString()}'`;
          return `'${String(v).replace(/'/g, "''")}'`;
        }).join(', ');
        sql += `INSERT INTO "${table}" (${columns}) VALUES (${values});\n`;
      }
      sql += '\n';
    }

    fs.writeFileSync(BACKUP_FILE, sql, 'utf-8');
    const sizeKB = (fs.statSync(BACKUP_FILE).size / 1024).toFixed(2);
    console.log(`\n✅ Backup saved: ${BACKUP_FILE}`);
    console.log(`📊 Size: ${sizeKB} KB`);

    client.release();
    await pool.end();
  } catch (err) {
    console.error('❌ Backup failed:', err.message);
    process.exit(1);
  }
})();
