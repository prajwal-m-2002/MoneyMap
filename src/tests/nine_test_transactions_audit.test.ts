import { describe, it, expect } from 'vitest'
import { calculateAccountBalance } from '@/context/FinanceContext'
import { calculateAxisSalaryFlow } from '@/lib/salaryFlowMath'
import { calculateConsolidatedFlow } from '@/lib/consolidatedFlowMath'
import type { Account, Transaction } from '@/types/finance'

describe('Nine Test Transactions Accounting & Allocation Audit', () => {
  // 1. Setup exact accounts matching user specifications
  const axis: Account = {
    id: '27e2c0a0-0690-486c-9e34-a23a8f8e91bc',
    name: 'Axis Bank',
    type: 'salary',
    openingBalance: 10000,
    balance: 10000,
    openingBalanceDate: '2026-10-10',
    ledgerCoverageStartDate: '2026-10-10',
    isActive: true,
  }

  const kotak: Account = {
    id: '3181a7ee-8679-4ec2-ab60-e12a278cfd8d',
    name: 'Kotak Bank',
    type: 'savings',
    openingBalance: 5000,
    balance: 5000,
    openingBalanceDate: '2026-10-10',
    ledgerCoverageStartDate: '2026-10-10',
    isActive: true,
  }

  const sbi: Account = {
    id: 'a2c72a8f-11a6-4e68-87c7-6a25e0c3784e',
    name: 'SBI',
    type: 'savings',
    openingBalance: 2000,
    balance: 2000,
    openingBalanceDate: '2026-10-10',
    ledgerCoverageStartDate: '2026-10-10',
    isActive: true,
  }

  const federal: Account = {
    id: '96e338eb-dee7-41e1-bc9c-a7e43fa8b2dd',
    name: 'Federal Bank',
    type: 'savings',
    openingBalance: 2000,
    balance: 2000,
    openingBalanceDate: '2026-10-10',
    ledgerCoverageStartDate: '2026-10-10',
    isActive: true,
  }

  const cash: Account = {
    id: 'f7864706-0575-4add-a0fe-0fe858880a95',
    name: 'Physical Cash',
    type: 'cash',
    openingBalance: 500,
    balance: 500,
    openingBalanceDate: '2026-10-10',
    ledgerCoverageStartDate: '2026-10-10',
    isActive: true,
  }

  const accounts = [axis, kotak, sbi, federal, cash]

  // 2. Setup the exact nine transactions with correct account assignments
  const transactions: Transaction[] = [
    // 1. Salary: +₹27,000 to Axis Bank
    {
      id: '16ebca3e-bfb6-4f6f-a176-d3a372b159e0',
      type: 'income',
      amount: 27000,
      title: 'Salary received',
      category: 'Salary',
      accountId: axis.id,
      date: '2026-10-10',
      createdAt: '2026-10-10T21:28:20.390Z',
    },
    // 2. Axis → Kotak: ₹8,000
    {
      id: 'ed55b780-9974-480c-9ddc-3a62f85ff699',
      type: 'transfer',
      amount: 8000,
      title: 'Monthly Savings',
      category: 'Transfer',
      accountId: axis.id,
      toAccountId: kotak.id,
      date: '2026-10-10',
      createdAt: '2026-10-10T21:29:12.546Z',
    },
    // 3. Axis → SBI: ₹5,000
    {
      id: '6cf6c997-c8bf-46fd-9d53-3f199ebe70e0',
      type: 'transfer',
      amount: 5000,
      title: 'Monthly Spending Fund',
      category: 'Transfer',
      accountId: axis.id,
      toAccountId: sbi.id,
      date: '2026-10-10',
      createdAt: '2026-10-10T21:29:58.144Z',
    },
    // 4. Axis → Federal Bank: ₹4,000
    {
      id: '6aa2e394-5857-4d0d-b570-ee07bf501a0e',
      type: 'transfer',
      amount: 4000,
      title: 'Purchase Fund',
      category: 'Transfer',
      accountId: axis.id,
      toAccountId: federal.id,
      date: '2026-10-10',
      createdAt: '2026-10-10T21:30:33.246Z',
    },
    // 5. Axis expense, Lunch: ₹300
    {
      id: '320f30fa-6ccf-4dfc-9962-6d7c699a90c4',
      type: 'expense',
      amount: 300,
      title: 'Lunch',
      category: 'Food & Dining',
      accountId: axis.id,
      date: '2026-10-10',
      createdAt: '2026-10-10T21:31:31.657Z',
    },
    // 6. SBI expense, Transport: ₹200 (correctly assigned to SBI)
    {
      id: 'f814cec6-ce1b-4748-9718-c31e9d481d73',
      type: 'expense',
      amount: 200,
      title: 'Transport',
      category: 'Transportation',
      accountId: sbi.id,
      date: '2026-10-10',
      createdAt: '2026-10-10T21:32:02.656Z',
    },
    // 7. Federal Bank expense, Household Items: ₹400 (correctly assigned to Federal Bank)
    {
      id: 'c298f949-c024-4fb3-8129-af06186bffe5',
      type: 'expense',
      amount: 400,
      title: 'Household Items',
      category: 'Shopping',
      accountId: federal.id,
      date: '2026-10-10',
      createdAt: '2026-10-10T21:32:30.996Z',
    },
    // 8. SBI → Physical Cash: ₹500
    {
      id: 'ce7a5f35-1bb3-416b-a2ac-da66958fa943',
      type: 'transfer',
      amount: 500,
      title: 'ATM Cash Withdrawal',
      category: 'Transfer',
      accountId: sbi.id,
      toAccountId: cash.id,
      date: '2026-10-10',
      createdAt: '2026-10-10T21:33:13.799Z',
    },
    // 9. Physical Cash expense, Evening Snacks: ₹100 (Category: Snacks)
    {
      id: '2e858fb4-14c6-4215-a6bb-614f53500491',
      type: 'expense',
      amount: 100,
      title: 'Evening Snacks',
      category: 'Snacks',
      accountId: cash.id,
      date: '2026-10-10',
      createdAt: '2026-10-10T21:33:47.444Z',
    },
  ]

  it('calculates the exact individual account balances', () => {
    const balAxis = calculateAccountBalance(axis, transactions)
    const balKotak = calculateAccountBalance(kotak, transactions)
    const balSBI = calculateAccountBalance(sbi, transactions)
    const balFederal = calculateAccountBalance(federal, transactions)
    const balCash = calculateAccountBalance(cash, transactions)

    expect(balAxis).toBe(19700)
    expect(balKotak).toBe(13000)
    expect(balSBI).toBe(6300)
    expect(balFederal).toBe(5600)
    expect(balCash).toBe(900)

    const totalCombined = balAxis + balKotak + balSBI + balFederal + balCash
    expect(totalCombined).toBe(45500)
  })

  it('calculates consolidated flow with correct income, expenses, and transfer cancellation', () => {
    // Populate current live balances on account objects
    axis.balance = 19700
    kotak.balance = 13000
    sbi.balance = 6300
    federal.balance = 5600
    cash.balance = 900

    const period = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
      isCurrentMonth: true,
    }

    const flow = calculateConsolidatedFlow({
      accounts,
      transactions,
      period,
    })

    // Opening balances total: 10000 + 5000 + 2000 + 2000 + 500 = 19,500
    expect(flow.openingBankAndCashBalance).toBe(19500)
    // External income: ₹27,000 (salary only)
    expect(flow.externalIncome).toBe(27000)
    // Actual expenses: ₹300 + ₹200 + ₹400 + ₹100 = ₹1,000
    expect(flow.actualExpenses).toBe(1000)
    // Closing bank and cash balance: 19,500 + 27,000 - 1,000 = 45,500
    expect(flow.closingBankAndCashBalance).toBe(45500)

    // Internal transfers count = 4, total volume = 8000 + 5000 + 4000 + 500 = 17,500
    expect(flow.internalTransferEventsCount).toBe(4)
    expect(flow.internalTransfersTotal).toBe(17500)
    // Reconciled and balanced
    expect(flow.isLedgerBalanced).toBe(true)
  })

  it('correctly reports category spending breakdown', () => {
    const expenses = transactions.filter((t) => t.type === 'expense')
    const totalExpenses = expenses.reduce((s, t) => s + t.amount, 0)
    expect(totalExpenses).toBe(1000)

    const catSums: Record<string, number> = {}
    for (const tx of expenses) {
      catSums[tx.category] = (catSums[tx.category] || 0) + tx.amount
    }

    expect(catSums['Food & Dining']).toBe(300)
    expect(catSums['Shopping']).toBe(400)
    expect(catSums['Transportation']).toBe(200)
    expect(catSums['Snacks']).toBe(100)
  })

  it('corrects Axis salary allocation breakdown using 27000 as denominator', () => {
    const period = {
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      label: 'October 2026',
    }

    const salaryFlow = calculateAxisSalaryFlow({
      accounts,
      transactions,
      selectedAxisId: axis.id,
      period,
    })

    expect(salaryFlow.salaryReceived).toBe(27000)
    expect(salaryFlow.kotakSavingsGross).toBe(8000)
    expect(salaryFlow.sbiTransfers).toBe(5000)
    expect(salaryFlow.federalTransfers).toBe(4000)
    expect(salaryFlow.directAxisExpenses).toBe(300)
    expect(salaryFlow.otherOutflows).toBe(0)

    const allocations = salaryFlow.allocationBreakdown
    const kotakAlloc = allocations.find((a) => a.destination === 'Kotak Savings')
    const sbiAlloc = allocations.find((a) => a.destination === 'SBI Allocation')
    const federalAlloc = allocations.find((a) => a.destination === 'Federal Allocation')
    const directAlloc = allocations.find((a) => a.destination === 'Direct Axis Expenses')
    const otherAlloc = allocations.find((a) => a.destination === 'Other Axis Outflows')

    expect(kotakAlloc?.amount).toBe(8000)
    expect(kotakAlloc?.percentage).toBe(29.63) // (8000 / 27000) * 100

    expect(sbiAlloc?.amount).toBe(5000)
    expect(sbiAlloc?.percentage).toBe(18.52) // (5000 / 27000) * 100

    expect(federalAlloc?.amount).toBe(4000)
    expect(federalAlloc?.percentage).toBe(14.81) // (4000 / 27000) * 100

    expect(directAlloc?.amount).toBe(300)
    expect(directAlloc?.percentage).toBe(1.11) // (300 / 27000) * 100

    expect(otherAlloc?.amount).toBe(0)
    expect(otherAlloc?.percentage).toBe(0)

    // Net salary remaining: 27,000 - (8000 + 5000 + 4000 + 300) = 9,700
    expect(salaryFlow.netSalaryRemaining).toBe(9700)
    expect(salaryFlow.percentSalaryRemaining).toBe(35.93) // (9700 / 27000) * 100
  })

  it('preserves mathematical consistency on transaction edits and deletions', () => {
    // Test edit: Change Lunch expense from ₹300 to ₹500
    const editedTransactions = transactions.map((t) =>
      t.id === '320f30fa-6ccf-4dfc-9962-6d7c699a90c4' ? { ...t, amount: 500 } : t
    )

    const newAxisBalance = calculateAccountBalance(axis, editedTransactions)
    expect(newAxisBalance).toBe(19500) // 19,700 - 200 = 19,500

    // Test delete: Delete Transport expense (₹200 from SBI)
    const afterDelete = transactions.filter((t) => t.id !== 'f814cec6-ce1b-4748-9718-c31e9d481d73')
    const newSBIBalance = calculateAccountBalance(sbi, afterDelete)
    expect(newSBIBalance).toBe(6500) // 6,300 + 200 refund = 6,500

    // Test delete transfer: Delete SBI -> Cash ₹500 transfer
    const afterTransferDelete = transactions.filter((t) => t.id !== 'ce7a5f35-1bb3-416b-a2ac-da66958fa943')
    const sbiWithoutTransfer = calculateAccountBalance(sbi, afterTransferDelete)
    const cashWithoutTransfer = calculateAccountBalance(cash, afterTransferDelete)
    expect(sbiWithoutTransfer).toBe(6800) // 6,300 + 500 = 6,800
    expect(cashWithoutTransfer).toBe(400) // 900 - 500 = 400 (500 opening - 100 expense)
  })
})
