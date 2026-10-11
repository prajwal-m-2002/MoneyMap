import { describe, it, expect } from 'vitest'
import {
  calculateEMIAmount,
  calculateTotalInterest,
  generateAmortizationSchedule,
  calculateLoanProgress,
  simulatePrepayment,
} from '@/lib/emiMath'
import type { EMI, EMIPayment, Account, Transaction } from '@/types/finance'
import { calculateAccountBalance } from '@/context/FinanceContext'

describe('Phase 9 — EMI Management & Loan Amortization Engine', () => {
  describe('1. EMI Mathematical Calculations (Reducing Balance Formula)', () => {
    it('calculates accurate monthly EMI for standard loans using reducing balance formula', () => {
      // 1 Lakh at 12% p.a. for 12 months:
      // r = 1% = 0.01 per month
      // E = 100000 * 0.01 * (1.01)^12 / ((1.01)^12 - 1) = 8884.8788... -> 8885
      const emi = calculateEMIAmount(100000, 12, 12)
      expect(emi).toBe(8885)

      // Total interest: 8885 * 12 - 100000 = 106620 - 100000 = 6620
      const totalInterest = calculateTotalInterest(100000, emi, 12)
      expect(totalInterest).toBe(6620)
    })

    it('correctly calculates car loan with fractional interest rate', () => {
      // 6 Lakhs at 8.75% p.a. for 48 months:
      const emi = calculateEMIAmount(600000, 8.75, 48)
      expect(emi).toBe(14860)

      const totalInterest = calculateTotalInterest(600000, emi, 48)
      expect(totalInterest).toBe(113280) // 14860 * 48 - 600000
    })

    it('handles 0% No-Cost EMI correctly with zero interest', () => {
      // 60,000 at 0% for 6 months
      const emi = calculateEMIAmount(60000, 0, 6)
      expect(emi).toBe(10000)

      const totalInterest = calculateTotalInterest(60000, emi, 6)
      expect(totalInterest).toBe(0)
    })

    it('guarantees 0% APR No-Cost EMI has strictly 0 total expected interest in calculateLoanProgress', () => {
      const macbookEMI: EMI = {
        id: 'emi-macbook',
        name: 'MacBook Pro M3',
        lender: 'Apple Financial / HDFC',
        principal: 169900,
        interestRate: 0,
        tenureMonths: 6,
        emiAmount: 28317,
        startDate: '2026-08-10',
        dueDay: 10,
        status: 'active',
        createdAt: '2026-08-10T00:00:00.000Z',
      }

      const progress = calculateLoanProgress(macbookEMI, [])
      expect(progress.totalExpectedInterest).toBe(0)
      expect(progress.totalLoanRepayment).toBe(169900)

      const schedule = generateAmortizationSchedule({
        principal: macbookEMI.principal,
        interestRate: macbookEMI.interestRate,
        tenureMonths: macbookEMI.tenureMonths,
        startDate: macbookEMI.startDate,
        dueDay: macbookEMI.dueDay,
        emiAmount: macbookEMI.emiAmount,
      })

      const totalScheduleInterest = schedule.reduce((sum, item) => sum + item.interestPaid, 0)
      expect(totalScheduleInterest).toBe(0)
      expect(progress.totalExpectedInterest).toBe(totalScheduleInterest)
    })

    it('handles edge cases gracefully (0 principal, 0 tenure)', () => {
      expect(calculateEMIAmount(0, 10, 12)).toBe(0)
      expect(calculateEMIAmount(100000, 10, 0)).toBe(0)
      expect(calculateTotalInterest(0, 5000, 12)).toBe(0)
    })
  })

  describe('2. Amortization Schedule Generation', () => {
    it('generates a full month-by-month schedule where principal sums to initial loan', () => {
      const schedule = generateAmortizationSchedule({
        principal: 100000,
        interestRate: 12,
        tenureMonths: 12,
        startDate: '2026-01-05',
        dueDay: 5,
      })

      expect(schedule).toHaveLength(12)
      expect(schedule[0].instalmentNumber).toBe(1)
      expect(schedule[0].openingBalance).toBe(100000)
      expect(schedule[0].paymentDate).toBe('2026-01-05')

      // In month 1: Interest = 100000 * 0.01 = 1000. Principal = 8885 - 1000 = 7885.
      expect(schedule[0].interestPaid).toBe(1000)
      expect(schedule[0].principalPaid).toBe(7885)

      // Total principal paid across all 12 months must exactly equal 100000
      const totalPrincipalPaid = schedule.reduce((sum, item) => sum + item.principalPaid, 0)
      expect(totalPrincipalPaid).toBe(100000)

      // Closing balance of final instalment must be exactly 0
      expect(schedule[11].closingBalance).toBe(0)

      // Amortization curve test: interest strictly decreases, principal strictly increases
      for (let i = 1; i < schedule.length; i++) {
        expect(schedule[i].interestPaid).toBeLessThanOrEqual(schedule[i - 1].interestPaid)
        expect(schedule[i].principalPaid).toBeGreaterThanOrEqual(schedule[i - 1].principalPaid)
      }
    })

    it('matches recorded paid payments in schedule', () => {
      const recordedPayment: EMIPayment = {
        id: 'pay-test-1',
        emiId: 'emi-test',
        instalmentNumber: 1,
        amount: 8885,
        principalComponent: 7885,
        interestComponent: 1000,
        paymentDate: '2026-01-05',
        status: 'paid',
      }

      const schedule = generateAmortizationSchedule({
        principal: 100000,
        interestRate: 12,
        tenureMonths: 12,
        startDate: '2026-01-05',
        payments: [recordedPayment],
      })

      expect(schedule[0].status).toBe('paid')
      expect(schedule[0].paymentId).toBe('pay-test-1')
      expect(schedule[1].status).not.toBe('paid')
    })
  })

  describe('3. Prepayment and Early Foreclosure Simulator', () => {
    it('simulates tenure reduction strategy correctly (saving months and interest)', () => {
      const res = simulatePrepayment({
        principalRemaining: 400000,
        annualRatePercent: 8.75,
        currentEmi: 14860,
        currentTenureRemaining: 32,
        prepaymentAmount: 50000,
        strategy: 'reduce_tenure',
      })

      expect(res.strategy).toBe('reduce_tenure')
      expect(res.prepaymentAmount).toBe(50000)
      // New tenure should be fewer months than original 32 months
      expect(res.newTenureMonths).toBeLessThan(32)
      expect(res.monthsSaved).toBeGreaterThan(0)
      expect(res.interestSaved).toBeGreaterThan(0)
      expect(res.newEmiAmount).toBe(14860) // EMI remains unchanged
    })

    it('simulates EMI reduction strategy correctly (lowering monthly outflow)', () => {
      const res = simulatePrepayment({
        principalRemaining: 400000,
        annualRatePercent: 8.75,
        currentEmi: 14860,
        currentTenureRemaining: 32,
        prepaymentAmount: 50000,
        strategy: 'reduce_emi',
      })

      expect(res.strategy).toBe('reduce_emi')
      expect(res.newTenureMonths).toBe(32) // Tenure remains unchanged
      expect(res.monthsSaved).toBe(0)
      expect(res.newEmiAmount).toBeLessThan(14860) // Monthly EMI drops
      expect(res.interestSaved).toBeGreaterThan(0)
    })

    it('handles 100% full foreclosure cleanly', () => {
      const res = simulatePrepayment({
        principalRemaining: 200000,
        annualRatePercent: 9,
        currentEmi: 10000,
        currentTenureRemaining: 24,
        prepaymentAmount: 200000, // Full loan paid off!
        strategy: 'reduce_tenure',
      })

      expect(res.newTenureMonths).toBe(0)
      expect(res.newEmiAmount).toBe(0)
      expect(res.monthsSaved).toBe(24)
      expect(res.interestSaved).toBe(res.originalRemainingInterest)
    })
  })

  describe('4. Loan Progress Tracking', () => {
    it('accurately computes paid instalments, remaining balance, and progress percentage', () => {
      const testEmi: EMI = {
        id: 'emi-test-1',
        name: 'Auto Loan',
        lender: 'HDFC',
        principal: 500000,
        interestRate: 8.5,
        tenureMonths: 36,
        emiAmount: 15783,
        startDate: '2025-01-05',
        dueDay: 5,
        status: 'active',
      }

      const payments: EMIPayment[] = [
        {
          id: 'pay-1',
          emiId: 'emi-test-1',
          instalmentNumber: 1,
          amount: 15783,
          principalComponent: 12241,
          interestComponent: 3542,
          paymentDate: '2025-01-05',
          status: 'paid',
        },
        {
          id: 'pay-2',
          emiId: 'emi-test-1',
          instalmentNumber: 2,
          amount: 15783,
          principalComponent: 12328,
          interestComponent: 3455,
          paymentDate: '2025-02-05',
          status: 'paid',
        },
      ]

      const progress = calculateLoanProgress(testEmi, payments)

      expect(progress.paidInstalmentsCount).toBe(2)
      expect(progress.totalInstalments).toBe(36)
      expect(progress.remainingInstalments).toBe(34)
      expect(progress.actualPrincipalPaid).toBe(12241 + 12328)
      expect(progress.remainingPrincipal).toBe(500000 - (12241 + 12328))
      expect(progress.progressPercent).toBe(Math.round(((12241 + 12328) / 500000) * 100))
      expect(progress.nextInstalment?.instalmentNumber).toBe(3)
    })
  })

  describe('5. Account Ledger Single-Entry Guarantee & Ledger Impact', () => {
    it('debits linked account balance cleanly on EMI payment without duplicate entries', () => {
      const account: Account = {
        id: 'acc-axis',
        name: 'Axis Bank',
        type: 'savings',
        balance: 50000,
        openingBalance: 50000,
        isActive: true,
      }

      // Record EMI payment transaction
      const emiTransaction: Transaction = {
        id: 'tx-emi-1',
        type: 'expense',
        amount: 14860,
        title: 'HDFC Car Loan (EMI #1)',
        category: 'EMI & Loans',
        accountId: 'acc-axis',
        date: '2026-10-05',
        createdAt: new Date().toISOString(),
      }

      const updatedBalance = calculateAccountBalance(account, [emiTransaction])
      expect(updatedBalance).toBe(50000 - 14860) // 35,140
    })
  })
})
