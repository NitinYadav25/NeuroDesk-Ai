'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore, useAuthStore } from '@/store'
import api from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { API_URL } from '@/lib/api'
import {
  Send, Plus, Trash2, MessageSquare, Bot, User, Loader2,
  ChevronDown, Cpu, Eye, EyeOff, FileText, Zap, X
} from 'lucide-react'
import toast from 'react-hot-toast'

const MODELS = ['mistral', 'llama3', 'gemma', 'llama2', 'codellama']
const AGENTS = [
  { id: 'general', label: 'Auto', icon: '🤖' },
  { id: 'research', label: 'Research', icon: '🔬' },
  { id: 'summary', label: 'Summary', icon: '📝' },
  { id: 'code', label: 'Code', icon: '💻' },
  { id: 'decision', label: 'Decision', icon: '🎯' },
]

export default function ChatPage() {
  const { user } = useAuthStore()
  const {
    conversations, activeConversation, messages,
    setConversations, setActiveConversation, setMessages, addMessage,
    isStreaming, setIsStreaming, selectedModel, setSelectedModel,
    explainReasoning, setExplainReasoning, selectedDocuments, toggleDocumentSelection
  } = useAppStore()

  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('general')
  const [streamingText, setStreamingText] = useState('')
  const [currentAgent, setCurrentAgent] = useState<any>(null)
  const [sources, setSources] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { loadConversations(); loadDocuments() }, [])
  useEffect(() => { if (activeConversation) loadMessages(activeConversation.id) }, [activeConversation?.id])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, streamingText])

  const loadConversations = async () => {
    try {
      const res = await api.get('/chat/conversations')
      setConversations(res.data.conversations || [])
    } catch {}
  }

  const loadDocuments = async () => {
    try {
      const res = await api.get('/documents')
      setDocuments(res.data.documents?.filter((d: any) => d.embedding_status === 'completed') || [])
    } catch {}
  }

  const loadMessages = async (convId: string) => {
    try {
      const res = await api.get(`/chat/conversations/${convId}/messages`)
      setMessages(res.data.messages || [])
    } catch {}
  }

  const createConversation = async () => {
    try {
      const res = await api.post('/chat/conversations', { model: selectedModel, agentType: selectedAgent })
      const newConv = res.data.conversation
      setConversations([newConv, ...conversations])
      setActiveConversation(newConv)
      setMessages([])
    } catch { toast.error('Failed to create conversation') }
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.delete(`/chat/conversations/${id}`)
      const updated = conversations.filter(c => c.id !== id)
      setConversations(updated)
      if (activeConversation?.id === id) {
        setActiveConversation(updated[0] || null)
        setMessages([])
      }
      toast.success('Conversation deleted')
    } catch { toast.error('Failed to delete') }
  }

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming || !activeConversation) return
    const userMsg = input.trim()
    setInput('')
    setIsStreaming(true)
    setStreamingText('')
    setCurrentAgent(null)
    setSources([])

    const tempUserMsg = { id: Date.now().toString(), role: 'user' as const, content: userMsg, created_at: new Date().toISOString() }
    addMessage(tempUserMsg)

    const token = typeof window !== 'undefined' ? localStorage.getItem('nd_token') : ''

    try {
      const response = await fetch(`${API_URL}/chat/conversations/${activeConversation.id}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: userMsg,
          documentIds: selectedDocuments,
          explainReasoning,
          model: selectedModel
        })
      })

      if (!response.body) throw new Error('No response body')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        const lines = text.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'agent') setCurrentAgent(parsed.data)
            else if (parsed.type === 'sources') setSources(parsed.data)
            else if (parsed.type === 'token') {
              accumulated += parsed.data
              setStreamingText(accumulated)
            }
          } catch {}
        }
      }

      if (accumulated) {
        addMessage({ id: (Date.now() + 1).toString(), role: 'assistant', content: accumulated, created_at: new Date().toISOString() })
      }
    } catch (err: any) {
      toast.error('Chat error: ' + err.message)
    } finally {
      setIsStreaming(false)
      setStreamingText('')
    }
  }, [input, isStreaming, activeConversation, selectedDocuments, explainReasoning, selectedModel, addMessage, setIsStreaming])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation Sidebar */}
      <div className="w-60 flex-shrink-0 flex flex-col border-r border-[rgba(99,102,241,0.1)] bg-[#0d0d18]">
        <div className="p-3 border-b border-[rgba(99,102,241,0.1)]">
          <button onClick={createConversation}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/20 text-indigo-400 text-sm font-medium transition-all">
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center text-slate-600 text-xs py-8 px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No conversations yet
            </div>
          ) : conversations.map(conv => (
            <div key={conv.id} onClick={() => setActiveConversation(conv)}
              className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                activeConversation?.id === conv.id ? 'bg-indigo-500/15 border border-indigo-500/20' : 'hover:bg-slate-800/40'}`}>
              <MessageSquare className="w-4 h-4 text-slate-600 flex-shrink-0" />
              <span className="flex-1 text-xs text-slate-400 truncate">{conv.title || 'New Conversation'}</span>
              <button onClick={(e) => deleteConversation(conv.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-rose-400 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[rgba(99,102,241,0.1)] bg-[#0d0d18]/50">
          {/* Agent selector */}
          <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
            {AGENTS.map(a => (
              <button key={a.id} onClick={() => setSelectedAgent(a.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${selectedAgent === a.id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                {a.icon} {a.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Model selector */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <Cpu className="w-4 h-4 text-slate-500" />
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-slate-400 text-xs outline-none">
                {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {/* Explain reasoning toggle */}
            <button onClick={() => setExplainReasoning(!explainReasoning)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${explainReasoning ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800/50 text-slate-500 hover:text-slate-300'}`}>
              {explainReasoning ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Explain
            </button>
          </div>
        </div>

        {/* Document selection bar */}
        {documents.length > 0 && (
          <div className="px-5 py-2 border-b border-[rgba(99,102,241,0.08)] bg-[#0d0d18]/30 flex items-center gap-2 overflow-x-auto">
            <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
            <span className="text-xs text-slate-600 flex-shrink-0">Context:</span>
            {documents.map(doc => (
              <button key={doc.id} onClick={() => toggleDocumentSelection(doc.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                  selectedDocuments.includes(doc.id) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800/40 text-slate-500 hover:text-slate-300'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {doc.title?.slice(0, 25)}{(doc.title?.length || 0) > 25 ? '…' : ''}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {!activeConversation ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
                <Bot className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-200 mb-2">Start a New Chat</h2>
              <p className="text-slate-500 text-sm mb-6">Ask anything — your AI agents are ready</p>
              <button onClick={createConversation}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium hover:opacity-90 transition-opacity glow-sm">
                <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> New Conversation</span>
              </button>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={msg.id || i} role={msg.role} content={msg.content} />
              ))}
              {isStreaming && (
                <div>
                  {currentAgent && (
                    <div className="flex items-center gap-2 mb-2 text-xs text-slate-600">
                      <span>{currentAgent.icon}</span>
                      <span>{currentAgent.name} is working…</span>
                    </div>
                  )}
                  {sources.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {sources.map((s, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          📄 {s.title?.slice(0, 30)}
                        </span>
                      ))}
                    </div>
                  )}
                  {streamingText ? <MessageBubble role="assistant" content={streamingText} isStreaming /> : (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        {activeConversation && (
          <div className="p-4 border-t border-[rgba(99,102,241,0.1)] bg-[#0d0d18]/50">
            <div className="flex gap-3 items-end glass rounded-2xl p-3">
              <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                placeholder="Ask anything... (Shift+Enter for new line)"
                rows={1} style={{ resize: 'none', minHeight: '44px', maxHeight: '180px' }}
                className="flex-1 bg-transparent text-slate-200 placeholder-slate-600 outline-none text-sm leading-relaxed"
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement
                  t.style.height = 'auto'
                  t.style.height = Math.min(t.scrollHeight, 180) + 'px'
                }} />
              <button onClick={sendMessage} disabled={!input.trim() || isStreaming || !activeConversation}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20">
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-center text-slate-700 text-xs mt-2">
              {selectedDocuments.length > 0 ? `📚 Using ${selectedDocuments.length} document(s) as context` : 'No documents selected — using general knowledge'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ role, content, isStreaming }: { role: string; content: string; isStreaming?: boolean }) {
  const isUser = role === 'user'
  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${
        isUser ? 'bg-indigo-600' : 'bg-gradient-to-br from-violet-600 to-indigo-600'}`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>
      <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
        isUser ? 'bg-indigo-600/20 border border-indigo-500/20 text-slate-200' : 'glass text-slate-200'
      } ${isStreaming ? 'typing-cursor' : ''}`}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose-dark text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}
