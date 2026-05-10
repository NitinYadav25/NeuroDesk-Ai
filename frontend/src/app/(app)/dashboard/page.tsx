'use client'
import { useEffect, useState } from 'react'
import { useAuthStore, useAppStore } from '@/store'
import api from '@/lib/api'
import Link from 'next/link'
import { Brain, MessageSquare, FileText, BookOpen, Network, Zap, TrendingUp, Bot, ArrowRight, Activity } from 'lucide-react'

interface Stats {
  conversations: number
  documents: number
  notes: number
  memory: number
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats>({ conversations: 0, documents: 0, notes: 0, memory: 0 })
  const [aiStatus, setAiStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [convRes, docRes, noteRes, memRes, statusRes] = await Promise.allSettled([
          api.get('/chat/conversations'),
          api.get('/documents'),
          api.get('/notes'),
          api.get('/memory'),
          api.get('/memory/ai-status'),
        ])
        setStats({
          conversations: convRes.status === 'fulfilled' ? convRes.value.data.conversations?.length || 0 : 0,
          documents: docRes.status === 'fulfilled' ? docRes.value.data.documents?.length || 0 : 0,
          notes: noteRes.status === 'fulfilled' ? noteRes.value.data.notes?.length || 0 : 0,
          memory: memRes.status === 'fulfilled' ? memRes.value.data.memory?.length || 0 : 0,
        })
        if (statusRes.status === 'fulfilled') setAiStatus(statusRes.value.data.status)
      } catch {}
      setLoading(false)
    }
    loadData()
  }, [])

  const quickActions = [
    { href: '/chat', icon: MessageSquare, label: 'Start AI Chat', desc: 'Chat with your documents', color: 'from-indigo-600 to-indigo-700', glow: 'shadow-indigo-500/30' },
    { href: '/documents', icon: FileText, label: 'Upload Document', desc: 'Add PDFs to knowledge base', color: 'from-emerald-600 to-emerald-700', glow: 'shadow-emerald-500/30' },
    { href: '/notes', icon: BookOpen, label: 'New Note', desc: 'Create AI-assisted notes', color: 'from-cyan-600 to-cyan-700', glow: 'shadow-cyan-500/30' },
    { href: '/graph', icon: Network, label: 'Knowledge Graph', desc: 'Explore memory graph', color: 'from-violet-600 to-violet-700', glow: 'shadow-violet-500/30' },
  ]

  const statCards = [
    { label: 'Conversations', value: stats.conversations, icon: MessageSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
    { label: 'Documents', value: stats.documents, icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Notes', value: stats.notes, icon: BookOpen, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
    { label: 'Memories', value: stats.memory, icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.username}! 👋
            </h1>
            <p className="text-slate-500 text-sm">Your AI Knowledge OS is ready</p>
          </div>
        </div>
      </div>

      {/* AI Status Banner */}
      {aiStatus && (
        <div className="glass rounded-xl p-4 mb-8 flex items-center gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium text-slate-400">AI Status:</span>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge label="Ollama" active={aiStatus.ollama?.available} />
            <StatusBadge label="ChromaDB" active={aiStatus.chroma?.available} />
            <StatusBadge label="Groq" active={aiStatus.groq?.configured} />
            <StatusBadge label="HuggingFace" active={aiStatus.huggingface?.configured} />
          </div>
          {aiStatus.ollama?.models?.length > 0 && (
            <div className="ml-auto text-xs text-slate-600">
              Models: {aiStatus.ollama.models.map((m: any) => m.name).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => (
          <div key={card.label} className="glass rounded-2xl p-5 animate-fade-in" style={{ animationDelay: `${0.1 + i * 0.05}s` }}>
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="text-3xl font-bold text-slate-100 mb-1">
              {loading ? <span className="w-8 h-7 bg-slate-800 rounded animate-pulse block" /> : card.value}
            </div>
            <div className="text-sm text-slate-500">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="text-lg font-semibold text-slate-300 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-4 mb-8">
        {quickActions.map((action, i) => (
          <Link key={action.href} href={action.href}
            className="glass rounded-2xl p-5 flex items-center gap-4 hover:border-indigo-500/30 transition-all duration-300 group animate-fade-in"
            style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg ${action.glow} group-hover:scale-110 transition-transform`}>
              <action.icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-200 group-hover:text-white transition-colors">{action.label}</div>
              <div className="text-sm text-slate-500">{action.desc}</div>
            </div>
            <ArrowRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>

      {/* Agent Info */}
      <h2 className="text-lg font-semibold text-slate-300 mb-4">Available AI Agents</h2>
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: '🔬', name: 'Research Agent', desc: 'Document Q&A & analysis', color: 'border-blue-500/20 bg-blue-500/5' },
          { icon: '📝', name: 'Summary Agent', desc: 'Summaries & key points', color: 'border-emerald-500/20 bg-emerald-500/5' },
          { icon: '💻', name: 'Code Agent', desc: 'Coding help & debugging', color: 'border-violet-500/20 bg-violet-500/5' },
          { icon: '🎯', name: 'Decision Agent', desc: 'Planning & roadmaps', color: 'border-amber-500/20 bg-amber-500/5' },
        ].map((agent, i) => (
          <div key={agent.name} className={`rounded-xl border p-4 ${agent.color} animate-fade-in`} style={{ animationDelay: `${0.5 + i * 0.05}s` }}>
            <div className="text-2xl mb-2">{agent.icon}</div>
            <div className="text-sm font-medium text-slate-300">{agent.name}</div>
            <div className="text-xs text-slate-600 mt-1">{agent.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-700'}`} />
      <span className={`text-xs font-medium ${active ? 'text-emerald-400' : 'text-slate-600'}`}>{label}</span>
    </div>
  )
}
