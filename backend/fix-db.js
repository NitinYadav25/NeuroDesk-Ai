const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || 'neurodesk',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

async function fixDatabase() {
  try {
    console.log('Attempting to update database for Google Auth...');
    
    // 1. Make password_hash nullable
    await pool.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL');
    console.log('✅ Updated password_hash to be optional');

    // 2. Add firebase_uid column if it doesn't exist
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='firebase_uid') THEN
          ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(255) UNIQUE;
        END IF;
      END $$;
    `);
    console.log('✅ Checked/Added firebase_uid column');
    
    console.log('\n🚀 Database is now fully ready for Google Auth!');
    
    // 3. Show current users
    const result = await pool.query('SELECT id, email, username FROM users LIMIT 5');
    console.log('\nCurrent Users in DB:');
    console.table(result.rows);

  } catch (err) {
    console.error('❌ Error updating database:', err.message);
  } finally {
    await pool.end();
  }
}

fixDatabase();
