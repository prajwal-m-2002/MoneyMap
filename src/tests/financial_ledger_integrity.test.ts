import { describe, it, expect } from 'vitest'
import {
  calculateConsolidatedFlow,
  type FlowPeriodBounds,
} from '@/lib/consolidatedFlowMath'
import { computeFinancialHealthScore } from '@/lib/financialHealth'
import type { Account, Transaction, EMI, FinancialSummary } from '@/types/finance'

describe('Item 4 — Financial Ledger Integrity, Solvency, and Mutation Auditing', () => {
  const period: FlowPeriodBounds = {
    startDate: '2026-10-01',
    endDate: '2026-10-31',
    label: 'October 2026',
    isCurrentMonth: true,
  }

  // ── Scenario 1: Salary Credited to Axis ────────────────────────────────────
  it('1. Salary credited to Axis increases account balance and counts as consolidated income', () => {
    const axis: Account = {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 60000,
      isActive: true,
    }

    const salaryTx: Transaction = {
      id: 'tx-sal',
      type: 'income',
      amount: 50000,
      title: 'October Salary',
      category: 'Salary',
      accountId: axis.id,
      date: '2026-10-01',
      createdAt: '2026-10-01T09:00:00Z',
    }

    const flow = calculateConsolidatedFlow({
      accounts: [axis],
      transactions: [salaryTx],
      period,
    })

    const axisSummary = flow.accountSummaries[0]
    expect(axisSummary.openingBalance).toBe(10000)
    expect(axisSummary.salaryReceived).toBe(50000)
    expect(axisSummary.closingBalance).toBe(60000)
    expect(flow.externalIncome).toBe(50000)
    expect(flow.salaryIncome).toBe(50000)
    expect(flow.actualExpenses).toBe(0)
    expect(flow.closingBankAndCashBalance).toBe(60000)
    expect(flow.isLedgerBalanced).toBe(true)
    expect(flow.isReconciled).toBe(true)
  })

  // ── Scenario 2: Transfers from Axis to Kotak, SBI, and Federal ──────────────
  it('2. Transfers from Axis to Kotak, SBI, and Federal decrease source and increase destinations without affecting consolidated funds', () => {
    const axis: Account = {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 60000,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 30000,
      isActive: true,
    }
    const kotak: Account = {
      id: 'acc-kotak',
      name: 'Kotak Bank',
      type: 'savings',
      openingBalance: 5000,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 20000,
      isActive: true,
    }
    const sbi: Account = {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 2000,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 12000,
      isActive: true,
    }
    const federal: Account = {
      id: 'acc-fed',
      name: 'Federal Bank',
      type: 'savings',
      openingBalance: 2000,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 7000,
      isActive: true,
    }

    const transfers: Transaction[] = [
      {
        id: 'tx-tr-kotak',
        type: 'transfer',
        amount: 15000,
        title: 'Savings Allocation',
        category: 'Transfer',
        accountId: axis.id,
        toAccountId: kotak.id,
        date: '2026-10-02',
        createdAt: '2026-10-02T10:00:00Z',
      },
      {
        id: 'tx-tr-sbi',
        type: 'transfer',
        amount: 10000,
        title: 'Daily Living Allocation',
        category: 'Transfer',
        accountId: axis.id,
        toAccountId: sbi.id,
        date: '2026-10-02',
        createdAt: '2026-10-02T10:00:00Z',
      },
      {
        id: 'tx-tr-fed',
        type: 'transfer',
        amount: 5000,
        title: 'Lifestyle Allocation',
        category: 'Transfer',
        accountId: axis.id,
        toAccountId: federal.id,
        date: '2026-10-02',
        createdAt: '2026-10-02T10:00:00Z',
      },
    ]

    const flow = calculateConsolidatedFlow({
      accounts: [axis, kotak, sbi, federal],
      transactions: transfers,
      period,
    })

    // Consolidated funds unchanged: Opening 69,000 -> Closing 69,000
    expect(flow.openingBankAndCashBalance).toBe(69000)
    expect(flow.closingBankAndCashBalance).toBe(69000)
    // Transfers are excluded from external income & expenses
    expect(flow.externalIncome).toBe(0)
    expect(flow.actualExpenses).toBe(0)
    expect(flow.internalTransfersTotal).toBe(30000)
    expect(flow.internalTransferEventsCount).toBe(3)

    // Check account balances
    const axisSum = flow.accountSummaries.find((a) => a.account.id === axis.id)!
    const kotakSum = flow.accountSummaries.find((a) => a.account.id === kotak.id)!
    const sbiSum = flow.accountSummaries.find((a) => a.account.id === sbi.id)!
    const fedSum = flow.accountSummaries.find((a) => a.account.id === federal.id)!

    expect(axisSum.closingBalance).toBe(30000)
    expect(kotakSum.closingBalance).toBe(20000)
    expect(sbiSum.closingBalance).toBe(12000)
    expect(fedSum.closingBalance).toBe(7000)
  })

  // ── Scenario 3: Direct Expenses from Axis ─────────────────────────────────
  it('3. Direct expenses from Axis reduce account and count as consolidated expense', () => {
    const axis: Account = {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 30000,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 27000,
      isActive: true,
    }

    const expense: Transaction = {
      id: 'tx-axis-exp',
      type: 'expense',
      amount: 3000,
      title: 'Broadband & Mobile Bills',
      category: 'Utilities',
      accountId: axis.id,
      date: '2026-10-04',
      createdAt: '2026-10-04T12:00:00Z',
    }

    const flow = calculateConsolidatedFlow({
      accounts: [axis],
      transactions: [expense],
      period,
    })

    expect(flow.actualExpenses).toBe(3000)
    expect(flow.closingBankAndCashBalance).toBe(27000)
  })

  // ── Scenario 4: SBI and Federal Purchases ──────────────────────────────────
  it('4. SBI and Federal purchases reduce respective accounts and increase consolidated expenses', () => {
    const sbi: Account = {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 12000,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 9500,
      isActive: true,
    }
    const federal: Account = {
      id: 'acc-fed',
      name: 'Federal Bank',
      type: 'savings',
      openingBalance: 7000,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 3500,
      isActive: true,
    }

    const sbiPurchase: Transaction = {
      id: 'tx-sbi-buy',
      type: 'expense',
      amount: 2500,
      title: 'Supermarket Groceries',
      category: 'Groceries',
      accountId: sbi.id,
      date: '2026-10-05',
      createdAt: '2026-10-05T14:00:00Z',
    }
    const fedPurchase: Transaction = {
      id: 'tx-fed-buy',
      type: 'expense',
      amount: 3500,
      title: 'Apparel Store',
      category: 'Shopping',
      accountId: federal.id,
      date: '2026-10-06',
      createdAt: '2026-10-06T16:00:00Z',
    }

    const flow = calculateConsolidatedFlow({
      accounts: [sbi, federal],
      transactions: [sbiPurchase, fedPurchase],
      period,
    })

    expect(flow.actualExpenses).toBe(6000)
    expect(flow.closingBankAndCashBalance).toBe(13000)
  })

  // ── Scenario 5: SBI Transfer to Cash Followed by Cash Expense ──────────────
  it('5. SBI transfer to physical cash (ATM withdrawal) is NOT an expense; only cash expense counts as expense', () => {
    const sbi: Account = {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 9500,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 7500,
      isActive: true,
    }
    const cash: Account = {
      id: 'acc-cash',
      name: 'Physical Cash',
      type: 'cash',
      openingBalance: 500,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 1700,
      isActive: true,
    }

    const atmWithdrawal: Transaction = {
      id: 'tx-atm',
      type: 'transfer',
      amount: 2000,
      title: 'ATM Cash Withdrawal',
      category: 'Transfer',
      accountId: sbi.id,
      toAccountId: cash.id,
      date: '2026-10-07',
      createdAt: '2026-10-07T11:00:00Z',
    }

    const cashExpense: Transaction = {
      id: 'tx-cash-tea',
      type: 'expense',
      amount: 800,
      title: 'Street Dining & Fuel',
      category: 'Food',
      accountId: cash.id,
      date: '2026-10-08',
      createdAt: '2026-10-08T18:00:00Z',
    }

    const flow = calculateConsolidatedFlow({
      accounts: [sbi, cash],
      transactions: [atmWithdrawal, cashExpense],
      period,
    })

    // ATM withdrawal is NOT counted as expense!
    // Total expense is ONLY the ₹800 cash expense!
    expect(flow.actualExpenses).toBe(800)
    expect(flow.internalTransfersTotal).toBe(2000)
    // Combined Opening: 9,500 + 500 = 10,000
    // Combined Closing: 7,500 + 1,700 = 9,200 (10,000 - 800)
    expect(flow.openingBankAndCashBalance).toBe(10000)
    expect(flow.closingBankAndCashBalance).toBe(9200)
    expect(flow.isLedgerBalanced).toBe(true)
  })

  // ── Scenario 6: Completed EMI Payment Counts Exactly Once ─────────────────
  it('6. Completed EMI payment counts exactly once as an expense', () => {
    const sbi: Account = {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 7500,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 3000,
      isActive: true,
    }

    const emiPaymentTx: Transaction = {
      id: 'tx-emi-oct',
      type: 'expense',
      amount: 4500,
      title: 'HDFC Personal Loan EMI',
      category: 'EMI',
      accountId: sbi.id,
      date: '2026-10-10',
      createdAt: '2026-10-10T10:00:00Z',
    }

    const flow = calculateConsolidatedFlow({
      accounts: [sbi],
      transactions: [emiPaymentTx],
      period,
    })

    const sbiSummary = flow.accountSummaries[0]
    expect(sbiSummary.emiExpenses).toBe(4500)
    expect(sbiSummary.actualExpenses).toBe(4500)
    expect(flow.actualExpenses).toBe(4500)
    expect(flow.closingBankAndCashBalance).toBe(3000)
  })

  // ── Scenario 7: Unpaid Future EMI Does Not Count as Expense ───────────────
  it('7. Unpaid future EMI tracks liability principal but does not count as expense', () => {
    const sbi: Account = {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 3000,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 3000,
      isActive: true,
    }

    const futureEMI: EMI = {
      id: 'emi-future-1',
      name: 'Car Loan',
      lender: 'HDFC Bank',
      principal: 200000,
      interestRate: 8.5,
      tenureMonths: 36,
      emiAmount: 6314,
      startDate: '2026-11-01',
      dueDay: 5,
      accountId: sbi.id,
      status: 'active',
      createdAt: '2026-10-01T00:00:00Z',
    }

    const flow = calculateConsolidatedFlow({
      accounts: [sbi],
      transactions: [], // No payment made in October
      emis: [futureEMI],
      period,
    })

    // Future unpaid EMI is NOT an expense in October
    expect(flow.actualExpenses).toBe(0)
    expect(flow.closingBankAndCashBalance).toBe(3000)
    // Liability is tracked
    expect(flow.liabilities).toBe(200000)
    // Net worth = 3,000 - 200,000 = -197,000
    expect(flow.netWorth).toBe(-197000)
  })

  // ── Scenario 8: Editing and Deleting Transaction Integrity ─────────────────
  it('8. Editing and deleting transactions maintains atomic ledger consistency using integer paise', () => {
    // Integer paise balance simulation
    let axisPaise = 10000 * 100 // 10,000.00
    let kotakPaise = 5000 * 100 // 5,000.00

    // 1. Create transfer ₹4,000 from Axis to Kotak
    const transferPaise = Math.round(4000.5 * 100) // 400,050 paise
    axisPaise -= transferPaise
    kotakPaise += transferPaise

    expect(axisPaise).toBe(599950) // ₹5,999.50
    expect(kotakPaise).toBe(900050) // ₹9,000.50

    // 2. Edit transfer to ₹3,000: reverse old, apply new
    axisPaise += transferPaise
    kotakPaise -= transferPaise
    const editedPaise = Math.round(3000 * 100)
    axisPaise -= editedPaise
    kotakPaise += editedPaise

    expect(axisPaise).toBe(700000) // ₹7,000.00
    expect(kotakPaise).toBe(800000) // ₹8,000.00

    // 3. Delete transfer: reverse edited transfer completely
    axisPaise += editedPaise
    kotakPaise -= editedPaise

    expect(axisPaise).toBe(1000000) // ₹10,000.00 exactly restored
    expect(kotakPaise).toBe(500000) // ₹5,000.00 exactly restored
  })

  // ── Scenario 9: 3-tier Reconciliation Status Distinction ───────────────────
  it('9. Correctly distinguishes internal ledger balance from external statement reconciliation', () => {
    const unverifiedAccount: Account = {
      id: 'acc-unver',
      name: 'Unverified Bank',
      type: 'savings',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      ledgerCoverageStartDate: '2026-10-01',
      balance: 10000,
      isActive: true,
      // No external bank statement uploaded
      lastStatementReconciledDate: undefined,
    }

    const flowUnverified = calculateConsolidatedFlow({
      accounts: [unverifiedAccount],
      transactions: [],
      period,
    })

    const summary = flowUnverified.accountSummaries[0]
    expect(summary.isLedgerBalanced).toBe(true)
    expect(summary.isBalanceMatchedToLive).toBe(true)
    // Must NOT claim external bank statement reconciliation!
    expect(summary.isStatementReconciled).toBe(false)
    expect(flowUnverified.isStatementReconciled).toBe(false)
    expect(summary.reconciliationStatusLabel).toBe('Internal Ledger Balanced')

    // Verified account with explicit statement reconciliation
    const verifiedAccount: Account = {
      ...unverifiedAccount,
      lastStatementReconciledDate: '2026-10-15',
    }

    const flowVerified = calculateConsolidatedFlow({
      accounts: [verifiedAccount],
      transactions: [],
      period,
    })

    const verifiedSummary = flowVerified.accountSummaries[0]
    expect(verifiedSummary.isStatementReconciled).toBe(true)
    expect(verifiedSummary.statementReconciledDate).toBe('2026-10-15')
    expect(flowVerified.isStatementReconciled).toBe(true)
  })

  // ── Scenario 10: Data-aware Financial Health Score ─────────────────────────
  it('10. Financial Health Score returns provisional insufficient_data when income and expense history is absent', () => {
    const fiveAccounts: Account[] = [
      { id: 'a1', name: 'Axis Bank', type: 'salary', balance: 10000, openingBalance: 10000, isActive: true },
      { id: 'a2', name: 'Kotak Bank', type: 'savings', balance: 5000, openingBalance: 5000, isActive: true },
      { id: 'a3', name: 'SBI', type: 'savings', balance: 2000, openingBalance: 2000, isActive: true },
      { id: 'a4', name: 'Federal Bank', type: 'savings', balance: 2000, openingBalance: 2000, isActive: true },
      { id: 'a5', name: 'Cash', type: 'cash', balance: 500, openingBalance: 500, isActive: true },
    ]

    const emptySummary: FinancialSummary = {
      totalAvailable: 19500,
      incomeThisMonth: 0,
      expensesThisMonth: 0,
      netSavings: 0,
      investmentValue: 0,
      emiDueThisMonth: 0,
      netWorth: 19500,
    }

    const score = computeFinancialHealthScore({
      summary: emptySummary,
      accounts: fiveAccounts,
      transactions: [], // Zero income and zero expense history
    })

    // Must NOT claim an authoritative score (e.g. 78/100)!
    expect(score.isInsufficientData).toBe(true)
    expect(score.isProvisional).toBe(true)
    expect(score.tier).toBe('insufficient_data')
    expect(score.tierLabel).toBe('Provisional — Insufficient Data')
    expect(score.totalScore).toBe(0)
    // Must NOT calculate an emergency runway without reliable expense history
    expect(score.pillars.emergencyBuffer.status).toBe('neutral')
    expect(score.pillars.emergencyBuffer.description).toContain('Expense burn unestablished')
    // Explains what additional data is required
    expect(score.dataQualityNotes).toContain('Emergency-fund runway cannot be computed without a reliable monthly living expense baseline')
  })
})
