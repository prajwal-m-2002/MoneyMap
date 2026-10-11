import { describe, it, expect } from 'vitest'
import { calculateAxisSalaryFlow } from '@/lib/salaryFlowMath'
import { calculateAccountBalance } from '@/context/FinanceContext'
import type { Account, Transaction } from '@/types/finance'

describe('Section 11 Acceptance Tests: Axis Salary Flow & Allocations', () => {
  it('correctly calculates the full financial allocation model matching Section 11 specifications', () => {
    // Isolated Test Dataset
    const axis: Account = {
      id: 'acc-axis-salary',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      balance: 10000,
      isActive: true,
      color: 'emerald',
    }

    const kotak: Account = {
      id: 'acc-kotak-savings',
      name: 'Kotak Bank',
      type: 'savings',
      openingBalance: 5000,
      balance: 5000,
      isActive: true,
      color: 'blue',
    }

    const sbi: Account = {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 2000,
      balance: 2000,
      isActive: true,
      color: 'indigo',
    }

    const federal: Account = {
      id: 'acc-federal',
      name: 'Federal Bank',
      type: 'savings',
      openingBalance: 2000,
      balance: 2000,
      isActive: true,
      color: 'teal',
    }

    const cash: Account = {
      id: 'acc-cash',
      name: 'Cash',
      type: 'cash',
      openingBalance: 500,
      balance: 500,
      isActive: true,
      color: 'amber',
    }

    const accounts = [axis, kotak, sbi, federal, cash]

    // Transactions as per Section 11:
    const transactions: Transaction[] = [
      // 1. Salary of ₹27,000 credited to Axis
      {
        id: 'tx-1',
        type: 'income',
        amount: 27000,
        title: 'Monthly Salary Credit',
        category: 'Salary',
        accountId: axis.id,
        date: '2026-10-01',
        createdAt: '2026-10-01T09:00:00Z',
      },
      // 2. ₹8,000 transferred from Axis to Kotak as savings
      {
        id: 'tx-2',
        type: 'transfer',
        amount: 8000,
        title: 'Transfer to Kotak Savings',
        category: 'Transfer',
        accountId: axis.id,
        toAccountId: kotak.id,
        date: '2026-10-02',
        notes: 'Monthly savings pool',
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
        notes: 'SBI utility buffer',
        createdAt: '2026-10-02T10:05:00Z',
      },
      // 4. ₹4,000 transferred from Axis to Federal
      {
        id: 'tx-4',
        type: 'transfer',
        amount: 4000,
        title: 'Transfer to Federal',
        category: 'Transfer',
        accountId: axis.id,
        toAccountId: federal.id,
        date: '2026-10-02',
        notes: 'Federal operational funds',
        createdAt: '2026-10-02T10:10:00Z',
      },
      // 5. ₹300 direct Axis expense
      {
        id: 'tx-5',
        type: 'expense',
        amount: 300,
        title: 'Axis Quick Bill',
        category: 'Utilities',
        accountId: axis.id,
        date: '2026-10-05',
        createdAt: '2026-10-05T12:00:00Z',
      },
      // 6. ₹200 actual SBI expense
      {
        id: 'tx-6',
        type: 'expense',
        amount: 200,
        title: 'SBI Card Expense',
        category: 'Food & Dining',
        accountId: sbi.id,
        date: '2026-10-06',
        createdAt: '2026-10-06T14:00:00Z',
      },
      // 7. ₹400 actual Federal expense
      {
        id: 'tx-7',
        type: 'expense',
        amount: 400,
        title: 'Federal Expense',
        category: 'Shopping',
        accountId: federal.id,
        date: '2026-10-07',
        createdAt: '2026-10-07T15:00:00Z',
      },
    ]

    // Compute live balances using the official FinanceContext calculator
    axis.balance = calculateAccountBalance(axis, transactions)
    kotak.balance = calculateAccountBalance(kotak, transactions)
    sbi.balance = calculateAccountBalance(sbi, transactions)
    federal.balance = calculateAccountBalance(federal, transactions)
    cash.balance = calculateAccountBalance(cash, transactions)

    // Verify account live balances:
    // Ending Axis balance: 10,000 + 27,000 - 8,000 - 5,000 - 4,000 - 300 = 19,700
    expect(axis.balance).toBe(19700)
    // Ending Kotak balance: 5,000 + 8,000 = 13,000
    expect(kotak.balance).toBe(13000)
    // Ending SBI balance: 2,000 + 5,000 - 200 = 6,800
    expect(sbi.balance).toBe(6800)
    // Ending Federal balance: 2,000 + 4,000 - 400 = 5,600
    expect(federal.balance).toBe(5600)
    // Ending Cash balance: 500
    expect(cash.balance).toBe(500)

    // Total bank and cash across all accounts:
    const totalBankAndCash = accounts.reduce((sum, a) => sum + a.balance, 0)
    expect(totalBankAndCash).toBe(45600)

    // Period: October 2026
    const period = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
    }

    const flow = calculateAxisSalaryFlow({
      accounts,
      transactions,
      selectedAxisId: axis.id,
      period,
    })

    // Expected Results from Section 11:
    // 1. Salary received: ₹27,000
    expect(flow.salaryReceived).toBe(27000)

    // 2. Kotak savings allocation: ₹8,000
    expect(flow.kotakSavingsGross).toBe(8000)
    expect(flow.kotakSavingsNet).toBe(8000)

    // 3. SBI allocation: ₹5,000
    expect(flow.sbiTransfers).toBe(5000)

    // 4. Federal allocation: ₹4,000
    expect(flow.federalTransfers).toBe(4000)

    // 5. Direct Axis spending: ₹300
    expect(flow.directAxisExpenses).toBe(300)

    // 6. Total internal transfers out of Axis: 8,000 + 5,000 + 4,000 = 17,000
    const internalTransfersOutOfAxis = flow.kotakSavingsGross + flow.sbiTransfers + flow.federalTransfers
    expect(internalTransfersOutOfAxis).toBe(17000)

    // 7. Total actual expenses across all accounts in period: 300 + 200 + 400 = 900
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense' && t.date >= period.startDate && t.date <= period.endDate)
      .reduce((sum, t) => sum + t.amount, 0)
    expect(totalExpenses).toBe(900)

    // 8. Net salary remaining after recorded Axis outflows: ₹9,700
    // (27,000 - 17,000 transfers - 300 direct expense)
    expect(flow.netSalaryRemaining).toBe(9700)

    // 9. Allocation Percentages:
    // Kotak: 29.63%
    const kotakBreakdown = flow.allocationBreakdown.find((b) => b.destination === 'Kotak Savings')
    expect(kotakBreakdown?.percentage).toBe(29.63)

    // SBI: 18.52%
    const sbiBreakdown = flow.allocationBreakdown.find((b) => b.destination === 'SBI Allocation')
    expect(sbiBreakdown?.percentage).toBe(18.52)

    // Federal: 14.81%
    const federalBreakdown = flow.allocationBreakdown.find((b) => b.destination === 'Federal Allocation')
    expect(federalBreakdown?.percentage).toBe(14.81)

    // Direct Axis spending: 1.11%
    const directBreakdown = flow.allocationBreakdown.find((b) => b.destination === 'Direct Axis Expenses')
    expect(directBreakdown?.percentage).toBe(1.11)

    // Remaining salary after these outflows: 35.93%
    expect(flow.percentSalaryRemaining).toBe(35.93)

    // Verify percentages sum to ~100%: 29.63 + 18.52 + 14.81 + 1.11 + 35.93 = 100.00%
    const sumPct =
      (kotakBreakdown?.percentage ?? 0) +
      (sbiBreakdown?.percentage ?? 0) +
      (federalBreakdown?.percentage ?? 0) +
      (directBreakdown?.percentage ?? 0) +
      (flow.percentSalaryRemaining ?? 0)
    expect(Math.round(sumPct)).toBe(100)

    // Destination account actual spending verification:
    // SBI actual expense: ₹200, unspent allocation: ₹4,800
    expect(flow.sbiDetails.actualExpensesFromSBI).toBe(200)
    expect(flow.sbiDetails.unspentAllocation).toBe(4800)

    // Federal actual expense: ₹400, unspent allocation: ₹3,600
    expect(flow.federalDetails.actualExpensesFromFederal).toBe(400)
    expect(flow.federalDetails.unspentAllocation).toBe(3600)
  })

  it('handles empty salary period safely without division by zero', () => {
    const axis: Account = {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      balance: 10000,
      isActive: true,
    }

    const flow = calculateAxisSalaryFlow({
      accounts: [axis],
      transactions: [],
      period: { startDate: '2026-10-01', endDate: '2026-10-31', label: 'October 2026' },
    })

    expect(flow.salaryReceived).toBe(0)
    expect(flow.percentSalaryRemaining).toBeNull()
    expect(flow.allocationBreakdown.every((b) => b.percentage === 0)).toBe(true)
  })
})
