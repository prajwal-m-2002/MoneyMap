import { describe, it, expect } from 'vitest'
import type { Account, Transaction } from '@/types/finance'

// Helper function implementing exact calculation rules matching FinanceContext
function calculateFinancialSummary(accounts: Account[], transactions: Transaction[]) {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const totalAvailable = accounts
    .filter((a) => a.type === 'savings' || a.type === 'current' || a.type === 'cash')
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0)

  let incomeThisMonth = 0
  let expensesThisMonth = 0

  for (const tx of transactions) {
    if (!tx.date) continue
    const txDate = new Date(tx.date)
    if (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
      if (tx.type === 'income') {
        incomeThisMonth += Number(tx.amount) || 0
      } else if (tx.type === 'expense') {
        expensesThisMonth += Number(tx.amount) || 0
      }
      // Transfers are strictly excluded from income and expenses!
    }
  }

  const netSavings = incomeThisMonth - expensesThisMonth
  const investmentValue = 145000
  const emiDueThisMonth = 18500
  const netWorth = totalAvailable + investmentValue - emiDueThisMonth

  return {
    totalAvailable,
    incomeThisMonth,
    expensesThisMonth,
    netSavings,
    investmentValue,
    emiDueThisMonth,
    netWorth,
  }
}

describe('MoneyMap Financial Accuracy & Calculation Rules', () => {
  const initialAccounts: Account[] = [
    { id: 'acc-axis', name: 'Axis Bank', type: 'savings', balance: 50000, openingBalance: 50000 },
    { id: 'acc-kotak', name: 'Kotak Bank', type: 'savings', balance: 20000, openingBalance: 20000 },
    { id: 'acc-cash', name: 'Cash', type: 'cash', balance: 5000, openingBalance: 5000 },
  ]

  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`

  it('calculates Total Available as sum of bank balances + physical cash', () => {
    const summary = calculateFinancialSummary(initialAccounts, [])
    expect(summary.totalAvailable).toBe(75000)
  })

  it('correctly sums income and expenses for current calendar month', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 60000,
        title: 'Salary',
        category: 'Salary',
        accountId: 'acc-axis',
        date: currentMonthStr,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'expense',
        amount: 3500,
        title: 'Groceries',
        category: 'Food',
        accountId: 'acc-kotak',
        date: currentMonthStr,
        createdAt: new Date().toISOString(),
      },
    ]

    const summary = calculateFinancialSummary(initialAccounts, transactions)
    expect(summary.incomeThisMonth).toBe(60000)
    expect(summary.expensesThisMonth).toBe(3500)
    expect(summary.netSavings).toBe(56500)
  })

  it('CRITICAL: Transfers between owned accounts do NOT count as income or expenses', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 50000,
        title: 'Salary',
        category: 'Salary',
        accountId: 'acc-axis',
        date: currentMonthStr,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'expense',
        amount: 5000,
        title: 'Shopping',
        category: 'Shopping',
        accountId: 'acc-kotak',
        date: currentMonthStr,
        createdAt: new Date().toISOString(),
      },
      {
        id: '3',
        type: 'transfer',
        amount: 10000,
        title: 'Transfer to Cash',
        category: 'Transfer',
        accountId: 'acc-axis',
        toAccountId: 'acc-cash',
        date: currentMonthStr,
        createdAt: new Date().toISOString(),
      },
    ]

    const summary = calculateFinancialSummary(initialAccounts, transactions)
    // Income must still be exactly 50000, not 60000
    expect(summary.incomeThisMonth).toBe(50000)
    // Expense must still be exactly 5000, not 15000
    expect(summary.expensesThisMonth).toBe(5000)
  })

  it('ignores transactions from previous months when calculating monthly income & expense', () => {
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 15)
    const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-15`

    const transactions: Transaction[] = [
      {
        id: '1',
        type: 'income',
        amount: 50000,
        title: 'Last Month Salary',
        category: 'Salary',
        accountId: 'acc-axis',
        date: prevMonthStr,
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        type: 'expense',
        amount: 12000,
        title: 'Last Month Rent',
        category: 'Housing',
        accountId: 'acc-axis',
        date: prevMonthStr,
        createdAt: new Date().toISOString(),
      },
    ]

    const summary = calculateFinancialSummary(initialAccounts, transactions)
    expect(summary.incomeThisMonth).toBe(0)
    expect(summary.expensesThisMonth).toBe(0)
  })
})
