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
      console.log('⚠️  Ollama unavailable - using cloud fallback');
    }
    
    // Debug cloud keys
    if (GROQ_API_KEY) console.log('✅ Groq API Key detected');
    else console.log('❌ Groq API Key missing');
    if (HF_API_KEY) console.log('✅ HuggingFace API Key detected');
    else console.log('❌ HuggingFace API Key missing');
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

    const requestedModel = model || this.defaultModel;

    // Try Ollama
    if (this.ollamaAvailable) {
      try {
        // Verify model exists first to avoid long timeouts/errors
        const modelsRes = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 2000 });
        const exists = modelsRes.data.models?.some(m => m.name.split(':')[0] === requestedModel.split(':')[0]);
        
        if (exists) {
          const res = await axios.post(`${OLLAMA_URL}/api/chat`, {
            model: requestedModel,
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
        } else {
          console.log(`⚠️  Ollama model "${requestedModel}" not found, falling back to cloud...`);
        }
      } catch (err) {
        console.log('Ollama stream error, falling back:', err.message);
      }
    }

    // Groq fallback
    if (GROQ_API_KEY) {
      try {
        console.log('☁️  Attempting Groq fallback (llama-3.3-70b-versatile)...');
        const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: 'llama-3.3-70b-versatile',
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
            const cleanLine = line.trim();
            if (!cleanLine.startsWith('data: ')) continue;
            const data = cleanLine.slice(6).trim();
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
        console.error('❌ Groq error:', err.response?.data || err.message);
      }
    }

    // HuggingFace fallback (non-streaming)
    if (HF_API_KEY) {
      try {
        console.log('☁️  Attempting HuggingFace fallback...');
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
        console.error('❌ HF error:', err.response?.data || err.message);
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
    // Add cloud models if API keys are present
    if (GROQ_API_KEY) {
      models.push({ name: 'llama-3.3-70b (Groq)', source: 'cloud', size: 'Cloud' });
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
