require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

(async () => {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    console.error('Missing DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  try {
    const res = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user' AND column_name = 'isApproved'
    `);
    if (res.rows.length > 0) {
      console.log('OK: isApproved already exists');
      return;
    }

    await pool.query(`ALTER TABLE "user" ADD COLUMN "isApproved" boolean`);
    console.log('ADDED: isApproved column added to user table');
  } catch (err) {
    console.error('DB_CHECK_ERR', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
