'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store'
import { Brain, Eye, EyeOff, Loader2, ArrowRight, User, Mail, Lock } from 'lucide-react'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const { register, isLoading } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await register(email, username, password)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/3 right-1/3 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/3 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative w-full max-w-md px-6 animate-scale-in">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">NeuroDesk AI</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-100 mt-4">Create your AI Brain</h1>
          <p className="text-slate-500 mt-1">Free forever · No credit card needed</p>
        </div>

        <div className="glass rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your name" required
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters" required minLength={6}
                  className="w-full pl-11 pr-12 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">{error}</div>
            )}

            <button type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold hover:opacity-90 transition-all duration-200 disabled:opacity-60 glow-sm">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
