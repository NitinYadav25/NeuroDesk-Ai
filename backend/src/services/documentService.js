const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const aiService = require('./aiService');
const chromaService = require('../config/chromadb');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

class DocumentService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  chunkText(text) {
    const chunks = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length);
      let chunkEnd = end;
      if (end < text.length) {
        const lastPeriod = text.lastIndexOf('.', end);
        const lastNewline = text.lastIndexOf('\n', end);
        const breakPoint = Math.max(lastPeriod, lastNewline);
        if (breakPoint > start + CHUNK_SIZE * 0.5) chunkEnd = breakPoint + 1;
      }
      const chunk = text.slice(start, chunkEnd).trim();
      if (chunk.length > 50) chunks.push(chunk);
      start = chunkEnd - CHUNK_OVERLAP;
      if (start >= text.length) break;
    }
    return chunks;
  }

  async extractText(filePath, fileType) {
    try {
      if (fileType === 'pdf' || filePath.endsWith('.pdf')) {
        // Read file in chunks if possible, but pdf-parse needs a buffer
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        // Clear buffer reference
        const text = data.text;
        return text;
      } else {
        return fs.readFileSync(filePath, 'utf8');
      }
    } catch (err) {
      console.error('Text extraction error:', err.message);
      throw new Error(`Failed to extract text: ${err.message}`);
    }
  }

  // Queue wrapper to prevent multiple heavy extractions at once
  async processDocument(documentId, userId, filePath, fileType, title) {
    return new Promise((resolve, reject) => {
      this.queue.push({ documentId, userId, filePath, fileType, title, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    const job = this.queue.shift();

    try {
      console.log(`🚀 Starting processing for ${job.title} (${job.documentId})...`);
      let text = await this.extractText(job.filePath, job.fileType);
      const chunks = this.chunkText(text);
      
      // CRITICAL: Clear text reference to free memory
      text = null;
      if (global.gc) global.gc();

      console.log(`📄 Document chunked into ${chunks.length} pieces.`);

      const BATCH_SIZE = 15; // Smaller batch size for stability
      let chunksProcessed = 0;

      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batchChunks = chunks.slice(i, i + BATCH_SIZE);
        const documents = [];

        for (let j = 0; j < batchChunks.length; j++) {
          const chunk = batchChunks[j];
          const embedding = await aiService.generateEmbedding(chunk);
          
          const chunkId = `${job.documentId}_chunk_${i + j}`;
          documents.push({
            id: chunkId,
            text: chunk,
            embedding,
            metadata: {
              document_id: job.documentId,
              user_id: job.userId,
              title: job.title,
              chunk_index: i + j,
              total_chunks: chunks.length
            }
          });

          // Persistent storage in Postgres
          try {
            await pool.query(
              'INSERT INTO document_chunks (document_id, chunk_index, content) VALUES ($1, $2, $3)',
              [job.documentId, i + j, chunk]
            );
          } catch (pgErr) {
            console.error(`  ⚠️  Postgres chunk error:`, pgErr.message);
          }
        }

        await chromaService.addDocuments(documents);
        chunksProcessed += batchChunks.length;
        console.log(`  ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} done (${chunksProcessed}/${chunks.length})`);
        
        // Brief rest to let event loop and GC breathe
        await new Promise(r => setTimeout(r, 300));
        if (global.gc) global.gc();
      }

      job.resolve({ success: true, chunksProcessed: chunks.length });
    } catch (err) {
      console.error(`❌ Job failed for ${job.documentId}:`, err.message);
      job.reject(err);
    } finally {
      this.isProcessing = false;
      this.processQueue(); // Process next in queue
    }
  }

  async retrieveContext(query, userId, documentIds = [], topK = 5) {
    const embedding = await aiService.generateEmbedding(query);
    const where = { user_id: userId };
    if (documentIds.length === 1) where.document_id = documentIds[0];
    
    const results = await chromaService.queryDocuments(embedding, topK, where);
    return results;
  }

  async generateSummary(text, model) {
    const truncated = text.slice(0, 4000);
    const messages = [
      {
        role: 'user',
        content: `Summarize this document:\n\n${truncated}`
      }
    ];

    let summary = '';
    for await (const chunk of aiService.streamResponse(messages, model, 'Summarize clearly.')) {
      summary += chunk;
    }
    return summary;
  }
}

const documentService = new DocumentService();
module.exports = documentService;

