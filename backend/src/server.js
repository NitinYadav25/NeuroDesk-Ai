require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many requests' });
app.use('/api/', limiter);

// ── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// ── Static Files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/memory', require('./routes/memory'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/notes', require('./routes/notes'));

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  const aiService = require('./services/aiService');
  const chromaService = require('./config/chromadb');
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      ollama: aiService.ollamaAvailable,
      chroma: chromaService.available
    }
  });
});

// ── Error Handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const startServer = async () => {
  // Initialize services
  const { initializeDatabase } = require('./config/database');
  const aiService = require('./services/aiService');
  const chromaService = require('./config/chromadb');
  const neo4jService = require('./config/neo4j');
  const redisService = require('./config/redis');
  const storageService = require('./services/storageService');
  const { initializeFirebase } = require('./config/firebase');
  const initializeKeepAlive = require('./services/keepAliveService');

  await initializeDatabase();
  await initializeFirebase();
  initializeKeepAlive();
  await aiService.initialize();
  await chromaService.initialize();
  await neo4jService.initialize();
  await redisService.initialize();
  await storageService.initialize();

  app.listen(PORT, () => {
    console.log(`\n🚀 NeuroDesk AI Backend running on http://localhost:${PORT}`);
    console.log(`📡 AI Status: Ollama=${aiService.ollamaAvailable ? '✅' : '❌'} ChromaDB=${chromaService.available ? '✅' : '❌'} Neo4j=${neo4jService.available ? '✅' : '❌'} Redis=${redisService.available ? '✅' : '❌'}`);
    console.log(`🔑 Cloud Fallback: Groq=${!!process.env.GROQ_API_KEY ? '✅' : '❌'} HuggingFace=${!!process.env.HF_API_KEY ? '✅' : '❌'}\n`);
  });
};

startServer().catch(console.error);
