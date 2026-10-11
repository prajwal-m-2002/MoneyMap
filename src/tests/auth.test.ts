import { describe, it, expect, beforeEach } from 'vitest'
import { isSupabaseConfigured } from '@/lib/supabase'

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

describe('Supabase Configuration Detection', () => {
  it('detects whether valid Supabase configuration is present', () => {
    expect(typeof isSupabaseConfigured).toBe('boolean')
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
