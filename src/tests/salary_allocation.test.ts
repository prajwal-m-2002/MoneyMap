import { describe, it, expect } from 'vitest'
import type { Transaction } from '@/types/finance'

// Logic helper mirror of SalaryAllocationCard calculations
export function calculateSalaryAllocation({
  transactions,
  expensesThisMonth,
  incomeThisMonth,
  emiDueThisMonth = 0,
  expectedSalary = 65000,
  expectedSalaryDay = 1,
  currentDate = new Date(),
}: {
  transactions: Transaction[]
  expensesThisMonth: number
  incomeThisMonth: number
  emiDueThisMonth?: number
  expectedSalary?: number
  expectedSalaryDay?: number
  currentDate?: Date
}) {
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()
  const currentDay = currentDate.getDate()

  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1)

  const salaryTx = transactions.find((tx) => {
    if (tx.type !== 'income' || !tx.date) return false
    const d = new Date(tx.date)
    const isThisMonth = d.getFullYear() === currentYear && d.getMonth() === currentMonth
    const isSalary = tx.category.toLowerCase().includes('salary') || tx.title.toLowerCase().includes('salary')
    return isThisMonth && isSalary
  })

  const isSalaryReceived = Boolean(salaryTx)
  const receivedAmount = salaryTx ? salaryTx.amount : 0

  const totalIncome = incomeThisMonth > 0 ? incomeThisMonth : expectedSalary
  const totalSpent = expensesThisMonth
  const fixedEmiDue = emiDueThisMonth

  const spentPercent = Math.min(100, Math.round((totalSpent / totalIncome) * 100))
  const emiPercent = Math.min(100 - spentPercent, Math.round((fixedEmiDue / totalIncome) * 100))
  const savingsPercent = Math.max(0, 100 - spentPercent - emiPercent)

  const availableToSpend = Math.max(0, totalIncome - totalSpent - fixedEmiDue)
  const dailySafeToSpend = Math.round(availableToSpend / daysRemaining)

  return {
    isSalaryReceived,
    receivedAmount,
    totalIncome,
    totalSpent,
    fixedEmiDue,
    spentPercent,
    emiPercent,
    savingsPercent,
    availableToSpend,
    daysRemaining,
    dailySafeToSpend,
    expectedSalaryDay,
  }
}

describe('Phase 6 — Home Dashboard Salary & Budget Allocation Engine', () => {
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  it('detects when salary has NOT been received in the current month', () => {
    const res = calculateSalaryAllocation({
      transactions: [],
      expensesThisMonth: 12000,
      incomeThisMonth: 0,
      expectedSalary: 75000,
      currentDate: now,
    })

    expect(res.isSalaryReceived).toBe(false)
    expect(res.receivedAmount).toBe(0)
    expect(res.totalIncome).toBe(75000) // Fallback to expected
  })

  it('detects salary received via category match', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-sal-1',
        title: 'Acme Corp Monthly Pay',
        amount: 80000,
        type: 'income',
        category: 'Salary',
        accountId: 'acc-1',
        date: currentMonthStr,
        createdAt: '2026-10-01T00:00:00Z',
      },
    ]

    const res = calculateSalaryAllocation({
      transactions: txs,
      expensesThisMonth: 20000,
      incomeThisMonth: 80000,
      currentDate: now,
    })

    expect(res.isSalaryReceived).toBe(true)
    expect(res.receivedAmount).toBe(80000)
    expect(res.totalIncome).toBe(80000)
  })

  it('detects salary received via title match even if category differs', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-sal-2',
        title: 'October Salary Direct Deposit',
        amount: 65000,
        type: 'income',
        category: 'Work',
        accountId: 'acc-1',
        date: currentMonthStr,
        createdAt: '2026-10-01T00:00:00Z',
      },
    ]

    const res = calculateSalaryAllocation({
      transactions: txs,
      expensesThisMonth: 15000,
      incomeThisMonth: 65000,
      currentDate: now,
    })

    expect(res.isSalaryReceived).toBe(true)
    expect(res.receivedAmount).toBe(65000)
  })

  it('ignores salary transactions from previous months', () => {
    const pastYear = now.getFullYear() - 1
    const txs: Transaction[] = [
      {
        id: 'tx-sal-old',
        title: 'Salary',
        amount: 50000,
        type: 'income',
        category: 'Salary',
        accountId: 'acc-1',
        date: `${pastYear}-05-01`,
        createdAt: `${pastYear}-05-01T00:00:00Z`,
      },
    ]

    const res = calculateSalaryAllocation({
      transactions: txs,
      expensesThisMonth: 5000,
      incomeThisMonth: 0,
      expectedSalary: 60000,
      currentDate: now,
    })

    expect(res.isSalaryReceived).toBe(false)
  })

  it('computes accurate tri-color allocation percentages totaling <= 100%', () => {
    const res = calculateSalaryAllocation({
      transactions: [],
      expensesThisMonth: 25000, // 25k of 100k = 25%
      incomeThisMonth: 100000,
      emiDueThisMonth: 20000,   // 20k of 100k = 20%
      currentDate: now,
    })

    expect(res.spentPercent).toBe(25)
    expect(res.emiPercent).toBe(20)
    expect(res.savingsPercent).toBe(55)
    expect(res.spentPercent + res.emiPercent + res.savingsPercent).toBe(100)
  })

  it('calculates daily safe-to-spend based on remaining calendar days', () => {
    // Fixed mid-month test: day 15 of a 30-day month -> 16 days remaining
    const midMonthDate = new Date(2026, 3, 15) // April has 30 days. April 15 -> remaining: 30 - 15 + 1 = 16 days
    const res = calculateSalaryAllocation({
      transactions: [],
      expensesThisMonth: 20000,
      incomeThisMonth: 100000,
      emiDueThisMonth: 0,
      currentDate: midMonthDate,
    })

    // Available surplus = 100,000 - 20,000 = 80,000
    // Daily safe-to-spend = 80,000 / 16 = 5,000 / day
    expect(res.daysRemaining).toBe(16)
    expect(res.availableToSpend).toBe(80000)
    expect(res.dailySafeToSpend).toBe(5000)
  })

  it('clamps safe-to-spend and surplus to 0 when overspent', () => {
    const res = calculateSalaryAllocation({
      transactions: [],
      expensesThisMonth: 90000,
      incomeThisMonth: 70000,
      emiDueThisMonth: 10000,
      currentDate: now,
    })

    expect(res.availableToSpend).toBe(0)
    expect(res.dailySafeToSpend).toBe(0)
    expect(res.savingsPercent).toBe(0)
    expect(res.spentPercent).toBe(100)
  })
})
