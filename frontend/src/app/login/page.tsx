'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store'
import { Brain, Eye, EyeOff, Loader2, ArrowRight, Shield, Lock, Mail, Cpu } from 'lucide-react'
import { motion } from 'framer-motion'
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithPopup } from 'firebase/auth'
import ReCAPTCHA from 'react-google-recaptcha'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [showCaptcha, setShowCaptcha] = useState(false)
  const [pendingToken, setPendingToken] = useState<string | null>(null)
  
  const { login, loginWithGoogle, isLoading } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      router.push('/dashboard')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(String(err))
      }
    }
  }

  const handleGoogleLogin = async () => {
    setError('')
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const idToken = await result.user.getIdToken()
      
      // Step 1: Store the Firebase token
      setPendingToken(idToken)
      // Step 2: Show the captcha
      setShowCaptcha(true)
      
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Google authentication failed')
      }
    }
  }

  const onCaptchaChange = async (token: string | null) => {
    if (!token || !pendingToken) return

    try {
      setShowCaptcha(false)
      await loginWithGoogle(pendingToken, token)
      setPendingToken(null)
      router.push('/dashboard')
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Verification failed')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-bg-primary">
      {/* Background Neural Matrix */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse-glow" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 pointer-events-none" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Link href="/" className="inline-flex items-center gap-3 mb-6 group">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/20 group-hover:scale-110 transition-all duration-500">
              <Brain className="w-8 h-8 text-white" />
            </div>
          </Link>
          <h1 className="text-4xl font-bold tracking-tighter text-white">Neural Access</h1>
          <p className="text-slate-500 mt-2 font-medium tracking-tight">Synchronize with your knowledge OS</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-[2.5rem] p-8 border-white/5 shadow-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Transmission ID</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@neural.net"
                  required
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border border-white/5 text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 ml-1">Access Key</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-4 flex items-center text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/5 border border-white/5 text-white placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-medium"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold uppercase tracking-widest text-center"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-white text-black font-bold hover:scale-[1.02] active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-white/5"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Initialize Sync <ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-[0.2em]">
              <span className="px-4 bg-transparent text-slate-600 backdrop-blur-sm">Neural Bridge</span>
            </div>
          </div>

          {showCaptcha && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col items-center gap-4"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Security Verification Required</p>
              <ReCAPTCHA
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ""}
                onChange={onCaptchaChange}
                theme="dark"
              />
              <button 
                onClick={() => setShowCaptcha(false)}
                className="text-[10px] text-slate-500 hover:text-white transition-colors uppercase font-bold"
              >
                Cancel
              </button>
            </motion.div>
          )}

          {!showCaptcha && (
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-white/5 border border-white/5 text-white font-bold hover:bg-white/10 transition-all duration-200 disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>
          )}

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-slate-500 text-xs font-medium">
              New to the Nexus?{' '}
              <Link href="/register" className="text-white hover:text-indigo-400 transition-colors font-bold">
                Create Identity
              </Link>
            </p>
          </div>
        </motion.div>
        
        <div className="mt-10 flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-700">
          <span className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Biometric Encrypted</span>
          <span className="w-1 h-1 rounded-full bg-slate-800" />
          <span className="flex items-center gap-1.5"><Cpu className="w-3 h-3" /> Secure Node</span>
        </div>
      </div>
    </div>
  )
}
