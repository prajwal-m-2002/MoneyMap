import { describe, it, expect } from 'vitest'
import { calculateAccountBalance } from '@/context/FinanceContext'
import { calculateEMIAmount, generateAmortizationSchedule } from '@/lib/emiMath'
import { calculateNetWorthBreakdown } from '@/lib/portfolioMath'
import { parseBankStatement } from '@/lib/statementParser'
import { generateCashFlowForecast } from '@/lib/predictionEngine'
import { formatINR } from '@/lib/utils'
import type { Account, Transaction } from '@/types/finance'

describe('Phase 13 — System Hardening, Invariance & Resilience Engine', () => {
  describe('1. Financial Conservation & Invariance Laws', () => {
    const baseAccountA: Account = {
      id: 'acc-a',
      name: 'Bank A',
      type: 'savings',
      balance: 50000,
      openingBalance: 50000,
    }

    const baseAccountB: Account = {
      id: 'acc-b',
      name: 'Bank B',
      type: 'savings',
      balance: 20000,
      openingBalance: 20000,
    }

    it('preserves total liquid funds under internal account transfers', () => {
      const initialTotal = baseAccountA.openingBalance + baseAccountB.openingBalance

      const transferTx: Transaction = {
        id: 'tx-trf-1',
        type: 'transfer',
        amount: 15000,
        title: 'Transfer to Savings',
        category: 'Transfer',
        accountId: 'acc-a', // source
        toAccountId: 'acc-b', // destination
        date: '2026-10-05',
        createdAt: '2026-10-05T00:00:00Z',
      }

      const balA = calculateAccountBalance(baseAccountA, [transferTx])
      const balB = calculateAccountBalance(baseAccountB, [transferTx])

      expect(balA).toBe(35000)
      expect(balB).toBe(35000)
      expect(balA + balB).toBe(initialTotal) // Total liquid pool conserved!
    })

    it('strictly modifies account balance atomically on income and expense transactions', () => {
      const txs: Transaction[] = [
        {
          id: 'tx-inc-1',
          type: 'income',
          amount: 25000,
          title: 'Consulting Income',
          category: 'Income',
          accountId: 'acc-a',
          date: '2026-10-01',
          createdAt: '2026-10-01T00:00:00Z',
        },
        {
          id: 'tx-exp-1',
          type: 'expense',
          amount: 5000,
          title: 'Office Supplies',
          category: 'Shopping',
          accountId: 'acc-a',
          date: '2026-10-02',
          createdAt: '2026-10-02T00:00:00Z',
        },
      ]

      const balA = calculateAccountBalance(baseAccountA, txs)
      // 50,000 + 25,000 - 5,000 = 70,000
      expect(balA).toBe(70000)
    })
  })

  describe('2. Loan Amortization Conservation Laws', () => {
    it('verifies that the sum of principal components in an amortization schedule exactly equals the original loan principal', () => {
      const principal = 500000
      const interestRate = 9.5
      const tenureMonths = 36

      const emiAmount = calculateEMIAmount(principal, interestRate, tenureMonths)
      const schedule = generateAmortizationSchedule({
        principal,
        interestRate,
        tenureMonths,
        emiAmount,
        startDate: '2026-01-01',
      })

      expect(schedule).toHaveLength(36)

      const totalPrincipalSum = schedule.reduce((sum, item) => sum + item.principalPaid, 0)
      expect(Math.round(totalPrincipalSum)).toBe(principal)

      // Final instalment must reduce remaining balance to 0
      expect(schedule[schedule.length - 1].closingBalance).toBe(0)
    })
  })

  describe('3. Net Worth Solvency Invariants', () => {
    it('accurately evaluates positive, zero, and negative net worth scenarios without formatting errors', () => {
      // Scenario A: Solvent (Assets > Debt)
      const solvent = calculateNetWorthBreakdown({
        liquidAccounts: [
          { id: 'acc-1', name: 'Savings', type: 'savings', balance: 100000, openingBalance: 100000 },
        ],
        investments: [
          {
            id: 'inv-1',
            name: 'Mutual Fund',
            assetType: 'mutual_funds',
            investedAmount: 180000,
            currentValue: 200000,
            lastUpdated: '2026-01-01',
          },
        ],
        emis: [
          {
            id: 'emi-1',
            name: 'Car Loan',
            lender: 'HDFC',
            principal: 50000,
            interestRate: 9,
            tenureMonths: 12,
            emiAmount: 4373,
            startDate: '2026-01-01',
            dueDay: 5,
            status: 'active',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        emiPayments: [],
      })
      expect(solvent.netWorth).toBe(250000)
      expect(solvent.grossAssets).toBe(300000)
      expect(formatINR(solvent.netWorth)).toBe('₹2,50,000')

      // Scenario B: Insolvent (Debt > Assets)
      const insolvent = calculateNetWorthBreakdown({
        liquidAccounts: [
          { id: 'acc-2', name: 'Savings', type: 'savings', balance: 50000, openingBalance: 50000 },
        ],
        investments: [
          {
            id: 'inv-2',
            name: 'Stocks',
            assetType: 'stocks',
            investedAmount: 60000,
            currentValue: 50000,
            lastUpdated: '2026-01-01',
          },
        ],
        emis: [
          {
            id: 'emi-2',
            name: 'Personal Loan',
            lender: 'ICICI',
            principal: 200000,
            interestRate: 12,
            tenureMonths: 24,
            emiAmount: 9415,
            startDate: '2026-01-01',
            dueDay: 5,
            status: 'active',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        emiPayments: [],
      })
      expect(insolvent.netWorth).toBe(-100000)
      expect(formatINR(insolvent.netWorth)).toBe('-₹1,00,000') // Proper negative formatting, never ₹-
      expect(insolvent.debtRatio).toBe(2) // 200,000 / 100,000 = 2.0 (200%)
    })
  })

  describe('4. Predictive Forecast Continuity Invariants', () => {
    it('guarantees that daily balance transitions are continuous across all 30 days', () => {
      const forecast = generateCashFlowForecast(
        50000,
        [
          {
            id: 'r-1',
            title: 'Salary',
            amount: 60000,
            type: 'income',
            category: 'Salary',
            accountId: 'acc-1',
            frequency: 'monthly',
            interval: 1,
            startDate: '2026-10-01',
            nextDueDate: '2026-10-15',
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

      expect(forecast.days).toHaveLength(30)

      // Invariant: Balance[t] = Balance[t-1] + Inflows[t] - Outflows[t]
      for (let i = 1; i < forecast.days.length; i++) {
        const prev = forecast.days[i - 1]
        const curr = forecast.days[i]
        const expectedBalance = prev.projectedBalance + curr.inflows - curr.outflows
        expect(curr.projectedBalance).toBe(expectedBalance)
      }
    })
  })

  describe('5. Parser Fault Tolerance & Graceful Degradation', () => {
    it('handles empty strings, malformed delimiters, and invalid rows without throwing unhandled exceptions', () => {
      const emptyResult = parseBankStatement('')
      expect(emptyResult.totalCount).toBe(0)
      expect(emptyResult.errors.length).toBeGreaterThan(0)

      const garbageResult = parseBankStatement('foo,bar\n123,456\n***,///')
      expect(garbageResult.totalCount).toBe(0) // skips invalid data rows gracefully
    })
  })
})
