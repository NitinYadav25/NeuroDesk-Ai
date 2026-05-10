const aiService = require('../services/aiService');
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
      // Generate graph data from documents and memory
      const nodes = [];
      const edges = [];
      const nodeMap = new Map();

      const addNode = (id, label, type, importance = 0.5) => {
        if (!nodeMap.has(id)) {
          nodeMap.set(id, true);
          nodes.push({ id, label, type, importance });
        }
      };

      // Get documents
      try {
        const { pool } = require('../config/database');
        const docs = await pool.query('SELECT id, title FROM documents WHERE user_id = $1 LIMIT 20', [req.user.userId]);
        docs.rows.forEach(doc => addNode(doc.id, doc.title, 'document', 0.8));

        const mems = await pool.query('SELECT id, content, category, importance FROM memory_items WHERE user_id = $1 LIMIT 30', [req.user.userId]);
        mems.rows.forEach(mem => {
          const label = mem.content.slice(0, 40) + (mem.content.length > 40 ? '...' : '');
          addNode(mem.id, label, mem.category || 'memory', mem.importance);
        });

        const convs = await pool.query('SELECT id, title FROM conversations WHERE user_id = $1 LIMIT 10', [req.user.userId]);
        convs.rows.forEach(conv => addNode(conv.id, conv.title || 'Conversation', 'conversation', 0.6));
      } catch {
        for (const [, item] of inMemoryMemory) {
          if (item.user_id === req.user.userId) {
            const label = item.content.slice(0, 40) + '...';
            addNode(item.id, label, item.category || 'memory', item.importance);
          }
        }
      }

      // Create edges based on categories
      const nodeList = nodes;
      for (let i = 0; i < nodeList.length; i++) {
        for (let j = i + 1; j < nodeList.length; j++) {
          if (nodeList[i].type === nodeList[j].type && Math.random() > 0.6) {
            edges.push({ source: nodeList[i].id, target: nodeList[j].id, weight: Math.random() });
          }
        }
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
      
      res.json({
        status: {
          ollama: { available: ollamaStatus, models },
          chroma: { available: chromaService.available },
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
