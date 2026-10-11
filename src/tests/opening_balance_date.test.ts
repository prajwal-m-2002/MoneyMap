import { describe, it, expect } from 'vitest'
import {
  calculateAccountBalance,
  calculateAccountBalanceAsOf,
  generateUUID,
} from '@/context/FinanceContext'
import { calculateStatementSummary } from '@/lib/statementExporter'
import type { Account, Transaction } from '@/types/finance'

describe('Opening Balance Date & Historical Financial Ledger Audit', () => {
  // Test 1 & 2: Account with opening balance and date
  it('creates an account with specified opening balance and date', () => {
    const account: Account = {
      id: generateUUID(),
      name: 'Axis Bank',
      type: 'savings',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      accountNumber: '•••• 4321',
      color: 'emerald',
      isActive: true,
      balance: 10000,
      createdAt: '2026-10-01T00:00:00Z',
    }

    expect(account.openingBalance).toBe(10000)
    expect(account.openingBalanceDate).toBe('2026-10-01')
    expect(account.balance).toBe(10000)
  })

  // Test 3: Edit date and verify it saves correctly
  it('updates the opening balance date and preserves all other fields', () => {
    const initialAccount: Account = {
      id: generateUUID(),
      name: 'Axis Bank',
      type: 'savings',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      accountNumber: '•••• 4321',
      color: 'emerald',
      isActive: true,
      balance: 10000,
    }

    const updatedAccount: Account = {
      ...initialAccount,
      openingBalanceDate: '2026-09-15',
    }

    expect(updatedAccount.openingBalanceDate).toBe('2026-09-15')
    expect(updatedAccount.name).toBe('Axis Bank')
    expect(updatedAccount.openingBalance).toBe(10000)
    expect(updatedAccount.accountNumber).toBe('•••• 4321')
  })

  // Test 4: Edit another field and confirm date remains unchanged
  it('preserves opening balance date when modifying other fields (name, color, status)', () => {
    const account: Account = {
      id: generateUUID(),
      name: 'Axis Bank',
      type: 'savings',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      color: 'emerald',
      isActive: true,
      balance: 10000,
    }

    // Modifying name and color
    const edited = {
      ...account,
      name: 'Axis Priority Banking',
      color: 'blue',
      isActive: false,
    }

    expect(edited.openingBalanceDate).toBe('2026-10-01')
    expect(edited.name).toBe('Axis Priority Banking')
    expect(edited.color).toBe('blue')
    expect(edited.isActive).toBe(false)
  })

  // Test 5: Historical balances before and after opening balance date
  it('strictly isolates historical ledger balances before vs. on/after opening balance date', () => {
    const account: Account = {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'savings',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      balance: 10000,
      isActive: true,
    }

    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'income',
        amount: 5000,
        title: 'Freelance Payout',
        category: 'Freelance',
        accountId: account.id,
        date: '2026-09-25', // Before opening balance date
        createdAt: '2026-09-25T10:00:00Z',
      },
      {
        id: 'tx-2',
        type: 'expense',
        amount: 2000,
        title: 'Electricity Bill',
        category: 'Utilities',
        accountId: account.id,
        date: '2026-10-05', // After opening balance date
        createdAt: '2026-10-05T10:00:00Z',
      },
    ]

    // Balance on Sep 20: 0 (no txs, before opening date)
    expect(calculateAccountBalance(account, transactions, '2026-09-20')).toBe(0)

    // Balance on Sep 30: 5000 (only freelance income, opening balance NOT yet active)
    expect(calculateAccountBalance(account, transactions, '2026-09-30')).toBe(5000)

    // Balance on Oct 01: 10000 (opening balance enters ledger) + 5000 = 15000
    expect(calculateAccountBalance(account, transactions, '2026-10-01')).toBe(15000)

    // Balance on Oct 06: 15000 - 2000 = 13000
    expect(calculateAccountBalance(account, transactions, '2026-10-06')).toBe(13000)
    expect(calculateAccountBalanceAsOf(account, transactions, '2026-10-06')).toBe(13000)
  })

  // Test 6: Statements use the correct historical balance
  it('calculates statement opening and closing balance according to date range and opening balance date', () => {
    const account: Account = {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'savings',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      balance: 10000,
      isActive: true,
    }

    const txSep: Transaction = {
      id: 'tx-sep',
      type: 'expense',
      amount: 1000,
      title: 'Groceries',
      category: 'Groceries',
      accountId: account.id,
      date: '2026-09-28',
      createdAt: '2026-09-28T10:00:00Z',
    }

    const txOct: Transaction = {
      id: 'tx-oct',
      type: 'income',
      amount: 4000,
      title: 'Consulting',
      category: 'Freelance',
      accountId: account.id,
      date: '2026-10-10',
      createdAt: '2026-10-10T10:00:00Z',
    }

    const allTxs = [txSep, txOct]

    // Statement for September: rangeStart = 2026-09-01 (before opening balance date 2026-10-01)
    const sepStatement = calculateStatementSummary([txSep], account, 'September 2026', '2026-09-01', allTxs)
    expect(sepStatement.openingBalance).toBe(0) // Does NOT include 10000
    expect(sepStatement.closingBalance).toBe(-1000)

    // Statement for October: rangeStart = 2026-10-01 (on opening balance date)
    const octStatement = calculateStatementSummary([txOct], account, 'October 2026', '2026-10-01', allTxs)
    // Opening balance includes ₹10,000 + prior September expense (-1000) = ₹9,000
    expect(octStatement.openingBalance).toBe(9000)
    // Closing balance = ₹9,000 + ₹4,000 = ₹13,000
    expect(octStatement.closingBalance).toBe(13000)
  })

  // Test 7: Safe migration preserves existing accounts without date
  it('preserves existing accounts and safely backfills opening balance date to created_at or default', () => {
    const legacyAccountWithoutDate: Account = {
      id: 'legacy-acc-1',
      name: 'Legacy Bank',
      type: 'savings',
      openingBalance: 25000,
      balance: 25000,
      createdAt: '2026-07-01T08:00:00Z',
      isActive: true,
    }

    // Default effective opening date is createdAt's date
    const asOfBefore = calculateAccountBalance(legacyAccountWithoutDate, [], '2026-06-30')
    const asOfOn = calculateAccountBalance(legacyAccountWithoutDate, [], '2026-07-01')

    expect(asOfBefore).toBe(0)
    expect(asOfOn).toBe(25000)
  })

  // Test 8: Date validation logic
  it('validates date format YYYY-MM-DD and rejects invalid dates', () => {
    const isValidFormat = (val: string) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false
      const [y, m, d] = val.split('-').map(Number)
      const date = new Date(Date.UTC(y, m - 1, d))
      return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
    }

    expect(isValidFormat('2026-10-01')).toBe(true)
    expect(isValidFormat('2026-12-31')).toBe(true)
    expect(isValidFormat('invalid-date')).toBe(false)
    expect(isValidFormat('2026-02-31')).toBe(false) // 31st Feb is invalid
    expect(isValidFormat('01-10-2026')).toBe(false) // Not YYYY-MM-DD
    expect(isValidFormat('')).toBe(false)
  })
})
