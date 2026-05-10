const { ChromaClient } = require('chromadb');

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'neurodesk_documents';

class ChromaService {
  constructor() {
    this.client = new ChromaClient({ path: CHROMA_URL });
    this.collection = null;
    this.available = false;
  }

  async initialize() {
    try {
      await this.client.heartbeat();
      await this.ensureCollection();
      this.available = true;
      console.log('✅ ChromaDB connected successfully');
    } catch (err) {
      this.available = false;
      console.log(`⚠️  ChromaDB unavailable (${err.message}) - using in-memory vector store`);
    }
  }

  async ensureCollection() {
    try {
      this.collection = await this.client.getOrCreateCollection({
        name: COLLECTION_NAME,
        metadata: { "description": "NeuroDesk AI document embeddings" },
        embeddingFunction: { generate: (texts) => texts.map(() => []) }
      });
    } catch (err) {
      throw err;
    }
  }

  async addDocuments(documents) {
    if (!this.available) return this._inMemoryAdd(documents);
    try {
      await this.collection.add({
        ids: documents.map(d => d.id),
        embeddings: documents.map(d => d.embedding),
        documents: documents.map(d => d.text),
        metadatas: documents.map(d => d.metadata || {})
      });
      return true;
    } catch (err) {
      console.error('ChromaDB add error:', err.message);
      return false;
    }
  }

  async queryDocuments(embedding, nResults = 5, where = {}) {
    if (!this.available) return this._inMemoryQuery(embedding, nResults);
    try {
      const results = await this.collection.query({
        queryEmbeddings: [embedding],
        nResults: nResults,
        where: Object.keys(where).length > 0 ? where : undefined,
      });
      
      if (!results.documents || !results.documents[0]) return [];
      
      return results.documents[0].map((doc, i) => ({
        text: doc,
        metadata: results.metadatas[0][i],
        distance: results.distances[0][i],
        score: 1 - results.distances[0][i]
      }));
    } catch (err) {
      console.error('ChromaDB query error:', err.message);
      return [];
    }
  }

  async deleteByDocumentId(documentId) {
    if (!this.available) return;
    try {
      await this.collection.delete({
        where: { document_id: documentId }
      });
    } catch (err) {
      console.error('ChromaDB delete error:', err.message);
    }
  }

  // In-memory fallback
  _inMemoryStore = [];

  _inMemoryAdd(documents) {
    documents.forEach(doc => this._inMemoryStore.push(doc));
    return true;
  }

  _inMemoryQuery(embedding, nResults) {
    if (this._inMemoryStore.length === 0) return [];
    const scored = this._inMemoryStore.map(doc => {
      const score = this._cosineSimilarity(embedding, doc.embedding);
      return { text: doc.text, metadata: doc.metadata, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, nResults);
  }

  _cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10);
  }
}

const chromaService = new ChromaService();
module.exports = chromaService;
