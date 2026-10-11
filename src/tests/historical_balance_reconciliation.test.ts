import { describe, it, expect } from 'vitest'
import {
  calculateConsolidatedFlow,
  getAccountBalanceAtPeriodStart,
  type FlowPeriodBounds,
} from '@/lib/consolidatedFlowMath'
import type { Account, Transaction } from '@/types/finance'

describe('Historical Balance Calculations and Reconciliation Audit (10 Required Cases)', () => {
  // ── Case 1: Account with an opening balance and no transactions ────────────────
  it('Case 1: correctly calculates an account with an opening balance and no transactions', () => {
    const account: Account = {
      id: 'acc-1',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      balance: 10000,
      isActive: true,
    }

    const period: FlowPeriodBounds = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
      isCurrentMonth: true,
    }

    const flow = calculateConsolidatedFlow({
      accounts: [account],
      transactions: [],
      period,
    })

    const periodStartBal = getAccountBalanceAtPeriodStart(account, [], period.startDate)
    expect(periodStartBal).toBe(10000)

    const summary = flow.accountSummaries[0]
    expect(summary.openingBalance).toBe(10000)
    expect(summary.totalMoneyReceived).toBe(0)
    expect(summary.totalOutflows).toBe(0)
    expect(summary.closingBalance).toBe(10000)
    expect(summary.liveBalance).toBe(10000)
    expect(summary.isReconciled).toBe(true)
    expect(summary.reconciliationDiscrepancy).toBe(0)
  })

  // ── Case 2: Account with income and expenses during reporting period ───────────
  it('Case 2: correctly calculates an account with external income and expenses during the reporting period', () => {
    const account: Account = {
      id: 'acc-2',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      balance: 29000,
      isActive: true,
    }

    const period: FlowPeriodBounds = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
      isCurrentMonth: true,
    }

    const transactions: Transaction[] = [
      {
        id: 'tx-inc-1',
        type: 'income',
        amount: 25000,
        title: 'Monthly Salary',
        category: 'Salary',
        accountId: account.id,
        date: '2026-10-05',
        createdAt: '2026-10-05T09:00:00Z',
      },
      {
        id: 'tx-exp-1',
        type: 'expense',
        amount: 3500,
        title: 'Grocery Supermarket',
        category: 'Groceries',
        accountId: account.id,
        date: '2026-10-12',
        createdAt: '2026-10-12T14:00:00Z',
      },
      {
        id: 'tx-exp-2',
        type: 'expense',
        amount: 2500,
        title: 'Personal Loan EMI',
        category: 'EMI',
        accountId: account.id,
        date: '2026-10-15',
        createdAt: '2026-10-15T10:00:00Z',
      },
    ]

    const flow = calculateConsolidatedFlow({
      accounts: [account],
      transactions,
      period,
    })

    const summary = flow.accountSummaries[0]
    expect(summary.openingBalance).toBe(10000)
    expect(summary.externalMoneyReceived).toBe(25000)
    expect(summary.salaryReceived).toBe(25000)
    expect(summary.directExpenses).toBe(3500)
    expect(summary.emiExpenses).toBe(2500)
    expect(summary.actualExpenses).toBe(6000)
    // Closing = 10,000 + 25,000 - 6,000 = 29,000
    expect(summary.closingBalance).toBe(29000)
    expect(summary.isReconciled).toBe(true)
    expect(summary.reconciliationDiscrepancy).toBe(0)
  })

  // ── Case 3: Transfers between two owned accounts ──────────────────────────────
  it('Case 3: verifies that transfers between two owned accounts decrease source and increase dest by exact amount without changing consolidated totals', () => {
    const axis: Account = {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      balance: 6000,
      isActive: true,
    }

    const kotak: Account = {
      id: 'acc-kotak',
      name: 'Kotak Bank',
      type: 'savings',
      openingBalance: 5000,
      openingBalanceDate: '2026-10-01',
      balance: 9000,
      isActive: true,
    }

    const period: FlowPeriodBounds = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
      isCurrentMonth: true,
    }

    const transferTx: Transaction = {
      id: 'tx-tr-1',
      type: 'transfer',
      amount: 4000,
      title: 'Savings Transfer',
      category: 'Transfer',
      accountId: axis.id,
      toAccountId: kotak.id,
      date: '2026-10-05',
      createdAt: '2026-10-05T10:00:00Z',
    }

    const flow = calculateConsolidatedFlow({
      accounts: [axis, kotak],
      transactions: [transferTx],
      period,
    })

    const axisSummary = flow.accountSummaries.find((a) => a.account.id === axis.id)!
    const kotakSummary = flow.accountSummaries.find((a) => a.account.id === kotak.id)!

    // Source account decreases by ₹4,000
    expect(axisSummary.transfersOut).toBe(4000)
    expect(axisSummary.transfersToKotak).toBe(4000)
    expect(axisSummary.closingBalance).toBe(6000)
    expect(axisSummary.isReconciled).toBe(true)

    // Destination account increases by ₹4,000
    expect(kotakSummary.transfersIn).toBe(4000)
    expect(kotakSummary.transfersFromAxis).toBe(4000)
    expect(kotakSummary.closingBalance).toBe(9000)
    expect(kotakSummary.isReconciled).toBe(true)

    // Consolidated metrics: internal transfer has net ₹0 impact
    expect(flow.externalIncome).toBe(0)
    expect(flow.actualExpenses).toBe(0)
    expect(flow.internalTransfersTotal).toBe(4000)
    expect(flow.internalTransferEventsCount).toBe(1)
    expect(flow.openingBankAndCashBalance).toBe(15000)
    expect(flow.closingBankAndCashBalance).toBe(15000)
    expect(flow.isReconciled).toBe(true)
    expect(flow.reconciliationDiscrepancy).toBe(0)
  })

  // ── Case 4: Transfer from bank account to physical cash ───────────────────────
  it('Case 4: verifies transfer from bank account to physical cash preserves consolidated cash & bank total', () => {
    const sbi: Account = {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 5000,
      openingBalanceDate: '2026-10-01',
      balance: 3500,
      isActive: true,
    }

    const cash: Account = {
      id: 'acc-cash',
      name: 'Physical Cash',
      type: 'cash',
      openingBalance: 500,
      openingBalanceDate: '2026-10-01',
      balance: 2000,
      isActive: true,
    }

    const period: FlowPeriodBounds = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
      isCurrentMonth: true,
    }

    const atmWithdrawal: Transaction = {
      id: 'tx-atm-1',
      type: 'transfer',
      amount: 1500,
      title: 'ATM Cash Withdrawal',
      category: 'Transfer',
      accountId: sbi.id,
      toAccountId: cash.id,
      date: '2026-10-08',
      createdAt: '2026-10-08T11:00:00Z',
    }

    const flow = calculateConsolidatedFlow({
      accounts: [sbi, cash],
      transactions: [atmWithdrawal],
      period,
    })

    const sbiSummary = flow.accountSummaries.find((a) => a.account.id === sbi.id)!
    const cashSummary = flow.accountSummaries.find((a) => a.account.id === cash.id)!

    expect(sbiSummary.transfersOut).toBe(1500)
    expect(sbiSummary.transfersToCash).toBe(1500)
    expect(sbiSummary.closingBalance).toBe(3500)

    expect(cashSummary.transfersIn).toBe(1500)
    expect(cashSummary.closingBalance).toBe(2000)

    // Combined opening and closing are both exactly ₹5,500
    expect(flow.openingBankAndCashBalance).toBe(5500)
    expect(flow.closingBankAndCashBalance).toBe(5500)
    expect(flow.isReconciled).toBe(true)
  })

  // ── Case 5: Period before the account's opening-balance date ───────────────────
  it('Case 5: displays actionable warning and prevents false reconciled status when period is before opening-balance date', () => {
    const account: Account = {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-10', // Opened Oct 10
      balance: 10000,
      isActive: true,
    }

    // Historical reporting period is September 2026 (before account opening date)
    const period: FlowPeriodBounds = {
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      label: 'September 2026',
      isCurrentMonth: false,
    }

    const flow = calculateConsolidatedFlow({
      accounts: [account],
      transactions: [],
      period,
    })

    const summary = flow.accountSummaries[0]
    expect(summary.openingBalance).toBe(0)
    expect(summary.closingBalance).toBe(0)
    expect(summary.isOpeningDateAfterPeriod).toBe(true)
    expect(summary.hasHistoricalDataWarning).toBe(true)
    expect(summary.historicalWarningMessage).toContain('initialized on 2026-10-10 (after this reporting period)')
    // Must NOT claim reconciled/verified
    expect(summary.isReconciled).toBe(false)
    expect(flow.hasHistoricalDataWarning).toBe(true)
    expect(flow.isReconciled).toBe(false)
  })

  // ── Case 6: Period after the account's opening-balance date ────────────────────
  it('Case 6: correctly carries forward opening balance and prior activity for a period after the opening-balance date', () => {
    const account: Account = {
      id: 'acc-kotak',
      name: 'Kotak Bank',
      type: 'savings',
      openingBalance: 5000,
      openingBalanceDate: '2026-09-15', // Opened in September
      balance: 9000,
      isActive: true,
    }

    const septemberExpense: Transaction = {
      id: 'tx-sep-1',
      type: 'expense',
      amount: 1000,
      title: 'September Purchase',
      category: 'Shopping',
      accountId: account.id,
      date: '2026-09-20',
      createdAt: '2026-09-20T10:00:00Z',
    }

    const octoberIncome: Transaction = {
      id: 'tx-oct-1',
      type: 'income',
      amount: 5000,
      title: 'October Dividend',
      category: 'Dividends',
      accountId: account.id,
      date: '2026-10-05',
      createdAt: '2026-10-05T10:00:00Z',
    }

    // Reporting period is October 2026
    const period: FlowPeriodBounds = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
      isCurrentMonth: true,
    }

    const flow = calculateConsolidatedFlow({
      accounts: [account],
      transactions: [septemberExpense, octoberIncome],
      period,
    })

    const summary = flow.accountSummaries[0]
    // Opening balance at start of October: 5,000 (opening) - 1,000 (September expense) = 4,000
    expect(summary.openingBalance).toBe(4000)
    expect(summary.externalMoneyReceived).toBe(5000)
    // Closing balance at end of October: 4,000 + 5,000 = 9,000
    expect(summary.closingBalance).toBe(9000)
    expect(summary.isReconciled).toBe(true)
    expect(summary.hasHistoricalDataWarning).toBe(false)
  })

  // ── Case 7: Historical period whose closing balance differs from live balance ─
  it('Case 7: verifies historical period closing balance is computed independently from today live balance', () => {
    const account: Account = {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 10000,
      openingBalanceDate: '2026-07-01',
      // Live balance after all transactions up to today is ₹4,000
      balance: 4000,
      isActive: true,
    }

    // Historical period: August 2026
    const period: FlowPeriodBounds = {
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      label: 'August 2026',
      isCurrentMonth: false,
    }

    const augustExpense: Transaction = {
      id: 'tx-aug-1',
      type: 'expense',
      amount: 2000,
      title: 'August Rent',
      category: 'Rent',
      accountId: account.id,
      date: '2026-08-10',
      createdAt: '2026-08-10T10:00:00Z',
    }

    const septemberExpense: Transaction = {
      id: 'tx-sep-1',
      type: 'expense',
      amount: 3000,
      title: 'September Insurance',
      category: 'Insurance',
      accountId: account.id,
      date: '2026-09-15',
      createdAt: '2026-09-15T10:00:00Z',
    }

    const octoberExpense: Transaction = {
      id: 'tx-oct-1',
      type: 'expense',
      amount: 1000,
      title: 'October Utilities',
      category: 'Utilities',
      accountId: account.id,
      date: '2026-10-02',
      createdAt: '2026-10-02T10:00:00Z',
    }

    const flow = calculateConsolidatedFlow({
      accounts: [account],
      transactions: [augustExpense, septemberExpense, octoberExpense],
      period,
    })

    const summary = flow.accountSummaries[0]
    // August Opening: 10,000. August Expense: 2,000. August Closing: 8,000.
    expect(summary.openingBalance).toBe(10000)
    expect(summary.actualExpenses).toBe(2000)
    expect(summary.closingBalance).toBe(8000)
    // Live balance is 4,000 (10,000 - 2,000 - 3,000 - 1,000)
    expect(summary.liveBalance).toBe(4000)
    // They differ and are calculated independently
    expect(summary.closingBalance).not.toBe(summary.liveBalance)
    expect(summary.isReconciled).toBe(true)
  })

  // ── Case 8: Custom date range and month-end boundary ───────────────────────────
  it('Case 8: correctly includes transactions on boundary dates in a custom date range', () => {
    const account: Account = {
      id: 'acc-fed',
      name: 'Federal Bank',
      type: 'savings',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      balance: 10500,
      isActive: true,
    }

    // Custom date range: Oct 5 to Oct 25
    const period: FlowPeriodBounds = {
      startDate: '2026-10-05',
      endDate: '2026-10-25',
      label: '2026-10-05 to 2026-10-25',
      isCurrentMonth: false,
    }

    const transactions: Transaction[] = [
      // 1. Before period (Oct 4) -> affects opening balance
      {
        id: 'tx-b-1',
        type: 'expense',
        amount: 1000,
        title: 'Pre-period Coffee',
        category: 'Food',
        accountId: account.id,
        date: '2026-10-04',
        createdAt: '2026-10-04T10:00:00Z',
      },
      // 2. Exact start boundary (Oct 5) -> included in period inflows
      {
        id: 'tx-b-2',
        type: 'income',
        amount: 2000,
        title: 'Freelance Bonus',
        category: 'Freelance',
        accountId: account.id,
        date: '2026-10-05',
        createdAt: '2026-10-05T09:00:00Z',
      },
      // 3. Exact end boundary (Oct 25) -> included in period outflows
      {
        id: 'tx-b-3',
        type: 'expense',
        amount: 500,
        title: 'End-date Books',
        category: 'Books',
        accountId: account.id,
        date: '2026-10-25',
        createdAt: '2026-10-25T18:00:00Z',
      },
      // 4. After period (Oct 26) -> strictly excluded from period
      {
        id: 'tx-b-4',
        type: 'expense',
        amount: 2000,
        title: 'Post-period Electronics',
        category: 'Electronics',
        accountId: account.id,
        date: '2026-10-26',
        createdAt: '2026-10-26T12:00:00Z',
      },
    ]

    const flow = calculateConsolidatedFlow({
      accounts: [account],
      transactions,
      period,
    })

    const summary = flow.accountSummaries[0]
    // Opening balance as of Oct 5: 10,000 - 1,000 = 9,000
    expect(summary.openingBalance).toBe(9000)
    // External income on Oct 5 is included
    expect(summary.externalMoneyReceived).toBe(2000)
    // Expense on Oct 25 is included; expense on Oct 26 is excluded
    expect(summary.actualExpenses).toBe(500)
    // Closing balance as of Oct 25: 9,000 + 2,000 - 500 = 10,500
    expect(summary.closingBalance).toBe(10500)
    expect(summary.isReconciled).toBe(true)
  })

  // ── Case 9: Missing or incomplete historical ledger data ──────────────────────
  it('Case 9: correctly detects accounts opened after reporting period and displays consolidated warning', () => {
    const existingAccount: Account = {
      id: 'acc-exist',
      name: 'Existing Bank',
      type: 'savings',
      openingBalance: 5000,
      openingBalanceDate: '2026-01-01',
      balance: 5000,
      isActive: true,
    }

    const lateAccount: Account = {
      id: 'acc-late',
      name: 'Late Bank',
      type: 'savings',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-10', // Opened Oct 10
      balance: 10000,
      isActive: true,
    }

    // Historical report for August 2026
    const period: FlowPeriodBounds = {
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      label: 'August 2026',
      isCurrentMonth: false,
    }

    const flow = calculateConsolidatedFlow({
      accounts: [existingAccount, lateAccount],
      transactions: [],
      period,
    })

    expect(flow.hasHistoricalDataWarning).toBe(true)
    expect(flow.historicalWarningMessage).toContain('Late Bank')
    expect(flow.isReconciled).toBe(false)
  })

  // ── Case 10: Combined reconciliation across all five existing accounts ─────────
  it('Case 10: reconciles all five existing accounts (Axis, Kotak, SBI, Federal, Cash) in October 2026', () => {
    // Exact accounts from the user's dashboard with openingBalanceDate set to October 10
    const axis: Account = {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-10',
      balance: 10000,
      isActive: true,
    }

    const kotak: Account = {
      id: 'acc-kotak',
      name: 'Kotak Bank',
      type: 'savings',
      openingBalance: 5000,
      openingBalanceDate: '2026-10-10',
      balance: 5000,
      isActive: true,
    }

    const sbi: Account = {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 2000,
      openingBalanceDate: '2026-10-10',
      balance: 2000,
      isActive: true,
    }

    const federal: Account = {
      id: 'acc-federal',
      name: 'Federal Bank',
      type: 'savings',
      openingBalance: 2000,
      openingBalanceDate: '2026-10-10',
      balance: 2000,
      isActive: true,
    }

    const cash: Account = {
      id: 'acc-cash',
      name: 'Physical Cash',
      type: 'cash',
      openingBalance: 500,
      openingBalanceDate: '2026-10-10',
      balance: 500,
      isActive: true,
    }

    const period: FlowPeriodBounds = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
      isCurrentMonth: true,
    }

    const flow = calculateConsolidatedFlow({
      accounts: [axis, kotak, sbi, federal, cash],
      transactions: [],
      period,
    })

    // 1. Combined Opening Bank & Cash Balance is ₹19,500 (pre-existing opening balances)
    expect(flow.openingBankAndCashBalance).toBe(19500)

    // 2. No synthetic capital introduced or income invented
    expect(flow.externalIncome).toBe(0)
    expect(flow.actualExpenses).toBe(0)

    // 3. Combined Closing Bank and Cash Balance is ₹19,500
    expect(flow.closingBankAndCashBalance).toBe(19500)

    // 4. Each account closing balance matches its live balance exactly
    const [axisSummary, kotakSummary, sbiSummary, federalSummary, cashSummary] = flow.accountSummaries
    expect(axisSummary.openingBalance).toBe(10000)
    expect(axisSummary.closingBalance).toBe(10000)
    expect(axisSummary.liveBalance).toBe(10000)
    expect(axisSummary.isPeriodPartiallyCovered).toBe(true)

    expect(kotakSummary.openingBalance).toBe(5000)
    expect(kotakSummary.closingBalance).toBe(5000)
    expect(kotakSummary.liveBalance).toBe(5000)
    expect(kotakSummary.isPeriodPartiallyCovered).toBe(true)

    expect(sbiSummary.openingBalance).toBe(2000)
    expect(sbiSummary.closingBalance).toBe(2000)
    expect(sbiSummary.liveBalance).toBe(2000)
    expect(sbiSummary.isPeriodPartiallyCovered).toBe(true)

    expect(federalSummary.openingBalance).toBe(2000)
    expect(federalSummary.closingBalance).toBe(2000)
    expect(federalSummary.liveBalance).toBe(2000)
    expect(federalSummary.isPeriodPartiallyCovered).toBe(true)

    expect(cashSummary.openingBalance).toBe(500)
    expect(cashSummary.closingBalance).toBe(500)
    expect(cashSummary.liveBalance).toBe(500)
    expect(cashSummary.isPeriodPartiallyCovered).toBe(true)

    // 5. Consolidated Solvency:
    // Closing (19,500) = Opening (19,500) + Income (0) - Expenses (0)
    expect(flow.isReconciled).toBe(true)
    expect(flow.reconciliationDiscrepancy).toBe(0)
    expect(flow.isPeriodPartiallyCovered).toBe(true)
    expect(flow.partialCoverageNotice).toContain('2026-10-10')
    expect(flow.hasHistoricalDataWarning).toBe(false)
  })
})

