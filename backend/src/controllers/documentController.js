const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const documentService = require('../services/documentService');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.txt', '.md', '.markdown'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only PDF, TXT, and Markdown files are supported'));
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

// In-memory document store
const inMemoryDocs = new Map();

class DocumentController {
  getUploadMiddleware() {
    return upload.single('file');
  }

  async uploadDocument(req, res) {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const { title } = req.body;
      const docTitle = title || req.file.originalname.replace(/\.[^.]+$/, '');
      const fileType = path.extname(req.file.originalname).slice(1).toLowerCase();
      const docId = uuidv4();

      // Save metadata
      let doc = null;
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          `INSERT INTO documents (id, user_id, title, file_path, file_type, file_size, embedding_status)
           VALUES ($1, $2, $3, $4, $5, $6, 'processing') RETURNING *`,
          [docId, req.user.userId, docTitle, req.file.path, fileType, req.file.size]
        );
        doc = result.rows[0];
      } catch {
        doc = {
          id: docId, user_id: req.user.userId, title: docTitle,
          file_path: req.file.path, file_type: fileType, file_size: req.file.size,
          embedding_status: 'processing', created_at: new Date()
        };
        inMemoryDocs.set(docId, doc);
      }

      // Process async
      res.status(201).json({ document: doc, message: 'Document uploaded and processing started' });

      // Background processing
      documentService.processDocument(docId, req.user.userId, req.file.path, fileType, docTitle)
        .then(async (result) => {
          try {
            const { pool } = require('../config/database');
            await pool.query(
              'UPDATE documents SET embedding_status = $1, metadata = $2 WHERE id = $3',
              ['completed', JSON.stringify(result), docId]
            );
          } catch {
            const d = inMemoryDocs.get(docId);
            if (d) { d.embedding_status = 'completed'; d.metadata = result; }
          }
          console.log(`✅ Document ${docId} processed: ${result.chunksProcessed} chunks`);
        })
        .catch(async (err) => {
          console.error(`❌ Document ${docId} processing failed:`, err.message);
          try {
            const { pool } = require('../config/database');
            await pool.query('UPDATE documents SET embedding_status = $1 WHERE id = $2', ['failed', docId]);
          } catch {}
        });
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message });
    }
  }

  async getDocuments(req, res) {
    try {
      const docs = [];
      try {
        const { pool } = require('../config/database');
        const result = await pool.query(
          'SELECT id, title, file_type, file_size, embedding_status, created_at, metadata FROM documents WHERE user_id = $1 ORDER BY created_at DESC',
          [req.user.userId]
        );
        result.rows.forEach(r => docs.push(r));
      } catch {
        for (const [, doc] of inMemoryDocs) {
          if (doc.user_id === req.user.userId) docs.push(doc);
        }
      }
      res.json({ documents: docs });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get documents' });
    }
  }

  async deleteDocument(req, res) {
    try {
      const { documentId } = req.params;
      let filePath = null;
      try {
        const { pool } = require('../config/database');
        const result = await pool.query('SELECT file_path FROM documents WHERE id = $1 AND user_id = $2', [documentId, req.user.userId]);
        if (result.rows[0]) filePath = result.rows[0].file_path;
        await pool.query('DELETE FROM documents WHERE id = $1 AND user_id = $2', [documentId, req.user.userId]);
      } catch {
        const doc = inMemoryDocs.get(documentId);
        if (doc) { filePath = doc.file_path; inMemoryDocs.delete(documentId); }
      }
      if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
      await require('../config/chromadb').deleteByDocumentId(documentId);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  async getDocumentStatus(req, res) {
    try {
      const { documentId } = req.params;
      let doc = null;
      try {
        const { pool } = require('../config/database');
        const result = await pool.query('SELECT id, title, embedding_status, metadata FROM documents WHERE id = $1', [documentId]);
        doc = result.rows[0];
      } catch {
        doc = inMemoryDocs.get(documentId);
      }
      if (!doc) return res.status(404).json({ error: 'Document not found' });
      res.json({ document: doc });
    } catch (err) {
      res.status(500).json({ error: 'Failed to get status' });
    }
  }
}

const documentController = new DocumentController();
module.exports = { documentController };
