import { describe, it, expect } from 'vitest'
import {
  getLastCalendarDayOfMonth,
  getMonthBounds,
  getPreviousMonthStr,
  getNextMonthStr,
  calculateMonthlyCycleOverview,
  formatMonthLabel,
} from '@/lib/monthlyCycleMath'
import type { Account, Transaction, MonthlyBudgetPlan } from '@/types/finance'

describe('MoneyMap — Recurring Monthly Salary & Account Allocation Workflow', () => {
  const createStandardAccounts = (): Account[] => [
    {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      balance: 19700,
      openingBalanceDate: '2026-10-10',
      trackingStartDate: '2026-10-10',
    },
    {
      id: 'acc-kotak',
      name: 'Kotak Bank',
      type: 'savings',
      openingBalance: 6000,
      balance: 13000,
      openingBalanceDate: '2026-10-10',
      trackingStartDate: '2026-10-10',
    },
    {
      id: 'acc-sbi',
      name: 'SBI Bank',
      type: 'savings',
      openingBalance: 2300,
      balance: 6300,
      openingBalanceDate: '2026-10-10',
      trackingStartDate: '2026-10-10',
    },
    {
      id: 'acc-federal',
      name: 'Federal Bank',
      type: 'savings',
      openingBalance: 600,
      balance: 5600,
      openingBalanceDate: '2026-10-10',
      trackingStartDate: '2026-10-10',
    },
    {
      id: 'acc-cash',
      name: 'Physical Cash',
      type: 'cash',
      openingBalance: 600,
      balance: 900,
      openingBalanceDate: '2026-10-10',
      trackingStartDate: '2026-10-10',
    },
  ]

  const createOctoberTransactions = (): Transaction[] => [
    {
      id: 'tx-oct-sal',
      type: 'income',
      amount: 27000,
      title: 'October Salary',
      category: 'Salary',
      accountId: 'acc-axis',
      date: '2026-10-11',
      createdAt: '2026-10-11T10:00:00Z',
    },
    {
      id: 'tx-oct-tr-kotak',
      type: 'transfer',
      amount: 7000,
      title: 'Kotak Savings Allocation',
      category: 'Transfer',
      accountId: 'acc-axis',
      fromAccountId: 'acc-axis',
      toAccountId: 'acc-kotak',
      date: '2026-10-11',
      createdAt: '2026-10-11T10:05:00Z',
    },
    {
      id: 'tx-oct-tr-sbi',
      type: 'transfer',
      amount: 5000,
      title: 'SBI EMI & Spending Allocation',
      category: 'Transfer',
      accountId: 'acc-axis',
      fromAccountId: 'acc-axis',
      toAccountId: 'acc-sbi',
      date: '2026-10-11',
      createdAt: '2026-10-11T10:10:00Z',
    },
    {
      id: 'tx-oct-tr-federal',
      type: 'transfer',
      amount: 5000,
      title: 'Federal Purchases Allocation',
      category: 'Transfer',
      accountId: 'acc-axis',
      fromAccountId: 'acc-axis',
      toAccountId: 'acc-federal',
      date: '2026-10-11',
      createdAt: '2026-10-11T10:15:00Z',
    },
    {
      id: 'tx-oct-atm',
      type: 'transfer',
      amount: 300,
      title: 'ATM Cash Withdrawal',
      category: 'Transfer',
      accountId: 'acc-axis',
      fromAccountId: 'acc-axis',
      toAccountId: 'acc-cash',
      date: '2026-10-11',
      createdAt: '2026-10-11T10:20:00Z',
    },
    {
      id: 'tx-oct-sbi-exp',
      type: 'expense',
      amount: 1000,
      title: 'Grocery Store Payment',
      category: 'Groceries',
      accountId: 'acc-sbi',
      date: '2026-10-11',
      createdAt: '2026-10-11T10:25:00Z',
    },
  ]

  describe('1. Calendar Boundaries, Month-Ends & Year Transitions', () => {
    it('correctly calculates last calendar day for 28, 29, 30, and 31 day months', () => {
      // February non-leap (2026)
      expect(getLastCalendarDayOfMonth(2026, 2)).toBe(28)
      // February leap year (2024)
      expect(getLastCalendarDayOfMonth(2024, 2)).toBe(29)
      // September (30 days)
      expect(getLastCalendarDayOfMonth(2026, 9)).toBe(30)
      // October (31 days)
      expect(getLastCalendarDayOfMonth(2026, 10)).toBe(31)
      // November (30 days)
      expect(getLastCalendarDayOfMonth(2026, 11)).toBe(30)
      // December (31 days)
      expect(getLastCalendarDayOfMonth(2026, 12)).toBe(31)
    })

    it('handles September 30 to October 1 transition cleanly', () => {
      const sep = getMonthBounds('2026-09')
      expect(sep.startDate).toBe('2026-09-01')
      expect(sep.endDate).toBe('2026-09-30')
      expect(getNextMonthStr('2026-09')).toBe('2026-10')

      const oct = getMonthBounds('2026-10')
      expect(oct.startDate).toBe('2026-10-01')
      expect(oct.endDate).toBe('2026-10-31')
      expect(getPreviousMonthStr('2026-10')).toBe('2026-09')
    })

    it('handles October 31 to November 1 transition cleanly', () => {
      const oct = getMonthBounds('2026-10')
      expect(oct.endDate).toBe('2026-10-31')
      expect(getNextMonthStr('2026-10')).toBe('2026-11')

      const nov = getMonthBounds('2026-11')
      expect(nov.startDate).toBe('2026-11-01')
      expect(nov.endDate).toBe('2026-11-30')
      expect(getPreviousMonthStr('2026-11')).toBe('2026-10')
    })

    it('handles December 31 to January 1 year transition cleanly', () => {
      expect(getNextMonthStr('2026-12')).toBe('2027-01')
      expect(getPreviousMonthStr('2027-01')).toBe('2026-12')

      const jan27 = getMonthBounds('2027-01')
      expect(jan27.startDate).toBe('2027-01-01')
      expect(jan27.endDate).toBe('2027-01-31')
      expect(jan27.year).toBe(2027)
    })
  })

  describe('2. Salary Credited on Actual Date vs Delayed Salary', () => {
    it('records salary in the month it was actually credited', () => {
      const accounts = createStandardAccounts()
      const txs = createOctoberTransactions()

      const octOverview = calculateMonthlyCycleOverview('2026-10', accounts, txs)
      expect(octOverview.actualSalaryReceived).toBe(27000)
      expect(octOverview.isSalaryCredited).toBe(true)
      expect(octOverview.isSalaryDelayed).toBe(false)
      expect(octOverview.salaryCreditDate).toBe('2026-10-11')
    })

    it('does NOT count delayed salary in earlier month before actual credit date', () => {
      const accounts = createStandardAccounts()
      // Delayed salary: credited on Nov 2 instead of Oct 31
      const txs: Transaction[] = [
        ...createOctoberTransactions().filter((t) => t.id !== 'tx-oct-sal'),
        {
          id: 'tx-delayed-sal',
          type: 'income',
          amount: 27000,
          title: 'Monthly Salary (Delayed)',
          category: 'Salary',
          accountId: 'acc-axis',
          date: '2026-11-02',
          createdAt: '2026-11-02T10:00:00Z',
        },
      ]

      // October overview
      const octOverview = calculateMonthlyCycleOverview('2026-10', accounts, txs)
      expect(octOverview.actualSalaryReceived).toBe(0)
      expect(octOverview.isSalaryCredited).toBe(false)
      expect(octOverview.isSalaryDelayed).toBe(true)

      // November overview
      const novOverview = calculateMonthlyCycleOverview('2026-11', accounts, txs)
      expect(novOverview.actualSalaryReceived).toBe(27000)
      expect(novOverview.isSalaryCredited).toBe(true)
      expect(novOverview.salaryCreditDate).toBe('2026-11-02')
    })
  })

  describe('3. Month-End Closing and November 1 Opening Balance Carry-Forward', () => {
    it('calculates October closing balances matching expected figures', () => {
      const accounts = createStandardAccounts()
      const txs = createOctoberTransactions()

      const octOverview = calculateMonthlyCycleOverview('2026-10', accounts, txs)

      const axis = octOverview.accounts.find((a) => a.accountId === 'acc-axis')!
      const kotak = octOverview.accounts.find((a) => a.accountId === 'acc-kotak')!
      const sbi = octOverview.accounts.find((a) => a.accountId === 'acc-sbi')!
      const federal = octOverview.accounts.find((a) => a.accountId === 'acc-federal')!
      const cash = octOverview.accounts.find((a) => a.accountId === 'acc-cash')!

      // Axis: 10,000 + 27,000 - 17,300 = 19,700
      expect(axis.openingBalance).toBe(10000)
      expect(axis.closingBalance).toBe(19700)

      // Kotak: 6,000 + 7,000 = 13,000
      expect(kotak.openingBalance).toBe(6000)
      expect(kotak.closingBalance).toBe(13000)

      // SBI: 2,300 + 5,000 - 1,000 = 6,300
      expect(sbi.openingBalance).toBe(2300)
      expect(sbi.closingBalance).toBe(6300)

      // Federal: 600 + 5,000 = 5,600
      expect(federal.openingBalance).toBe(600)
      expect(federal.closingBalance).toBe(5600)

      // Cash: 600 + 300 = 900
      expect(cash.openingBalance).toBe(600)
      expect(cash.closingBalance).toBe(900)

      // Combined Closing Balance
      expect(octOverview.monthEndClosingBalance).toBe(45500)
    })

    it('carries October 31 closing balances forward as November 1 opening balances with exact parity', () => {
      const accounts = createStandardAccounts()
      const txs = createOctoberTransactions()

      const novOverview = calculateMonthlyCycleOverview('2026-11', accounts, txs)

      const axisNov = novOverview.accounts.find((a) => a.accountId === 'acc-axis')!
      const kotakNov = novOverview.accounts.find((a) => a.accountId === 'acc-kotak')!
      const sbiNov = novOverview.accounts.find((a) => a.accountId === 'acc-sbi')!
      const federalNov = novOverview.accounts.find((a) => a.accountId === 'acc-federal')!
      const cashNov = novOverview.accounts.find((a) => a.accountId === 'acc-cash')!

      // Each account's November opening balance MUST equal October's closing balance!
      expect(axisNov.openingBalance).toBe(19700)
      expect(kotakNov.openingBalance).toBe(13000)
      expect(sbiNov.openingBalance).toBe(6300)
      expect(federalNov.openingBalance).toBe(5600)
      expect(cashNov.openingBalance).toBe(900)

      // Consolidated November opening balance
      expect(novOverview.currentMonthOpeningBalance).toBe(45500)
      // Consolidated Previous Month (October) closing balance
      expect(novOverview.previousMonthClosingBalance).toBe(45500)
    })

    it('ensures carry-forward balances are never treated as income or expenses', () => {
      const accounts = createStandardAccounts()
      const txs = createOctoberTransactions()

      // November with zero transactions recorded yet
      const novOverview = calculateMonthlyCycleOverview('2026-11', accounts, txs)

      expect(novOverview.currentMonthOpeningBalance).toBe(45500)
      // No income in November
      expect(novOverview.actualSalaryReceived).toBe(0)
      // No expenses in November
      expect(novOverview.actualSpendingTotal).toBe(0)
      // Closing balance remains 45,500
      expect(novOverview.monthEndClosingBalance).toBe(45500)
    })
  })

  describe('4. Transfers vs Purchases vs Cash Withdrawals', () => {
    it('transfers alter individual accounts but leave consolidated funds completely unchanged', () => {
      const accounts = createStandardAccounts()
      const txs = createOctoberTransactions()

      // In October:
      // Transfers:
      // Axis to Kotak: 7,000
      // Axis to SBI: 5,000
      // Axis to Federal: 5,000
      // Axis to Cash: 300
      // Total transferred out of Axis: 17,300
      // Total transferred into destinations: 17,300
      const octOverview = calculateMonthlyCycleOverview('2026-10', accounts, txs)

      const axis = octOverview.accounts.find((a) => a.accountId === 'acc-axis')!
      expect(axis.internalTransfersOut).toBe(17300)

      const kotak = octOverview.accounts.find((a) => a.accountId === 'acc-kotak')!
      expect(kotak.internalTransfersIn).toBe(7000)

      const sbi = octOverview.accounts.find((a) => a.accountId === 'acc-sbi')!
      expect(sbi.internalTransfersIn).toBe(5000)

      const federal = octOverview.accounts.find((a) => a.accountId === 'acc-federal')!
      expect(federal.internalTransfersIn).toBe(5000)

      const cash = octOverview.accounts.find((a) => a.accountId === 'acc-cash')!
      expect(cash.internalTransfersIn).toBe(300)

      // Consolidated effect: 27,000 (salary) - 1,000 (expense) = +26,000
      // 19,500 (opening) + 26,000 = 45,500
      expect(octOverview.monthEndClosingBalance).toBe(45500)
    })

    it('tracks purchases and expenses separately from transfers', () => {
      const accounts = createStandardAccounts()
      const txs = createOctoberTransactions()

      const octOverview = calculateMonthlyCycleOverview('2026-10', accounts, txs)

      // Actual spending is ONLY the ₹1,000 grocery expense from SBI
      expect(octOverview.actualSpendingTotal).toBe(1000)
      const sbi = octOverview.accounts.find((a) => a.accountId === 'acc-sbi')!
      expect(sbi.purchasesAndExpenses).toBe(1000)

      // Transfers are tracked under transfers, not spending
      expect(octOverview.actualTransfersCompletedTotal).toBe(17300)
    })
  })

  describe('5. Monthly Budget Allocation & Planning Workflow', () => {
    it('creates a fresh monthly budget plan on the first day of the new month', () => {
      const accounts = createStandardAccounts()
      const txs = createOctoberTransactions()

      const novOverview = calculateMonthlyCycleOverview('2026-11', accounts, txs)

      expect(novOverview.budgetAllocations.length).toBeGreaterThanOrEqual(5)
      expect(novOverview.plannedAllocationsTotal).toBe(27000)

      // Planned allocations are unfunded at the start of November
      const kotakNov = novOverview.budgetAllocations.find(
        (b) => b.categoryKey === 'kotak_savings'
      )!
      expect(kotakNov.plannedAmount).toBe(8000)
      expect(kotakNov.actualOutflow).toBe(0)
      expect(kotakNov.remainingAmount).toBe(8000)
      expect(kotakNov.status).toBe('unfunded')
    })

    it('enforces that a budget plan does NOT change account balances', () => {
      const accounts = createStandardAccounts()
      const txs = createOctoberTransactions()

      const customNovPlan: MonthlyBudgetPlan = {
        month: '2026-11',
        expectedSalary: 30000,
        allocations: [
          {
            id: 'nov-plan-kotak',
            name: 'Kotak Savings Target',
            categoryKey: 'kotak_savings',
            targetAccountId: 'acc-kotak',
            plannedAmount: 15000,
          },
        ],
      }

      // Compute with custom plan
      const novOverview = calculateMonthlyCycleOverview(
        '2026-11',
        accounts,
        txs,
        customNovPlan
      )

      // The plan amount is 15,000, but account opening and closing balances are UNCHANGED
      const kotakNov = novOverview.accounts.find((a) => a.accountId === 'acc-kotak')!
      expect(kotakNov.openingBalance).toBe(13000)
      expect(kotakNov.closingBalance).toBe(13000)
      expect(novOverview.monthEndClosingBalance).toBe(45500)
    })
  })

  describe('6. Historical Reporting & Disclosure of Mid-Month Tracking Start', () => {
    it('discloses mid-month tracking start and missing earlier history for October', () => {
      const accounts = createStandardAccounts()
      const txs = createOctoberTransactions()

      const octOverview = calculateMonthlyCycleOverview('2026-10', accounts, txs)

      expect(octOverview.isFirstTrackingMonth).toBe(true)
      expect(octOverview.hasMissingPriorHistory).toBe(true)
    })

    it('does not flag missing history for subsequent months once established', () => {
      const accounts = createStandardAccounts()
      const txs = createOctoberTransactions()

      const novOverview = calculateMonthlyCycleOverview('2026-11', accounts, txs)

      expect(novOverview.isFirstTrackingMonth).toBe(false)
      expect(novOverview.hasMissingPriorHistory).toBe(false)
    })

    it('formats month labels accurately', () => {
      expect(formatMonthLabel('2026-09')).toBe('September 2026')
      expect(formatMonthLabel('2026-10')).toBe('October 2026')
      expect(formatMonthLabel('2026-11')).toBe('November 2026')
      expect(formatMonthLabel('2027-01')).toBe('January 2027')
    })
  })

  describe('7. User Exact Spec: August to October Salary Carry-Forward & October 1 Transfers', () => {
    const createZeroBalanceAccounts = (): Account[] => [
      {
        id: 'acc-axis',
        name: 'Axis Bank',
        type: 'salary',
        openingBalance: 0,
        balance: 0,
        openingBalanceDate: '2026-08-01',
        trackingStartDate: '2026-08-01',
        isActive: true,
      },
      {
        id: 'acc-kotak',
        name: 'Kotak Bank',
        type: 'savings',
        openingBalance: 0,
        balance: 0,
        openingBalanceDate: '2026-08-01',
        trackingStartDate: '2026-08-01',
        isActive: true,
      },
      {
        id: 'acc-sbi',
        name: 'SBI Bank',
        type: 'savings',
        openingBalance: 0,
        balance: 0,
        openingBalanceDate: '2026-08-01',
        trackingStartDate: '2026-08-01',
        isActive: true,
      },
      {
        id: 'acc-federal',
        name: 'Federal Bank',
        type: 'savings',
        openingBalance: 0,
        balance: 0,
        openingBalanceDate: '2026-08-01',
        trackingStartDate: '2026-08-01',
        isActive: true,
      },
      {
        id: 'acc-cash',
        name: 'Physical Cash',
        type: 'cash',
        openingBalance: 0,
        balance: 0,
        openingBalanceDate: '2026-08-01',
        trackingStartDate: '2026-08-01',
        isActive: true,
      },
    ]

    const salaryTransactions: Transaction[] = [
      {
        id: 'tx-sal-aug31',
        type: 'income',
        amount: 27000,
        title: 'Monthly Salary',
        category: 'Salary',
        accountId: 'acc-axis',
        date: '2026-08-31',
        createdAt: '2026-08-31T18:00:00Z',
      },
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
    ]

    it('verifies August closing ₹27,000, September opening ₹27,000, September closing ₹54,000, and October opening ₹54,000', () => {
      const accounts = createZeroBalanceAccounts()

      // 1. August 2026
      const augOverview = calculateMonthlyCycleOverview('2026-08', accounts, salaryTransactions)
      const axisAug = augOverview.accounts.find((a) => a.accountId === 'acc-axis')!
      expect(axisAug.openingBalance).toBe(0)
      expect(axisAug.inflows).toBe(27000)
      expect(axisAug.outflows).toBe(0)
      expect(axisAug.closingBalance).toBe(27000)
      expect(augOverview.monthEndClosingBalance).toBe(27000)
      expect(augOverview.actualSalaryReceived).toBe(27000)

      // 2. September 2026
      const sepOverview = calculateMonthlyCycleOverview('2026-09', accounts, salaryTransactions)
      const axisSep = sepOverview.accounts.find((a) => a.accountId === 'acc-axis')!
      expect(axisSep.openingBalance).toBe(27000) // Carried forward from August closing
      expect(axisSep.inflows).toBe(27000)
      expect(axisSep.outflows).toBe(0)
      expect(axisSep.closingBalance).toBe(54000) // 27,000 + 27,000
      expect(sepOverview.currentMonthOpeningBalance).toBe(27000)
      expect(sepOverview.monthEndClosingBalance).toBe(54000)
      expect(sepOverview.actualSalaryReceived).toBe(27000)

      // 3. October 2026 (no transactions yet)
      const octOverview = calculateMonthlyCycleOverview('2026-10', accounts, salaryTransactions)
      const axisOct = octOverview.accounts.find((a) => a.accountId === 'acc-axis')!
      expect(axisOct.openingBalance).toBe(54000) // Carried forward from September closing
      expect(axisOct.inflows).toBe(0)
      expect(axisOct.outflows).toBe(0)
      expect(axisOct.closingBalance).toBe(54000)
      expect(octOverview.currentMonthOpeningBalance).toBe(54000)
      expect(octOverview.monthEndClosingBalance).toBe(54000)
      // Carried forward balance is NEVER counted as income
      expect(octOverview.actualSalaryReceived).toBe(0)
      expect(octOverview.isSalaryCredited).toBe(false)
      expect(octOverview.isSalaryDelayed).toBe(true)
    })

    it('verifies October 1 transfers alter individual balances but leave combined money unchanged at ₹54,000', () => {
      const accounts = createZeroBalanceAccounts()

      const oct1Transfers: Transaction[] = [
        ...salaryTransactions,
        {
          id: 'tx-oct1-tr-kotak',
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
          id: 'tx-oct1-tr-sbi',
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
          id: 'tx-oct1-tr-federal',
          type: 'transfer',
          amount: 5000,
          title: 'Allocation to Federal Bank',
          category: 'Transfer',
          accountId: 'acc-axis',
          fromAccountId: 'acc-axis',
          toAccountId: 'acc-federal',
          date: '2026-10-01',
          createdAt: '2026-10-01T09:10:00Z',
        },
        {
          id: 'tx-oct1-tr-cash',
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
      ]

      const octOverview = calculateMonthlyCycleOverview('2026-10', accounts, oct1Transfers)

      const axis = octOverview.accounts.find((a) => a.accountId === 'acc-axis')!
      const kotak = octOverview.accounts.find((a) => a.accountId === 'acc-kotak')!
      const sbi = octOverview.accounts.find((a) => a.accountId === 'acc-sbi')!
      const federal = octOverview.accounts.find((a) => a.accountId === 'acc-federal')!
      const cash = octOverview.accounts.find((a) => a.accountId === 'acc-cash')!

      // Individual account opening balances:
      expect(axis.openingBalance).toBe(54000)
      expect(kotak.openingBalance).toBe(0)
      expect(sbi.openingBalance).toBe(0)
      expect(federal.openingBalance).toBe(0)
      expect(cash.openingBalance).toBe(0)

      // Individual account closing balances after internal transfers:
      // Axis: 54,000 - 21,000 = 33,000
      expect(axis.internalTransfersOut).toBe(21000)
      expect(axis.closingBalance).toBe(33000)

      // Kotak: 0 + 10,000 = 10,000
      expect(kotak.internalTransfersIn).toBe(10000)
      expect(kotak.closingBalance).toBe(10000)

      // SBI: 0 + 5,000 = 5,000
      expect(sbi.internalTransfersIn).toBe(5000)
      expect(sbi.closingBalance).toBe(5000)

      // Federal: 0 + 5,000 = 5,000
      expect(federal.internalTransfersIn).toBe(5000)
      expect(federal.closingBalance).toBe(5000)

      // Cash: 0 + 1,000 = 1,000
      expect(cash.internalTransfersIn).toBe(1000)
      expect(cash.closingBalance).toBe(1000)

      // Combined closing balance across all accounts:
      // 33,000 + 10,000 + 5,000 + 5,000 + 1,000 = 54,000
      expect(octOverview.monthEndClosingBalance).toBe(54000)
      // Combined opening balance:
      expect(octOverview.currentMonthOpeningBalance).toBe(54000)
      // Spending is ₹0 (internal transfers are not expenses)
      expect(octOverview.actualSpendingTotal).toBe(0)
      expect(octOverview.actualTransfersCompletedTotal).toBe(21000)
    })
  })
})
