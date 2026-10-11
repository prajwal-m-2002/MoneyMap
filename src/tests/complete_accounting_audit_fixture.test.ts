import { describe, it, expect } from 'vitest'
import { calculateAccountBalance } from '@/context/FinanceContext'
import { calculateMonthlyCycleOverview } from '@/lib/monthlyCycleMath'
import type { Account, Transaction } from '@/types/finance'

describe('MoneyMap — Complete Accounting Audit, Bug Fixes, and Validation', () => {
  // ── 1. The Standard Test Scenario Fixture Accounts ───────────────────
  const createFixtureAccounts = (): Account[] => [
    {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      balance: 10000,
      openingBalanceDate: '2026-09-25',
      trackingStartDate: '2026-09-25',
      ledgerCoverageStartDate: '2026-09-25',
      isActive: true,
    },
    {
      id: 'acc-kotak',
      name: 'Kotak Bank',
      type: 'savings',
      openingBalance: 5000,
      balance: 5000,
      openingBalanceDate: '2026-09-25',
      trackingStartDate: '2026-09-25',
      ledgerCoverageStartDate: '2026-09-25',
      isActive: true,
    },
    {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 2000,
      balance: 2000,
      openingBalanceDate: '2026-09-25',
      trackingStartDate: '2026-09-25',
      ledgerCoverageStartDate: '2026-09-25',
      isActive: true,
    },
    {
      id: 'acc-federal',
      name: 'Federal Bank',
      type: 'savings',
      openingBalance: 2000,
      balance: 2000,
      openingBalanceDate: '2026-09-25',
      trackingStartDate: '2026-09-25',
      ledgerCoverageStartDate: '2026-09-25',
      isActive: true,
    },
    {
      id: 'acc-cash',
      name: 'Cash',
      type: 'cash',
      openingBalance: 500,
      balance: 500,
      openingBalanceDate: '2026-09-25',
      trackingStartDate: '2026-09-25',
      ledgerCoverageStartDate: '2026-09-25',
      isActive: true,
    },
  ]

  // ── 2. The 30 Logical Transactions Dataset (25 Expenses, 1 Income, 4 Transfers) ──
  const createFixtureTransactions = (): Transaction[] => [
    // 1 Income record: September 30 Salary credited to Axis Bank
    {
      id: 'tx-sal-sep30',
      type: 'income',
      amount: 27000,
      title: 'Monthly Salary',
      category: 'Salary',
      accountId: 'acc-axis',
      date: '2026-09-30',
      createdAt: '2026-09-30T18:00:00Z',
    },

    // 4 Logical Transfers: October 1 Allocations from Axis Bank
    {
      id: 'tx-tr-kotak',
      type: 'transfer',
      amount: 10000,
      title: 'Allocation to Kotak Savings',
      category: 'Transfer',
      accountId: 'acc-axis',
      fromAccountId: 'acc-axis',
      toAccountId: 'acc-kotak',
      date: '2026-10-01',
      createdAt: '2026-10-01T09:00:00Z',
    },
    {
      id: 'tx-tr-sbi',
      type: 'transfer',
      amount: 5000,
      title: 'Allocation to SBI',
      category: 'Transfer',
      accountId: 'acc-axis',
      fromAccountId: 'acc-axis',
      toAccountId: 'acc-sbi',
      date: '2026-10-01',
      createdAt: '2026-10-01T09:05:00Z',
    },
    {
      id: 'tx-tr-federal',
      type: 'transfer',
      amount: 4000,
      title: 'Allocation to Federal Bank',
      category: 'Transfer',
      accountId: 'acc-axis',
      fromAccountId: 'acc-axis',
      toAccountId: 'acc-federal',
      date: '2026-10-01',
      createdAt: '2026-10-01T09:10:00Z',
    },
    {
      id: 'tx-tr-cash',
      type: 'transfer',
      amount: 1000,
      title: 'ATM Cash Withdrawal',
      category: 'Transfer',
      accountId: 'acc-axis',
      fromAccountId: 'acc-axis',
      toAccountId: 'acc-cash',
      date: '2026-10-01',
      createdAt: '2026-10-01T09:15:00Z',
    },

    // September Expenses (5 records, exactly ₹560):
    {
      id: 'tx-exp-sep-1',
      type: 'expense',
      amount: 150,
      title: 'Dinner at Dhaba',
      category: 'Food & Dining',
      accountId: 'acc-federal',
      date: '2026-09-25',
      createdAt: '2026-09-25T19:00:00Z',
    },
    {
      id: 'tx-exp-sep-2',
      type: 'expense',
      amount: 100,
      title: 'Cafe Evening Snack',
      category: 'Food & Dining',
      accountId: 'acc-federal',
      date: '2026-09-26',
      createdAt: '2026-09-26T17:00:00Z',
    },
    {
      id: 'tx-exp-sep-3',
      type: 'expense',
      amount: 60,
      title: 'Evening Snacks & Tea',
      category: 'Food & Dining',
      accountId: 'acc-cash',
      date: '2026-09-27',
      createdAt: '2026-09-27T17:30:00Z',
    },
    {
      id: 'tx-exp-sep-4',
      type: 'expense',
      amount: 150,
      title: 'Medical Tablets',
      category: 'Health & Medical',
      accountId: 'acc-federal',
      date: '2026-09-28',
      createdAt: '2026-09-28T11:00:00Z',
    },
    {
      id: 'tx-exp-sep-5',
      type: 'expense',
      amount: 100,
      title: 'Pharmacy Essentials',
      category: 'Health & Medical',
      accountId: 'acc-federal',
      date: '2026-09-29',
      createdAt: '2026-09-29T10:15:00Z',
    },

    // October Expenses (20 records, exactly ₹5,248):
    // Specified in Prompt:
    {
      id: 'tx-exp-oct-bajaj',
      type: 'expense',
      amount: 2200,
      title: 'Bajaj EMI Installment',
      category: 'EMI & Loans',
      accountId: 'acc-sbi',
      date: '2026-10-05',
      createdAt: '2026-10-05T08:00:00Z',
    },
    {
      id: 'tx-exp-oct-sub',
      type: 'expense',
      amount: 199,
      title: 'Cloud Storage Subscription',
      category: 'Entertainment',
      accountId: 'acc-kotak',
      date: '2026-10-05',
      createdAt: '2026-10-05T09:00:00Z',
    },
    {
      id: 'tx-exp-oct-recharge',
      type: 'expense',
      amount: 349,
      title: 'Mobile Prepaid Recharge',
      category: 'Bills & Utilities',
      accountId: 'acc-sbi',
      date: '2026-10-06',
      createdAt: '2026-10-06T10:00:00Z',
    },
    {
      id: 'tx-exp-oct-internet',
      type: 'expense',
      amount: 495,
      title: 'Broadband Fiber Internet Bill',
      category: 'Bills & Utilities',
      accountId: 'acc-sbi',
      date: '2026-10-06',
      createdAt: '2026-10-06T11:00:00Z',
    },

    // The 3 expenses specifically assigned to SBI (Total ₹430):
    {
      id: 'tx-exp-oct-canteen',
      type: 'expense',
      amount: 80,
      title: 'Canteen Meal',
      category: 'Food & Dining',
      accountId: 'acc-sbi',
      date: '2026-10-05',
      createdAt: '2026-10-05T13:00:00Z',
    },
    {
      id: 'tx-exp-oct-travel',
      type: 'expense',
      amount: 50,
      title: 'Local Travel Fare',
      category: 'Transportation',
      accountId: 'acc-sbi',
      date: '2026-10-07',
      createdAt: '2026-10-07T08:30:00Z',
    },
    {
      id: 'tx-exp-oct-fuel',
      type: 'expense',
      amount: 300,
      title: 'Vehicle Fuel Petrol',
      category: 'Transportation',
      accountId: 'acc-sbi',
      date: '2026-10-10',
      createdAt: '2026-10-10T16:00:00Z',
    },

    // Other SBI expenses:
    {
      id: 'tx-exp-oct-sbi-groc',
      type: 'expense',
      amount: 400,
      title: 'Weekly Vegetable Mart',
      category: 'Groceries',
      accountId: 'acc-sbi',
      date: '2026-10-08',
      createdAt: '2026-10-08T14:00:00Z',
    },
    {
      id: 'tx-exp-oct-sbi-misc',
      type: 'expense',
      amount: 125,
      title: 'Stationery & Courier',
      category: 'Other',
      accountId: 'acc-sbi',
      date: '2026-10-09',
      createdAt: '2026-10-09T15:00:00Z',
    },

    // Federal Bank October expenses (Total ₹715):
    {
      id: 'tx-exp-oct-fed-1',
      type: 'expense',
      amount: 250,
      title: 'Supermarket Provisions',
      category: 'Groceries',
      accountId: 'acc-federal',
      date: '2026-10-02',
      createdAt: '2026-10-02T12:00:00Z',
    },
    {
      id: 'tx-exp-oct-fed-2',
      type: 'expense',
      amount: 180,
      title: 'Household Cleaning Supplies',
      category: 'Rent & Housing',
      accountId: 'acc-federal',
      date: '2026-10-03',
      createdAt: '2026-10-03T16:00:00Z',
    },
    {
      id: 'tx-exp-oct-fed-3',
      type: 'expense',
      amount: 165,
      title: 'Medicine Syrup & Bandages',
      category: 'Health & Medical',
      accountId: 'acc-federal',
      date: '2026-10-08',
      createdAt: '2026-10-08T18:00:00Z',
    },
    {
      id: 'tx-exp-oct-fed-4',
      type: 'expense',
      amount: 120,
      title: 'Electric Bulb & Fuse',
      category: 'Bills & Utilities',
      accountId: 'acc-federal',
      date: '2026-10-11',
      createdAt: '2026-10-11T11:00:00Z',
    },

    // Cash October expenses (Total ₹335):
    {
      id: 'tx-exp-oct-cash-1',
      type: 'expense',
      amount: 40,
      title: 'Morning Chai & Biscuit',
      category: 'Food & Dining',
      accountId: 'acc-cash',
      date: '2026-10-02',
      createdAt: '2026-10-02T08:00:00Z',
    },
    {
      id: 'tx-exp-oct-cash-2',
      type: 'expense',
      amount: 60,
      title: 'Auto Rickshaw Short Distance',
      category: 'Transportation',
      accountId: 'acc-cash',
      date: '2026-10-03',
      createdAt: '2026-10-03T14:00:00Z',
    },
    {
      id: 'tx-exp-oct-cash-3',
      type: 'expense',
      amount: 55,
      title: 'Fresh Fruits from Vendor',
      category: 'Groceries',
      accountId: 'acc-cash',
      date: '2026-10-04',
      createdAt: '2026-10-04T10:00:00Z',
    },
    {
      id: 'tx-exp-oct-cash-4',
      type: 'expense',
      amount: 70,
      title: 'Street Food Snacks',
      category: 'Food & Dining',
      accountId: 'acc-cash',
      date: '2026-10-07',
      createdAt: '2026-10-07T17:00:00Z',
    },
    {
      id: 'tx-exp-oct-cash-5',
      type: 'expense',
      amount: 30,
      title: 'Photocopy & Printing',
      category: 'Other',
      accountId: 'acc-cash',
      date: '2026-10-09',
      createdAt: '2026-10-09T11:30:00Z',
    },
    {
      id: 'tx-exp-oct-cash-6',
      type: 'expense',
      amount: 45,
      title: 'Coconut Water',
      category: 'Food & Dining',
      accountId: 'acc-cash',
      date: '2026-10-10',
      createdAt: '2026-10-10T12:00:00Z',
    },
    {
      id: 'tx-exp-oct-cash-7',
      type: 'expense',
      amount: 35,
      title: 'Vegetable Lemon & Chillies',
      category: 'Groceries',
      accountId: 'acc-cash',
      date: '2026-10-11',
      createdAt: '2026-10-11T09:30:00Z',
    },
  ]

  // ── Verification Tests ──────────────────────────────────────────────

  it('1. Opening balances are starting funds and never treated as income', () => {
    const accounts = createFixtureAccounts()
    const totalOpening = accounts.reduce((sum, a) => sum + a.openingBalance, 0)
    expect(totalOpening).toBe(19500)

    // With zero transactions, income is strictly 0
    const sepOverview = calculateMonthlyCycleOverview('2026-09', accounts, [])
    expect(sepOverview.currentMonthOpeningBalance).toBe(19500)
    expect(sepOverview.actualSalaryReceived).toBe(0)
    expect(sepOverview.monthEndClosingBalance).toBe(19500)
  })

  it('2. Salary increases only the selected account (Axis Bank) and reports in September', () => {
    const accounts = createFixtureAccounts()
    const txs = createFixtureTransactions()
    const salaryTx = txs.find((t) => t.id === 'tx-sal-sep30')!

    expect(salaryTx.accountId).toBe('acc-axis')
    expect(salaryTx.date).toBe('2026-09-30')

    const sepOverview = calculateMonthlyCycleOverview('2026-09', accounts, txs)
    expect(sepOverview.actualSalaryReceived).toBe(27000)
    expect(sepOverview.salaryCreditDate).toBe('2026-09-30')

    // In September, salary credit affects Axis Bank closing balance
    const axis = sepOverview.accounts.find((a) => a.accountId === 'acc-axis')!
    expect(axis.openingBalance).toBe(10000)
    expect(axis.salaryReceived).toBe(27000)
    expect(axis.closingBalance).toBe(37000) // 10,000 + 27,000

    // Other accounts receive 0 salary
    for (const acc of sepOverview.accounts) {
      if (acc.accountId !== 'acc-axis') {
        expect(acc.salaryReceived).toBe(0)
      }
    }
  })

  it('3. September 2026 month-end closing balances reconcile exactly to ₹45,940', () => {
    const accounts = createFixtureAccounts()
    const txs = createFixtureTransactions()

    const sepOverview = calculateMonthlyCycleOverview('2026-09', accounts, txs)

    // September metrics
    expect(sepOverview.currentMonthOpeningBalance).toBe(19500)
    expect(sepOverview.actualSalaryReceived).toBe(27000)
    expect(sepOverview.actualSpendingTotal).toBe(560)
    expect(sepOverview.actualTransfersCompletedTotal).toBe(0)

    // Closing = 19,500 + 27,000 - 560 = 45,940
    expect(sepOverview.monthEndClosingBalance).toBe(45940)
    expect(sepOverview.isMonthEnded).toBe(true)
    expect(sepOverview.closingBalanceLabel).toBe('Month-End Closing Balance')

    // Account breakdown on September 30
    const axis = sepOverview.accounts.find((a) => a.accountId === 'acc-axis')!
    const kotak = sepOverview.accounts.find((a) => a.accountId === 'acc-kotak')!
    const sbi = sepOverview.accounts.find((a) => a.accountId === 'acc-sbi')!
    const federal = sepOverview.accounts.find((a) => a.accountId === 'acc-federal')!
    const cash = sepOverview.accounts.find((a) => a.accountId === 'acc-cash')!

    expect(axis.closingBalance).toBe(37000) // 10,000 + 27,000
    expect(kotak.closingBalance).toBe(5000)
    expect(sbi.closingBalance).toBe(2000)
    expect(federal.closingBalance).toBe(1500) // 2,000 - 500
    expect(cash.closingBalance).toBe(440) // 500 - 60
    expect(37000 + 5000 + 2000 + 1500 + 440).toBe(45940)
  })

  it('4. October 1 Opening Balance carries forward September Closing Balance of ₹45,940', () => {
    const accounts = createFixtureAccounts()
    const txs = createFixtureTransactions()

    const octOverview = calculateMonthlyCycleOverview('2026-10', accounts, txs)

    // Opening balance of October must equal September closing balance
    expect(octOverview.previousMonthClosingBalance).toBe(45940)
    expect(octOverview.currentMonthOpeningBalance).toBe(45940)

    const axis = octOverview.accounts.find((a) => a.accountId === 'acc-axis')!
    const kotak = octOverview.accounts.find((a) => a.accountId === 'acc-kotak')!
    const sbi = octOverview.accounts.find((a) => a.accountId === 'acc-sbi')!
    const federal = octOverview.accounts.find((a) => a.accountId === 'acc-federal')!
    const cash = octOverview.accounts.find((a) => a.accountId === 'acc-cash')!

    expect(axis.openingBalance).toBe(37000)
    expect(kotak.openingBalance).toBe(5000)
    expect(sbi.openingBalance).toBe(2000)
    expect(federal.openingBalance).toBe(1500)
    expect(cash.openingBalance).toBe(440)
  })

  it('5. October 1 transfers leave consolidated money strictly conserved at ₹45,940', () => {
    const accounts = createFixtureAccounts()
    const txs = createFixtureTransactions()

    const octOverview = calculateMonthlyCycleOverview('2026-10', accounts, txs)

    // Total transfers out of Axis: 10,000 + 5,000 + 4,000 + 1,000 = 20,000
    const axis = octOverview.accounts.find((a) => a.accountId === 'acc-axis')!
    expect(axis.internalTransfersOut).toBe(20000)

    // Transfers completed into destinations
    expect(octOverview.actualTransfersCompletedTotal).toBe(20000)
  })

  it('6. The fixture reconciles exactly to ₹40,692 closing balance on October 11', () => {
    const accounts = createFixtureAccounts()
    const txs = createFixtureTransactions()

    const octOverview = calculateMonthlyCycleOverview('2026-10', accounts, txs)

    expect(octOverview.actualSpendingTotal).toBe(5248)
    expect(octOverview.monthEndClosingBalance).toBe(40692)
    expect(octOverview.isMonthEnded).toBe(false)
    expect(octOverview.closingBalanceLabel).toBe('Month-to-Date Closing Balance')
    expect(typeof octOverview.projectedMonthEndBalance).toBe('number')

    // Individual accounts check
    const axis = octOverview.accounts.find((a) => a.accountId === 'acc-axis')!
    const kotak = octOverview.accounts.find((a) => a.accountId === 'acc-kotak')!
    const sbi = octOverview.accounts.find((a) => a.accountId === 'acc-sbi')!
    const federal = octOverview.accounts.find((a) => a.accountId === 'acc-federal')!
    const cash = octOverview.accounts.find((a) => a.accountId === 'acc-cash')!

    expect(axis.closingBalance).toBe(17000)
    expect(kotak.closingBalance).toBe(14801)
    expect(sbi.closingBalance).toBe(3001)
    expect(federal.closingBalance).toBe(4785)
    expect(cash.closingBalance).toBe(1105)

    // Sum of individual accounts equals consolidated total
    const totalClosing =
      axis.closingBalance +
      kotak.closingBalance +
      sbi.closingBalance +
      federal.closingBalance +
      cash.closingBalance

    expect(totalClosing).toBe(40692)
    // Mathematical accounting proof:
    // Opening (19,500) + Income (27,000) - Expenses (560 + 5,248) = 40,692
    expect(19500 + 27000 - 5808).toBe(40692)
  })

  it('7. Reassigning Canteen, Travel, and Fuel (₹430) to SBI correctly updates SBI and Federal', () => {
    const accounts = createFixtureAccounts()
    const baseTxs = createFixtureTransactions()

    // Canteen (80), Travel (50), Fuel (300) are assigned to SBI
    const canteen = baseTxs.find((t) => t.id === 'tx-exp-oct-canteen')!
    const travel = baseTxs.find((t) => t.id === 'tx-exp-oct-travel')!
    const fuel = baseTxs.find((t) => t.id === 'tx-exp-oct-fuel')!

    expect(canteen.accountId).toBe('acc-sbi')
    expect(travel.accountId).toBe('acc-sbi')
    expect(fuel.accountId).toBe('acc-sbi')

    const axisAcc = accounts.find((a) => a.id === 'acc-axis')!
    const sbiAcc = accounts.find((a) => a.id === 'acc-sbi')!
    const fedAcc = accounts.find((a) => a.id === 'acc-federal')!
    const kotakAcc = accounts.find((a) => a.id === 'acc-kotak')!
    const cashAcc = accounts.find((a) => a.id === 'acc-cash')!

    expect(calculateAccountBalance(sbiAcc, baseTxs)).toBe(3001)
    expect(calculateAccountBalance(fedAcc, baseTxs)).toBe(4785)
    expect(calculateAccountBalance(axisAcc, baseTxs)).toBe(17000)
    expect(calculateAccountBalance(kotakAcc, baseTxs)).toBe(14801)
    expect(calculateAccountBalance(cashAcc, baseTxs)).toBe(1105)

    // If these ₹430 were mistakenly placed in Federal instead:
    const mistakenTxs = baseTxs.map((t) => {
      if (t.id === 'tx-exp-oct-canteen' || t.id === 'tx-exp-oct-travel' || t.id === 'tx-exp-oct-fuel') {
        return { ...t, accountId: 'acc-federal' }
      }
      return t
    })

    expect(calculateAccountBalance(sbiAcc, mistakenTxs)).toBe(3431) // SBI has +430 extra
    expect(calculateAccountBalance(fedAcc, mistakenTxs)).toBe(4355) // Federal is debited -430 unfairly

    // Correcting reassignment restores SBI to 3001 and Federal to 4785!
    const correctedTxs = mistakenTxs.map((t) => {
      if (t.id === 'tx-exp-oct-canteen' || t.id === 'tx-exp-oct-travel' || t.id === 'tx-exp-oct-fuel') {
        return { ...t, accountId: 'acc-sbi' }
      }
      return t
    })

    expect(calculateAccountBalance(sbiAcc, correctedTxs)).toBe(3001)
    expect(calculateAccountBalance(fedAcc, correctedTxs)).toBe(4785)
  })

  it('8. Deleting an expense restores the account balance correctly', () => {
    const accounts = createFixtureAccounts()
    const txs = createFixtureTransactions()
    const sbiAcc = accounts.find((a) => a.id === 'acc-sbi')!

    expect(calculateAccountBalance(sbiAcc, txs)).toBe(3001)

    // Delete fuel expense (₹300)
    const afterDelete = txs.filter((t) => t.id !== 'tx-exp-oct-fuel')
    expect(calculateAccountBalance(sbiAcc, afterDelete)).toBe(3301) // 3001 + 300 restored
  })

  it('9. Editing or deleting a transfer updates both source and destination accounts atomically', () => {
    const accounts = createFixtureAccounts()
    const txs = createFixtureTransactions()
    const axisAcc = accounts.find((a) => a.id === 'acc-axis')!
    const kotakAcc = accounts.find((a) => a.id === 'acc-kotak')!

    expect(calculateAccountBalance(axisAcc, txs)).toBe(17000)
    expect(calculateAccountBalance(kotakAcc, txs)).toBe(14801)

    // Edit transfer amount to Kotak from 10,000 to 12,000
    const editedTransfer = txs.map((t) =>
      t.id === 'tx-tr-kotak' ? { ...t, amount: 12000 } : t
    )

    expect(calculateAccountBalance(axisAcc, editedTransfer)).toBe(15000) // 17,000 - 2,000
    expect(calculateAccountBalance(kotakAcc, editedTransfer)).toBe(16801) // 14,801 + 2,000

    // Delete transfer: refunds Axis and deducts Kotak
    const deletedTransfer = txs.filter((t) => t.id !== 'tx-tr-kotak')
    expect(calculateAccountBalance(axisAcc, deletedTransfer)).toBe(27000) // 17,000 + 10,000
    expect(calculateAccountBalance(kotakAcc, deletedTransfer)).toBe(4801) // 14,801 - 10,000
  })

  it('10. Confirms transaction counts: 25 expenses, 1 income, 4 transfers = 30 logical transactions', () => {
    const txs = createFixtureTransactions()

    const expenses = txs.filter((t) => t.type === 'expense')
    const income = txs.filter((t) => t.type === 'income')
    const transfers = txs.filter((t) => t.type === 'transfer')

    expect(expenses.length).toBe(25)
    expect(income.length).toBe(1)
    expect(transfers.length).toBe(4)

    // Logical count convention:
    expect(txs.length).toBe(30)

    // If counted by 2 transfer legs (source debit + destination credit):
    const physicalLegsCount = expenses.length + income.length + transfers.length * 2
    expect(physicalLegsCount).toBe(34)
  })
})
