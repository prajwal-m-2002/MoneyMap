import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { UserProfile } from '@/types/auth'
import {
  supabase,
  isSupabaseConfigured,
  signInWithEmail as supabaseSignInWithEmail,
  signUpWithEmail as supabaseSignUpWithEmail,
  signInWithGoogle as supabaseSignInWithGoogle,
  signOutUser as supabaseSignOutUser,
} from '@/lib/supabase'

interface AuthContextType {
  user: UserProfile | null
  session: Session | null
  loading: boolean
  isConfigured: boolean
  isDemoMode: boolean
  error: string | null
  signInWithPassword: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUpWithPassword: (email: string, password: string, fullName?: string) => Promise<{ success: boolean; error?: string }>
  signInWithGoogle: () => Promise<void>
  loginAsDemo: (demoEmail?: string) => void
  signOut: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEMO_STORAGE_KEY = 'moneymap_demo_user_v1'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize Auth state
  useEffect(() => {
    let mounted = true

    async function initAuth() {
      try {
        if (isSupabaseConfigured && supabase) {
          // Check existing Supabase session
          const { data, error: sessionError } = await supabase.auth.getSession()
          if (sessionError) {
            console.warn('Supabase getSession error:', sessionError.message)
          }

          if (data?.session?.user && mounted) {
            const sbUser = data.session.user
            setSession(data.session)
            setUser({
              id: sbUser.id,
              email: sbUser.email || '',
              fullName: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0],
              avatarUrl: sbUser.user_metadata?.avatar_url,
              provider: (sbUser.app_metadata?.provider as 'email' | 'google') || 'email',
              createdAt: sbUser.created_at,
            })
            setIsDemoMode(false)
            setLoading(false)
            return
          }

          // Listen for Supabase auth changes
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, currentSession) => {
            if (!mounted) return
            setSession(currentSession)
            if (currentSession?.user) {
              const sbUser = currentSession.user
              setUser({
                id: sbUser.id,
                email: sbUser.email || '',
                fullName: sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0],
                avatarUrl: sbUser.user_metadata?.avatar_url,
                provider: (sbUser.app_metadata?.provider as 'email' | 'google') || 'email',
                createdAt: sbUser.created_at,
              })
              setIsDemoMode(false)
            } else {
              // If not in demo mode, clear user
              if (!localStorage.getItem(DEMO_STORAGE_KEY)) {
                setUser(null)
              }
            }
            setLoading(false)
          })

          return () => {
            subscription.unsubscribe()
          }
        }

        // Check if demo user was saved
        const storedDemo = localStorage.getItem(DEMO_STORAGE_KEY)
        if (storedDemo && mounted) {
          try {
            const parsed = JSON.parse(storedDemo)
            setUser(parsed)
            setIsDemoMode(true)
          } catch {
            localStorage.removeItem(DEMO_STORAGE_KEY)
          }
        }
      } catch (err: any) {
        console.error('Auth initialization error:', err)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    return () => {
      mounted = false
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const signInWithPassword = async (email: string, password: string) => {
    setError(null)
    if (!email || !password) {
      const msg = 'Please enter both email and password.'
      setError(msg)
      return { success: false, error: msg }
    }

    if (!isSupabaseConfigured || !supabase) {
      // In unconfigured mode, seamlessly allow user login as local user
      loginAsDemo(email)
      return { success: true }
    }

    try {
      const data = await supabaseSignInWithEmail(email, password)
      if (data.user) {
        setIsDemoMode(false)
        localStorage.removeItem(DEMO_STORAGE_KEY)
        return { success: true }
      }
      return { success: false, error: 'Authentication failed.' }
    } catch (err: any) {
      const msg = err.message || 'Failed to sign in. Please check your credentials.'
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const signUpWithPassword = async (email: string, password: string, fullName?: string) => {
    setError(null)
    if (!email || !password) {
      const msg = 'Please provide both email and password.'
      setError(msg)
      return { success: false, error: msg }
    }

    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters.'
      setError(msg)
      return { success: false, error: msg }
    }

    if (!isSupabaseConfigured || !supabase) {
      loginAsDemo(email)
      return { success: true }
    }

    try {
      const data = await supabaseSignUpWithEmail(email, password, fullName)
      if (data.user) {
        setIsDemoMode(false)
        localStorage.removeItem(DEMO_STORAGE_KEY)
        return { success: true }
      }
      return { success: false, error: 'Failed to create account.' }
    } catch (err: any) {
      const msg = err.message || 'Registration failed.'
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const signInWithGoogle = async () => {
    setError(null)
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable Google OAuth.')
      return
    }

    try {
      await supabaseSignInWithGoogle()
    } catch (err: any) {
      setError(err.message || 'Google sign in failed.')
    }
  }

  const loginAsDemo = useCallback((demoEmail = 'demo.user@moneymap.app') => {
    const demoUser: UserProfile = {
      id: 'usr-demo-001',
      email: demoEmail,
      fullName: demoEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      provider: 'demo',
      createdAt: new Date().toISOString(),
    }
    setUser(demoUser)
    setIsDemoMode(true)
    setError(null)
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser))
    } catch {
      // ignore
    }
  }, [])

  const signOut = async () => {
    setError(null)
    try {
      if (isSupabaseConfigured && supabase) {
        await supabaseSignOutUser()
      }
    } catch (err) {
      console.warn('Supabase sign out error:', err)
    } finally {
      localStorage.removeItem(DEMO_STORAGE_KEY)
      setUser(null)
      setSession(null)
      setIsDemoMode(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        isDemoMode,
        error,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        loginAsDemo,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
