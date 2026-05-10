const { v4: uuidv4 } = require('uuid');

// In-memory notes store
const inMemoryNotes = new Map();

class NotesController {
  async getNotes(req, res) {
    try {
      const notes = [];
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          'SELECT * FROM notes WHERE user_id = $1 ORDER BY is_pinned DESC, updated_at DESC',
          [req.user.userId]
        );
        result.rows.forEach(r => notes.push(r));
      } catch {
        for (const [, note] of inMemoryNotes) {
          if (note.user_id === req.user.userId) notes.push(note);
        }
        notes.sort((a, b) => (b.is_pinned - a.is_pinned) || (new Date(b.updated_at) - new Date(a.updated_at)));
      }
      res.json({ notes });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get notes' });
    }
  }

  async createNote(req, res) {
    try {
      const { title = 'Untitled Note', content = '', tags = [] } = req.body;
      let note = null;
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          'INSERT INTO notes (user_id, title, content, tags) VALUES ($1, $2, $3, $4) RETURNING *',
          [req.user.userId, title, content, tags]
        );
        note = result.rows[0];
      } catch {
        note = { id: uuidv4(), user_id: req.user.userId, title, content, tags, is_pinned: false, created_at: new Date(), updated_at: new Date() };
        inMemoryNotes.set(note.id, note);
      }
      res.status(201).json({ note });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create note' });
    }
  }

  async updateNote(req, res) {
    try {
      const { noteId } = req.params;
      const { title, content, tags, is_pinned } = req.body;
      let note = null;
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          `UPDATE notes SET title = COALESCE($1, title), content = COALESCE($2, content),
           tags = COALESCE($3, tags), is_pinned = COALESCE($4, is_pinned), updated_at = NOW()
           WHERE id = $5 AND user_id = $6 RETURNING *`,
          [title, content, tags, is_pinned, noteId, req.user.userId]
        );
        note = result.rows[0];
      } catch {
        note = inMemoryNotes.get(noteId);
        if (note) {
          if (title !== undefined) note.title = title;
          if (content !== undefined) note.content = content;
          if (tags !== undefined) note.tags = tags;
          if (is_pinned !== undefined) note.is_pinned = is_pinned;
          note.updated_at = new Date();
        }
      }
      if (!note) return res.status(404).json({ error: 'Note not found' });
      res.json({ note });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update note' });
    }
  }

  async deleteNote(req, res) {
    try {
      const { noteId } = req.params;
      try {
        const { pool } = require('../config/database');
        await pool.query('DELETE FROM notes WHERE id = $1 AND user_id = $2', [noteId, req.user.userId]);
      } catch {
        inMemoryNotes.delete(noteId);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete note' });
    }
  }

  async generateAINote(req, res) {
    try {
      const { prompt, documentIds = [] } = req.body;
      const aiService = require('../services/aiService');
      const documentService = require('../services/documentService');

      let contextText = '';
      if (documentIds.length > 0) {
        const context = await documentService.retrieveContext(prompt, req.user.userId, documentIds);
        contextText = context.map(c => c.text).join('\n\n');
      }

      const systemPrompt = `You are an expert note-taker and knowledge organizer.
Generate a well-structured note with: Title, Summary, Key Points, Details, and Action Items.
Use markdown formatting with clear headings and bullet points.
${contextText ? `\nContext from documents:\n${contextText}` : ''}`;

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      for await (const chunk of aiService.streamResponse(
        [{ role: 'user', content: prompt }], 'mistral', systemPrompt
      )) {
        res.write(`data: ${JSON.stringify({ token: chunk })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate note' });
    }
  }
}

const notesController = new NotesController();
module.exports = { notesController };
