'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store'
import { Brain, Zap, Shield, Globe, ChevronRight } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const { user } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (user) router.replace('/dashboard')
  }, [user, router])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-3xl" />
        {/* Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm font-medium mb-8 animate-fade-in">
          <Zap className="w-4 h-4" />
          <span>AI Knowledge Operating System</span>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Brain className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-5xl font-bold gradient-text">NeuroDesk AI</h1>
        </div>

        <p className="text-xl text-slate-400 mb-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Your Personal AI Brain
        </p>

        <p className="text-slate-500 max-w-2xl mx-auto mb-12 leading-relaxed animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Upload documents, ask questions, build knowledge graphs, and let AI agents work for you.
          Powered by local Ollama models for complete privacy and zero cost.
        </p>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          {['🧠 Persistent Memory', '📄 Document RAG', '🤖 Multi-Agent AI', '🌐 Knowledge Graph', '🔒 100% Local AI', '⚡ Real-time Streaming'].map((f) => (
            <span key={f} className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-400 text-sm">
              {f}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold text-lg hover:opacity-90 hover:scale-105 transition-all duration-200 shadow-lg shadow-indigo-500/30 glow-sm">
            Get Started Free <ChevronRight className="w-5 h-5" />
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl border border-slate-700 text-slate-300 font-semibold text-lg hover:bg-slate-800 hover:border-slate-600 transition-all duration-200">
            Sign In
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          {[
            { icon: '📚', title: 'Document Intelligence', desc: 'Upload PDFs, TXT, Markdown. AI extracts, chunks, and embeds everything for semantic retrieval.' },
            { icon: '🤖', title: 'Multi-Agent System', desc: 'Specialized Research, Summary, Code, and Decision agents route your queries intelligently.' },
            { icon: '🧬', title: 'Knowledge Graph', desc: 'Visualize relationships between concepts, documents, and memories in an interactive graph.' },
          ].map((card) => (
            <div key={card.title} className="glass rounded-2xl p-6 text-left glass-hover transition-all duration-300 cursor-default">
              <div className="text-3xl mb-4">{card.icon}</div>
              <h3 className="text-lg font-semibold text-slate-200 mb-2">{card.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
