import type { Session as SupabaseSession } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  fullName?: string
  avatarUrl?: string
  provider?: 'email' | 'google' | 'demo'
  createdAt?: string
}

export interface AuthState {
  user: UserProfile | null
  session: SupabaseSession | null
  loading: boolean
  isConfigured: boolean
  isDemoMode: boolean
  error: string | null
}
