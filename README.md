# 🧠 NeuroDesk AI — Knowledge Operating System

A full-stack AI-powered Knowledge Operating System with persistent memory, RAG pipelines, multi-agent AI, and offline support.

## ✨ Features

- **AI Chat** with real-time streaming responses (SSE)
- **Document Intelligence** — Upload PDFs/TXT/Markdown, auto-indexed via RAG
- **Multi-Agent System** — Research, Summary, Code, Decision agents
- **Persistent Memory** — Conversations, notes, and knowledge stored long-term
- **Knowledge Graph** — Interactive force-directed visualization
- **Local AI First** — Runs 100% offline with Ollama (Mistral, LLaMA3, Gemma)
- **Cloud Fallback** — Groq and HuggingFace when local AI is unavailable
- **Dark Mode** — Modern glassmorphism UI

---

## 🏗 Architecture

```
NeuroDesk AI
├── frontend/          # Next.js 15 + Tailwind CSS v4
│   ├── src/app/
│   │   ├── (app)/     # Protected app routes
│   │   │   ├── dashboard/
│   │   │   ├── chat/
│   │   │   ├── documents/
│   │   │   ├── notes/
│   │   │   ├── graph/
│   │   │   └── settings/
│   │   ├── login/
│   │   └── register/
│   └── src/store/     # Zustand state management
│
└── backend/           # Node.js + Express
    └── src/
        ├── ai/
        │   └── orchestrator.js    # Multi-agent orchestration + RAG
        ├── config/
        │   ├── database.js        # PostgreSQL + in-memory fallback
        │   └── chromadb.js        # Vector store + in-memory fallback
        ├── controllers/
        │   ├── authController.js
        │   ├── chatController.js
        │   ├── documentController.js
        │   ├── notesController.js
        │   └── memoryController.js
        ├── services/
        │   ├── aiService.js       # Ollama → Groq → HF fallback chain
        │   └── documentService.js # PDF extraction + chunking + embedding
        └── routes/
```

---

## 🚀 Quick Start

### Prerequisites

1. **Node.js** v18+ — https://nodejs.org
2. **Ollama** (recommended for local AI) — https://ollama.com
3. **PostgreSQL** (optional) — app works without it using in-memory storage
4. **ChromaDB** (optional) — pip install chromadb

### 1. Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Copy and edit backend environment
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
PORT=5000
JWT_SECRET=your-secret-key

# Optional: Cloud AI fallbacks
GROQ_API_KEY=your_groq_key      # Get free at console.groq.com
HF_API_KEY=your_hf_key          # Get free at huggingface.co
```

### 3. Start Ollama (for local AI)

```bash
# Install and start Ollama
ollama pull mistral              # Main chat model
ollama pull nomic-embed-text    # Embedding model
```

### 4. Start ChromaDB (for vector search)

```bash
pip install chromadb
chroma run --host localhost --port 8000
```

### 5. Start the Application

```bash
# Terminal 1: Start backend
cd backend
npm run dev

# Terminal 2: Start frontend
cd frontend
npm run dev
```

Open http://localhost:3000

---

## 🤖 AI Stack

| Component | Primary | Fallback 1 | Fallback 2 |
|-----------|---------|------------|------------|
| **LLM** | Ollama (local) | Groq (free cloud) | HuggingFace |
| **Embeddings** | Ollama nomic-embed-text | HuggingFace API | Hash-based (offline) |
| **Vector DB** | ChromaDB | In-memory store | — |
| **Database** | PostgreSQL | In-memory store | — |

**The app works even with NO external services** — it uses fallbacks at every layer.

---

## 🧩 AI Agents

| Agent | Trigger Keywords | Purpose |
|-------|-----------------|---------|
| 🔬 Research | analyze, investigate, what is, explain | Document Q&A |
| 📝 Summary | summarize, brief, tldr, key points | Condensed summaries |
| 💻 Code | code, debug, implement, function | Programming help |
| 🎯 Decision | plan, roadmap, strategy, startup | Strategic planning |
| 🤖 General | (everything else) | General assistant |

---

## 📡 API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in (returns JWT)
- `GET /api/auth/profile` — Get current user

### Chat
- `GET /api/chat/conversations` — List conversations
- `POST /api/chat/conversations` — Create conversation
- `POST /api/chat/conversations/:id/stream` — **Stream AI response (SSE)**
- `GET /api/chat/conversations/:id/messages` — Get messages

### Documents
- `GET /api/documents` — List documents
- `POST /api/documents/upload` — Upload file (multipart)
- `GET /api/documents/:id/status` — Check processing status
- `DELETE /api/documents/:id` — Delete document

### Notes
- `GET /api/notes` — List notes
- `POST /api/notes` — Create note
- `PUT /api/notes/:id` — Update note
- `POST /api/notes/generate` — **AI-generate note (SSE)**

### Memory & Graph
- `GET /api/memory` — List memory items
- `GET /api/memory/graph` — Knowledge graph data
- `GET /api/memory/ai-status` — AI services status

---

## 🔧 Troubleshooting

**Backend won't start:**
- Check Node.js is v18+: `node --version`
- Run `npm install` in the backend directory

**AI not responding:**
- Ensure Ollama is running: `ollama list`
- Set `GROQ_API_KEY` or `HF_API_KEY` in `.env` for cloud fallback

**Documents not processing:**
- Check embedding status in the Documents page
- Without Ollama, embeddings use a hash-based fallback (semantic search quality reduced)

**ChromaDB not connecting:**
- The app works without ChromaDB using in-memory vector storage
- Documents still get indexed, but embeddings won't persist across restarts

---

## 📦 Tech Stack

**Frontend:** Next.js 15, React 19, Tailwind CSS v4, Zustand, Framer Motion, React Markdown

**Backend:** Node.js, Express, JWT Auth, Multer, pdf-parse, WebSockets

**AI:** Ollama (local), Groq API, HuggingFace Inference API

**Storage:** PostgreSQL, ChromaDB, In-memory fallbacks

---

## 📄 License

MIT — Free to use and modify.
