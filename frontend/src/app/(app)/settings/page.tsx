'use client'
import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store'
import api from '@/lib/api'
import { Settings, Cpu, Key, Database, Shield, CheckCircle, AlertCircle, Loader2, Save } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [aiStatus, setAiStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ai')

  useEffect(() => { loadStatus() }, [])

  const loadStatus = async () => {
    try {
      const res = await api.get('/memory/ai-status')
      setAiStatus(res.data.status)
    } catch {}
    finally { setLoading(false) }
  }

  const tabs = [
    { id: 'ai', label: 'AI Models', icon: Cpu },
    { id: 'account', label: 'Account', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Database },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-slate-600 to-slate-700 flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
            <p className="text-slate-500 text-sm">Configure your NeuroDesk AI</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800 mb-8">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* AI Models Tab */}
        {activeTab === 'ai' && (
          <div className="space-y-6 animate-fade-in">
            {/* Status Overview */}
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" /> AI Engine Status
              </h3>
              {loading ? <div className="flex items-center gap-2 text-slate-600"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div> : (
                <div className="space-y-4">
                  <ServiceCard
                    name="Ollama (Local AI)"
                    desc="Run AI models 100% offline and free on your machine"
                    active={aiStatus?.ollama?.available}
                    models={aiStatus?.ollama?.models}
                    badge="PRIMARY"
                    badgeColor="text-indigo-400 bg-indigo-500/10"
                    setupUrl="https://ollama.com"
                    setupHint="Download Ollama and run: ollama pull mistral"
                  />
                  <ServiceCard
                    name="Groq (Cloud Fallback)"
                    desc="Fast cloud inference using Mixtral — free tier available"
                    active={aiStatus?.groq?.configured}
                    badge="FALLBACK"
                    badgeColor="text-amber-400 bg-amber-500/10"
                    setupUrl="https://console.groq.com"
                    setupHint="Set GROQ_API_KEY in backend/.env"
                  />
                  <ServiceCard
                    name="HuggingFace (Cloud Fallback)"
                    desc="Free inference API for open-source models"
                    active={aiStatus?.huggingface?.configured}
                    badge="FALLBACK"
                    badgeColor="text-amber-400 bg-amber-500/10"
                    setupUrl="https://huggingface.co/settings/tokens"
                    setupHint="Set HF_API_KEY in backend/.env"
                  />
                  <ServiceCard
                    name="ChromaDB (Vector Store)"
                    desc="Local vector database for semantic search and RAG"
                    active={aiStatus?.chroma?.available}
                    badge="VECTOR DB"
                    badgeColor="text-emerald-400 bg-emerald-500/10"
                    setupUrl="https://docs.trychroma.com"
                    setupHint="Run: pip install chromadb && chroma run"
                  />
                </div>
              )}
            </div>

            {/* Ollama Models */}
            {aiStatus?.ollama?.models?.length > 0 && (
              <div className="glass rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">Installed Ollama Models</h3>
                <div className="space-y-2">
                  {aiStatus.ollama.models.map((model: any) => (
                    <div key={model.name} className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-sm font-mono text-slate-300">{model.name}</span>
                      </div>
                      {model.size && (
                        <span className="text-xs text-slate-600">{(model.size / 1e9).toFixed(1)} GB</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 px-4 py-3 rounded-xl bg-slate-800/20 border border-slate-800">
                  <p className="text-xs text-slate-600">Pull more models:</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {['ollama pull llama3', 'ollama pull gemma', 'ollama pull codellama', 'ollama pull nomic-embed-text'].map(cmd => (
                      <code key={cmd} className="text-xs px-2 py-1 rounded bg-slate-900 text-indigo-400 border border-slate-800 font-mono">{cmd}</code>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="glass rounded-2xl p-6 animate-fade-in">
            <h3 className="text-lg font-semibold text-slate-200 mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-slate-400" /> Account Information
            </h3>
            <div className="space-y-4">
              <InfoRow label="Username" value={user?.username || '—'} />
              <InfoRow label="Email" value={user?.email || '—'} />
              <InfoRow label="User ID" value={user?.id || '—'} mono />
              <InfoRow label="Member Since" value={user?.created_at ? new Date(user.created_at).toLocaleDateString() : '—'} />
            </div>
          </div>
        )}

        {/* Integrations Tab */}
        {activeTab === 'integrations' && (
          <div className="space-y-6 animate-fade-in">
            <div className="glass rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-slate-400" /> Backend Configuration
              </h3>
              <p className="text-sm text-slate-500 mb-4">Edit <code className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded text-xs">backend/.env</code> to configure these settings:</p>
              <div className="space-y-3">
                {[
                  { key: 'OLLAMA_URL', default: 'http://localhost:11434', desc: 'Local Ollama server URL' },
                  { key: 'CHROMA_URL', default: 'http://localhost:8000', desc: 'ChromaDB vector store URL' },
                  { key: 'PG_HOST', default: 'localhost', desc: 'PostgreSQL host (optional)' },
                  { key: 'GROQ_API_KEY', default: 'your-key', desc: 'Groq cloud API key (free tier)' },
                  { key: 'HF_API_KEY', default: 'your-key', desc: 'HuggingFace API key (free)' },
                  { key: 'JWT_SECRET', default: 'change-me', desc: 'JWT signing secret' },
                ].map(item => (
                  <div key={item.key} className="px-4 py-3 rounded-xl bg-slate-800/30 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <code className="text-sm text-violet-400 font-mono">{item.key}</code>
                      <span className="text-xs text-slate-600 font-mono">{item.default}</span>
                    </div>
                    <p className="text-xs text-slate-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ServiceCard({ name, desc, active, models, badge, badgeColor, setupUrl, setupHint }: any) {
  return (
    <div className={`flex items-start gap-4 p-4 rounded-xl border ${active ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-800 bg-slate-800/20'}`}>
      <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${active ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
        {active ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-slate-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-medium text-sm text-slate-200">{name}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>{badge}</span>
          {active && <span className="text-xs text-emerald-400">● Connected</span>}
        </div>
        <p className="text-xs text-slate-600 mb-2">{desc}</p>
        {!active && (
          <div className="flex items-center gap-3">
            <code className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded font-mono">{setupHint}</code>
            <a href={setupUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:underline">Setup →</a>
          </div>
        )}
        {active && models?.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {models.map((m: any) => <span key={m.name} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">{m.name}</span>)}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm text-slate-300 ${mono ? 'font-mono text-xs text-slate-500' : ''}`}>{value}</span>
    </div>
  )
}
