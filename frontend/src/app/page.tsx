'use client'
import { Brain, Zap, ChevronRight, Sparkles, Shield, Cpu, Globe, Rocket } from 'lucide-react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-bg-primary text-white selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background Neural Matrix */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse-glow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tighter">NeuroDesk AI</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Sign In</Link>
          <Link href="/register" className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-bold hover:bg-slate-200 transition-all">Get Started</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-32 px-6 flex flex-col items-center text-center max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-bold uppercase tracking-widest mb-8"
        >
          <Sparkles className="w-4 h-4" />
          Next-Gen Knowledge OS is Here
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[0.9]"
        >
          Your Neural <br /> 
          <span className="gradient-text">Expansion Pack.</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-xl text-slate-500 max-w-2xl mb-12 leading-relaxed"
        >
          NeuroDesk AI is a high-performance Knowledge Operating System. 
          Upload documents, build complex semantic graphs, and orchestrate 
          AI agents—all powered by local models.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 items-center"
        >
          <Link href="/register" className="group relative px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-lg hover:bg-indigo-500 transition-all flex items-center gap-2 glow-md">
            Initialize Your Brain <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="px-8 py-4 rounded-2xl border border-slate-800 text-slate-400 font-bold text-lg hover:bg-slate-900 transition-all">
            Watch Technical Demo
          </button>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 py-32 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={<Cpu className="w-8 h-8 text-indigo-400" />}
            title="Local Intelligence"
            desc="Run massive LLMs entirely on your local hardware using Ollama. Zero latency, zero cost, 100% privacy."
          />
          <FeatureCard 
            icon={<Globe className="w-8 h-8 text-cyan-400" />}
            title="Semantic Mesh"
            desc="Your data is cross-referenced in a high-dimensional vector space, creating a persistent memory graph."
          />
          <FeatureCard 
            icon={<Shield className="w-8 h-8 text-emerald-400" />}
            title="Sovereign Data"
            desc="No cloud uploads. No tracking. Your knowledge stays in your local PostgreSQL & ChromaDB cluster."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-20 border-t border-slate-900 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <Brain className="w-8 h-8 text-indigo-500" />
          <span className="text-xl font-bold tracking-tighter">NeuroDesk AI</span>
        </div>
        <p className="text-slate-600 text-sm">© 2026 NeuroDesk. The open-source cognitive operating system.</p>
      </footer>
    </main>
  )
}

function FeatureCard({ icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="glass rounded-4xl p-8 glass-hover transition-all duration-500 group">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6 border border-white/5 group-hover:border-indigo-500/30 transition-all duration-500">
        {icon}
      </div>
      <h3 className="text-2xl font-bold mb-4">{title}</h3>
      <p className="text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">
        {desc}
      </p>
    </div>
  )
}
