import type { Account, Transaction } from '@/types/finance'
import { calculateAccountBalanceAsOf } from '@/context/FinanceContext'

export type SalaryPeriodPreset =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'custom'

export interface SalaryPeriodBounds {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  label: string
}

export type AxisTxClassification =
  | 'salary_received'
  | 'kotak_savings'
  | 'sbi_allocation'
  | 'federal_allocation'
  | 'cash_withdrawal'
  | 'other_transfer'
  | 'direct_axis_expense'
  | 'unclassified_outflow'
  | 'other_inflow'

export interface ClassifiedAxisTransaction {
  transaction: Transaction
  classification: AxisTxClassification
  classificationLabel: string
  destinationOrSource: string
  amount: number
  isOutflow: boolean
  percentageOfSalary: number | null
}

export interface AxisSalaryFlowSummary {
  period: SalaryPeriodBounds
  salaryReceived: number
  kotakSavingsGross: number
  kotakSavingsReturned: number
  kotakSavingsNet: number
  sbiTransfers: number
  federalTransfers: number
  cashWithdrawals: number
  otherTransfers: number
  directAxisExpenses: number
  otherOutflows: number
  totalOutflows: number
  netSalaryRemaining: number
  percentSalaryRemaining: number | null
  currentAxisBalance: number
  historicalAxisBalanceAtEnd: number
  allocationBreakdown: {
    destination: string
    amount: number
    percentage: number
    color: string
  }[]
  sbiDetails: {
    transferredFromAxis: number
    percentageOfSalary: number
    actualExpensesFromSBI: number
    remainingBalance: number
    unspentAllocation: number
  }
  federalDetails: {
    transferredFromAxis: number
    percentageOfSalary: number
    actualExpensesFromFederal: number
    remainingBalance: number
    unspentAllocation: number
  }
  kotakSavingsDetails: {
    grossTransfers: number
    returnedTransfers: number
    netSavings: number
    percentageOfSalary: number
    remainingBalance: number
  }
  classifiedTransactions: ClassifiedAxisTransaction[]
}

/**
 * Calculates start and end date bounds for salary flow period presets.
 */
