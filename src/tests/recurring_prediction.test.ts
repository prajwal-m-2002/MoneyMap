import { describe, it, expect } from 'vitest'
import {
  calculateNextDueDate,
  isRecurringDue,
  generateCashFlowForecast,
  discoverRecurringPatterns,
  DEFAULT_RECURRING_TRANSACTIONS,
} from '@/lib/predictionEngine'
import type { RecurringTransaction, Transaction, EMI } from '@/types/finance'

describe('Phase 12 — Recurring Transactions & Smart Prediction Engine', () => {
  describe('1. Next Due Date Calculation Math', () => {
    it('accurately advances daily intervals', () => {
      expect(calculateNextDueDate('2026-10-01', 'daily', 1)).toBe('2026-10-02')
      expect(calculateNextDueDate('2026-10-01', 'daily', 3)).toBe('2026-10-04')
    })

    it('accurately advances weekly intervals', () => {
      expect(calculateNextDueDate('2026-10-01', 'weekly', 1)).toBe('2026-10-08')
      expect(calculateNextDueDate('2026-10-01', 'weekly', 2)).toBe('2026-10-15')
    })

    it('accurately advances monthly intervals and handles month-end clamping', () => {
      expect(calculateNextDueDate('2026-10-05', 'monthly', 1)).toBe('2026-11-05')
      expect(calculateNextDueDate('2026-10-05', 'monthly', 2)).toBe('2026-12-05')

      // Jan 31 + 1 month in non-leap year -> Feb 28
      expect(calculateNextDueDate('2026-01-31', 'monthly', 1)).toBe('2026-02-28')
    })

    it('accurately advances quarterly and yearly intervals', () => {
      expect(calculateNextDueDate('2026-01-15', 'quarterly', 1)).toBe('2026-04-15')
      expect(calculateNextDueDate('2026-01-15', 'yearly', 1)).toBe('2027-01-15')
    })
  })

  describe('2. Due Date Detection & Status Evaluation', () => {
    const sampleRule: RecurringTransaction = {
      id: 'rec-test-1',
      title: 'Broadband',
      amount: 999,
      type: 'expense',
      category: 'Bills & Utilities',
      accountId: 'acc-1',
      frequency: 'monthly',
      interval: 1,
      startDate: '2026-10-01',
      nextDueDate: '2026-10-10',
      paymentMethod: 'UPI',
      autoProcess: true,
      status: 'active',
      createdAt: '2026-10-01T00:00:00Z',
    }

    it('marks active items with nextDueDate <= today as due', () => {
      expect(isRecurringDue(sampleRule, '2026-10-10')).toBe(true)
      expect(isRecurringDue(sampleRule, '2026-10-15')).toBe(true)
      expect(isRecurringDue(sampleRule, '2026-10-05')).toBe(false)
    })

    it('respects paused and completed statuses', () => {
      expect(isRecurringDue({ ...sampleRule, status: 'paused' }, '2026-10-15')).toBe(false)
      expect(isRecurringDue({ ...sampleRule, status: 'completed' }, '2026-10-15')).toBe(false)
    })

    it('respects endDate horizon limit', () => {
      const expiringRule: RecurringTransaction = {
        ...sampleRule,
        endDate: '2026-10-05',
        nextDueDate: '2026-10-10',
      }
      expect(isRecurringDue(expiringRule, '2026-10-10')).toBe(false)
    })
  })

  describe('3. Predictive 30-Day Cash Flow Forecast', () => {
    const recurringRules: RecurringTransaction[] = [
      {
        id: 'r-salary',
        title: 'Salary Credit',
        amount: 50000,
        type: 'income',
        category: 'Salary',
        accountId: 'acc-1',
        frequency: 'monthly',
        interval: 1,
        startDate: '2026-10-01',
        nextDueDate: '2026-10-05',
        paymentMethod: 'Net Banking',
        autoProcess: true,
        status: 'active',
        createdAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'r-rent',
        title: 'House Rent',
        amount: 15000,
        type: 'expense',
        category: 'Rent & Housing',
        accountId: 'acc-1',
        frequency: 'monthly',
        interval: 1,
        startDate: '2026-10-01',
        nextDueDate: '2026-10-06',
        paymentMethod: 'Net Banking',
        autoProcess: true,
        status: 'active',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ]

    const emis: EMI[] = [
      {
        id: 'emi-1',
        name: 'Personal Loan',
        lender: 'HDFC',
        principal: 100000,
        interestRate: 10,
        tenureMonths: 12,
        emiAmount: 8792,
        startDate: '2026-01-01',
        dueDay: 10, // Due on 10th of month
        status: 'active',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ]

    it('correctly projects daily balance forward 30 days factoring inflows and outflows', () => {
      const forecast = generateCashFlowForecast(
        20000, // starting balance
        recurringRules,
        emis,
        [], // no discretionary txs
        30,
        '2026-10-01'
      )

      expect(forecast.days).toHaveLength(30)
      expect(forecast.currentLiquidBalance).toBe(20000)

      // Upcoming inflows: +50,000 (Salary on 5th)
      expect(forecast.totalUpcomingInflows).toBe(50000)

      // Upcoming outflows: 15,000 (Rent on 6th) + 8,792 (EMI on 10th) = 23,792
      expect(forecast.totalUpcomingOutflows).toBe(23792)

      // Balance trajectory:
      // Oct 1 to Oct 4: 20,000
      expect(forecast.days[0].projectedBalance).toBe(20000)
      // Oct 5 (Salary +50,000): 70,000
      expect(forecast.days[4].projectedBalance).toBe(70000)
      // Oct 6 (Rent -15,000): 55,000
      expect(forecast.days[5].projectedBalance).toBe(55000)
      // Oct 10 (EMI -8,792): 46,208
      expect(forecast.days[9].projectedBalance).toBe(46208)

      // Safe to spend daily must be positive
      expect(forecast.safeDailySpend).toBeGreaterThan(0)
      expect(forecast.hasLowBalanceWarning).toBe(false)
    })

    it('detects cash dip warning if projected balance falls below safety buffer', () => {
      const forecast = generateCashFlowForecast(
        5000, // starting balance
        [
          {
            id: 'r-huge-bill',
            title: 'Credit Card Bill',
            amount: 10000,
            type: 'expense',
            category: 'Bills & Utilities',
            accountId: 'acc-1',
            frequency: 'monthly',
            interval: 1,
            startDate: '2026-10-01',
            nextDueDate: '2026-10-03',
            paymentMethod: 'Net Banking',
            autoProcess: true,
            status: 'active',
            createdAt: '2026-10-01T00:00:00Z',
          },
        ],
        [],
        [],
        30,
        '2026-10-01'
      )

      // Balance will dip to -5,000 on Oct 3
      expect(forecast.hasLowBalanceWarning).toBe(true)
      expect(forecast.lowestProjectedBalance.amount).toBeLessThan(5000)
    })
  })

  describe('4. Smart Pattern Discovery (Pattern Mining)', () => {
    it('discovers repeating transactions occurring in multiple months', () => {
      const sampleTxs: Transaction[] = [
        {
          id: 'tx-1',
          title: 'Airtel Broadband Fiber',
          amount: 999,
          type: 'expense',
          category: 'Bills & Utilities',
          accountId: 'acc-1',
          date: '2026-08-05',
          createdAt: '2026-08-05T00:00:00Z',
        },
        {
          id: 'tx-2',
          title: 'Airtel Broadband Fiber',
          amount: 999,
          type: 'expense',
          category: 'Bills & Utilities',
          accountId: 'acc-1',
          date: '2026-09-05',
          createdAt: '2026-09-05T00:00:00Z',
        },
        {
          id: 'tx-3',
          title: 'Airtel Broadband Fiber',
          amount: 999,
          type: 'expense',
          category: 'Bills & Utilities',
          accountId: 'acc-1',
          date: '2026-10-05',
          createdAt: '2026-10-05T00:00:00Z',
        },
        {
          id: 'tx-4',
          title: 'One-time Restaurant Dinner',
          amount: 1500,
          type: 'expense',
          category: 'Food & Dining',
          accountId: 'acc-1',
          date: '2026-10-02',
          createdAt: '2026-10-02T00:00:00Z',
        },
      ]

      const suggestions = discoverRecurringPatterns(sampleTxs)

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].title).toBe('Airtel Broadband Fiber')
      expect(suggestions[0].averageAmount).toBe(999)
      expect(suggestions[0].suggestedFrequency).toBe('monthly')
      expect(suggestions[0].approximateDayOfMonth).toBe(5)
      expect(suggestions[0].confidence).toBeGreaterThanOrEqual(80)
    })

    it('ignores one-off transactions and inconsistent amounts', () => {
      const sampleTxs: Transaction[] = [
        {
          id: 'tx-1',
          title: 'Shopping Mall',
          amount: 500,
          type: 'expense',
          category: 'Shopping',
          accountId: 'acc-1',
          date: '2026-08-01',
          createdAt: '2026-08-01T00:00:00Z',
        },
        {
          id: 'tx-2',
          title: 'Shopping Mall',
          amount: 8000, // very different amount
          type: 'expense',
          category: 'Shopping',
          accountId: 'acc-1',
          date: '2026-09-01',
          createdAt: '2026-09-01T00:00:00Z',
        },
      ]

      const suggestions = discoverRecurringPatterns(sampleTxs)
      expect(suggestions).toHaveLength(0)
    })
  })

  describe('5. Default Seed Recurring Rules Integrity', () => {
    it('provides comprehensive seed recurring rules for the Indian financial ecosystem', () => {
      expect(DEFAULT_RECURRING_TRANSACTIONS.length).toBeGreaterThanOrEqual(5)

      const salaryRule = DEFAULT_RECURRING_TRANSACTIONS.find((r) => r.type === 'income')
      expect(salaryRule).toBeDefined()
      expect(salaryRule?.amount).toBe(65000)

      const rentRule = DEFAULT_RECURRING_TRANSACTIONS.find((r) => r.category === 'Rent & Housing')
      expect(rentRule).toBeDefined()
      expect(rentRule?.amount).toBe(18000)

      const sipRule = DEFAULT_RECURRING_TRANSACTIONS.find((r) => r.category === 'Investments')
      expect(sipRule).toBeDefined()
      expect(sipRule?.amount).toBe(5000)
    })
  })
})
