const pdfParse = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const aiService = require('./aiService');
const chromaService = require('../config/chromadb');
const { v4: uuidv4 } = require('uuid');

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

class DocumentService {
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
        const buffer = fs.readFileSync(filePath);
        const data = await pdfParse(buffer);
        return data.text;
      } else {
        return fs.readFileSync(filePath, 'utf8');
      }
    } catch (err) {
      console.error('Text extraction error:', err.message);
      throw new Error(`Failed to extract text: ${err.message}`);
    }
  }

  async processDocument(documentId, userId, filePath, fileType, title) {
    try {
      const text = await this.extractText(filePath, fileType);
      const chunks = this.chunkText(text);
      console.log(`Processing ${chunks.length} chunks for document ${documentId}`);

      const documents = [];
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await aiService.generateEmbedding(chunk);
        documents.push({
          id: `${documentId}_chunk_${i}`,
          text: chunk,
          embedding,
          metadata: {
            document_id: documentId,
            user_id: userId,
            title,
            chunk_index: i,
            total_chunks: chunks.length
          }
        });
        // Small delay to avoid overwhelming the embedding service
        if (i % 5 === 0 && i > 0) await new Promise(r => setTimeout(r, 500));
      }

      await chromaService.addDocuments(documents);
      return { success: true, chunksProcessed: chunks.length, textLength: text.length };
    } catch (err) {
      console.error('Document processing error:', err.message);
      throw err;
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
        content: `Please provide a comprehensive summary of the following document. Include: key topics, main insights, important findings, and actionable takeaways.\n\nDocument:\n${truncated}`
      }
    ];

    let summary = '';
    for await (const chunk of aiService.streamResponse(messages, model, 
      'You are an expert document analyst. Provide clear, structured summaries.')) {
      summary += chunk;
    }
    return summary;
  }
}

const documentService = new DocumentService();
module.exports = documentService;
