const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || 'neurodesk',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

async function checkUsers() {
  try {
    const result = await pool.query('SELECT id, email, username, firebase_uid, created_at FROM users ORDER BY created_at DESC LIMIT 5');
    console.log('\n=== Recent Registered Users ===');
    if (result.rows.length === 0) {
      console.log('No users found in database.');
    } else {
      console.table(result.rows);
    }
  } catch (err) {
    console.error('Error checking database:', err.message);
  } finally {
    await pool.end();
  }
}

checkUsers();
