const { v4: uuidv4 } = require('uuid');
const { orchestrator } = require('../ai/orchestrator');
const aiService = require('../services/aiService');

// In-memory conversation store
const inMemoryConversations = new Map();
const inMemoryMessages = new Map();

class ChatController {
  async getConversations(req, res) {
    try {
      const conversations = [];
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          'SELECT id, title, model, agent_type, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
          [req.user.userId]
        );
        result.rows.forEach(r => conversations.push(r));
      } catch {
        for (const [, conv] of inMemoryConversations) {
          if (conv.user_id === req.user.userId) conversations.push(conv);
        }
        conversations.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      }
      res.json({ conversations });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get conversations' });
    }
  }

  async createConversation(req, res) {
    try {
      const { title = 'New Conversation', model = 'mistral', agentType = 'general' } = req.body;
      let conv = null;
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          'INSERT INTO conversations (user_id, title, model, agent_type) VALUES ($1, $2, $3, $4) RETURNING *',
          [req.user.userId, title, model, agentType]
        );
        conv = result.rows[0];
      } catch {
        conv = { id: uuidv4(), user_id: req.user.userId, title, model, agent_type: agentType, created_at: new Date(), updated_at: new Date() };
        inMemoryConversations.set(conv.id, conv);
      }
      res.status(201).json({ conversation: conv });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  }

  async getMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const messages = [];
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
          [conversationId]
        );
        result.rows.forEach(r => messages.push(r));
      } catch {
        const msgs = inMemoryMessages.get(conversationId) || [];
        msgs.forEach(m => messages.push(m));
      }
      res.json({ messages });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get messages' });
    }
  }

  async streamChat(req, res) {
    const { conversationId } = req.params;
    const { message, documentIds = [], explainReasoning = false, model } = req.body;

    if (!message) return res.status(400).json({ error: 'Message required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      // Get conversation history
      let history = [];
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          'SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 20',
          [conversationId]
        );
        history = result.rows;
      } catch {
        history = (inMemoryMessages.get(conversationId) || []).slice(-20);
      }

      // Get conversation model
      let convModel = model || 'mistral';
      try {
        const { pool } = require('../config/database');
        const result = await pool.query('SELECT model FROM conversations WHERE id = $1', [conversationId]);
        if (result.rows[0]) convModel = model || result.rows[0].model;
      } catch {}

      // Save user message
      await this._saveMessage(conversationId, 'user', message);

      // Stream through orchestrator
      let fullResponse = '';
      for await (const chunk of orchestrator.orchestrate(message, req.user.userId, history, {
        documentIds, explainReasoning, model: convModel
      })) {
        res.write(`data: ${chunk}\n`);
        try {
          const parsed = JSON.parse(chunk.trim());
          if (parsed.type === 'token') fullResponse += parsed.data;
        } catch {}
      }

      // Save assistant message
      if (fullResponse) await this._saveMessage(conversationId, 'assistant', fullResponse);

      // Update conversation title if first message
      if (history.length === 0) {
        const shortTitle = message.slice(0, 80) + (message.length > 80 ? '...' : '');
        try {
          const { pool } = require('../config/database');
          await pool.query('UPDATE conversations SET title = $1, updated_at = NOW() WHERE id = $2', [shortTitle, conversationId]);
        } catch {
          const conv = inMemoryConversations.get(conversationId);
          if (conv) { conv.title = shortTitle; conv.updated_at = new Date(); }
        }
      }

      res.write('data: [DONE]\n\n');
    } catch (err) {
      console.error('Stream chat error:', err);
      res.write(`data: ${JSON.stringify({ type: 'error', data: err.message })}\n`);
    } finally {
      res.end();
    }
  }

  async _saveMessage(conversationId, role, content) {
    try {
      const { pool } = require('../config/database');
      await pool.query(
        'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)',
        [conversationId, role, content]
      );
    } catch {
      const msgs = inMemoryMessages.get(conversationId) || [];
      msgs.push({ id: uuidv4(), conversation_id: conversationId, role, content, created_at: new Date() });
      inMemoryMessages.set(conversationId, msgs);
    }
  }

  async deleteConversation(req, res) {
    try {
      const { conversationId } = req.params;
      try {
        const { pool } = require('../config/database');
        await pool.query('DELETE FROM conversations WHERE id = $1 AND user_id = $2', [conversationId, req.user.userId]);
      } catch {
        inMemoryConversations.delete(conversationId);
        inMemoryMessages.delete(conversationId);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete conversation' });
    }
  }
}

const chatController = new ChatController();
module.exports = { chatController };
