'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore, useAuthStore } from '@/store'
import api from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { API_URL } from '@/lib/api'
import {
  Send, Plus, Trash2, MessageSquare, Bot, User, Loader2,
  ChevronDown, Cpu, Eye, EyeOff, FileText, Zap, X, Copy, Check,
  Sparkles, Shield, Activity
} from 'lucide-react'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const MODELS = ['mistral', 'llama3', 'gemma', 'llama2', 'codellama']
const AGENTS = [
  { id: 'general', label: 'Auto', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'research', label: 'Research', icon: <Shield className="w-3.5 h-3.5" /> },
  { id: 'summary', label: 'Summary', icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'code', label: 'Code', icon: <Cpu className="w-3.5 h-3.5" /> },
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
  const [currentAgent, setCurrentAgent] = useState<{name: string, icon: string} | null>(null)
  const [sources, setSources] = useState<{title: string}[]>([])
  const [documents, setDocuments] = useState<{id: string, title: string, embedding_status: string}[]>([])
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      toast.error('Chat error: ' + errorMessage)
    } finally {
      setIsStreaming(false)
      setStreamingText('')
    }
  }, [input, isStreaming, activeConversation, selectedDocuments, explainReasoning, selectedModel, addMessage, setIsStreaming])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  return (
    <div className="flex h-full overflow-hidden bg-transparent relative">
      {/* Background Neural Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Conversation Sidebar */}
      <div className="w-72 shrink-0 flex flex-col border-r border-white/5 bg-bg-secondary/50 backdrop-blur-xl relative z-10">
        <div className="p-6 border-b border-white/5">
          <button onClick={createConversation}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 text-sm font-bold transition-all group">
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" /> New Neural Thread
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center text-slate-600 text-xs py-12 px-4">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-20" />
              Initial threads required.
            </div>
          ) : conversations.map(conv => (
            <div key={conv.id} onClick={() => setActiveConversation(conv)}
              className={`group flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer transition-all duration-300 ${
                activeConversation?.id === conv.id 
                  ? 'bg-indigo-600/10 border border-indigo-500/20 shadow-lg shadow-indigo-500/5' 
                  : 'hover:bg-white/5 border border-transparent'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeConversation?.id === conv.id ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800/50 text-slate-600'}`}>
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className={`flex-1 text-xs font-bold truncate transition-colors ${activeConversation?.id === conv.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>
                {conv.title || 'New Thread'}
              </span>
              <button onClick={(e) => deleteConversation(conv.id, e)} className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-rose-400 transition-all p-1 hover:bg-rose-500/10 rounded-lg">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Top Neural Bar */}
        <div className="flex items-center gap-4 px-8 py-4 border-b border-white/5 bg-bg-secondary/30 backdrop-blur-md">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5">
            {AGENTS.map(a => (
              <button key={a.id} onClick={() => setSelectedAgent(a.id)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all ${selectedAgent === a.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                {a.icon} {a.label}
              </button>
            ))}
          </div>
          
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-xl bg-white/5 border border-white/5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <select value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-slate-300 text-[11px] font-bold uppercase tracking-wider outline-none cursor-pointer">
                {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <button onClick={() => setExplainReasoning(!explainReasoning)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all ${explainReasoning ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-500/5' : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-white/5'}`}>
              {explainReasoning ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              Deep Insight
            </button>
          </div>
        </div>

        {/* Context Bar */}
        <AnimatePresence>
          {documents.length > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="px-8 py-3 border-b border-white/5 bg-white/5 flex items-center gap-4 overflow-x-auto">
              <div className="flex items-center gap-2 shrink-0">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Active Knowledge:</span>
              </div>
              <div className="flex items-center gap-2">
                {documents.map(doc => (
                  <button key={doc.id} onClick={() => toggleDocumentSelection(doc.id)}
                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedDocuments.includes(doc.id) ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-slate-500 hover:text-slate-300 border border-white/5'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${selectedDocuments.includes(doc.id) ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`} />
                    {doc.title?.slice(0, 30)}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 lg:px-24 py-10 space-y-10 scrollbar-hide">
          {!activeConversation ? (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
              <div className="w-20 h-20 rounded-4xl bg-linear-to-br from-indigo-600 to-violet-600 flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/40 animate-float">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">Neural Core Interface</h2>
              <p className="text-slate-500 text-sm mb-10 leading-relaxed italic">"Awaiting initial transmission. Accessing local knowledge cluster..."</p>
              <button onClick={createConversation}
                className="w-full px-8 py-4 rounded-2xl bg-white text-black font-bold hover:scale-105 transition-all shadow-xl shadow-white/5">
                Initialize Session
              </button>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={msg.id || i} role={msg.role} content={msg.content} />
              ))}
              {isStreaming && (
                <div className="space-y-4">
                  {(currentAgent || sources.length > 0) && (
                    <div className="flex flex-col gap-2 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 max-w-[80%]">
                      {currentAgent && (
                        <div className="flex items-center gap-3 text-xs text-indigo-400 font-bold uppercase tracking-widest">
                          <Activity className="w-3.5 h-3.5 animate-spin" />
                          <span>{currentAgent.name} Syncing...</span>
                        </div>
                      )}
                      {sources.length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {sources.map((s, i) => (
                            <span key={i} className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold uppercase tracking-tighter">
                              Ref: {s.title?.slice(0, 30)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {streamingText ? <MessageBubble role="assistant" content={streamingText} isStreaming /> : (
                    <div className="flex items-center gap-4 opacity-50">
                      <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center">
                        <Bot className="w-5 h-5 text-indigo-400 animate-pulse" />
                      </div>
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Neural Input Interface */}
        {activeConversation && (
          <div className="px-8 lg:px-24 pb-8 pt-4">
            <div className="relative glass rounded-3xl p-2 border-white/10 shadow-2xl focus-within:border-indigo-500/30 transition-all duration-500 group">
              {/* Glow background for input */}
              <div className="absolute inset-0 bg-indigo-500/0 group-focus-within:bg-indigo-500/5 rounded-3xl blur-xl transition-all duration-700" />
              
              <div className="relative z-10 flex gap-4 items-end px-4 py-2">
                <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="Transmit message to neural core..."
                  rows={1} style={{ resize: 'none', minHeight: '44px', maxHeight: '200px' }}
                  className="flex-1 bg-transparent text-slate-200 placeholder-slate-600 outline-none text-sm leading-relaxed py-2 font-medium"
                  onInput={(e) => {
                    const t = e.target as HTMLTextAreaElement
                    t.style.height = 'auto'
                    t.style.height = Math.min(t.scrollHeight, 200) + 'px'
                  }} />
                <button onClick={sendMessage} disabled={!input.trim() || isStreaming || !activeConversation}
                  className="shrink-0 w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center hover:scale-105 transition-all disabled:opacity-20 disabled:scale-100 disabled:cursor-not-allowed shadow-xl shadow-white/5">
                  {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mt-4 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-700">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Encrypted Channel</span>
              <span className="w-1 h-1 rounded-full bg-slate-800" />
              <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> Local Compute</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ role, content, isStreaming }: { role: string; content: string; isStreaming?: boolean }) {
  const isUser = role === 'user'
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Vectorized content copied')
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-6 group/msg ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center shadow-lg transition-all duration-500 ${
        isUser ? 'bg-white text-black' : 'bg-linear-to-br from-indigo-600 to-violet-600 text-white shadow-indigo-500/20'}`}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>
      <div className={`relative max-w-[85%] lg:max-w-[80%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`rounded-3xl px-6 py-4 shadow-2xl transition-all duration-500 ${
          isUser 
            ? 'bg-white/5 border border-white/5 text-slate-200 rounded-tr-none' 
            : 'glass text-slate-200 rounded-tl-none group-hover/msg:border-indigo-500/20'
        } ${isStreaming ? 'typing-cursor' : ''}`}>
          {isUser ? (
            <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose-dark text-sm leading-relaxed font-medium">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '')
                    const codeString = String(children).replace(/\n$/, '')
                    return !inline && match ? (
                      <div className="relative group/code my-6 rounded-2xl overflow-hidden border border-white/5">
                        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{match[1]}</span>
                          <button onClick={() => copyToClipboard(codeString)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all">
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <pre className="bg-[#05050a]! p-6! m-0! overflow-x-auto" {...props}>
                          <code className={className}>{children}</code>
                        </pre>
                      </div>
                    ) : (
                      <code className="px-1.5 py-0.5 rounded-md bg-white/5 text-indigo-300 font-mono text-xs border border-white/5" {...props}>{children}</code>
                    )
                  }
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        
        {/* Message Actions */}
        <div className={`mt-2 flex items-center gap-4 transition-all duration-500 opacity-0 group-hover/msg:opacity-100 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {!isStreaming && (
            <button onClick={() => copyToClipboard(content)}
              className="text-[10px] font-bold uppercase tracking-widest text-slate-600 hover:text-indigo-400 transition-colors flex items-center gap-1.5">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Vector Copy'}
            </button>
          )}
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