export function getSalaryPeriodBounds(
  preset: SalaryPeriodPreset,
  customStart?: string,
  customEnd?: string
): SalaryPeriodBounds {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  const pad = (n: number) => String(n).padStart(2, '0')

  switch (preset) {
    case 'this_month': {
      const start = `${year}-${pad(month + 1)}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const end = `${year}-${pad(month + 1)}-${pad(lastDay)}`
      const label = now.toLocaleString('default', { month: 'long', year: 'numeric' })
      return { startDate: start, endDate: end, label }
    }

    case 'last_month': {
      const prevDate = new Date(year, month - 1, 1)
      const pYear = prevDate.getFullYear()
      const pMonth = prevDate.getMonth()
      const start = `${pYear}-${pad(pMonth + 1)}-01`
      const lastDay = new Date(pYear, pMonth + 1, 0).getDate()
      const end = `${pYear}-${pad(pMonth + 1)}-${pad(lastDay)}`
      const label = prevDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      return { startDate: start, endDate: end, label }
    }

    case 'last_3_months': {
      const threeMonthsAgo = new Date(year, month - 2, 1)
      const start = `${threeMonthsAgo.getFullYear()}-${pad(threeMonthsAgo.getMonth() + 1)}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const end = `${year}-${pad(month + 1)}-${pad(lastDay)}`
      return { startDate: start, endDate: end, label: 'Last 3 Months' }
    }

    case 'last_6_months': {
      const sixMonthsAgo = new Date(year, month - 5, 1)
      const start = `${sixMonthsAgo.getFullYear()}-${pad(sixMonthsAgo.getMonth() + 1)}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const end = `${year}-${pad(month + 1)}-${pad(lastDay)}`
      return { startDate: start, endDate: end, label: 'Last 6 Months' }
    }

    case 'custom': {
      const start = customStart || `${year}-${pad(month + 1)}-01`
      const end = customEnd || `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`
      return { startDate: start, endDate: end, label: `${start} to ${end}` }
    }
  }
}

/**
 * Auto-detects key bank accounts by role/type/name or fallback IDs.
 */
export function identifyAccounts(accounts: Account[]) {
  const activeAccounts = accounts.filter((a) => a.isActive !== false)

  // Axis Bank: salary account or name matching Axis
  const axis =
    activeAccounts.find((a) => a.type === 'salary') ||
    activeAccounts.find((a) => /axis/i.test(a.name)) ||
    activeAccounts[0]

  // Kotak Bank: savings account or name matching Kotak
  const kotak =
    activeAccounts.find((a) => /kotak/i.test(a.name)) ||
    activeAccounts.find((a) => a.id !== axis?.id && a.type === 'savings')

  // SBI: State Bank of India
  const sbi = activeAccounts.find((a) => /sbi|state\s*bank/i.test(a.name))

  // Federal Bank
  const federal = activeAccounts.find((a) => /federal/i.test(a.name))

  // Cash pool
  const cash = activeAccounts.find((a) => a.type === 'cash' || /cash/i.test(a.name))

  return { axis, kotak, sbi, federal, cash }
}

/**
 * Checks if a transaction represents a salary credit.
 */
export function isSalaryTransaction(tx: Transaction, axisAccountId?: string): boolean {
  if (tx.type !== 'income') return false
  if (axisAccountId && tx.accountId !== axisAccountId) return false

  const catLower = (tx.category || '').toLowerCase().trim()
  const titleLower = (tx.title || '').toLowerCase().trim()

  return (
    catLower === 'salary' ||
    catLower.includes('salary') ||
    catLower.includes('payroll') ||
    titleLower.includes('salary') ||
    titleLower.includes('payroll')
  )
}

/**
 * Core Financial Analytics Engine: Calculates complete Axis Salary Flow & Allocations.
 */
export function calculateAxisSalaryFlow({
  accounts,
  transactions,
  selectedAxisId,
  period,
}: {
  accounts: Account[]
  transactions: Transaction[]
  selectedAxisId?: string
  period: SalaryPeriodBounds
}): AxisSalaryFlowSummary {
  const detected = identifyAccounts(accounts)
  const axisAccount = (selectedAxisId ? accounts.find((a) => a.id === selectedAxisId) : null) || detected.axis

  if (!axisAccount) {
    return {
      period,
      salaryReceived: 0,
      kotakSavingsGross: 0,
      kotakSavingsReturned: 0,
      kotakSavingsNet: 0,
      sbiTransfers: 0,
      federalTransfers: 0,
      cashWithdrawals: 0,
      otherTransfers: 0,
      directAxisExpenses: 0,
      otherOutflows: 0,
      totalOutflows: 0,
      netSalaryRemaining: 0,
      percentSalaryRemaining: null,
      currentAxisBalance: 0,
      historicalAxisBalanceAtEnd: 0,
      allocationBreakdown: [],
      sbiDetails: { transferredFromAxis: 0, percentageOfSalary: 0, actualExpensesFromSBI: 0, remainingBalance: 0, unspentAllocation: 0 },
      federalDetails: { transferredFromAxis: 0, percentageOfSalary: 0, actualExpensesFromFederal: 0, remainingBalance: 0, unspentAllocation: 0 },
      kotakSavingsDetails: { grossTransfers: 0, returnedTransfers: 0, netSavings: 0, percentageOfSalary: 0, remainingBalance: 0 },
      classifiedTransactions: [],
    }
  }

  const axisId = axisAccount.id
  const accountMap = new Map(accounts.map((a) => [a.id, a]))

  // Filter transactions within period: [startDate, endDate]
  const periodTxs = transactions.filter((tx) => {
    return tx.date >= period.startDate && tx.date <= period.endDate
  })

  // 1. Compute Salary Received in Axis
  let salaryReceived = 0
  for (const tx of periodTxs) {
    if (tx.accountId === axisId && isSalaryTransaction(tx, axisId)) {
      salaryReceived += tx.amount
    }
  }
  salaryReceived = Math.round(salaryReceived * 100) / 100

  // 2. Classify and Track Outflows & Inflows related to Axis
  let kotakSavingsGross = 0
  let kotakSavingsReturned = 0
  let sbiTransfers = 0
  let federalTransfers = 0
  let cashWithdrawals = 0
  let otherTransfers = 0
  let directAxisExpenses = 0
  let otherOutflows = 0

  const classifiedList: ClassifiedAxisTransaction[] = []

  // Check destination account matching functions
  const isKotak = (id?: string) => {
    if (!id) return false
    if (detected.kotak && id === detected.kotak.id) return true
    const acc = accountMap.get(id)
    return !!acc && /kotak/i.test(acc.name)
  }

  const isSBI = (id?: string) => {
    if (!id) return false
    if (detected.sbi && id === detected.sbi.id) return true
    const acc = accountMap.get(id)
    return !!acc && /sbi|state\s*bank/i.test(acc.name)
  }

  const isFederal = (id?: string) => {
    if (!id) return false
    if (detected.federal && id === detected.federal.id) return true
    const acc = accountMap.get(id)
    return !!acc && /federal/i.test(acc.name)
  }

  const isCash = (id?: string) => {
    if (!id) return false
    if (detected.cash && id === detected.cash.id) return true
    const acc = accountMap.get(id)
    return !!acc && (acc.type === 'cash' || /cash/i.test(acc.name))
  }

  for (const tx of periodTxs) {
    const isFromAxis = tx.accountId === axisId
    const isToAxis = tx.toAccountId === axisId

    // A. Income in Axis
    if (tx.type === 'income' && isFromAxis) {
      const isSalary = isSalaryTransaction(tx, axisId)
      classifiedList.push({
        transaction: tx,
        classification: isSalary ? 'salary_received' : 'other_inflow',
        classificationLabel: isSalary ? 'Salary Received' : 'Other Income',
        destinationOrSource: tx.title || 'Income Credit',
        amount: tx.amount,
        isOutflow: false,
        percentageOfSalary: null,
      })
      continue
    }

    // B. Direct Expense from Axis
    if (tx.type === 'expense' && isFromAxis) {
      directAxisExpenses += tx.amount
      const pct = salaryReceived > 0 ? (tx.amount / salaryReceived) * 100 : null
      classifiedList.push({
        transaction: tx,
        classification: 'direct_axis_expense',
        classificationLabel: 'Direct Axis Expense',
        destinationOrSource: tx.title || tx.category || 'Purchase / Bill',
        amount: tx.amount,
        isOutflow: true,
        percentageOfSalary: pct !== null ? Math.round(pct * 100) / 100 : null,
      })
      continue
    }

    // C. Transfers involving Axis
    if (tx.type === 'transfer') {
      // Transfer OUT of Axis
      if (isFromAxis) {
        const destAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : undefined
        const destName = destAcc ? destAcc.name : 'Unknown Account'
        const pct = salaryReceived > 0 ? (tx.amount / salaryReceived) * 100 : null
        const roundedPct = pct !== null ? Math.round(pct * 100) / 100 : null

        if (isKotak(tx.toAccountId)) {
          kotakSavingsGross += tx.amount
          classifiedList.push({
            transaction: tx,
            classification: 'kotak_savings',
            classificationLabel: 'Savings Allocation',
            destinationOrSource: destName,
            amount: tx.amount,
            isOutflow: true,
            percentageOfSalary: roundedPct,
          })
        } else if (isSBI(tx.toAccountId)) {
          sbiTransfers += tx.amount
          classifiedList.push({
            transaction: tx,
            classification: 'sbi_allocation',
            classificationLabel: 'SBI Allocation',
            destinationOrSource: destName,
            amount: tx.amount,
            isOutflow: true,
            percentageOfSalary: roundedPct,
          })
        } else if (isFederal(tx.toAccountId)) {
          federalTransfers += tx.amount
          classifiedList.push({
            transaction: tx,
            classification: 'federal_allocation',
            classificationLabel: 'Federal Allocation',
            destinationOrSource: destName,
            amount: tx.amount,
            isOutflow: true,
            percentageOfSalary: roundedPct,
          })
        } else if (isCash(tx.toAccountId)) {
          cashWithdrawals += tx.amount
          classifiedList.push({
            transaction: tx,
            classification: 'cash_withdrawal',
            classificationLabel: 'Cash Allocation',
            destinationOrSource: destName,
            amount: tx.amount,
            isOutflow: true,
            percentageOfSalary: roundedPct,
          })
        } else {
          otherTransfers += tx.amount
          classifiedList.push({
            transaction: tx,
            classification: 'other_transfer',
            classificationLabel: 'Other Transfer',
            destinationOrSource: destName,
            amount: tx.amount,
            isOutflow: true,
            percentageOfSalary: roundedPct,
          })
        }
      }

      // Transfer BACK into Axis from Kotak (reduces net savings)
      if (isToAxis && isKotak(tx.accountId)) {
        kotakSavingsReturned += tx.amount
        classifiedList.push({
          transaction: tx,
          classification: 'other_inflow',
          classificationLabel: 'Savings Return to Axis',
          destinationOrSource: 'Kotak Bank',
          amount: tx.amount,
          isOutflow: false,
          percentageOfSalary: null,
        })
      }
    }
  }

  // Round numbers to avoid floating point drift
  kotakSavingsGross = Math.round(kotakSavingsGross * 100) / 100
  kotakSavingsReturned = Math.round(kotakSavingsReturned * 100) / 100
  const kotakSavingsNet = Math.max(0, Math.round((kotakSavingsGross - kotakSavingsReturned) * 100) / 100)
  sbiTransfers = Math.round(sbiTransfers * 100) / 100
  federalTransfers = Math.round(federalTransfers * 100) / 100
  cashWithdrawals = Math.round(cashWithdrawals * 100) / 100
  otherTransfers = Math.round(otherTransfers * 100) / 100
  directAxisExpenses = Math.round(directAxisExpenses * 100) / 100
  otherOutflows = Math.round((cashWithdrawals + otherTransfers) * 100) / 100

  // Total Classified Outflows
  const totalOutflows = Math.round(
    (kotakSavingsGross + sbiTransfers + federalTransfers + directAxisExpenses + otherOutflows) * 100
  ) / 100

  // Net salary remaining formula:
  // Net salary remaining = salary received - classified outgoing transfers - direct Axis expenses - other classified outflows
  const netSalaryRemaining = Math.round((salaryReceived - totalOutflows) * 100) / 100
  const percentSalaryRemaining =
    salaryReceived > 0 ? Math.round(((netSalaryRemaining / salaryReceived) * 100) * 100) / 100 : null

  // 3. Destination Account Actual Spending Analysis (SBI & Federal)
  // Actual expenses paid from SBI during the selected period
  const sbiAccount = detected.sbi
  let actualExpensesFromSBI = 0
  if (sbiAccount) {
    actualExpensesFromSBI = periodTxs
      .filter((tx) => tx.accountId === sbiAccount.id && tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0)
    actualExpensesFromSBI = Math.round(actualExpensesFromSBI * 100) / 100
  }

  // Actual expenses paid from Federal during the selected period
  const federalAccount = detected.federal
  let actualExpensesFromFederal = 0
  if (federalAccount) {
    actualExpensesFromFederal = periodTxs
      .filter((tx) => tx.accountId === federalAccount.id && tx.type === 'expense')
      .reduce((sum, tx) => sum + tx.amount, 0)
    actualExpensesFromFederal = Math.round(actualExpensesFromFederal * 100) / 100
  }

  // 4. Balances: Live vs. Historical As-of Period End
  const currentAxisBalance = Math.round(axisAccount.balance * 100) / 100
  const historicalAxisBalanceAtEnd = Math.round(
    calculateAccountBalanceAsOf(axisAccount, transactions, period.endDate) * 100
  ) / 100

  // 5. Allocation Breakdown List
  const calcPct = (amt: number) =>
    salaryReceived > 0 ? Math.round(((amt / salaryReceived) * 100) * 100) / 100 : 0

  const allocationBreakdown = [
    {
      destination: 'Kotak Savings',
      amount: kotakSavingsGross,
      percentage: calcPct(kotakSavingsGross),
      color: '#06b6d4', // cyan-500
    },
    {
      destination: 'SBI Allocation',
      amount: sbiTransfers,
      percentage: calcPct(sbiTransfers),
      color: '#3b82f6', // blue-500
    },
    {
      destination: 'Federal Allocation',
      amount: federalTransfers,
      percentage: calcPct(federalTransfers),
      color: '#8b5cf6', // purple-500
    },
    {
      destination: 'Direct Axis Expenses',
      amount: directAxisExpenses,
      percentage: calcPct(directAxisExpenses),
      color: '#f43f5e', // rose-500
    },
    {
      destination: 'Other Axis Outflows',
      amount: otherOutflows,
      percentage: calcPct(otherOutflows),
      color: '#f59e0b', // amber-500
    },
  ]

  // Sort classified transactions descending by date, then time/id
  classifiedList.sort((a, b) => {
    if (b.transaction.date !== a.transaction.date) {
      return b.transaction.date.localeCompare(a.transaction.date)
    }
    return (b.transaction.time || '').localeCompare(a.transaction.time || '')
  })

  return {
    period,
    salaryReceived,
    kotakSavingsGross,
    kotakSavingsReturned,
    kotakSavingsNet,
    sbiTransfers,
    federalTransfers,
    cashWithdrawals,
    otherTransfers,
    directAxisExpenses,
    otherOutflows,
    totalOutflows,
    netSalaryRemaining,
    percentSalaryRemaining,
    currentAxisBalance,
    historicalAxisBalanceAtEnd,
    allocationBreakdown,
    sbiDetails: {
      transferredFromAxis: sbiTransfers,
      percentageOfSalary: calcPct(sbiTransfers),
      actualExpensesFromSBI,
      remainingBalance: sbiAccount ? Math.round(sbiAccount.balance * 100) / 100 : 0,
      unspentAllocation: Math.max(0, Math.round((sbiTransfers - actualExpensesFromSBI) * 100) / 100),
    },
    federalDetails: {
      transferredFromAxis: federalTransfers,
      percentageOfSalary: calcPct(federalTransfers),
      actualExpensesFromFederal,
      remainingBalance: federalAccount ? Math.round(federalAccount.balance * 100) / 100 : 0,
      unspentAllocation: Math.max(0, Math.round((federalTransfers - actualExpensesFromFederal) * 100) / 100),
    },
    kotakSavingsDetails: {
      grossTransfers: kotakSavingsGross,
      returnedTransfers: kotakSavingsReturned,
      netSavings: kotakSavingsNet,
      percentageOfSalary: calcPct(kotakSavingsGross),
      remainingBalance: detected.kotak ? Math.round(detected.kotak.balance * 100) / 100 : 0,
    },
    classifiedTransactions: classifiedList,
  }
}
