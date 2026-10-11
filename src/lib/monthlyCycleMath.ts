import type {
  Account,
  Transaction,
  MonthlyBudgetPlan,
  MonthlyBudgetAllocationProgress,
} from '@/types/finance'
import {
  getDefaultMonthlyBudgetPlan,
  calculateMonthlyBudgetAllocation,
} from '@/lib/monthlyBudgetMath'

/**
 * Returns the exact number of calendar days in a given year and month (1-indexed).
 * Correctly accounts for leap years (e.g. Feb 2024 has 29 days, Feb 2026 has 28 days)
 * and months with 30 or 31 days.
 */
export function getLastCalendarDayOfMonth(year: number, month1Indexed: number): number {
  return new Date(Date.UTC(year, month1Indexed, 0)).getUTCDate()
}

export interface MonthBounds {
  month: string // YYYY-MM
  year: number
  monthNumber: number // 1-12
  startDate: string // YYYY-MM-01
  endDate: string // YYYY-MM-lastDay
  lastDay: number
}

/**
 * Parses a YYYY-MM string and returns comprehensive calendar boundary information.
 */
export function getMonthBounds(monthStr: string): MonthBounds {
  const [yearStr, monthNumStr] = monthStr.split('-')
  const year = parseInt(yearStr, 10)
  const monthNumber = parseInt(monthNumStr, 10)
  const lastDay = getLastCalendarDayOfMonth(year, monthNumber)
  const pad = (n: number) => String(n).padStart(2, '0')

  return {
    month: monthStr,
    year,
    monthNumber,
    startDate: `${yearStr}-${pad(monthNumber)}-01`,
    endDate: `${yearStr}-${pad(monthNumber)}-${pad(lastDay)}`,
    lastDay,
  }
}

/**
 * Returns the previous month string in YYYY-MM format, correctly handling
 * December to January year boundaries (e.g. 2027-01 -> 2026-12).
 */
export function getPreviousMonthStr(monthStr: string): string {
  const { year, monthNumber } = getMonthBounds(monthStr)
  if (monthNumber === 1) {
    return `${year - 1}-12`
  }
  return `${year}-${String(monthNumber - 1).padStart(2, '0')}`
}

/**
 * Returns the next month string in YYYY-MM format, correctly handling
 * year-end transitions (e.g. 2026-12 -> 2027-01).
 */
export function getNextMonthStr(monthStr: string): string {
  const { year, monthNumber } = getMonthBounds(monthStr)
  if (monthNumber === 12) {
    return `${year + 1}-01`
  }
  return `${year}-${String(monthNumber + 1).padStart(2, '0')}`
}

/**
 * Human-readable month label (e.g. 'October 2026').
 */
