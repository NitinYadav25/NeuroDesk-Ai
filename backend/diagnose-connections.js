const axios = require('axios');
const { ChromaClient } = require('chromadb');
require('dotenv').config();

async function checkStatus() {
  const host = process.env.CHROMA_HOST || (process.env.CHROMA_URL ? new URL(process.env.CHROMA_URL).hostname : 'localhost');
  const isCloud = host.includes('trychroma.com');
  const port = process.env.CHROMA_PORT ? parseInt(process.env.CHROMA_PORT) : 
              (isCloud ? 443 : (process.env.CHROMA_URL ? parseInt(new URL(process.env.CHROMA_URL).port) : 8000));
  
  const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

  console.log('--- Diagnostic Report ---');
  
  // Check ChromaDB
  console.log(`Checking ChromaDB at ${host}:${port}...`);
  
  const config = {
    host: host,
    port: port,
    tenant: process.env.CHROMA_TENANT || 'default_tenant',
    database: process.env.CHROMA_DATABASE || 'default_database'
  };

  if (isCloud || process.env.CHROMA_API_KEY || port === 443) {
    config.ssl = true;
  }

  if (process.env.CHROMA_API_KEY) {
    config.headers = {
      "Authorization": `Bearer ${process.env.CHROMA_API_KEY}`,
      "X-Chroma-Token": process.env.CHROMA_API_KEY
    };
  }

  const client = new ChromaClient(config);
  try {
    const heartbeat = await client.heartbeat();
    console.log('✅ ChromaDB: Connected (Heartbeat:', heartbeat, ')');
    
    const collections = await client.listCollections();
    console.log('✅ ChromaDB: Collections:', collections.map(c => c.name).join(', ') || 'None');
  } catch (err) {
    console.error('❌ ChromaDB: Failed to connect.', err.message);
    console.log('Tip: Make sure ChromaDB is running. If using Docker, run:');
    console.log('docker run -p 8000:8000 chromadb/chroma');
  }

  // Check Ollama
  console.log(`\nChecking Ollama at ${OLLAMA_URL}...`);
  try {
    const res = await axios.get(`${OLLAMA_URL}/api/tags`);
    console.log('✅ Ollama: Connected');
    const models = res.data.models || [];
    console.log('✅ Ollama: Available Models:', models.map(m => m.name).join(', ') || 'None');
    
    const hasEmbedModel = models.some(m => m.name.includes('nomic-embed-text'));
    if (hasEmbedModel) {
      console.log('✅ Ollama: nomic-embed-text is available for embeddings.');
    } else {
      console.warn('⚠️  Ollama: nomic-embed-text is MISSING. Document indexing will fail.');
      console.log('Tip: Run `ollama pull nomic-embed-text` to fix this.');
    }
  } catch (err) {
    console.error('❌ Ollama: Failed to connect.', err.message);
    console.log('Tip: Make sure Ollama is running locally.');
  }
}

checkStatus();
