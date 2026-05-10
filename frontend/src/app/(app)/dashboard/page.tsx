'use client'
import { useEffect, useState } from 'react'
import { useAuthStore, useAppStore } from '@/store'
import api from '@/lib/api'
import Link from 'next/link'
import { 
  Brain, MessageSquare, FileText, BookOpen, Network, 
  Zap, TrendingUp, Bot, ArrowRight, Activity, 
  Cpu, Shield, Globe, Sparkles
} from 'lucide-react'

interface Stats {
  conversations: number
  documents: number
  notes: number
  memory: number
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<Stats>({ conversations: 0, documents: 0, notes: 0, memory: 0 })
  const [aiStatus, setAiStatus] = useState<Record<string, any> | null>(null)
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
    { href: '/chat', icon: MessageSquare, label: 'AI Brain Chat', desc: 'Interact with knowledge', color: 'from-indigo-600 to-violet-600', glow: 'shadow-indigo-500/20' },
    { href: '/documents', icon: FileText, label: 'Data Ingestion', desc: 'Sync local intelligence', color: 'from-emerald-600 to-teal-600', glow: 'shadow-emerald-500/20' },
    { href: '/notes', icon: BookOpen, label: 'Neural Notes', desc: 'Auto-structured insights', color: 'from-cyan-600 to-blue-600', glow: 'shadow-cyan-500/20' },
    { href: '/graph', icon: Network, label: 'Knowledge Map', desc: 'Explore link semantic', color: 'from-violet-600 to-fuchsia-600', glow: 'shadow-violet-500/20' },
  ]

  const statCards = [
    { label: 'Neural Threads', value: stats.conversations, icon: MessageSquare, color: 'text-indigo-400' },
    { label: 'Data Nodes', value: stats.documents, icon: FileText, color: 'text-emerald-400' },
    { label: 'Synaptic Notes', value: stats.notes, icon: BookOpen, color: 'text-cyan-400' },
    { label: 'Memory Points', value: stats.memory, icon: Brain, color: 'text-violet-400' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-transparent relative">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-violet-600/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="mb-10 animate-fade-in flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] uppercase tracking-widest font-bold text-indigo-400">System Ready</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Welcome back, <span className="gradient-text">{user?.username}</span>
          </h1>
          <p className="text-slate-500 max-w-md">Your neural network has processed <span className="text-slate-300 font-medium">{stats.memory} data points</span> since last session.</p>
        </div>
        <div className="hidden lg:flex items-center gap-4 p-4 glass rounded-2xl border-indigo-500/10">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Core Latency</div>
            <div className="text-lg font-bold text-emerald-400">12ms</div>
          </div>
          <Activity className="w-8 h-8 text-indigo-500/50" />
        </div>
      </div>

      {/* AI Health Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="lg:col-span-2 glass rounded-3xl p-6 relative overflow-hidden group animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
            <Cpu className="w-32 h-32 text-indigo-500" />
          </div>
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Shield className="w-4 h-4" /> System Intelligence Core
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <StatusModule label="Ollama" active={aiStatus?.ollama?.available} sub={aiStatus?.ollama?.models?.[0]?.name || 'Local'} />
              <StatusModule label="ChromaDB" active={aiStatus?.chroma?.available} sub="Vectorized" />
              <StatusModule label="Groq" active={aiStatus?.groq?.configured} sub="Cloud High-Speed" />
              <StatusModule label="Security" active={true} sub="Encrypted" />
            </div>
          </div>
        </div>
        <div className="glass rounded-3xl p-6 bg-linear-to-br from-indigo-600/10 to-transparent border-indigo-500/20 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" /> AI Insights
          </h3>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400 leading-relaxed">
              "Your most active knowledge cluster is currently related to <span className="text-indigo-400 font-medium">Artificial Intelligence</span>."
            </div>
            <button className="w-full py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/20 text-indigo-400 text-xs font-bold hover:bg-indigo-600/30 transition-all">
              Run Daily Knowledge Audit
            </button>
          </div>
        </div>
      </div>

      {/* Neural Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((card, i) => (
          <div key={card.label} className="glass rounded-3xl p-6 glass-hover animate-fade-in" style={{ animationDelay: `${0.3 + i * 0.05}s` }}>
            <div className={`w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-4 border border-slate-700/50 group-hover:border-indigo-500/50 transition-colors`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{card.label}</div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {loading ? <span className="w-12 h-8 bg-slate-800/50 rounded-lg animate-pulse inline-block" /> : card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Access Matrix */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-400" /> Interaction Matrix
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, i) => (
            <Link key={action.href} href={action.href}
              className="glass rounded-3xl p-6 flex items-center gap-5 glass-hover group animate-fade-in"
              style={{ animationDelay: `${0.5 + i * 0.05}s` }}>
              <div className={`w-16 h-16 rounded-2xl bg-linear-to-br ${action.color} flex items-center justify-center shadow-2xl ${action.glow} group-hover:scale-105 transition-all duration-500`}>
                <action.icon className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-lg font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{action.label}</div>
                <div className="text-sm text-slate-500 leading-snug">{action.desc}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-4 transition-all">
                <ArrowRight className="w-5 h-5 text-indigo-400" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatusModule({ label, active, sub }: { label: string; active: boolean; sub: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]' : 'bg-slate-700'}`} />
        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-[10px] text-slate-600 pl-4">{active ? sub : 'Offline'}</span>
    </div>
  )
}
