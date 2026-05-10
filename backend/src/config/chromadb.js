const axios = require('axios');

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'neurodesk_documents';

class ChromaService {
  constructor() {
    this.baseUrl = CHROMA_URL;
    this.collectionId = null;
    this.available = false;
  }

  async initialize() {
    try {
      await axios.get(`${this.baseUrl}/api/v1/heartbeat`, { timeout: 3000 });
      await this.ensureCollection();
      this.available = true;
      console.log('✅ ChromaDB connected successfully');
    } catch (err) {
      this.available = false;
      console.log('⚠️  ChromaDB unavailable - using in-memory vector store');
    }
  }

  async ensureCollection() {
    try {
      const res = await axios.get(`${this.baseUrl}/api/v1/collections/${COLLECTION_NAME}`);
      this.collectionId = res.data.id;
    } catch {
      const res = await axios.post(`${this.baseUrl}/api/v1/collections`, {
        name: COLLECTION_NAME,
        metadata: { description: 'NeuroDesk AI document embeddings' }
      });
      this.collectionId = res.data.id;
    }
  }

  async addDocuments(documents) {
    if (!this.available) return this._inMemoryAdd(documents);
    try {
      await axios.post(`${this.baseUrl}/api/v1/collections/${this.collectionId}/add`, {
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
      const body = {
        query_embeddings: [embedding],
        n_results: nResults,
        include: ['documents', 'metadatas', 'distances']
      };
      if (Object.keys(where).length > 0) body.where = where;

      const res = await axios.post(
        `${this.baseUrl}/api/v1/collections/${this.collectionId}/query`,
        body
      );
      const results = res.data;
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
      await axios.post(`${this.baseUrl}/api/v1/collections/${this.collectionId}/delete`, {
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
