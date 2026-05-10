const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT) || 5432,
  database: process.env.PG_DATABASE || 'neurodesk',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

const initializeDatabase = async () => {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    console.log('⚠️  PostgreSQL unavailable - using in-memory storage');
    return;
  }
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        preferences JSONB DEFAULT '{}'::jsonb
      );

      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        content TEXT,
        file_path TEXT,
        file_type VARCHAR(50),
        file_size INTEGER,
        embedding_status VARCHAR(50) DEFAULT 'pending',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500),
        model VARCHAR(100) DEFAULT 'mistral',
        agent_type VARCHAR(100) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        tokens_used INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500),
        content TEXT,
        tags TEXT[],
        document_ids UUID[],
        is_pinned BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS memory_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        category VARCHAR(100),
        importance FLOAT DEFAULT 0.5,
        access_count INTEGER DEFAULT 0,
        last_accessed TIMESTAMP DEFAULT NOW(),
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
      CREATE INDEX IF NOT EXISTS idx_memory_user_id ON memory_items(user_id);
    `);
    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    console.log('⚠️  Running without PostgreSQL - using in-memory storage');
  } finally {
    client.release();
  }
};

module.exports = { pool, initializeDatabase };
