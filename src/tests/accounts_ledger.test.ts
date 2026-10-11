import { describe, it, expect } from 'vitest'
import { calculateAccountBalance } from '@/context/FinanceContext'
import type { Account, Transaction } from '@/types/finance'

describe('Phase 4: Accounts and Balance Engine', () => {
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

  it('calculates balance starting strictly from opening balance with no transactions', () => {
    const balance = calculateAccountBalance(accountAxis, [])
    expect(balance).toBe(50000)
  })

  it('credits income to the destination account accurately', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'income',
        amount: 25000,
        title: 'Freelance Payout',
        category: 'Freelance',
        accountId: 'acc-axis',
        date: '2026-10-01',
        createdAt: '2026-10-01T10:00:00Z',
      },
    ]

    const axisBalance = calculateAccountBalance(accountAxis, transactions)
    const kotakBalance = calculateAccountBalance(accountKotak, transactions)

    expect(axisBalance).toBe(75000)
    expect(kotakBalance).toBe(20000) // unaffected
  })

  it('debits expenses from the source account accurately', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-2',
        type: 'expense',
        amount: 4500,
        title: 'Groceries',
        category: 'Food',
        accountId: 'acc-kotak',
        date: '2026-10-02',
        createdAt: '2026-10-02T10:00:00Z',
      },
    ]

    const kotakBalance = calculateAccountBalance(accountKotak, transactions)
    expect(kotakBalance).toBe(15500)
  })

  it('transfers accurately debit source and credit destination without altering total net funds', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-3',
        type: 'transfer',
        amount: 10000,
        title: 'Move funds',
        category: 'Transfer',
        accountId: 'acc-axis',
        toAccountId: 'acc-kotak',
        date: '2026-10-03',
        createdAt: '2026-10-03T10:00:00Z',
      },
    ]

    const axisBalance = calculateAccountBalance(accountAxis, transactions)
    const kotakBalance = calculateAccountBalance(accountKotak, transactions)

    expect(axisBalance).toBe(40000) // 50000 - 10000
    expect(kotakBalance).toBe(30000) // 20000 + 10000

    // Conservation of money: total remains 70000
    expect(axisBalance + kotakBalance).toBe(accountAxis.openingBalance + accountKotak.openingBalance)
  })

  it('reconciles account balance upon transaction deletion', () => {
    const initialTxs: Transaction[] = [
      {
        id: 'tx-4',
        type: 'expense',
        amount: 3000,
        title: 'Dinner',
        category: 'Food',
        accountId: 'acc-axis',
        date: '2026-10-04',
        createdAt: '2026-10-04T10:00:00Z',
      },
    ]

    expect(calculateAccountBalance(accountAxis, initialTxs)).toBe(47000)

    // Simulate deleting tx-4
    const remainingTxs = initialTxs.filter((t) => t.id !== 'tx-4')
    expect(calculateAccountBalance(accountAxis, remainingTxs)).toBe(50000)
  })

  it('computes historical balances as of any given point in time', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'income',
        amount: 10000,
        title: 'Bonus',
        category: 'Bonus',
        accountId: 'acc-axis',
        date: '2026-10-01',
        createdAt: '2026-10-01T10:00:00Z',
      },
      {
        id: 'tx-2',
        type: 'expense',
        amount: 5000,
        title: 'Rent Part 1',
        category: 'Housing',
        accountId: 'acc-axis',
        date: '2026-10-05',
        createdAt: '2026-10-05T10:00:00Z',
      },
      {
        id: 'tx-3',
        type: 'expense',
        amount: 3000,
        title: 'Electricity',
        category: 'Utilities',
        accountId: 'acc-axis',
        date: '2026-10-10',
        createdAt: '2026-10-10T10:00:00Z',
      },
    ]

    function calculateHistoricalBalance(account: Account, txs: Transaction[], asOfDate: string) {
      const historicalTxs = txs.filter((t) => t.date <= asOfDate)
      return calculateAccountBalance(account, historicalTxs)
    }

    // On 2026-10-01: 50000 + 10000 = 60000
    expect(calculateHistoricalBalance(accountAxis, transactions, '2026-10-01')).toBe(60000)
    // On 2026-10-05: 60000 - 5000 = 55000
    expect(calculateHistoricalBalance(accountAxis, transactions, '2026-10-05')).toBe(55000)
    // On 2026-10-10: 55000 - 3000 = 52000
    expect(calculateHistoricalBalance(accountAxis, transactions, '2026-10-10')).toBe(52000)
  })
})