describe('Requirement D — Opening Balance Classification & Historical Ledger Validation', () => {
  // ── D.1: Existing account balance entered into MoneyMap ───────────────────────
  it('D.1: existing account balance entered into MoneyMap is classified as opening balance, not income or capital inflow', () => {
    const existingAccount: Account = {
      id: 'acc-pre-existing',
      name: 'Existing Salary Account',
      type: 'salary',
      openingBalance: 35000,
      openingBalanceDate: '2026-10-01',
      createdAt: '2026-10-10T12:00:00Z', // Created in MoneyMap on Oct 10
      ledgerCoverageStartDate: '2026-10-10', // History complete only from Oct 10
      balance: 35000,
      isActive: true,
    }

    const period: FlowPeriodBounds = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
      isCurrentMonth: true,
    }

    const flow = calculateConsolidatedFlow({
      accounts: [existingAccount],
      transactions: [],
      period,
    })

    const summary = flow.accountSummaries[0]
    expect(summary.openingBalance).toBe(35000)
    expect(summary.externalMoneyReceived).toBe(0)
    expect(summary.totalMoneyReceived).toBe(0)
    expect(summary.actualExpenses).toBe(0)
    expect(summary.closingBalance).toBe(35000)

    // Not counted as external income or new capital injection
    expect(flow.openingBankAndCashBalance).toBe(35000)
    expect(flow.externalIncome).toBe(0)
    expect(flow.actualExpenses).toBe(0)
    expect(flow.closingBankAndCashBalance).toBe(35000)

    // Period is partially covered because ledger tracking started on Oct 10
    expect(summary.isPeriodPartiallyCovered).toBe(true)
    expect(summary.ledgerCoverageStartDate).toBe('2026-10-10')
    expect(flow.isPeriodPartiallyCovered).toBe(true)
    expect(flow.partialCoverageNotice).toContain('2026-10-10')
    expect(flow.isReconciled).toBe(true)
    expect(flow.reconciliationDiscrepancy).toBe(0)
  })

  // ── D.2: Account genuinely opened during the selected month ───────────────────
  it('D.2: account genuinely opened during selected month distinguishes opening balance from actual inflows and outflows', () => {
    const newAccount: Account = {
      id: 'acc-new-oct',
      name: 'New Savings Account',
      type: 'savings',
      openingBalance: 0,
      openingBalanceDate: '2026-10-15',
      createdAt: '2026-10-15T10:00:00Z',
      ledgerCoverageStartDate: '2026-10-15',
      balance: 13000,
      isActive: true,
    }

    const fundingAccount: Account = {
      id: 'acc-existing-hub',
      name: 'Existing Hub',
      type: 'salary',
      openingBalance: 50000,
      openingBalanceDate: '2026-10-01',
      createdAt: '2026-10-01T00:00:00Z',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 35000,
      isActive: true,
    }

    const period: FlowPeriodBounds = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
      isCurrentMonth: true,
    }

    const initialTransfer: Transaction = {
      id: 'tx-fund-new',
      type: 'transfer',
      amount: 15000,
      title: 'Initial Account Deposit',
      category: 'Transfer',
      accountId: fundingAccount.id,
      toAccountId: newAccount.id,
      date: '2026-10-15',
      createdAt: '2026-10-15T11:00:00Z',
    }

    const accountPurchase: Transaction = {
      id: 'tx-new-exp',
      type: 'expense',
      amount: 2000,
      title: 'Debit Card Kit Purchase',
      category: 'Bank Charges',
      accountId: newAccount.id,
      date: '2026-10-18',
      createdAt: '2026-10-18T15:00:00Z',
    }

    const flow = calculateConsolidatedFlow({
      accounts: [fundingAccount, newAccount],
      transactions: [initialTransfer, accountPurchase],
      period,
    })

    const newAccSummary = flow.accountSummaries.find((s) => s.account.id === newAccount.id)!
    const hubSummary = flow.accountSummaries.find((s) => s.account.id === fundingAccount.id)!

    // Hub account transferred ₹15,000 out
    expect(hubSummary.transfersOut).toBe(15000)
    expect(hubSummary.closingBalance).toBe(35000)

    // New account started with ₹0 opening balance
    expect(newAccSummary.openingBalance).toBe(0)
    // Transfer from owned account is internal, NOT external income
    expect(newAccSummary.transfersIn).toBe(15000)
    expect(newAccSummary.externalMoneyReceived).toBe(0)
    expect(newAccSummary.actualExpenses).toBe(2000)
    expect(newAccSummary.closingBalance).toBe(13000)

    // Consolidated funds: Opening = 50,000 + 0 = 50,000
    expect(flow.openingBankAndCashBalance).toBe(50000)
    // External income = 0
    expect(flow.externalIncome).toBe(0)
    // Actual expenses = 2,000
    expect(flow.actualExpenses).toBe(2000)
    // Internal transfer total = 15,000
    expect(flow.internalTransfersTotal).toBe(15000)
    // Closing = 50,000 - 2,000 = 48,000 (Hub: 35,000 + New: 13,000)
    expect(flow.closingBankAndCashBalance).toBe(48000)
    expect(flow.isReconciled).toBe(true)
    expect(flow.reconciliationDiscrepancy).toBe(0)
  })

  // ── D.3: Account with complete historical transactions ────────────────────────
  it('D.3: account with complete historical transactions computes opening and closing balances with full coverage and no warnings', () => {
    const completeAccount: Account = {
      id: 'acc-full-history',
      name: 'Audited Main Account',
      type: 'salary',
      openingBalance: 10000,
      openingBalanceDate: '2026-06-01',
      createdAt: '2026-06-01T00:00:00Z',
      ledgerCoverageStartDate: '2026-06-01',
      balance: 45000,
      isActive: true,
    }

    // Historical transactions prior to October
    const priorTransactions: Transaction[] = [
      {
        id: 'tx-june-inc',
        type: 'income',
        amount: 30000,
        title: 'June Salary',
        category: 'Salary',
        accountId: completeAccount.id,
        date: '2026-06-30',
        createdAt: '2026-06-30T10:00:00Z',
      },
      {
        id: 'tx-july-exp',
        type: 'expense',
        amount: 15000,
        title: 'July Rent',
        category: 'Rent',
        accountId: completeAccount.id,
        date: '2026-07-05',
        createdAt: '2026-07-05T10:00:00Z',
      },
    ]

    // October transactions
    const octoberTransactions: Transaction[] = [
      {
        id: 'tx-oct-salary',
        type: 'income',
        amount: 35000,
        title: 'October Salary',
        category: 'Salary',
        accountId: completeAccount.id,
        date: '2026-10-05',
        createdAt: '2026-10-05T09:00:00Z',
      },
      {
        id: 'tx-oct-exp',
        type: 'expense',
        amount: 15000,
        title: 'October Living Expenses',
        category: 'Living',
        accountId: completeAccount.id,
        date: '2026-10-15',
        createdAt: '2026-10-15T12:00:00Z',
      },
    ]

    const period: FlowPeriodBounds = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
      isCurrentMonth: true,
    }

    const flow = calculateConsolidatedFlow({
      accounts: [completeAccount],
      transactions: [...priorTransactions, ...octoberTransactions],
      period,
    })

    const summary = flow.accountSummaries[0]
    // Opening balance at 2026-10-01: 10,000 (initial) + 30,000 (June) - 15,000 (July) = 25,000
    expect(summary.openingBalance).toBe(25000)
    expect(summary.externalMoneyReceived).toBe(35000)
    expect(summary.actualExpenses).toBe(15000)
    // Closing = 25,000 + 35,000 - 15,000 = 45,000
    expect(summary.closingBalance).toBe(45000)
    expect(summary.isReconciled).toBe(true)
    expect(summary.isPeriodPartiallyCovered).toBe(false)
    expect(summary.hasHistoricalDataWarning).toBe(false)

    expect(flow.openingBankAndCashBalance).toBe(25000)
    expect(flow.externalIncome).toBe(35000)
    expect(flow.actualExpenses).toBe(15000)
    expect(flow.closingBankAndCashBalance).toBe(45000)
    expect(flow.isPeriodPartiallyCovered).toBe(false)
    expect(flow.hasHistoricalDataWarning).toBe(false)
    expect(flow.isReconciled).toBe(true)
  })

  // ── D.4: Account with incomplete historical data ──────────────────────────────
  it('D.4: account requested for period before coverage shows historical-data warning and does not report verified zero balances', () => {
    const account: Account = {
      id: 'acc-incomplete',
      name: 'Recent Account',
      type: 'savings',
      openingBalance: 12000,
      openingBalanceDate: '2026-10-10',
      createdAt: '2026-10-10T15:00:00Z',
      ledgerCoverageStartDate: '2026-10-10',
      balance: 12000,
      isActive: true,
    }

    // Reporting period is August 2026 (before coverage began)
    const period: FlowPeriodBounds = {
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      label: 'August 2026',
      isCurrentMonth: false,
    }

    const flow = calculateConsolidatedFlow({
      accounts: [account],
      transactions: [],
      period,
    })

    const summary = flow.accountSummaries[0]
    expect(summary.isPeriodBeforeCoverage).toBe(true)
    expect(summary.hasHistoricalDataWarning).toBe(true)
    expect(summary.historicalWarningMessage).toContain('initialized on 2026-10-10 (after this reporting period)')
    // Crucial requirement: Must NOT silently report verified zero balances
    expect(summary.isReconciled).toBe(false)
    expect(flow.hasHistoricalDataWarning).toBe(true)
    expect(flow.isReconciled).toBe(false)
  })
})

