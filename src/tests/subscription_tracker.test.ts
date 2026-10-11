import { describe, it, expect } from 'vitest'
import type { RecurringTransaction } from '@/types/finance'

describe('Subscription & Free Trial Tracker', () => {
  it('creates and validates a standard paid subscription', () => {
    const netflix: RecurringTransaction = {
      id: 'sub-netflix',
      title: 'Netflix Premium',
      amount: 649,
      type: 'expense',
      category: 'Entertainment',
      accountId: 'acc-axis',
      frequency: 'monthly',
      interval: 1,
      startDate: '2026-11-01',
      endDate: '2027-11-01',
      nextDueDate: '2026-12-01',
      paymentMethod: 'Net Banking',
      autoProcess: true,
      status: 'active',
      createdAt: '2026-11-01T00:00:00Z',
      provider: 'Netflix',
      isFreeTrial: false,
      remindOneDayBefore: true,
      billingCycle: 'monthly',
    }

    expect(netflix.amount).toBe(649)
    expect(netflix.provider).toBe('Netflix')
    expect(netflix.isFreeTrial).toBe(false)
    expect(netflix.autoProcess).toBe(true)
  })

  it('supports ₹0 free trials like Amazon Music promotional autopay with cancellation deadline', () => {
    const amazonMusicTrial: RecurringTransaction = {
      id: 'sub-amz-music',
      title: 'Amazon Music HD',
      amount: 0,
      type: 'expense',
      category: 'Music',
      accountId: 'acc-axis',
      frequency: 'monthly',
      interval: 1,
      startDate: '2026-10-15',
      endDate: '2026-11-15',
      nextDueDate: '2026-11-15',
      paymentMethod: 'Net Banking',
      autoProcess: true,
      status: 'active',
      createdAt: '2026-10-15T00:00:00Z',
      provider: 'Amazon',
      isFreeTrial: true,
      remindOneDayBefore: true,
      billingCycle: 'trial',
      notes: 'Cancel before Nov 15 to avoid ₹149 monthly charge',
    }

    expect(amazonMusicTrial.amount).toBe(0)
    expect(amazonMusicTrial.isFreeTrial).toBe(true)
    expect(amazonMusicTrial.notes).toContain('Cancel before Nov 15')
  })

  it('correctly calculates 1-day advance reminder date before subscription end date', () => {
    const endDate = '2026-11-20'
    const [year, month, day] = endDate.split('-').map(Number)
    const d = new Date(Date.UTC(year, month - 1, day))
    d.setUTCDate(d.getUTCDate() - 1)
    const reminderDate = d.toISOString().slice(0, 10)

    expect(reminderDate).toBe('2026-11-19')
  })

  it('correctly flags urgent cancellation when trial ends within 3 days', () => {
    const today = new Date('2026-11-10T00:00:00Z').getTime()
    const endDate = new Date('2026-11-12T00:00:00Z').getTime()
    const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))

    expect(daysRemaining).toBe(2)
    const isUrgent = daysRemaining <= 3 && daysRemaining >= 0
    expect(isUrgent).toBe(true)
  })
})
