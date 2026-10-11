import { describe, it, expect } from 'vitest'
import {
  calculateConsolidatedFlow,
  sortAccountsByRequiredOrder,
} from '@/lib/consolidatedFlowMath'
import type { Account, Transaction } from '@/types/finance'

describe('Section 13 Manual Acceptance Tests: Consolidated & Individual Account Flow', () => {
  it('correctly calculates the full financial allocation model matching Section 13 specifications', () => {
    // 1. Isolated Test Dataset
    const axis: Account = {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      balance: 10000,
      isActive: true,
      color: 'emerald',
      createdAt: '2026-10-01T00:00:00Z',
    }

    const kotak: Account = {
      id: 'acc-kotak',
      name: 'Kotak Bank',
      type: 'savings',
      openingBalance: 5000,
      openingBalanceDate: '2026-10-01',
      balance: 5000,
      isActive: true,
      color: 'red',
      createdAt: '2026-10-01T00:00:00Z',
    }

    const sbi: Account = {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 2000,
      openingBalanceDate: '2026-10-01',
      balance: 2000,
      isActive: true,
      color: 'blue',
      createdAt: '2026-10-01T00:00:00Z',
    }

    const federal: Account = {
      id: 'acc-federal',
      name: 'Federal Bank',
      type: 'savings',
      openingBalance: 2000,
      openingBalanceDate: '2026-10-01',
      balance: 2000,
      isActive: true,
      color: 'purple',
      createdAt: '2026-10-01T00:00:00Z',
    }

    const cash: Account = {
      id: 'acc-cash',
      name: 'Physical Cash',
      type: 'cash',
      openingBalance: 500,
      openingBalanceDate: '2026-10-01',
      balance: 500,
      isActive: true,
      color: 'amber',
      createdAt: '2026-10-01T00:00:00Z',
    }

    const accounts = [axis, kotak, sbi, federal, cash]

    // 2. Transactions
    const transactions: Transaction[] = [
      // 1. Salary of ₹27,000 credited to Axis
      {
        id: 'tx-1',
        type: 'income',
        amount: 27000,
        title: 'Monthly Salary',
        category: 'Salary',
        accountId: axis.id,
        date: '2026-10-01',
        time: '09:00',
        paymentMethod: 'Net Banking',
        createdAt: '2026-10-01T09:00:00Z',
      },
      // 2. ₹8,000 transferred from Axis to Kotak
      {
        id: 'tx-2',
        type: 'transfer',
        amount: 8000,
        title: 'Transfer to Kotak',
        category: 'Transfer',
        accountId: axis.id,
        toAccountId: kotak.id,
        date: '2026-10-02',
        time: '10:00',
        paymentMethod: 'Net Banking',
        createdAt: '2026-10-02T10:00:00Z',
      },
      // 3. ₹5,000 transferred from Axis to SBI
      {
        id: 'tx-3',
        type: 'transfer',
        amount: 5000,
        title: 'Transfer to SBI',
        category: 'Transfer',
        accountId: axis.id,
        toAccountId: sbi.id,
        date: '2026-10-02',
        time: '11:00',
        paymentMethod: 'Net Banking',
        createdAt: '2026-10-02T11:00:00Z',
      },
      // 4. ₹4,000 transferred from Axis to Federal Bank
      {
        id: 'tx-4',
        type: 'transfer',
        amount: 4000,
        title: 'Transfer to Federal',
        category: 'Transfer',
        accountId: axis.id,
        toAccountId: federal.id,
        date: '2026-10-02',
        time: '12:00',
        paymentMethod: 'Net Banking',
        createdAt: '2026-10-02T12:00:00Z',
      },
      // 5. Direct Axis expense: ₹300
      {
        id: 'tx-5',
        type: 'expense',
        amount: 300,
        title: 'Axis Utility Bill',
        category: 'Bills & Utilities',
        accountId: axis.id,
        date: '2026-10-03',
        time: '14:00',
        paymentMethod: 'UPI',
        createdAt: '2026-10-03T14:00:00Z',
      },
      // 6. SBI expense: ₹200
      {
        id: 'tx-6',
        type: 'expense',
        amount: 200,
        title: 'SBI Small Purchase',
        category: 'Food & Dining',
        accountId: sbi.id,
        date: '2026-10-04',
        time: '15:00',
        paymentMethod: 'UPI',
        createdAt: '2026-10-04T15:00:00Z',
      },
      // 7. SBI to cash: ₹500
      {
        id: 'tx-7',
        type: 'transfer',
        amount: 500,
        title: 'ATM Cash Withdrawal',
        category: 'Transfer',
        accountId: sbi.id,
        toAccountId: cash.id,
        date: '2026-10-06',
        time: '17:00',
        paymentMethod: 'Debit Card',
        createdAt: '2026-10-06T17:00:00Z',
      },
      // 8. Cash expense: ₹100
      {
        id: 'tx-8',
        type: 'expense',
        amount: 100,
        title: 'Local Tea & Snack',
        category: 'Food & Dining',
        accountId: cash.id,
        date: '2026-10-07',
        time: '18:00',
        paymentMethod: 'Cash',
        createdAt: '2026-10-07T18:00:00Z',
      },
    ]

    const period = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
      isCurrentMonth: false,
    }

    // Run consolidated calculation engine
    const flow = calculateConsolidatedFlow({
      accounts,
      transactions,
      period,
    })

    // ── Expected consolidated figures (Exact Acceptance Test Oracle) ─
    expect(flow.openingBankAndCashBalance).toBe(19500)
    expect(flow.externalIncome).toBe(27000)
    expect(flow.actualExpenses).toBe(600)
    expect(flow.internalTransferEventsCount).toBe(4)
    expect(flow.internalTransfersTotal).toBe(17500)
    expect(flow.closingBankAndCashBalance).toBe(45900)

    // Verify reconciliation: ₹19,500 + ₹27,000 − ₹600 = ₹45,900
    expect(flow.openingBankAndCashBalance + flow.externalIncome - flow.actualExpenses).toBe(45900)
    expect(flow.isReconciled).toBe(true)
    expect(flow.reconciliationDiscrepancy).toBe(0)

    // ── Individual Account Summaries ─────────────────────────
    const [axisSummary, kotakSummary, sbiSummary, federalSummary, cashSummary] = flow.accountSummaries

    // Account ordering verification: Axis -> Kotak -> SBI -> Federal -> Cash
    expect(axisSummary.account.name).toBe('Axis Bank')
    expect(kotakSummary.account.name).toBe('Kotak Bank')
    expect(sbiSummary.account.name).toBe('SBI')
    expect(federalSummary.account.name).toBe('Federal Bank')
    expect(cashSummary.account.name).toBe('Physical Cash')

    // 1. Axis Bank assertions (Opening 10,000 + 27,000 - 8,000 - 5,000 - 4,000 - 300 = 19,700)
    expect(axisSummary.openingBalance).toBe(10000)
    expect(axisSummary.salaryReceived).toBe(27000)
    expect(axisSummary.externalMoneyReceived).toBe(27000)
    expect(axisSummary.transfersToKotak).toBe(8000)
    expect(axisSummary.transfersToSBI).toBe(5000)
    expect(axisSummary.transfersToFederal).toBe(4000)
    expect(axisSummary.actualExpenses).toBe(300)
    expect(axisSummary.closingBalance).toBe(19700)
    expect(axisSummary.isReconciled).toBe(true)

    // 2. Kotak Bank assertions (Opening 5,000 + 8,000 = 13,000)
    expect(kotakSummary.openingBalance).toBe(5000)
    expect(kotakSummary.transfersIn).toBe(8000)
    expect(kotakSummary.transfersFromAxis).toBe(8000)
    expect(kotakSummary.externalMoneyReceived).toBe(0) // Internal transfers must never be classified as external income
    expect(kotakSummary.actualExpenses).toBe(0)
    expect(kotakSummary.closingBalance).toBe(13000)
    expect(kotakSummary.isReconciled).toBe(true)
    expect(kotakSummary.kotakSavingsAnalysis?.netSavings).toBe(8000)

    // 3. SBI assertions (Opening 2,000 + 5,000 - 200 - 500 = 6,300)
    expect(sbiSummary.openingBalance).toBe(2000)
    expect(sbiSummary.transfersIn).toBe(5000)
    expect(sbiSummary.transfersFromAxis).toBe(5000)
    expect(sbiSummary.actualExpenses).toBe(200)
    expect(sbiSummary.transfersToCash).toBe(500)
    expect(sbiSummary.closingBalance).toBe(6300)
    expect(sbiSummary.isReconciled).toBe(true)

    // 4. Federal Bank assertions (Opening 2,000 + 4,000 = 6,000)
    expect(federalSummary.openingBalance).toBe(2000)
    expect(federalSummary.transfersIn).toBe(4000)
    expect(federalSummary.transfersFromAxis).toBe(4000)
    expect(federalSummary.actualExpenses).toBe(0)
    expect(federalSummary.closingBalance).toBe(6000)
    expect(federalSummary.isReconciled).toBe(true)

    // 5. Cash assertions (Opening 500 + 500 - 100 = 900)
    expect(cashSummary.openingBalance).toBe(500)
    expect(cashSummary.transfersIn).toBe(500)
    expect(cashSummary.actualExpenses).toBe(100)
    expect(cashSummary.closingBalance).toBe(900)
    expect(cashSummary.isReconciled).toBe(true)

    // Sum of all individual closing balances matches consolidated total exactly (₹45,900)
    const sumIndividual =
      axisSummary.closingBalance +
      kotakSummary.closingBalance +
      sbiSummary.closingBalance +
      federalSummary.closingBalance +
      cashSummary.closingBalance
    expect(sumIndividual).toBe(45900)
    expect(sumIndividual).toBe(flow.closingBankAndCashBalance)

    // Internal transfers do NOT increase consolidated income or expenses
    expect(flow.externalIncome).toBe(27000)
    expect(flow.actualExpenses).toBe(600)
  })

  it('correctly sorts arbitrary accounts into the required order: Axis -> Kotak -> SBI -> Federal -> Cash -> Others', () => {
    const mixedAccounts: Account[] = [
      { id: '1', name: 'Zerodha Wallet', type: 'investment', openingBalance: 0, balance: 0, isActive: true },
      { id: '2', name: 'Federal Bank Salary', type: 'savings', openingBalance: 0, balance: 0, isActive: true },
      { id: '3', name: 'Axis Bank Salary', type: 'salary', openingBalance: 0, balance: 0, isActive: true },
      { id: '4', name: 'SBI Savings', type: 'savings', openingBalance: 0, balance: 0, isActive: true },
      { id: '5', name: 'Petty Cash', type: 'cash', openingBalance: 0, balance: 0, isActive: true },
      { id: '6', name: 'Kotak 811', type: 'savings', openingBalance: 0, balance: 0, isActive: true },
    ]

    const sorted = sortAccountsByRequiredOrder(mixedAccounts)
    expect(sorted.map((a) => a.name)).toEqual([
      'Axis Bank Salary',
      'Kotak 811',
      'SBI Savings',
      'Federal Bank Salary',
      'Petty Cash',
      'Zerodha Wallet',
    ])
  })

  it('ensures completed EMI payments are counted exactly once and future unpaid EMIs are excluded from actual expenses', () => {
    const acc: Account = {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 20000,
      balance: 20000,
      isActive: true,
    }

    const txs: Transaction[] = [
      {
        id: 'tx-emi-1',
        type: 'expense',
        amount: 3500,
        title: 'MacBook EMI Oct',
        category: 'EMI',
        accountId: acc.id,
        date: '2026-10-05',
        createdAt: '2026-10-05T00:00:00Z',
      },
    ]

    const emis = [
      {
        id: 'emi-1',
        title: 'MacBook Air M2',
        monthlyAmount: 3500,
        totalAmount: 70000,
        remainingAmount: 42000,
        outstandingPrincipal: 42000,
        tenureMonths: 20,
        bankAccountId: acc.id,
        isCompleted: false,
        createdAt: '2026-01-01',
      },
    ]

    const flow = calculateConsolidatedFlow({
      accounts: [acc],
      transactions: txs,
      period: {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        label: 'October 2026',
        isCurrentMonth: true,
      },
      emis: emis as any,
    })

    // Actual expenses must include completed EMI exactly once (₹3,500)
    expect(flow.actualExpenses).toBe(3500)
    // Liabilities must reflect outstanding principal (₹42,000), NOT sum of all future installments or double counted
    expect(flow.liabilities).toBe(42000)
    // Closing balance reconciles: 20,000 - 3,500 = 16,500
    expect(flow.closingBankAndCashBalance).toBe(16500)
    expect(flow.isReconciled).toBe(true)
  })

  it('excludes investment contributions from ordinary expenses and does not double count in net worth', () => {
    const acc: Account = {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 50000,
      balance: 50000,
      isActive: true,
    }

    const txs: Transaction[] = [
      {
        id: 'tx-invest-1',
        type: 'expense',
        amount: 15000,
        title: 'Zerodha Mutual Fund SIP',
        category: 'Investments',
        accountId: acc.id,
        date: '2026-10-10',
        createdAt: '2026-10-10T00:00:00Z',
      },
      {
        id: 'tx-grocery',
        type: 'expense',
        amount: 2500,
        title: 'Grocery Mart',
        category: 'Groceries',
        accountId: acc.id,
        date: '2026-10-11',
        createdAt: '2026-10-11T00:00:00Z',
      },
    ]

    const investments = [
      {
        id: 'inv-1',
        name: 'Nifty 50 Index Fund',
        currentValue: 15000,
        investedAmount: 15000,
        assetType: 'mutual_fund',
        createdAt: '2026-10-10',
      },
    ]

    const flow = calculateConsolidatedFlow({
      accounts: [acc],
      transactions: txs,
      period: {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        label: 'October 2026',
        isCurrentMonth: true,
      },
      investments: investments as any,
    })

    // Investment value tracked in assets
    expect(flow.investmentValue).toBe(15000)
    // Net worth = Closing Bank & Cash (32,500) + Investments (15,000) - Liabilities (0) = 47,500
    expect(flow.closingBankAndCashBalance + flow.investmentValue - flow.liabilities).toBe(47500)
    expect(flow.netWorth).toBe(47500)
  })
})
