'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore, useAppStore } from '@/store'
import { motion } from 'framer-motion'
import {
  Brain, MessageSquare, FileText, BookOpen, Network,
  Settings, LogOut, Zap, ChevronRight, Bot
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'

const NAV_ITEMS = [
  { href: '/dashboard', icon: Zap, label: 'Dashboard', color: 'text-amber-400' },
  { href: '/chat', icon: MessageSquare, label: 'AI Chat', color: 'text-indigo-400' },
  { href: '/documents', icon: FileText, label: 'Documents', color: 'text-emerald-400' },
  { href: '/notes', icon: BookOpen, label: 'Notes', color: 'text-cyan-400' },
  { href: '/graph', icon: Network, label: 'Knowledge Graph', color: 'text-violet-400' },
  { href: '/settings', icon: Settings, label: 'Settings', color: 'text-slate-400' },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!user) router.replace('/login')
  }, [user, router])

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary text-slate-300">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#0d0d18', color: '#e2e8f0', border: '1px solid rgba(99,102,241,0.2)', backdropFilter: 'blur(10px)' }
      }} />

      {/* Sidebar */}
      <aside className="w-72 shrink-0 flex flex-col bg-bg-secondary border-r border-white/5 relative z-20">
        <div className="absolute inset-0 bg-indigo-600/5 blur-[80px] pointer-events-none" />
        
        {/* Logo */}
        <div className="p-8 border-b border-white/5 relative z-10">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all duration-500">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-lg tracking-tighter">NeuroDesk AI</div>
              <div className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">Neural Nexus v1.0</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto relative z-10">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group relative ${
                  isActive
                    ? 'bg-indigo-600/10 text-white border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.05)]'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}>
                {isActive && (
                  <motion.div layoutId="nav-glow" className="absolute inset-0 bg-indigo-500/5 rounded-2xl blur-md" />
                )}
                <item.icon className={`w-5 h-5 shrink-0 transition-colors ${isActive ? item.color : 'group-hover:text-slate-300'}`} />
                <span className="text-sm font-bold tracking-tight">{item.label}</span>
                {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] ml-auto" />}
              </Link>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="p-6 border-t border-white/5 relative z-10 bg-bg-secondary/80 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/5 glass-hover cursor-pointer transition-all">
            <div className="w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-lg">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{user.username}</div>
              <div className="text-[10px] text-slate-600 truncate font-mono uppercase tracking-tighter">Auth Verified</div>
            </div>
            <button onClick={() => { logout(); router.push('/login') }}
              className="text-slate-600 hover:text-rose-400 transition-colors p-1.5 hover:bg-rose-500/10 rounded-lg" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {/* Top Glow Overlay */}
        <div className="absolute top-0 right-0 w-[80%] h-64 bg-indigo-600/5 blur-[120px] pointer-events-none z-0" />
        <div className="relative z-10 flex-1 overflow-hidden flex flex-col">
          {children}
        </div>
      </main>
    </div>
  )
}
