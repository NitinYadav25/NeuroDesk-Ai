const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const HF_API_KEY = process.env.HF_API_KEY || '';

class AIService {
  constructor() {
    this.ollamaAvailable = false;
    this.defaultModel = process.env.DEFAULT_MODEL || 'mistral';
  }

  async initialize() {
    try {
      await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
      this.ollamaAvailable = true;
      console.log('✅ Ollama connected successfully');
    } catch {
      this.ollamaAvailable = false;
      console.log('⚠️  Ollama unavailable - will use cloud fallback');
    }
  }

  async generateEmbedding(text) {
    // Try Ollama embedding first
    if (this.ollamaAvailable) {
      try {
        const res = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
          model: 'nomic-embed-text',
          prompt: text
        }, { timeout: 15000 });
        return res.data.embedding;
      } catch {}
    }

    // Fallback: HuggingFace
    if (HF_API_KEY) {
      try {
        const res = await axios.post(
          'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2',
          { inputs: text },
          { headers: { Authorization: `Bearer ${HF_API_KEY}` }, timeout: 15000 }
        );
        return Array.isArray(res.data[0]) ? res.data[0] : res.data;
      } catch {}
    }

    // Simple hash-based embedding fallback (384 dims)
    return this._hashEmbedding(text);
  }

  _hashEmbedding(text) {
    const dim = 384;
    const embedding = new Array(dim).fill(0);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      embedding[i % dim] += Math.sin(code * (i + 1));
    }
    const mag = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    return embedding.map(v => v / (mag + 1e-10));
  }

  async *streamResponse(messages, model, systemPrompt) {
    const fullMessages = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    // Try Ollama
    if (this.ollamaAvailable) {
      try {
        const res = await axios.post(`${OLLAMA_URL}/api/chat`, {
          model: model || this.defaultModel,
          messages: fullMessages,
          stream: true
        }, { responseType: 'stream', timeout: 60000 });

        let buffer = '';
        for await (const chunk of res.data) {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.message?.content) yield data.message.content;
              if (data.done) return;
            } catch {}
          }
        }
        return;
      } catch (err) {
        console.log('Ollama stream error, falling back:', err.message);
      }
    }

    // Groq fallback
    if (GROQ_API_KEY) {
      try {
        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: 'mixtral-8x7b-32768',
          messages: fullMessages,
          stream: true,
          max_tokens: 2048
        }, {
          headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
          responseType: 'stream',
          timeout: 60000
        });

        let buffer = '';
        for await (const chunk of res.data) {
          buffer += chunk.toString();
          const lines = buffer.split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') return;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) yield content;
            } catch {}
          }
        }
        return;
      } catch (err) {
        console.log('Groq error, falling back:', err.message);
      }
    }

    // HuggingFace fallback (non-streaming)
    if (HF_API_KEY) {
      try {
        const prompt = fullMessages.map(m => `${m.role}: ${m.content}`).join('\n') + '\nassistant:';
        const res = await axios.post(
          'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
          { inputs: prompt, parameters: { max_new_tokens: 1024, return_full_text: false } },
          { headers: { Authorization: `Bearer ${HF_API_KEY}` }, timeout: 60000 }
        );
        const text = res.data[0]?.generated_text || 'No response generated.';
        yield text;
        return;
      } catch (err) {
        console.log('HF error:', err.message);
      }
    }

    yield 'I apologize, but no AI model is currently available. Please ensure Ollama is running locally or configure a cloud API key (GROQ_API_KEY or HF_API_KEY) in your .env file.';
  }

  async getAvailableModels() {
    const models = [];
    if (this.ollamaAvailable) {
      try {
        const res = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
        res.data.models?.forEach(m => models.push({ name: m.name, source: 'ollama', size: m.size }));
      } catch {}
    }
    return models;
  }

  async checkOllamaStatus() {
    try {
      await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
      this.ollamaAvailable = true;
      return true;
    } catch {
      this.ollamaAvailable = false;
      return false;
    }
  }
}

const aiService = new AIService();
module.exports = aiService;
