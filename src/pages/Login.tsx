import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Logo } from '@/components/Logo'
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Sparkles,
  CloudCheck,
  ShieldCheck,
  Database,
  ArrowRight,
  Info,
} from 'lucide-react'

export default function Login() {
  const {
    user,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    loginAsDemo,
    isConfigured,
    error: authError,
    clearError,
  } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname || '/'

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      navigate(from, { replace: true })
    }
  }, [user, navigate, from])

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [showConfigGuide, setShowConfigGuide] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    clearError()
    setSubmitting(true)

    try {
      if (mode === 'signin') {
        const res = await signInWithPassword(email, password)
        if (res.success) {
          navigate(from, { replace: true })
        } else if (res.error) {
          setLocalError(res.error)
        }
      } else {
        const res = await signUpWithPassword(email, password, fullName)
        if (res.success) {
          navigate(from, { replace: true })
        } else if (res.error) {
          setLocalError(res.error)
        }
      }
    } catch (err: any) {
      setLocalError(err.message || 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleClick = async () => {
    setLocalError(null)
    clearError()
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setLocalError(err.message || 'Google sign-in failed.')
    }
  }

  const handleDemoClick = () => {
    loginAsDemo('prajwal@moneymap.app')
    navigate(from, { replace: true })
  }

  const activeError = localError || authError

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-[var(--bg-app)]">
      {/* Background radial gradient glow */}
      <div className="fixed inset-0 pointer-events-none opacity-40 dark:opacity-20 flex items-center justify-center">
        <div className="w-[500px] h-[500px] rounded-full bg-brand-500/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6 animate-slide-up">
        {/* Branding header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm mb-1">
            <Logo variant="icon" size="md" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            MoneyMap
          </h1>
          <p className="text-xs text-[var(--text-secondary)] font-medium">
            Your Money, Clearly Mapped.
          </p>
        </div>

        {/* Card */}
        <div className="card p-6 sm:p-8 bg-[var(--bg-surface)] border border-[var(--border)] shadow-xl rounded-2xl space-y-6">
          {/* Signin / Signup Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
            <button
              type="button"
              id="tab-signin"
              onClick={() => {
                setMode('signin')
                setLocalError(null)
                clearError()
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signin'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              id="tab-signup"
              onClick={() => {
                setMode('signup')
                setLocalError(null)
                clearError()
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'signup'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            id="google-signin-btn"
            onClick={handleGoogleClick}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-medium text-sm transition-all duration-150 shadow-sm hover:shadow"
          >
            {/* Google SVG Icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12c0 2.03.45 3.84 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-[var(--border)] w-full" />
            <span className="bg-[var(--bg-surface)] px-3 text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold absolute">
              or continue with email
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeError && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="flex-1">{activeError}</span>
              </div>
            )}

            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    id="login-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Prajwal Sharma"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={submitting}
              className="w-full btn-primary py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 transition-all"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'signin' ? 'Sign In to MoneyMap' : 'Create MoneyMap Account'}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Mode Access */}
          <div className="pt-2 border-t border-[var(--border)]">
            <button
              type="button"
              id="demo-login-btn"
              onClick={handleDemoClick}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-brand-50/60 dark:bg-brand-950/20 border border-brand-200/80 dark:border-brand-800/40 text-brand-800 dark:text-brand-300 hover:bg-brand-100/60 transition-all group"
            >
              <div className="flex items-center gap-2.5 text-left">
                <div className="w-7 h-7 rounded-lg bg-brand-500 text-white flex items-center justify-center shadow-xs">
                  <Sparkles size={14} />
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">Explore with Demo Session</p>
                  <p className="text-[10px] text-brand-600 dark:text-brand-400">
                    Instant access without credentials
                  </p>
                </div>
              </div>
              <ArrowRight
                size={14}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </button>
          </div>
        </div>

        {/* Supabase Status & Setup Guide Card */}
        <div className="card p-4 bg-[var(--bg-surface)]/80 border border-[var(--border)] rounded-2xl text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-[var(--text-muted)]" />
              <span className="font-semibold text-[var(--text-primary)]">
                Supabase Backend
              </span>
            </div>
            {isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-200/60 dark:border-emerald-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-semibold text-[11px] border border-amber-200/60 dark:border-amber-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Local Mode
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowConfigGuide(!showConfigGuide)}
            className="text-[11px] text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-medium"
          >
            <Info size={12} />
            <span>{showConfigGuide ? 'Hide configuration steps' : 'How to connect live Supabase & Google OAuth'}</span>
          </button>

          {showConfigGuide && (
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] space-y-2 leading-relaxed animate-fade-in">
              <p className="font-semibold text-[var(--text-primary)]">
                To connect your live Supabase project:
              </p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Create a project at <strong>supabase.com</strong></li>
                <li>Go to <strong>Project Settings → API</strong></li>
                <li>Add to your <code className="px-1 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)]">.env.local</code>:</li>
              </ol>
              <pre className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] font-mono text-[10px] text-[var(--text-primary)] overflow-x-auto">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...`}
              </pre>
              <p className="text-[10px] text-[var(--text-muted)]">
                For Google OAuth, configure Google Client ID & Secret in Supabase <strong>Authentication → Providers → Google</strong>.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-4 text-[11px] text-[var(--text-muted)] font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} /> 256-bit Encryption
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <CloudCheck size={12} /> RLS Protected
          </span>
        </div>
      </div>
    </div>
  )
}
