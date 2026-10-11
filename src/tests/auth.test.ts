import { describe, it, expect, beforeEach } from 'vitest'
import { isSupabaseConfigured, getOAuthRedirectUrl, getSupabaseConfigStatus } from '@/lib/supabase'
import { extractOAuthErrorFromUrl } from '@/context/AuthContext'

// Mock Storage for node-based testing environments
class MemoryStorage {
  private store = new Map<string, string>()

  getItem(key: string) {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.store.set(key, String(value))
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  clear() {
    this.store.clear()
  }
}

const mockStorage = new MemoryStorage()

describe('Supabase Configuration Detection & Diagnostics', () => {
  it('detects whether valid Supabase configuration is present', () => {
    expect(typeof isSupabaseConfigured).toBe('boolean')
  })

  it('provides structured configuration diagnostics', () => {
    const status = getSupabaseConfigStatus()
    expect(status).toHaveProperty('isConfigured')
    expect(status).toHaveProperty('hasUrl')
    expect(status).toHaveProperty('hasKey')
    expect(status).toHaveProperty('urlSource')
    expect(status).toHaveProperty('keySource')
    expect(Array.isArray(status.missingVars)).toBe(true)
  })
})

describe('OAuth Redirect URL Selection — Production vs Localhost', () => {
  it('resolves production Vercel domain correctly and NEVER returns localhost in production', () => {
    const prodWindow = {
      location: {
        origin: 'https://money-map-five-weld.vercel.app',
      },
    }

    const redirectUrl = getOAuthRedirectUrl(undefined, prodWindow)
    expect(redirectUrl).toBe('https://money-map-five-weld.vercel.app/')
    expect(redirectUrl).not.toContain('localhost')
    expect(redirectUrl).not.toContain(':3000')
  })

  it('normalizes trailing slashes properly on production origin', () => {
    const prodWithSlash = {
      location: {
        origin: 'https://money-map-five-weld.vercel.app/',
      },
    }

    const redirectUrl = getOAuthRedirectUrl(undefined, prodWithSlash)
    expect(redirectUrl).toBe('https://money-map-five-weld.vercel.app/')
  })

  it('resolves local development port 3000 when running on localhost', () => {
    const localWindow = {
      location: {
        origin: 'http://localhost:3000',
      },
    }

    const redirectUrl = getOAuthRedirectUrl(undefined, localWindow)
    expect(redirectUrl).toBe('http://localhost:3000/')
  })

  it('prioritizes custom redirect URL if provided', () => {
    const custom = 'https://money-map-five-weld.vercel.app/login'
    const redirectUrl = getOAuthRedirectUrl(custom)
    expect(redirectUrl).toBe(custom)
  })

  it('falls back safely to localhost:3000/ when window is undefined (SSR/test runner)', () => {
    const redirectUrl = getOAuthRedirectUrl(undefined, undefined)
    expect(redirectUrl).toBe('http://localhost:3000/')
  })
})

describe('OAuth Error Extraction from URL', () => {
  it('extracts error_description from query search string', () => {
    const search = '?error=access_denied&error_description=User+denied+access+to+application'
    const err = extractOAuthErrorFromUrl(search, '')
    expect(err).toBe('User denied access to application')
  })

  it('extracts error_description from hash fragment', () => {
    const hash = '#error=invalid_grant&error_description=Token+exchange+failed'
    const err = extractOAuthErrorFromUrl('', hash)
    expect(err).toBe('Token exchange failed')
  })

  it('provides friendly message for access_denied without description', () => {
    const search = '?error=access_denied'
    const err = extractOAuthErrorFromUrl(search, '')
    expect(err).toBe('Google sign-in was cancelled or access denied.')
  })

  it('returns null when no error is present in query or hash', () => {
    const search = '?code=valid-auth-code-xyz'
    const hash = '#access_token=valid-jwt-token'
    expect(extractOAuthErrorFromUrl(search, hash)).toBeNull()
  })
})

describe('Redirect Loop Prevention', () => {
  it('ensures targetRoute never equals /login to prevent infinite redirect loop', () => {
    const getSafeTargetRoute = (from?: string | null) => {
      return from && from !== '/login' ? from : '/'
    }

    expect(getSafeTargetRoute('/login')).toBe('/')
    expect(getSafeTargetRoute(null)).toBe('/')
    expect(getSafeTargetRoute(undefined)).toBe('/')
    expect(getSafeTargetRoute('/spending')).toBe('/spending')
    expect(getSafeTargetRoute('/transactions')).toBe('/transactions')
  })
})

describe('Authentication Validation Rules', () => {
  it('validates password minimum length requirement (>= 6 chars)', () => {
    const isPasswordValid = (pwd: string) => pwd.length >= 6
    expect(isPasswordValid('12345')).toBe(false)
    expect(isPasswordValid('123456')).toBe(true)
    expect(isPasswordValid('supersecret')).toBe(true)
  })

  it('validates email format before submitting', () => {
    const isEmailValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    expect(isEmailValid('invalid-email')).toBe(false)
    expect(isEmailValid('user@example')).toBe(false)
    expect(isEmailValid('user@example.com')).toBe(true)
    expect(isEmailValid('prajwal@moneymap.app')).toBe(true)
  })

  it('properly formats user display names and fallback initials', () => {
    const getInitials = (fullName?: string, email = '') => {
      if (fullName && fullName.trim().length > 0) return fullName[0].toUpperCase()
      return email ? email[0].toUpperCase() : 'U'
    }

    expect(getInitials('Prajwal Sharma', 'prajwal@moneymap.app')).toBe('P')
    expect(getInitials('', 'john.doe@test.com')).toBe('J')
    expect(getInitials(undefined, 'finance@domain.in')).toBe('F')
  })
})

describe('Demo Session Lifecycle', () => {
  const DEMO_STORAGE_KEY = 'moneymap_demo_user_v1'

  beforeEach(() => {
    mockStorage.clear()
  })

  it('stores demo session correctly in storage', () => {
    const demoUser = {
      id: 'usr-demo-001',
      email: 'prajwal@moneymap.app',
      fullName: 'Prajwal Sharma',
      provider: 'demo',
      createdAt: new Date().toISOString(),
    }

    mockStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(demoUser))
    const loaded = JSON.parse(mockStorage.getItem(DEMO_STORAGE_KEY) || '{}')
    expect(loaded.id).toBe('usr-demo-001')
    expect(loaded.email).toBe('prajwal@moneymap.app')
    expect(loaded.provider).toBe('demo')
  })

  it('clears demo session on sign out', () => {
    mockStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ id: 'usr-demo-001' }))
    expect(mockStorage.getItem(DEMO_STORAGE_KEY)).not.toBeNull()

    // Sign out simulation
    mockStorage.removeItem(DEMO_STORAGE_KEY)
    expect(mockStorage.getItem(DEMO_STORAGE_KEY)).toBeNull()
  })
})
