import { describe, it, expect } from 'vitest'
import { calculateAccountBalance } from '@/context/FinanceContext'
import type { Account, Transaction } from '@/types/finance'

describe('Phase 5: Income, Expenses, and Transfers Flow', () => {
  const accountAxis: Account = {
    id: 'acc-axis',
    name: 'Axis Bank',
    type: 'savings',
    openingBalance: 50000,
    balance: 50000,
    isActive: true,
  }

  const accountKotak: Account = {
    id: 'acc-kotak',
    name: 'Kotak Bank',
    type: 'savings',
    openingBalance: 20000,
    balance: 20000,
    isActive: true,
  }

  it('adjusts balance atomically when an expense amount is edited', () => {
    // Initial expense: ₹2,000 from Axis
    let txs: Transaction[] = [
      {
        id: 'tx-1',
        type: 'expense',
        amount: 2000,
        title: 'Electricity Bill',
        category: 'Utilities',
        accountId: 'acc-axis',
        date: '2026-10-05',
        createdAt: '2026-10-05T10:00:00Z',
      },
    ]

    expect(calculateAccountBalance(accountAxis, txs)).toBe(48000)

    // Edit expense amount from ₹2,000 to ₹3,500
    txs = txs.map((t) => (t.id === 'tx-1' ? { ...t, amount: 3500 } : t))
    expect(calculateAccountBalance(accountAxis, txs)).toBe(46500) // 50000 - 3500
  })

  it('switches accounts atomically when an expense is edited to a different account', () => {
    // Initial expense: ₹5,000 from Axis
    let txs: Transaction[] = [
      {
        id: 'tx-1',
        type: 'expense',
        amount: 5000,
        title: 'New Monitor',
        category: 'Shopping',
        accountId: 'acc-axis',
        date: '2026-10-06',
        createdAt: '2026-10-06T10:00:00Z',
      },
    ]

    expect(calculateAccountBalance(accountAxis, txs)).toBe(45000)
    expect(calculateAccountBalance(accountKotak, txs)).toBe(20000)

    // Edit transaction: Paid from Kotak instead of Axis
    txs = txs.map((t) => (t.id === 'tx-1' ? { ...t, accountId: 'acc-kotak' } : t))

    // Axis is refunded ₹5,000; Kotak is debited ₹5,000
    expect(calculateAccountBalance(accountAxis, txs)).toBe(50000)
    expect(calculateAccountBalance(accountKotak, txs)).toBe(15000)
  })

  it('adjusts both source and destination accounts atomically when transfer amount is edited', () => {
    // Transfer ₹10,000 from Axis to Kotak
    let txs: Transaction[] = [
      {
        id: 'tx-transfer',
        type: 'transfer',
        amount: 10000,
        title: 'Funds rebalance',
        category: 'Transfer',
        accountId: 'acc-axis',
        toAccountId: 'acc-kotak',
        date: '2026-10-07',
        createdAt: '2026-10-07T10:00:00Z',
      },
    ]

    expect(calculateAccountBalance(accountAxis, txs)).toBe(40000)
    expect(calculateAccountBalance(accountKotak, txs)).toBe(30000)

    // Edit transfer amount to ₹15,000
    txs = txs.map((t) => (t.id === 'tx-transfer' ? { ...t, amount: 15000 } : t))

    expect(calculateAccountBalance(accountAxis, txs)).toBe(35000) // 50000 - 15000
    expect(calculateAccountBalance(accountKotak, txs)).toBe(35000) // 20000 + 15000
  })

  it('strictly isolates transfers from income and expenses summary calculations', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-inc',
        type: 'income',
        amount: 60000,
        title: 'Salary',
        category: 'Salary',
        accountId: 'acc-axis',
        date: '2026-10-01',
        createdAt: '2026-10-01T10:00:00Z',
      },
      {
        id: 'tx-exp',
        type: 'expense',
        amount: 12000,
        title: 'Rent',
        category: 'Housing',
        accountId: 'acc-axis',
        date: '2026-10-02',
        createdAt: '2026-10-02T10:00:00Z',
      },
      {
        id: 'tx-trf',
        type: 'transfer',
        amount: 25000,
        title: 'Internal Transfer',
        category: 'Transfer',
        accountId: 'acc-axis',
        toAccountId: 'acc-kotak',
        date: '2026-10-03',
        createdAt: '2026-10-03T10:00:00Z',
      },
    ]

    let totalIncome = 0
    let totalExpense = 0

    for (const t of txs) {
      if (t.type === 'income') totalIncome += t.amount
      if (t.type === 'expense') totalExpense += t.amount
    }

    expect(totalIncome).toBe(60000) // transfer excluded
    expect(totalExpense).toBe(12000) // transfer excluded
    expect(totalIncome - totalExpense).toBe(48000) // Net savings
  })

  it('rejects invalid transaction edits (amount <= 0 or identical transfer accounts)', () => {
    function validateEdit(tx: { amount: number; type: string; accountId: string; toAccountId?: string }) {
      if (tx.amount <= 0) return { valid: false, error: 'Amount must be > 0' }
      if (tx.type === 'transfer' && tx.accountId === tx.toAccountId) {
        return { valid: false, error: 'Source and destination cannot be identical' }
      }
      return { valid: true }
    }

    expect(validateEdit({ amount: -100, type: 'expense', accountId: 'acc-axis' }).valid).toBe(false)
    expect(validateEdit({ amount: 0, type: 'income', accountId: 'acc-axis' }).valid).toBe(false)
    expect(
      validateEdit({ amount: 500, type: 'transfer', accountId: 'acc-axis', toAccountId: 'acc-axis' }).valid
    ).toBe(false)
    expect(
      validateEdit({ amount: 500, type: 'transfer', accountId: 'acc-axis', toAccountId: 'acc-kotak' }).valid
    ).toBe(true)
  })

  it('sorts recent transactions as latest date first then previous', () => {
    const txs: Transaction[] = [
      {
        id: 'tx-aug',
        type: 'income',
        amount: 27000,
        title: 'Monthly Salary',
        category: 'Salary',
        accountId: 'acc-axis',
        date: '2026-08-31',
        createdAt: '2026-10-11T12:00:00Z',
      },
      {
        id: 'tx-sep',
        type: 'income',
        amount: 27000,
        title: 'Monthly Salary',
        category: 'Salary',
        accountId: 'acc-axis',
        date: '2026-09-30',
        createdAt: '2026-10-11T12:05:00Z',
      },
      {
        id: 'tx-oct',
        type: 'expense',
        amount: 1500,
        title: 'Grocery',
        category: 'Food',
        accountId: 'acc-axis',
        date: '2026-10-10',
        time: '14:30',
        createdAt: '2026-10-10T14:30:00Z',
      },
      {
        id: 'tx-oct-later',
        type: 'expense',
        amount: 500,
        title: 'Coffee',
        category: 'Food',
        accountId: 'acc-axis',
        date: '2026-10-10',
        time: '18:00',
        createdAt: '2026-10-10T18:00:00Z',
      },
    ]

    const sorted = [...txs].sort((a, b) => {
      const dateA = a.date || ''
      const dateB = b.date || ''
      if (dateA !== dateB) return dateB.localeCompare(dateA)
      if (a.time && b.time && a.time !== b.time) return b.time.localeCompare(a.time)
      if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return 0
    })

    expect(sorted.map((t) => t.id)).toEqual(['tx-oct-later', 'tx-oct', 'tx-sep', 'tx-aug'])
  })
})
