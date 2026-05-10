'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore, useAppStore } from '@/store'
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
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f]">
      <Toaster position="top-right" toastOptions={{
        style: { background: '#13131f', color: '#e2e8f0', border: '1px solid rgba(99,102,241,0.2)' }
      }} />

      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col bg-[#0d0d18] border-r border-[rgba(99,102,241,0.1)]">
        {/* Logo */}
        <div className="p-5 border-b border-[rgba(99,102,241,0.1)]">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-slate-100 text-sm">NeuroDesk AI</div>
              <div className="text-xs text-slate-600">Knowledge OS</div>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-500/15 border border-indigo-500/20 text-slate-100'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/40'
                }`}>
                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? item.color : ''}`} />
                <span className="text-sm font-medium">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400 opacity-60" />}
              </Link>
            )
          })}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-[rgba(99,102,241,0.1)]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/30">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user.username?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200 truncate">{user.username}</div>
              <div className="text-xs text-slate-600 truncate">{user.email}</div>
            </div>
            <button onClick={() => { logout(); router.push('/login') }}
              className="text-slate-600 hover:text-rose-400 transition-colors" title="Sign out">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  )
}
