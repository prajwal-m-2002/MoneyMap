import { createClient, type SupabaseClient, type User, type Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL
) as string | undefined

const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
) as string | undefined

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project-id') &&
  supabaseAnonKey !== 'your-supabase-anon-key-here' &&
  supabaseAnonKey.length > 10
)

export interface SupabaseConfigStatus {
  isConfigured: boolean
  hasUrl: boolean
  hasKey: boolean
  urlSource: 'VITE' | 'NEXT_PUBLIC' | 'none'
  keySource: 'VITE' | 'NEXT_PUBLIC' | 'none'
  missingVars: string[]
  error?: string
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const hasViteUrl = Boolean(import.meta.env.VITE_SUPABASE_URL)
  const hasNextUrl = Boolean(import.meta.env.NEXT_PUBLIC_SUPABASE_URL)
  const hasUrl = Boolean(supabaseUrl)

  const hasViteKey = Boolean(
    import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  )
  const hasNextKey = Boolean(
    import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const hasKey = Boolean(supabaseAnonKey)

  const missingVars: string[] = []
  if (!hasUrl) missingVars.push('VITE_SUPABASE_URL')
  if (!hasKey) missingVars.push('VITE_SUPABASE_ANON_KEY')

  let error: string | undefined
  if (!hasUrl && !hasKey) {
    error = 'Missing Supabase URL and Publishable/Anon Key. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.'
  } else if (!hasUrl) {
    error = 'Missing Supabase URL. Set VITE_SUPABASE_URL in your environment.'
  } else if (!hasKey) {
    error = 'Missing Supabase Publishable/Anon Key. Set VITE_SUPABASE_ANON_KEY in your environment.'
  } else if (!isSupabaseConfigured) {
    error = 'Supabase environment variables appear invalid or contain default placeholder values.'
  }

  return {
    isConfigured: isSupabaseConfigured,
    hasUrl,
    hasKey,
    urlSource: hasViteUrl ? 'VITE' : hasNextUrl ? 'NEXT_PUBLIC' : 'none',
    keySource: hasViteKey ? 'VITE' : hasNextKey ? 'NEXT_PUBLIC' : 'none',
    missingVars,
    error,
  }
}

/**
 * Resolves the OAuth callback redirect URL dynamically based on the current origin.
 * In production on Vercel, this returns https://money-map-five-weld.vercel.app/
 * In local development, this returns http://localhost:3000/
 * Never hardcodes localhost for production environments.
 */
export function getOAuthRedirectUrl(
  customRedirect?: string,
  win: Window | { location: { origin: string } } | undefined = typeof window !== 'undefined' ? window : undefined
): string {
  if (customRedirect && customRedirect.trim().length > 0) {
    return customRedirect.trim()
  }

  if (win?.location?.origin) {
    const origin = win.location.origin.replace(/\/+$/, '')
    return `${origin}/`
  }

  return 'http://localhost:3000/'
}

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export async function signInWithGoogle(redirectTo?: string) {
  if (!supabase) {
    const status = getSupabaseConfigStatus()
    throw new Error(status.error || 'Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }

  const callbackUrl = getOAuthRedirectUrl(redirectTo)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) throw error
  return data
}

export async function signInWithEmail(email: string, password: string): Promise<{ user: User | null; session: Session | null }> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signUpWithEmail(email: string, password: string, fullName?: string): Promise<{ user: User | null; session: Session | null }> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || email.split('@')[0],
      },
    },
  })

  if (error) throw error
  return data
}

export async function signOutUser() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
