const aiService = require('../services/aiService');
const graphService = require('../services/graphService');
const { v4: uuidv4 } = require('uuid');

// In-memory memory store
const inMemoryMemory = new Map();

class MemoryController {
  async getMemoryItems(req, res) {
    try {
      const items = [];
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          'SELECT * FROM memory_items WHERE user_id = $1 ORDER BY importance DESC, last_accessed DESC',
          [req.user.userId]
        );
        result.rows.forEach(r => items.push(r));
      } catch {
        for (const [, item] of inMemoryMemory) {
          if (item.user_id === req.user.userId) items.push(item);
        }
      }
      res.json({ memory: items });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get memory' });
    }
  }

  async addMemoryItem(req, res) {
    try {
      const { content, category = 'general', importance = 0.5 } = req.body;
      let item = null;
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          'INSERT INTO memory_items (user_id, content, category, importance) VALUES ($1, $2, $3, $4) RETURNING *',
          [req.user.userId, content, category, importance]
        );
        item = result.rows[0];
      } catch {
        item = { id: uuidv4(), user_id: req.user.userId, content, category, importance, access_count: 0, last_accessed: new Date(), created_at: new Date() };
        inMemoryMemory.set(item.id, item);
      }
      res.status(201).json({ item });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add memory' });
    }
  }

  async deleteMemoryItem(req, res) {
    try {
      const { memoryId } = req.params;
      try {
        const { pool } = require('../config/database');
        await pool.query('DELETE FROM memory_items WHERE id = $1 AND user_id = $2', [memoryId, req.user.userId]);
      } catch {
        inMemoryMemory.delete(memoryId);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete memory' });
    }
  }

  async getGraphData(req, res) {
    try {
      const graphData = await graphService.getGraphData();
      
      // Transform for frontend force-graph if needed
      const nodes = graphData.nodes.map(n => ({
        id: n.id,
        label: n.id,
        type: n.type,
        importance: 0.8
      }));
      
      const edges = graphData.links.map(l => ({
        source: l.source,
        target: l.target,
        label: l.label
      }));

      // Fallback to dummy data if graph is empty
      if (nodes.length === 0) {
        nodes.push({ id: 'core', label: 'Neural Core', type: 'system', importance: 1 });
      }

      res.json({ nodes, edges });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get graph data' });
    }
  }

  async getAIStatus(req, res) {
    try {
      const ollamaStatus = await aiService.checkOllamaStatus();
      const models = await aiService.getAvailableModels();
      const chromaService = require('../config/chromadb');
      const neo4jService = require('../config/neo4j');
      const redisService = require('../config/redis');
      const storageService = require('../services/storageService');
      
      res.json({
        status: {
          ollama: { available: ollamaStatus, models },
          chroma: { available: chromaService.available },
          neo4j: { available: neo4jService.available },
          redis: { available: redisService.available },
          storage: { type: storageService.useFirebase ? 'firebase' : 'local' },
          groq: { configured: !!process.env.GROQ_API_KEY },
          huggingface: { configured: !!process.env.HF_API_KEY }
        }
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get AI status' });
    }
  }
}

const memoryController = new MemoryController();
module.exports = { memoryController };
