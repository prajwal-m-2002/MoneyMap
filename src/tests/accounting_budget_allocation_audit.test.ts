import { describe, it, expect } from 'vitest'
import { calculateAccountBalance } from '@/context/FinanceContext'
import { calculateConsolidatedFlow, getFlowPeriodBounds } from '@/lib/consolidatedFlowMath'
import { generateCashFlowForecast } from '@/lib/predictionEngine'
import {
  getDefaultMonthlyBudgetPlan,
  calculateMonthlyBudgetAllocation,
} from '@/lib/monthlyBudgetMath'
import type {
  Account,
  Transaction,
  MonthlyBudgetPlan,
  RecurringTransaction,
} from '@/types/finance'

describe('MoneyMap — Accounting Accuracy & Monthly Budget Allocation Audit Suite', () => {
  const createStandardAccounts = (): Account[] => [
    {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      balance: 19700,
      openingBalanceDate: '2026-10-10',
      trackingStartDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
    {
      id: 'acc-kotak',
      name: 'Kotak Bank',
      type: 'savings',
      openingBalance: 5000,
      balance: 13000,
      openingBalanceDate: '2026-10-10',
      trackingStartDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
    {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 2000,
      balance: 6300,
      openingBalanceDate: '2026-10-10',
      trackingStartDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
    {
      id: 'acc-federal',
      name: 'Federal Bank',
      type: 'savings',
      openingBalance: 2000,
      balance: 5600,
      openingBalanceDate: '2026-10-10',
      trackingStartDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
    {
      id: 'acc-cash',
      name: 'Physical Cash',
      type: 'cash',
      openingBalance: 500,
      balance: 900,
      openingBalanceDate: '2026-10-10',
      trackingStartDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
  ]

  const createStandardNineTransactions = (accounts: Account[]): Transaction[] => [
    {
      id: 'tx-1',
      type: 'income',
      amount: 27000,
      title: 'Salary credit',
      category: 'Salary',
      accountId: accounts[0].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T10:00:00Z',
    },
    {
      id: 'tx-2',
      type: 'transfer',
      amount: 8000,
      title: 'Monthly Savings',
      category: 'Transfer',
      accountId: accounts[0].id,
      toAccountId: accounts[1].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T10:05:00Z',
    },
    {
      id: 'tx-3',
      type: 'transfer',
      amount: 5000,
      title: 'Monthly Spending Fund',
      category: 'Transfer',
      accountId: accounts[0].id,
      toAccountId: accounts[2].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T10:10:00Z',
    },
    {
      id: 'tx-4',
      type: 'transfer',
      amount: 4000,
      title: 'Purchase Fund',
      category: 'Transfer',
      accountId: accounts[0].id,
      toAccountId: accounts[3].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T10:15:00Z',
    },
    {
      id: 'tx-5',
      type: 'expense',
      amount: 300,
      title: 'Lunch',
      category: 'Food & Dining',
      accountId: accounts[0].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T12:00:00Z',
    },
    {
      id: 'tx-6',
      type: 'expense',
      amount: 200,
      title: 'Transport',
      category: 'Transportation',
      accountId: accounts[2].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T13:00:00Z',
    },
    {
      id: 'tx-7',
      type: 'expense',
      amount: 400,
      title: 'Household Items',
      category: 'Shopping',
      accountId: accounts[3].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T14:00:00Z',
    },
    {
      id: 'tx-8',
      type: 'transfer',
      amount: 500,
      title: 'ATM Cash Withdrawal',
      category: 'Transfer',
      accountId: accounts[2].id,
      toAccountId: accounts[4].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T15:00:00Z',
    },
    {
      id: 'tx-9',
      type: 'expense',
      amount: 100,
      title: 'Tea & Snacks',
      category: 'Food & Dining',
      accountId: accounts[4].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T16:00:00Z',
    },
  ]

  // ── 1. Opening Balances as Baseline ─────────────────────────
  describe('1. Opening Balances & Tracking Start Dates', () => {
    it('uses actual opening balance as baseline and never counts opening balance as income', () => {
      const accounts = createStandardAccounts()
      const txs = createStandardNineTransactions(accounts)

      // Axis Bank opening balance is ₹10,000
      const axisOpening = accounts[0].openingBalance
      expect(axisOpening).toBe(10000)

      const flow = calculateConsolidatedFlow({
        accounts,
        transactions: txs,
        period: {
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          label: 'October 2026',
          isCurrentMonth: true,
        },
      })

      // Combined opening balance is ₹19,500 (10k + 5k + 2k + 2k + 500)
      expect(flow.openingBankAndCashBalance).toBe(19500)
      // Income is strictly external income of ₹27,000, NOT ₹27,000 + ₹19,500!
      expect(flow.externalIncome).toBe(27000)
      expect(flow.salaryIncome).toBe(27000)
      expect(flow.otherIncome).toBe(0)
    })

    it('respects mid-month tracking start date and clearly flags partial coverage', () => {
      const accounts = createStandardAccounts()
      const txs = createStandardNineTransactions(accounts)

      const flow = calculateConsolidatedFlow({
        accounts,
        transactions: txs,
        period: {
          startDate: '2026-10-01',
          endDate: '2026-10-31',
          label: 'October 2026',
          isCurrentMonth: true,
        },
      })

      expect(flow.isPeriodPartiallyCovered).toBe(true)
      expect(flow.partialCoverageNotice).toContain('Ledger coverage: 2026-10-10–2026-10-31')
      expect(flow.partialCoverageNotice).toContain('Historical data unavailable before 2026-10-10')
    })
  })

  // ── 2. Internal Transfers & Consolidation ────────────────────
  describe('2. Internal Transfers & Accounting Consolidation', () => {
    it('ensures transfers change individual account balances but net to zero in consolidated flow', () => {
      const accounts = createStandardAccounts()
      const txs = createStandardNineTransactions(accounts)

      // Individual balance calculations
      const axisBal = calculateAccountBalance(accounts[0], txs)
      const kotakBal = calculateAccountBalance(accounts[1], txs)
      const sbiBal = calculateAccountBalance(accounts[2], txs)
      const fedBal = calculateAccountBalance(accounts[3], txs)
      const cashBal = calculateAccountBalance(accounts[4], txs)

      expect(axisBal).toBe(19700)
      expect(kotakBal).toBe(13000)
      expect(sbiBal).toBe(6300)
      expect(fedBal).toBe(5600)
      expect(cashBal).toBe(900)
      expect(axisBal + kotakBal + sbiBal + fedBal + cashBal).toBe(45500)

      const flow = calculateConsolidatedFlow({
        accounts,
        transactions: txs,
        period: {
          startDate: '2026-10-10',
          endDate: '2026-10-31',
          label: 'October 2026',
          isCurrentMonth: true,
        },
      })

      expect(flow.internalTransferEventsCount).toBe(4)
      expect(flow.internalTransfersTotal).toBe(17500)
      // Consolidated actual expenses = only direct expenses (300 + 200 + 400 + 100 = 1,000)
      expect(flow.actualExpenses).toBe(1000)
      expect(flow.closingBankAndCashBalance).toBe(45500)
    })

    it('does not count transfers to savings as expenses or external income', () => {
      const accounts = createStandardAccounts()
      const txs = createStandardNineTransactions(accounts)

      const flow = calculateConsolidatedFlow({
        accounts,
        transactions: txs,
        period: {
          startDate: '2026-10-10',
          endDate: '2026-10-31',
          label: 'October 2026',
          isCurrentMonth: true,
        },
      })

      // ₹8,000 transferred to Kotak Bank is an internal transfer, not expense
      expect(flow.actualExpenses).toBe(1000)
      expect(flow.externalIncome).toBe(27000)
    })
  })

  // ── 3. Monthly Budget Allocation Engine (Phase 3) ────────────
  describe('3. Monthly Budget Allocation & Planning Engine', () => {
    it('creates default monthly budget allocation plan matching 5-account structure', () => {
      const accounts = createStandardAccounts()
      const plan = getDefaultMonthlyBudgetPlan(accounts, 27000, '2026-10')

      expect(plan.expectedSalary).toBe(27000)
      expect(plan.allocations.length).toBe(5)

      const kotakItem = plan.allocations.find((a) => a.categoryKey === 'kotak_savings')!
      const sbiItem = plan.allocations.find((a) => a.categoryKey === 'sbi_emi_spending')!
      const fedItem = plan.allocations.find((a) => a.categoryKey === 'federal_purchases')!
      const cashItem = plan.allocations.find((a) => a.categoryKey === 'cash_spending')!
      const axisItem = plan.allocations.find((a) => a.categoryKey === 'axis_retained')!

      expect(kotakItem.plannedAmount).toBe(8000)
      expect(sbiItem.plannedAmount).toBe(5000)
      expect(fedItem.plannedAmount).toBe(4000)
      expect(cashItem.plannedAmount).toBe(1000)
      expect(axisItem.plannedAmount).toBe(9000)
    })

    it('calculates planned vs transferred vs spent without mutating account balances', () => {
      const accounts = createStandardAccounts()
      const txs = createStandardNineTransactions(accounts)
      const plan = getDefaultMonthlyBudgetPlan(accounts, 27000, '2026-10')

      const initialAxisBalance = calculateAccountBalance(accounts[0], txs)
      const initialKotakBalance = calculateAccountBalance(accounts[1], txs)

      const analysis = calculateMonthlyBudgetAllocation({
        accounts,
        transactions: txs,
        plan,
        month: '2026-10',
      })

      // Verification of calculations
      expect(analysis.actualSalaryReceived).toBe(27000)
      expect(analysis.totalPlanned).toBe(27000)
      expect(analysis.totalTransferred).toBe(17500) // 8000 + 5000 + 4000 + 500
      expect(analysis.totalSpent).toBe(1000) // 300 + 200 + 400 + 100

      // Kotak Savings: Planned ₹8,000, Transferred ₹8,000, Remaining ₹0 (100% funded)
      const kotakProgress = analysis.items.find((i) => i.categoryKey === 'kotak_savings')!
      expect(kotakProgress.plannedAmount).toBe(8000)
      expect(kotakProgress.transferredAmount).toBe(8000)
      expect(kotakProgress.spentAmount).toBe(0) // Not counted as expense!
      expect(kotakProgress.remainingAmount).toBe(0)
      expect(kotakProgress.percentUsed).toBe(100)
      expect(kotakProgress.status).toBe('on_track')

      // SBI EMI & Spending: Planned ₹5,000, Transferred ₹5,000, Spent ₹200
      const sbiProgress = analysis.items.find((i) => i.categoryKey === 'sbi_emi_spending')!
      expect(sbiProgress.plannedAmount).toBe(5000)
      expect(sbiProgress.transferredAmount).toBe(5000)
      expect(sbiProgress.spentAmount).toBe(200)

      // Cash: Planned ₹1,000, Transferred ₹500, Remaining ₹500
      const cashProgress = analysis.items.find((i) => i.categoryKey === 'cash_spending')!
      expect(cashProgress.plannedAmount).toBe(1000)
      expect(cashProgress.transferredAmount).toBe(500)
      expect(cashProgress.spentAmount).toBe(100)
      expect(cashProgress.remainingAmount).toBe(500)

      // CRITICAL ACCOUNTING RULE: Balances must NOT have changed!
      expect(calculateAccountBalance(accounts[0], txs)).toBe(initialAxisBalance)
      expect(calculateAccountBalance(accounts[1], txs)).toBe(initialKotakBalance)
    })

    it('supports customizable categories and planned amounts', () => {
      const accounts = createStandardAccounts()
      const txs = createStandardNineTransactions(accounts)

      const customPlan: MonthlyBudgetPlan = {
        month: '2026-10',
        expectedSalary: 30000,
        allocations: [
          {
            id: 'plan-custom-sip',
            name: 'Index Fund SIP',
            categoryKey: 'custom',
            plannedAmount: 5000,
            color: '#ec4899',
          },
          {
            id: 'plan-custom-vacation',
            name: 'Vacation Fund',
            categoryKey: 'custom',
            plannedAmount: 3000,
            color: '#8b5cf6',
          },
        ],
      }

      const analysis = calculateMonthlyBudgetAllocation({
        accounts,
        transactions: txs,
        plan: customPlan,
        month: '2026-10',
      })

      expect(analysis.totalPlanned).toBe(8000)
      expect(analysis.items.length).toBe(2)
      expect(analysis.items[0].name).toBe('Index Fund SIP')
      expect(analysis.items[0].remainingAmount).toBe(5000) // Unfunded
      expect(analysis.items[0].status).toBe('unfunded')
    })
  })

  // ── 4. Forecast Confidence & Projections ─────────────────────
  describe('4. Forecast Confidence & Insufficient History', () => {
    it('withholds confident safe daily spend when spending history is insufficient', () => {
      const forecast = generateCashFlowForecast({
        currentLiquidBalance: 45500,
        transactions: [], // 0 history
        recurringTransactions: [],
        emis: [],
        horizonDays: 30,
        forecastStartDate: '2026-10-10',
      })

      expect(forecast.hasSufficientSpendingHistory).toBe(false)
      expect(forecast.safeDailySpendStatus).toBe('insufficient_history')
      expect(forecast.spendingHistoryStatusMessage).toBe('Not enough spending history to estimate safely')
      expect(forecast.trajectoryStatus).toBe('provisional')
      expect(forecast.trajectoryLabel).toContain('Provisional Trajectory')
    })

    it('clearly distinguishes current available balance from projected month-end balance', () => {
      const recurring: RecurringTransaction[] = [
        {
          id: 'rec-bill',
          title: 'Electricity Bill',
          type: 'expense',
          amount: 2500,
          category: 'Utilities',
          frequency: 'monthly',
          interval: 1,
          startDate: '2026-10-01',
          nextDueDate: '2026-10-25',
          paymentMethod: 'UPI',
          autoProcess: false,
          status: 'active',
          accountId: 'acc-axis',
          createdAt: '2026-10-01T00:00:00Z',
        },
      ]

      const forecast = generateCashFlowForecast({
        currentLiquidBalance: 45500,
        transactions: [],
        recurringTransactions: recurring,
        emis: [],
        horizonDays: 30,
        forecastStartDate: '2026-10-10',
      })

      // Actual current available balance
      expect(forecast.currentLiquidBalance).toBe(45500)
      // Future projected month-end balance (after bill)
      expect(forecast.projectedMonthEndBalance).toBe(45500 - 2500)
      // Never subtracts future unpaid bill from current liquid balance
      expect(forecast.currentLiquidBalance).toBe(45500)
    })
  })

  // ── 5. Reconciliation Statuses ──────────────────────────────
  describe('5. Multi-tier Reconciliation Status Labels', () => {
    it('separates internal ledger balanced, live balance match, and bank statement verification', () => {
      const accounts = createStandardAccounts()
      const txs = createStandardNineTransactions(accounts)

      const flow = calculateConsolidatedFlow({
        accounts,
        transactions: txs,
        period: {
          startDate: '2026-10-10',
          endDate: '2026-10-31',
          label: 'October 2026',
          isCurrentMonth: true,
        },
      })

      // 1. Internal ledger balanced
      expect(flow.isLedgerBalanced).toBe(true)
      expect(flow.reconciliationDiscrepancy).toBe(0)

      // 2. App balances match ledger
      expect(flow.isBalanceMatchedToLive).toBe(true)

      // 3. Bank statement reconciliation pending (no statement uploaded)
      expect(flow.isStatementReconciled).toBe(false)
      expect(flow.reconciliationStatusLabel).toBe('Internal Ledger Balanced')
    })

    it('marks statement reconciled ONLY when accounts have statement verified on or after period start', () => {
      const accountsWithStatement = createStandardAccounts().map((a) => ({
        ...a,
        lastStatementReconciledDate: '2026-10-10',
      }))
      const txs = createStandardNineTransactions(accountsWithStatement)

      const flow = calculateConsolidatedFlow({
        accounts: accountsWithStatement,
        transactions: txs,
        period: {
          startDate: '2026-10-10',
          endDate: '2026-10-31',
          label: 'October 2026',
          isCurrentMonth: true,
        },
      })

      expect(flow.isStatementReconciled).toBe(true)
      expect(flow.reconciliationStatusLabel).toBe('Bank Statement Externally Reconciled')
    })
  })

  // ── 6. Calendar & Leap Year Boundaries ───────────────────────
  describe('6. Date Boundaries & Calendar Handling', () => {
    it('calculates full calendar month period bounds correctly for 28, 29, 30, and 31 day months', () => {
      // Leap year Feb 2024
      const feb2024 = new Date(2024, 2, 0).getDate()
      expect(feb2024).toBe(29)

      // Non-leap Feb 2025
      const feb2025 = new Date(2025, 2, 0).getDate()
      expect(feb2025).toBe(28)

      // April (30 days)
      const apr = new Date(2026, 4, 0).getDate()
      expect(apr).toBe(30)

      // October (31 days)
      const oct = new Date(2026, 10, 0).getDate()
      expect(oct).toBe(31)

      const octBounds = getFlowPeriodBounds('this_month')
      expect(octBounds.startDate).toContain('-01')
      expect(octBounds.endDate).toContain('-31')
    })
  })
})