export function formatMonthLabel(monthStr: string): string {
  const { year, monthNumber } = getMonthBounds(monthStr)
  const date = new Date(Date.UTC(year, monthNumber - 1, 15))
  return new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export interface AccountMonthBalanceResult {
  accountId: string
  accountName: string
  openingBalance: number
  inflows: number
  outflows: number
  closingBalance: number
  salaryReceived: number
  internalTransfersIn: number
  internalTransfersOut: number
  purchasesAndExpenses: number
  isFirstTrackingMonth: boolean
  hasMissingPriorHistory: boolean
}

/**
 * Calculates opening and closing balances for a single account across a target month.
 *
 * Strict Accounting Integrity:
 * 1. Opening balance is a baseline state; never treated as income or an expense.
 * 2. Month-end carry-forward balance of Month M is the exact Opening Balance of Month M+1.
 * 3. The first tracking month uses manually entered starting balances and discloses missing earlier history.
 * 4. Never invents transactions or overwrites confirmed balances.
 */
export function calculateAccountBalancesForMonth(
  account: Account,
  transactions: Transaction[],
  targetMonth: string
): AccountMonthBalanceResult {
  const targetBounds = getMonthBounds(targetMonth)

  // Find earliest transaction date involving this account
  let earliestTxDate: string | null = null
  for (const tx of transactions) {
    if (
      tx.date &&
      (tx.accountId === account.id ||
        tx.toAccountId === account.id ||
        (tx as any).fromAccountId === account.id)
    ) {
      if (!earliestTxDate || tx.date < earliestTxDate) {
        earliestTxDate = tx.date
      }
    }
  }

  // Identify tracking start date
  const explicitTrackStart = account.trackingStartDate || account.openingBalanceDate
  let trackStart = explicitTrackStart || earliestTxDate || '2026-10-10'
  if (earliestTxDate && earliestTxDate < trackStart) {
    trackStart = earliestTxDate
  }
  const firstTrackMonth = trackStart.slice(0, 7)

  const isFirstTrackingMonth = targetMonth === firstTrackMonth
  const isBeforeTracking = targetMonth < firstTrackMonth
  const hasMissingPriorHistory =
    isFirstTrackingMonth && trackStart > targetBounds.startDate

  // Determine chronological list of months from firstTrackMonth up to targetMonth
  if (isBeforeTracking) {
    return {
      accountId: account.id,
      accountName: account.name,
      openingBalance: 0,
      inflows: 0,
      outflows: 0,
      closingBalance: 0,
      salaryReceived: 0,
      internalTransfersIn: 0,
      internalTransfersOut: 0,
      purchasesAndExpenses: 0,
      isFirstTrackingMonth: false,
      hasMissingPriorHistory: true,
    }
  }

  // Iterate chronologically to carry balances forward with absolute mathematical precision
  let currentMonthCursor = firstTrackMonth
  let runningOpeningBalance = 0
  const openingBalVal = Number(account.openingBalance) || 0
  const openingBalDate = account.openingBalanceDate || account.trackingStartDate

  // If opening balance date is on or before the first tracking month, it enters on firstTrackMonth
  if (!openingBalDate || openingBalDate.slice(0, 7) <= firstTrackMonth) {
    runningOpeningBalance = openingBalVal
  }
  let runningClosingBalance = runningOpeningBalance

  while (currentMonthCursor <= targetMonth) {
    const isFirstMonth = currentMonthCursor === firstTrackMonth

    // If opening balance becomes active in this cursor month (and was not yet applied)
    if (
      openingBalDate &&
      openingBalDate.slice(0, 7) === currentMonthCursor &&
      openingBalDate.slice(0, 7) > firstTrackMonth
    ) {
      runningOpeningBalance += openingBalVal
    }

    let monthInflows = 0
    let monthOutflows = 0
    let salReceived = 0
    let transIn = 0
    let transOut = 0
    let expenses = 0

    // Filter transactions for cursor month on or after baseline start date
    const cursorTxs = transactions.filter((tx) => {
      if (!tx.date) return false
      if (!tx.date.startsWith(currentMonthCursor)) return false
      if (isFirstMonth && tx.date < trackStart) return false
      return true
    })

    for (const tx of cursorTxs) {
      const amt = Number(tx.amount) || 0
      const isSalary =
        tx.type === 'income' &&
        ((tx.category || '').toLowerCase().includes('salary') ||
          (tx.title || '').toLowerCase().includes('salary'))

      if (tx.type === 'income' && tx.accountId === account.id) {
        monthInflows += amt
        if (isSalary) salReceived += amt
      } else if (tx.type === 'expense' && tx.accountId === account.id) {
        monthOutflows += amt
        expenses += amt
      } else if (tx.type === 'transfer') {
        if (tx.toAccountId === account.id) {
          monthInflows += amt
          transIn += amt
        }
        if (tx.accountId === account.id || tx.fromAccountId === account.id) {
          monthOutflows += amt
          transOut += amt
        }
      }
    }

    runningClosingBalance = runningOpeningBalance + monthInflows - monthOutflows

    if (currentMonthCursor === targetMonth) {
      return {
        accountId: account.id,
        accountName: account.name,
        openingBalance: Math.round(runningOpeningBalance),
        inflows: Math.round(monthInflows),
        outflows: Math.round(monthOutflows),
        closingBalance: Math.round(runningClosingBalance),
        salaryReceived: Math.round(salReceived),
        internalTransfersIn: Math.round(transIn),
        internalTransfersOut: Math.round(transOut),
        purchasesAndExpenses: Math.round(expenses),
        isFirstTrackingMonth,
        hasMissingPriorHistory,
      }
    }

    // Carry forward to next month:
    // Opening balance of next month is strictly closing balance of current month!
    runningOpeningBalance = runningClosingBalance
    currentMonthCursor = getNextMonthStr(currentMonthCursor)
  }

  return {
    accountId: account.id,
    accountName: account.name,
    openingBalance: Math.round(runningOpeningBalance),
    inflows: 0,
    outflows: 0,
    closingBalance: Math.round(runningClosingBalance),
    salaryReceived: 0,
    internalTransfersIn: 0,
    internalTransfersOut: 0,
    purchasesAndExpenses: 0,
    isFirstTrackingMonth: false,
    hasMissingPriorHistory: false,
  }
}

export interface MonthlyCycleOverview {
  month: string // YYYY-MM
  monthLabel: string
  bounds: MonthBounds
  previousMonth: string
  nextMonth: string
  isFirstTrackingMonth: boolean
  hasMissingPriorHistory: boolean

  // Consolidated Figures
  previousMonthClosingBalance: number
  currentMonthOpeningBalance: number
  actualSalaryReceived: number
  salaryCreditDate: string | null
  isSalaryCredited: boolean
  isSalaryDelayed: boolean

  plannedAllocationsTotal: number
  actualTransfersCompletedTotal: number
  actualSpendingTotal: number
  currentBalancesTotal: number
  monthEndClosingBalance: number
  isMonthEnded: boolean
  closingBalanceLabel: string
  projectedMonthEndBalance: number

  // Itemized breakdowns
  accounts: AccountMonthBalanceResult[]
  budgetAllocations: MonthlyBudgetAllocationProgress[]
  plannedVsActualSummary: {
    totalPlanned: number
    totalTransferred: number
    totalSpent: number
    unallocatedRetained: number
  }
}

/**
 * Calculates the complete Monthly Overview and recurring salary-allocation state.
 */
export function calculateMonthlyCycleOverview(
  month: string,
  accounts: Account[],
  transactions: Transaction[],
  customPlan?: MonthlyBudgetPlan
): MonthlyCycleOverview {
  const bounds = getMonthBounds(month)
  const prevMonthStr = getPreviousMonthStr(month)
  const nextMonthStr = getNextMonthStr(month)

  // Calculate balances for each account in target month
  const accountResults: AccountMonthBalanceResult[] = accounts.map((acc) =>
    calculateAccountBalancesForMonth(acc, transactions, month)
  )

  // Calculate balances for each account in previous month
  const prevAccountResults: AccountMonthBalanceResult[] = accounts.map((acc) =>
    calculateAccountBalancesForMonth(acc, transactions, prevMonthStr)
  )

  const previousMonthClosingBalance = prevAccountResults.reduce(
    (sum, a) => sum + a.closingBalance,
    0
  )

  const currentMonthOpeningBalance = accountResults.reduce(
    (sum, a) => sum + a.openingBalance,
    0
  )

  const monthEndClosingBalance = accountResults.reduce(
    (sum, a) => sum + a.closingBalance,
    0
  )

  const currentBalancesTotal = accounts.reduce(
    (sum, a) => sum + (Number(a.balance) || 0),
    0
  )

  // Inspect actual salary transactions in target month (usually Axis Bank)
  let actualSalaryReceived = 0
  let salaryCreditDate: string | null = null

  const monthTxs = transactions.filter((tx) => {
    return tx.date && tx.date.startsWith(month)
  })

  for (const tx of monthTxs) {
    if (tx.type === 'income') {
      const isSal =
        (tx.category || '').toLowerCase().includes('salary') ||
        (tx.title || '').toLowerCase().includes('salary')
      if (isSal) {
        actualSalaryReceived += Number(tx.amount) || 0
        if (!salaryCreditDate || tx.date > salaryCreditDate) {
          salaryCreditDate = tx.date
        }
      }
    }
  }

  const isSalaryCredited = actualSalaryReceived > 0
  const isSalaryDelayed = !isSalaryCredited

  // Budget allocations for target month
  const plan =
    customPlan ||
    getDefaultMonthlyBudgetPlan(
      accounts,
      actualSalaryReceived > 0 ? actualSalaryReceived : 27000,
      month
    )

  const budgetSummary = calculateMonthlyBudgetAllocation({
    accounts,
    transactions,
    plan,
    month,
  })

  const actualTransfersCompletedTotal = accountResults.reduce(
    (sum, a) => sum + a.internalTransfersIn,
    0
  )

  const actualSpendingTotal = accountResults.reduce(
    (sum, a) => sum + a.purchasesAndExpenses,
    0
  )

  const isFirstTrackingMonth = accountResults.some((a) => a.isFirstTrackingMonth)
  const hasMissingPriorHistory = accountResults.some((a) => a.hasMissingPriorHistory)

  // Determine whether the month has ended or is ongoing
  const now = new Date()
  const systemToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const latestGlobalTxDate = transactions.reduce((max, tx) => (tx.date > max ? tx.date : max), '')
  const referenceDate = latestGlobalTxDate && latestGlobalTxDate > systemToday ? latestGlobalTxDate : systemToday
  const isMonthEnded = bounds.endDate < referenceDate
  const closingBalanceLabel = isMonthEnded ? 'Month-End Closing Balance' : 'Month-to-Date Closing Balance'

  let projectedMonthEndBalance = Math.round(monthEndClosingBalance)
  if (!isMonthEnded) {
    const refDay = referenceDate.startsWith(month)
      ? parseInt(referenceDate.slice(8, 10), 10)
      : Math.min(bounds.lastDay, Math.max(1, parseInt(systemToday.slice(8, 10), 10) || 1))
    const currentDay = Math.min(bounds.lastDay, Math.max(1, refDay))
    const daysRemaining = Math.max(0, bounds.lastDay - currentDay)
    const dailyBurnRate = currentDay > 0 ? actualSpendingTotal / currentDay : 0
    const projectedRemainingSpending = dailyBurnRate * daysRemaining
    const remainingSalaryToAdd = isSalaryCredited ? 0 : (plan?.expectedSalary || 0)
    projectedMonthEndBalance = Math.round(
      monthEndClosingBalance + remainingSalaryToAdd - projectedRemainingSpending
    )
  }

  return {
    month,
    monthLabel: formatMonthLabel(month),
    bounds,
    previousMonth: prevMonthStr,
    nextMonth: nextMonthStr,
    isFirstTrackingMonth,
    hasMissingPriorHistory,

    previousMonthClosingBalance: Math.round(previousMonthClosingBalance),
    currentMonthOpeningBalance: Math.round(currentMonthOpeningBalance),
    actualSalaryReceived: Math.round(actualSalaryReceived),
    salaryCreditDate,
    isSalaryCredited,
    isSalaryDelayed,

    plannedAllocationsTotal: budgetSummary.totalPlanned,
    actualTransfersCompletedTotal: Math.round(actualTransfersCompletedTotal),
    actualSpendingTotal: Math.round(actualSpendingTotal),
    currentBalancesTotal: Math.round(currentBalancesTotal),
    monthEndClosingBalance: Math.round(monthEndClosingBalance),
    isMonthEnded,
    closingBalanceLabel,
    projectedMonthEndBalance,

    accounts: accountResults,
    budgetAllocations: budgetSummary.items,
    plannedVsActualSummary: {
      totalPlanned: budgetSummary.totalPlanned,
      totalTransferred: budgetSummary.totalTransferred,
      totalSpent: budgetSummary.totalSpent,
      unallocatedRetained: budgetSummary.unallocatedPlanned,
    },
  }
}

/**
 * Storage key helper for saving and retrieving month-specific budget plans.
 */
export function getMonthlyPlanStorageKey(month: string): string {
  return `moneymap_monthly_plan_${month}`
}
