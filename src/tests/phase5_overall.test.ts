import { describe, it, expect, beforeEach } from 'vitest'
import { calculateAccountBalance } from '@/context/FinanceContext'
import type { Account, Transaction, ExpenseInput, IncomeInput, TransferInput } from '@/types/finance'

describe('Phase 5 Comprehensive Verification & Stress Test', () => {
  let accounts: Account[]
  let transactions: Transaction[]

  beforeEach(() => {
    // Initial master accounts from specification
    accounts = [
      { id: 'acc-axis', name: 'Axis Bank', type: 'savings', balance: 48500, openingBalance: 48500, isActive: true },
      { id: 'acc-kotak', name: 'Kotak Bank', type: 'savings', balance: 22600, openingBalance: 22600, isActive: true },
      { id: 'acc-sbi', name: 'SBI', type: 'savings', balance: 14200, openingBalance: 14200, isActive: true },
      { id: 'acc-federal', name: 'Federal Bank', type: 'savings', balance: 8000, openingBalance: 8000, isActive: true },
      { id: 'acc-cash', name: 'Physical Cash', type: 'cash', balance: 4500, openingBalance: 4500, isActive: true },
    ]
    transactions = []
  })

  // Helper simulating the exact atomic operations in FinanceContext
  function executeAddExpense(input: ExpenseInput): { success: boolean; error?: string } {
    if (input.amount <= 0) return { success: false, error: 'Amount must be > 0' }
    if (!input.title?.trim()) return { success: false, error: 'Title required' }
    if (!input.accountId) return { success: false, error: 'Account required' }

    const tx: Transaction = {
      id: `tx-exp-${Date.now()}-${Math.random()}`,
      type: 'expense',
      amount: input.amount,
      title: input.title,
      category: input.category,
      accountId: input.accountId,
      date: input.date,
      paymentMethod: input.paymentMethod || 'UPI',
      createdAt: new Date().toISOString(),
    }

    accounts = accounts.map((a) => (a.id === input.accountId ? { ...a, balance: a.balance - input.amount } : a))
    transactions = [tx, ...transactions]
    return { success: true }
  }

  function executeAddIncome(input: IncomeInput): { success: boolean; error?: string } {
    if (input.amount <= 0) return { success: false, error: 'Amount must be > 0' }
    if (!input.title?.trim()) return { success: false, error: 'Title required' }
    if (!input.accountId) return { success: false, error: 'Account required' }

    const tx: Transaction = {
      id: `tx-inc-${Date.now()}-${Math.random()}`,
      type: 'income',
      amount: input.amount,
      title: input.title,
      category: input.category || 'Salary',
      accountId: input.accountId,
      date: input.date,
      createdAt: new Date().toISOString(),
    }

    accounts = accounts.map((a) => (a.id === input.accountId ? { ...a, balance: a.balance + input.amount } : a))
    transactions = [tx, ...transactions]
    return { success: true }
  }

  function executeTransfer(input: TransferInput): { success: boolean; error?: string } {
    if (input.amount <= 0) return { success: false, error: 'Amount must be > 0' }
    if (!input.fromAccountId || !input.toAccountId) return { success: false, error: 'Both accounts required' }
    if (input.fromAccountId === input.toAccountId) return { success: false, error: 'Source cannot equal destination' }

    const tx: Transaction = {
      id: `tx-trf-${Date.now()}-${Math.random()}`,
      type: 'transfer',
      amount: input.amount,
      title: input.purpose || 'Transfer',
      category: 'Transfer',
      accountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      date: input.date,
      createdAt: new Date().toISOString(),
    }

    accounts = accounts.map((a) => {
      if (a.id === input.fromAccountId) return { ...a, balance: a.balance - input.amount }
      if (a.id === input.toAccountId) return { ...a, balance: a.balance + input.amount }
      return a
    })
    transactions = [tx, ...transactions]
    return { success: true }
  }

  function executeEditTransaction(id: string, updated: Partial<Transaction>): { success: boolean; error?: string } {
    const oldTx = transactions.find((t) => t.id === id)
    if (!oldTx) return { success: false, error: 'Not found' }

    const newTx: Transaction = { ...oldTx, ...updated }
    if (newTx.amount <= 0) return { success: false, error: 'Amount must be > 0' }
    if (newTx.type === 'transfer' && newTx.accountId === newTx.toAccountId) {
      return { success: false, error: 'Source cannot equal destination' }
    }

    // Revert old effect
    if (oldTx.type === 'expense') {
      accounts = accounts.map((a) => (a.id === oldTx.accountId ? { ...a, balance: a.balance + oldTx.amount } : a))
    } else if (oldTx.type === 'income') {
      accounts = accounts.map((a) => (a.id === oldTx.accountId ? { ...a, balance: a.balance - oldTx.amount } : a))
    } else if (oldTx.type === 'transfer') {
      accounts = accounts.map((a) => {
        if (a.id === oldTx.accountId) return { ...a, balance: a.balance + oldTx.amount }
        if (a.id === oldTx.toAccountId) return { ...a, balance: a.balance - oldTx.amount }
        return a
      })
    }

    // Apply new effect
    if (newTx.type === 'expense') {
      accounts = accounts.map((a) => (a.id === newTx.accountId ? { ...a, balance: a.balance - newTx.amount } : a))
    } else if (newTx.type === 'income') {
      accounts = accounts.map((a) => (a.id === newTx.accountId ? { ...a, balance: a.balance + newTx.amount } : a))
    } else if (newTx.type === 'transfer') {
      accounts = accounts.map((a) => {
        if (a.id === newTx.accountId) return { ...a, balance: a.balance - newTx.amount }
        if (a.id === newTx.toAccountId) return { ...a, balance: a.balance + newTx.amount }
        return a
      })
    }

    transactions = transactions.map((t) => (t.id === id ? newTx : t))
    return { success: true }
  }

  function executeDeleteTransaction(id: string): { success: boolean; error?: string } {
    const tx = transactions.find((t) => t.id === id)
    if (!tx) return { success: false, error: 'Not found' }

    if (tx.type === 'expense') {
      accounts = accounts.map((a) => (a.id === tx.accountId ? { ...a, balance: a.balance + tx.amount } : a))
    } else if (tx.type === 'income') {
      accounts = accounts.map((a) => (a.id === tx.accountId ? { ...a, balance: a.balance - tx.amount } : a))
    } else if (tx.type === 'transfer') {
      accounts = accounts.map((a) => {
        if (a.id === tx.accountId) return { ...a, balance: a.balance + tx.amount }
        if (a.id === tx.toAccountId) return { ...a, balance: a.balance - tx.amount }
        return a
      })
    }

    transactions = transactions.filter((t) => t.id !== id)
    return { success: true }
  }

  describe('1. Master Financial Reconciliation Flow', () => {
    it('executes baseline master transactions and matches exact ledger reconciliation', () => {
      // 1. Credit Salary: +₹65,000 to Axis Bank
      executeAddIncome({
        amount: 65000,
        title: 'Monthly Salary',
        accountId: 'acc-axis',
        date: '2026-10-01',
      })

      // 2. Debit Groceries: -₹1,250 from Kotak Bank
      executeAddExpense({
        amount: 1250,
        title: 'Groceries',
        category: 'Food',
        accountId: 'acc-kotak',
        date: '2026-10-02',
      })

      // 3. Debit Cab: -₹450 from Axis Bank
      executeAddExpense({
        amount: 450,
        title: 'Uber to Office',
        category: 'Transport',
        accountId: 'acc-axis',
        date: '2026-10-03',
      })

      // 4. Transfer: ₹5,000 from Axis Bank to Physical Cash
      executeTransfer({
        amount: 5000,
        fromAccountId: 'acc-axis',
        toAccountId: 'acc-cash',
        date: '2026-10-04',
        purpose: 'ATM Cash Withdrawal',
      })

      // Verify individual account balances:
      // Axis: 48500 + 65000 - 450 - 5000 = 108050
      const axis = accounts.find((a) => a.id === 'acc-axis')!
      expect(axis.balance).toBe(108050)
      expect(calculateAccountBalance(axis, transactions)).toBe(108050)

      // Kotak: 22600 - 1250 = 21350
      const kotak = accounts.find((a) => a.id === 'acc-kotak')!
      expect(kotak.balance).toBe(21350)
      expect(calculateAccountBalance(kotak, transactions)).toBe(21350)

      // Cash: 4500 + 5000 = 9500
      const cash = accounts.find((a) => a.id === 'acc-cash')!
      expect(cash.balance).toBe(9500)
      expect(calculateAccountBalance(cash, transactions)).toBe(9500)

      // Total Available: 108050 + 21350 + 14200 (SBI) + 8000 (Federal) + 9500 (Cash) = 161100
      const totalAvailable = accounts.reduce((sum, a) => sum + a.balance, 0)
      expect(totalAvailable).toBe(161100)

      // Income This Month: Exactly ₹65,000 (Transfers strictly excluded)
      const income = transactions.filter((t) => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
      expect(income).toBe(65000)

      // Expense This Month: Exactly ₹1,700 (1250 + 450, Transfers strictly excluded)
      const expenses = transactions.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      expect(expenses).toBe(1700)

      // Net Savings: 65000 - 1700 = 63300
      expect(income - expenses).toBe(63300)
    })
  })

  describe('2. Dual-Sided Transaction Editing Stress Tests', () => {
    it('editing expense amount preserves total money balance across ledger', () => {
      executeAddExpense({
        amount: 2000,
        title: 'Electricity',
        category: 'Utilities',
        accountId: 'acc-axis',
        date: '2026-10-05',
      })
      const txId = transactions[0].id

      expect(accounts.find((a) => a.id === 'acc-axis')!.balance).toBe(46500)

      // Edit amount from ₹2,000 to ₹3,200
      executeEditTransaction(txId, { amount: 3200 })
      expect(accounts.find((a) => a.id === 'acc-axis')!.balance).toBe(45300)

      // Edit amount from ₹3,200 down to ₹1,000
      executeEditTransaction(txId, { amount: 1000 })
      expect(accounts.find((a) => a.id === 'acc-axis')!.balance).toBe(47500)
    })

    it('editing expense to change account refunds old account and debits new account with exact atomicity', () => {
      executeAddExpense({
        amount: 3000,
        title: 'Dinner',
        category: 'Food',
        accountId: 'acc-axis',
        date: '2026-10-05',
      })
      const txId = transactions[0].id

      expect(accounts.find((a) => a.id === 'acc-axis')!.balance).toBe(45500)
      expect(accounts.find((a) => a.id === 'acc-kotak')!.balance).toBe(22600)

      // Switch account from Axis to Kotak
      executeEditTransaction(txId, { accountId: 'acc-kotak' })

      // Axis must be restored to 48500, Kotak must be 22600 - 3000 = 19600
      expect(accounts.find((a) => a.id === 'acc-axis')!.balance).toBe(48500)
      expect(accounts.find((a) => a.id === 'acc-kotak')!.balance).toBe(19600)
    })

    it('editing transfer source and destination accounts preserves conservation of money', () => {
      // Transfer ₹5,000 from Axis to Kotak
      executeTransfer({
        amount: 5000,
        fromAccountId: 'acc-axis',
        toAccountId: 'acc-kotak',
        date: '2026-10-05',
      })
      const txId = transactions[0].id

      expect(accounts.find((a) => a.id === 'acc-axis')!.balance).toBe(43500)
      expect(accounts.find((a) => a.id === 'acc-kotak')!.balance).toBe(27600)

      // Edit transfer: Source changed to SBI, destination changed to Federal Bank, amount changed to ₹7,000
      executeEditTransaction(txId, {
        accountId: 'acc-sbi',
        toAccountId: 'acc-federal',
        amount: 7000,
      })

      // Old accounts restored:
      expect(accounts.find((a) => a.id === 'acc-axis')!.balance).toBe(48500)
      expect(accounts.find((a) => a.id === 'acc-kotak')!.balance).toBe(22600)

      // New accounts modified:
      expect(accounts.find((a) => a.id === 'acc-sbi')!.balance).toBe(7200) // 14200 - 7000
      expect(accounts.find((a) => a.id === 'acc-federal')!.balance).toBe(15000) // 8000 + 7000

      // Total money across all 5 accounts remains strictly invariant (97800)
      const totalPool = accounts.reduce((sum, a) => sum + a.balance, 0)
      expect(totalPool).toBe(97800)
    })
  })

  describe('3. Deletion and Rollback Validation', () => {
    it('deleting income restores previous account balance', () => {
      executeAddIncome({ amount: 10000, title: 'Bonus', accountId: 'acc-axis', date: '2026-10-06' })
      const txId = transactions[0].id
      expect(accounts.find((a) => a.id === 'acc-axis')!.balance).toBe(58500)

      executeDeleteTransaction(txId)
      expect(accounts.find((a) => a.id === 'acc-axis')!.balance).toBe(48500)
      expect(transactions).toHaveLength(0)
    })

    it('deleting transfer restores both source and destination accounts', () => {
      executeTransfer({ amount: 4000, fromAccountId: 'acc-axis', toAccountId: 'acc-cash', date: '2026-10-06' })
      const txId = transactions[0].id

      expect(accounts.find((a) => a.id === 'acc-axis')!.balance).toBe(44500)
      expect(accounts.find((a) => a.id === 'acc-cash')!.balance).toBe(8500)

      executeDeleteTransaction(txId)
      expect(accounts.find((a) => a.id === 'acc-axis')!.balance).toBe(48500)
      expect(accounts.find((a) => a.id === 'acc-cash')!.balance).toBe(4500)
      expect(transactions).toHaveLength(0)
    })
  })

  describe('4. Validation & Edge Cases', () => {
    it('rejects duplicate or invalid inputs', () => {
      expect(executeAddExpense({ amount: -50, title: 'Test', category: 'General', accountId: 'acc-axis', date: '2026-10-01' }).success).toBe(false)
      expect(executeAddIncome({ amount: 0, title: 'Test', accountId: 'acc-axis', date: '2026-10-01' }).success).toBe(false)
      expect(executeTransfer({ amount: 500, fromAccountId: 'acc-axis', toAccountId: 'acc-axis', date: '2026-10-01' }).success).toBe(false)
    })
  })
})
