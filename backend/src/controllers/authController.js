const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'neurodesk-ai-secret-key-change-in-production';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';

// In-memory user store (falls back when DB is unavailable)
let inMemoryUsers = [];

class AuthController {
  async register(req, res) {
    try {
      const { email, username, password } = req.body;
      if (!email || !username || !password) {
        return res.status(400).json({ error: 'Email, username, and password are required' });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      // Try PostgreSQL first
      try {
        const { pool } = require('../config/database');
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) return res.status(409).json({ error: 'Email already registered' });
        
        const hash = await bcrypt.hash(password, 12);
        const result = await pool.query(
          'INSERT INTO users (email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, created_at',
          [email, username, hash]
        );
        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
        return res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username } });
      } catch (dbErr) {
        // Fallback to in-memory
      }

      if (inMemoryUsers.find(u => u.email === email)) {
        return res.status(409).json({ error: 'Email already registered' });
      }
      const hash = await bcrypt.hash(password, 12);
      const user = { id: uuidv4(), email, username, password_hash: hash, created_at: new Date() };
      inMemoryUsers.push(user);
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
      return res.status(201).json({ token, user: { id: user.id, email: user.email, username: user.username } });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

      let user = null;
      try {
        const { pool } = require('../config/database');
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        user = result.rows[0];
      } catch {}

      if (!user) user = inMemoryUsers.find(u => u.email === email);
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
      return res.json({ token, user: { id: user.id, email: user.email, username: user.username } });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async getProfile(req, res) {
    try {
      let user = null;
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          'SELECT id, email, username, avatar_url, created_at, preferences FROM users WHERE id = $1',
          [req.user.userId]
        );
        user = result.rows[0];
      } catch {}
      if (!user) user = inMemoryUsers.find(u => u.id === req.user.userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user: { id: user.id, email: user.email, username: user.username, created_at: user.created_at } });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }
}

const authController = new AuthController();

// Middleware
const authenticate = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = { authController, authenticate };
