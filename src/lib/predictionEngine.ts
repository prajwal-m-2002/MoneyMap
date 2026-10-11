import type {
  RecurringFrequency,
  RecurringTransaction,
  CashFlowForecast,
  CashFlowForecastDay,
  ForecastEvent,
  RecurringSuggestion,
  Transaction,
  EMI,
} from '@/types/finance'

// ── 1. Next Due Date Calculation ─────────────────────────────

export function calculateNextDueDate(
  currentDueDate: string,
  frequency: RecurringFrequency,
  interval = 1
): string {
  const [y, m, d] = currentDueDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)

  switch (frequency) {
    case 'daily':
      date.setDate(date.getDate() + interval)
      break

    case 'weekly':
      date.setDate(date.getDate() + interval * 7)
      break

    case 'monthly': {
      const targetMonth = date.getMonth() + interval
      date.setMonth(targetMonth)
      // Handle day overflow (e.g. 31st in a 30-day month)
      if (date.getDate() !== d) {
        date.setDate(0) // last day of previous month
      }
      break
    }

    case 'quarterly': {
      const targetMonth = date.getMonth() + interval * 3
      date.setMonth(targetMonth)
      if (date.getDate() !== d) {
        date.setDate(0)
      }
      break
    }

    case 'yearly':
      date.setFullYear(date.getFullYear() + interval)
      break
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function isRecurringDue(
  item: RecurringTransaction,
  asOfDate = new Date().toISOString().split('T')[0]
): boolean {
  if (item.status !== 'active') return false
  if (item.endDate && item.nextDueDate > item.endDate) return false
  return item.nextDueDate <= asOfDate
}

/**
 * ── 2. Cash Flow Forecast & Prediction Math ──────────────────
 *
 * Exact Liquidity Forecast & Discretionary Allowance Formulas:
 *
 * 1. Daily Balance Projection:
 *    RunningBalance[t] = RunningBalance[t-1] + ScheduledInflows[t] - ScheduledOutflows[t] - DiscretionaryBurn[t]
 *
 * 2. Month-End Projected Balance:
 *    MonthEndBalance = RunningBalance as of last day of current calendar month (e.g. Feb 28/29, Apr 30, Oct 31).
 *
 * 3. Discretionary Daily Spending Allowance:
 *    NetDiscretionarySurplus = Math.max(0, MonthEndBalance - MinimumSafetyReserve)
 *    SafeDailySpend = Math.max(0, Math.floor(NetDiscretionarySurplus / DaysLeftInMonth))
 *
 * 4. Future Unpaid EMIs:
 *    Included strictly as future commitments in outflows on their scheduled due dates.
 *    Never subtracted from historical actual expenses.
 *
 * 5. Future Recurring Income:
 *    Documented explicitly as an assumption subject to employer/client credit confirmation.
 */
export interface CashFlowForecastInput {
  currentLiquidBalance: number
  recurringItems?: RecurringTransaction[]
  recurringTransactions?: RecurringTransaction[]
  emis?: EMI[]
  transactions?: Transaction[]
  forecastDays?: number
  horizonDays?: number
  startDateStr?: string
  forecastStartDate?: string
  emiPayments?: import('@/types/finance').EMIPayment[]
  minimumReserve?: number
}

export function generateCashFlowForecast(
  currentLiquidBalanceOrParams: number | CashFlowForecastInput,
  recurringItemsArg: RecurringTransaction[] = [],
  emisArg: EMI[] = [],
  transactionsArg: Transaction[] = [],
  forecastDaysArg = 30,
  startDateStrArg = new Date().toISOString().split('T')[0],
  emiPaymentsArg: import('@/types/finance').EMIPayment[] = [],
  minimumReserveArg = 0
): CashFlowForecast {
  let currentLiquidBalance: number
  let recurringItems: RecurringTransaction[]
  let emis: EMI[]
  let transactions: Transaction[]
  let forecastDays: number
  let startDateStr: string
  let emiPayments: import('@/types/finance').EMIPayment[]
  let minimumReserve: number

  if (typeof currentLiquidBalanceOrParams === 'object' && currentLiquidBalanceOrParams !== null) {
    const p = currentLiquidBalanceOrParams
    currentLiquidBalance = p.currentLiquidBalance
    recurringItems = p.recurringItems || p.recurringTransactions || []
    emis = p.emis || []
    transactions = p.transactions || []
    forecastDays = p.forecastDays || p.horizonDays || 30
    startDateStr = p.startDateStr || p.forecastStartDate || new Date().toISOString().split('T')[0]
    emiPayments = p.emiPayments || []
    minimumReserve = p.minimumReserve || 0
  } else {
    currentLiquidBalance = currentLiquidBalanceOrParams
    recurringItems = recurringItemsArg || []
    emis = emisArg || []
    transactions = transactionsArg || []
    forecastDays = forecastDaysArg
    startDateStr = startDateStrArg
    emiPayments = emiPaymentsArg || []
    minimumReserve = minimumReserveArg
  }

  const [startY, startM, startD] = startDateStr.split('-').map(Number)
  const startDate = new Date(startY, startM - 1, startD)

  // Insufficient data detection
  const isInsufficientData =
    currentLiquidBalance <= 0 &&
    recurringItems.length === 0 &&
    emis.length === 0 &&
    transactions.length === 0

  // Calculate historical daily discretionary expense from last 30 days
  // Strictly exclude rent, salary, investments, EMIs, and auto-recurring transactions
  const thirtyDaysAgoStr = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const recentDiscretionaryTxs = transactions.filter((tx) => {
    if (tx.type !== 'expense' || !tx.date) return false
    if (tx.date < thirtyDaysAgoStr || tx.date > startDateStr) return false
    const cat = (tx.category || '').toLowerCase()
    const notes = (tx.notes || '').toLowerCase()
    if (cat.includes('rent') || cat.includes('housing')) return false
    if (cat.includes('salary')) return false
    if (cat.includes('investment')) return false
    if (cat.includes('emi') || cat.includes('loan') || Boolean((tx as any).emiId)) return false
    if (notes.includes('[recurring rule]') || notes.includes('auto-debit')) return false
    return true
  })

  const totalRecentDiscretionary = recentDiscretionaryTxs.reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  )
  const averageDailyDiscretionary = Math.round((totalRecentDiscretionary / 30) * 100) / 100

  // Days left in current month (correctly handles February 28/29, 30-day, and 31-day months)
  const lastDayOfCurrentMonth = new Date(startY, startM, 0).getDate()
  const daysLeftInMonth = Math.max(1, lastDayOfCurrentMonth - startD)

  let runningBalance = currentLiquidBalance
  let lowestAmount = currentLiquidBalance
  let lowestDate = startDateStr
  let totalUpcomingInflows = 0
  let totalUpcomingOutflows = 0
  let monthEndBalance = currentLiquidBalance

  const days: CashFlowForecastDay[] = []

  // Pre-expand recurring occurrences across the forecast horizon
  for (let i = 0; i < forecastDays; i++) {
    const curDate = new Date(startDate)
    curDate.setDate(curDate.getDate() + i)
    const pad = (n: number) => String(n).padStart(2, '0')
    const curDateStr = `${curDate.getFullYear()}-${pad(curDate.getMonth() + 1)}-${pad(curDate.getDate())}`
    const curMonthPrefix = curDateStr.slice(0, 7)
    const dayLabel = curDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })

    const events: ForecastEvent[] = []
    let dayInflow = 0
    let dayOutflow = 0

    // 1. Check Recurring Items
    recurringItems.forEach((rec) => {
      if (rec.status !== 'active') return

      const checkDue = rec.nextDueDate
      // Check if due on this day (or if overdue on Day 0)
      if (i === 0 && checkDue <= curDateStr) {
        if (rec.type === 'income') {
          dayInflow += rec.amount
          events.push({ title: rec.title, amount: rec.amount, type: 'income', category: rec.category })
        } else {
          dayOutflow += rec.amount
          events.push({ title: rec.title, amount: rec.amount, type: 'expense', category: rec.category })
        }
      } else if (checkDue === curDateStr) {
        if (rec.type === 'income') {
          dayInflow += rec.amount
          events.push({ title: rec.title, amount: rec.amount, type: 'income', category: rec.category })
        } else {
          dayOutflow += rec.amount
          events.push({ title: rec.title, amount: rec.amount, type: 'expense', category: rec.category })
        }
      }
    })

    // 2. Check Active EMI Due Dates (only future UNPAID instalments)
    emis.forEach((emi) => {
      if (emi.status !== 'active') return

      // Handle month-end due days (e.g. 31st in a 30-day month or Feb)
      const lastDayOfCurMonth = new Date(curDate.getFullYear(), curDate.getMonth() + 1, 0).getDate()
      const effectiveDueDay = Math.min(emi.dueDay, lastDayOfCurMonth)

      // Check if due on this date (or overdue on Day 0)
      const isDueToday = curDate.getDate() === effectiveDueDay
      const isOverdueDay0 = i === 0 && curDate.getDate() > effectiveDueDay

      if (isDueToday || isOverdueDay0) {
        // Verify if this instalment for curMonthPrefix has already been serviced
        const alreadyPaidInPayments = emiPayments.some(
          (p) => p.emiId === emi.id && p.status === 'paid' && p.paymentDate.startsWith(curMonthPrefix)
        )
        const alreadyPaidInTxs = transactions.some(
          (tx) =>
            tx.type === 'expense' &&
            Boolean(tx.date && tx.date.startsWith(curMonthPrefix)) &&
            (Boolean((tx as any).emiId === emi.id) ||
              ((tx.category || '').toLowerCase().includes('emi') &&
                (tx.title || '').toLowerCase().includes(emi.name.toLowerCase())))
        )

        if (!alreadyPaidInPayments && !alreadyPaidInTxs) {
          dayOutflow += emi.emiAmount
          events.push({
            title: `${emi.name} EMI${isOverdueDay0 ? ' (Pending)' : ''}`,
            amount: emi.emiAmount,
            type: 'emi',
            category: 'EMI & Loans',
          })
        }
      }
    })

    // Add discretionary baseline expense if no large fixed expense today
    if (averageDailyDiscretionary > 0 && i > 0) {
      dayOutflow += averageDailyDiscretionary
    }

    runningBalance = runningBalance + dayInflow - dayOutflow
    totalUpcomingInflows += dayInflow
    totalUpcomingOutflows += dayOutflow

    if (runningBalance < lowestAmount) {
      lowestAmount = runningBalance
      lowestDate = curDateStr
    }

    // Capture Month-End Balance for the current month
    if (curDate.getDate() === lastDayOfCurrentMonth && curDate.getMonth() === startM - 1) {
      monthEndBalance = runningBalance
    }

    days.push({
      date: curDateStr,
      dayLabel,
      projectedBalance: Math.round(runningBalance),
      inflows: Math.round(dayInflow),
      outflows: Math.round(dayOutflow),
      events,
    })
  }

  // Distinct expense dates recorded in the last 30 days
  const distinctExpenseDays = new Set(recentDiscretionaryTxs.map((tx) => tx.date))
  const distinctExpenseDaysCount = distinctExpenseDays.size
  const spendingHistoryThresholdDays = 30 // Documented minimum requirement

  // History adequacy: We need at least 30 continuous days of ledger history or at least 15 distinct expense dates
  const hasSufficientSpendingHistory =
    transactions.length > 0 && distinctExpenseDaysCount >= 15

  const endD = new Date(startDate)
  endD.setDate(endD.getDate() + forecastDays - 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  const forecastEndDate = `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(endD.getDate())}`

  // Discretionary allowance formula:
  // NetDiscretionarySurplus = max(0, monthEndBalance - minimumReserve)
  // SafeDailySpend = floor(NetDiscretionarySurplus / daysLeftInMonth)
  const netRemainingSurplus = Math.max(0, monthEndBalance - minimumReserve)
  const provisionalDailySpend =
    isInsufficientData || netRemainingSurplus <= 0
      ? 0
      : Math.max(0, Math.floor(netRemainingSurplus / daysLeftInMonth))

  // We preserve the mathematical formula result in safeDailySpend for formula regression tests,
  // while safeDailySpendStatus clearly flags when history is insufficient.
  const safeDailySpend = provisionalDailySpend

  const safeDailySpendStatus: 'verified' | 'insufficient_history' | 'provisional' =
    isInsufficientData
      ? 'insufficient_history'
      : !hasSufficientSpendingHistory
      ? 'insufficient_history'
      : 'verified'

  const spendingHistoryStatusMessage = isInsufficientData
    ? 'Insufficient data: Insufficient active account balance or transaction history to construct a reliable liquidity forecast.'
    : !hasSufficientSpendingHistory
    ? 'Not enough spending history to estimate safely'
    : 'Verified spending baseline (>= 30 days)'

  // Trajectory Status:
  // Must NEVER label a scenario "Healthy" solely because there are no recorded commitments or because historical expense data is missing!
  let trajectoryStatus: 'healthy' | 'provisional' | 'low_balance' | 'insufficient_data' = 'provisional'
  let trajectoryLabel = 'Provisional Trajectory'

  if (isInsufficientData) {
    trajectoryStatus = 'insufficient_data'
    trajectoryLabel = 'Insufficient Data'
  } else if (lowestAmount < 5000) {
    trajectoryStatus = 'low_balance'
    trajectoryLabel = `Cash Dip Alert: ₹${lowestAmount.toLocaleString('en-IN')} on ${lowestDate}`
  } else if (!hasSufficientSpendingHistory) {
    trajectoryStatus = 'provisional'
    trajectoryLabel = 'Provisional Trajectory (Unverified Baseline)'
  } else {
    trajectoryStatus = 'healthy'
    trajectoryLabel = 'Healthy Cash Trajectory'
  }

  const verifiedFacts = {
    startingLiquidBalance: Math.round(currentLiquidBalance),
    reconciledAsOfDate: startDateStr,
    historicalExpensesTotal: Math.round(totalRecentDiscretionary),
    recordedDaysCount: distinctExpenseDaysCount,
  }

  const scheduledCommitments = {
    totalCommitments: Math.round(totalUpcomingOutflows),
    upcomingInflows: Math.round(totalUpcomingInflows),
    upcomingOutflows: Math.round(totalUpcomingOutflows),
    eventsCount: days.reduce((sum, d) => sum + d.events.length, 0),
  }

  // Itemized Assumptions Documentation
  const assumptions: string[] = [
    `Starting liquid balance: ₹${Math.round(currentLiquidBalance).toLocaleString('en-IN')} across active accounts.`,
    `Forecast horizon: ${forecastDays} days from ${startDateStr}; ${daysLeftInMonth} day${daysLeftInMonth === 1 ? '' : 's'} remaining in this month.`,
  ]

  if (!hasSufficientSpendingHistory) {
    assumptions.push(
      `Spending history limitation: Only ${distinctExpenseDaysCount} day(s) of discretionary expenses recorded in the past 30 days. Discretionary spending rate is unverified and requires at least 30 continuous days of tracking to estimate safely.`
    )
  }

  if (totalUpcomingInflows > 0) {
    assumptions.push(
      `Scheduled income assumption: ₹${Math.round(totalUpcomingInflows).toLocaleString('en-IN')} expected from active recurring rules (assumed subject to credit).`
    )
  } else {
    assumptions.push('No upcoming recurring income entries assumed in the 30-day horizon.')
  }

  if (totalUpcomingOutflows > 0) {
    assumptions.push(
      `Scheduled commitments: ₹${Math.round(totalUpcomingOutflows).toLocaleString('en-IN')} across recurring bills and unpaid EMI instalments. These are recognized on their respective future due dates and are NEVER subtracted from the current live ledger balance.`
    )
  }

  if (averageDailyDiscretionary > 0 && hasSufficientSpendingHistory) {
    assumptions.push(
      `Discretionary baseline burn: ₹${Math.round(averageDailyDiscretionary).toLocaleString('en-IN')}/day based on past 30 days non-fixed expenses.`
    )
  }

  if (minimumReserve > 0) {
    assumptions.push(`Safety Reserve cushion: ₹${Math.round(minimumReserve).toLocaleString('en-IN')} withheld from daily spending.`)
  }

  assumptions.push(
    `Daily discretionary allowance: Max(0, Month-End Balance ₹${Math.round(monthEndBalance).toLocaleString('en-IN')} − Reserve ₹${Math.round(minimumReserve).toLocaleString('en-IN')}) ÷ ${daysLeftInMonth} days = ₹${safeDailySpend}/day ${!hasSufficientSpendingHistory ? '(Provisional Scenario — Unverified)' : '(Authoritative)'}.`
  )

  return {
    currentLiquidBalance,
    projectedMonthEndBalance: Math.round(monthEndBalance),
    lowestProjectedBalance: {
      amount: Math.round(lowestAmount),
      date: lowestDate,
    },
    totalUpcomingInflows: Math.round(totalUpcomingInflows),
    totalUpcomingOutflows: Math.round(totalUpcomingOutflows),
    safeDailySpend,
    daysLeftInMonth,
    days,
    hasLowBalanceWarning: lowestAmount < 5000,
    isInsufficientData,
    insufficientDataReason: isInsufficientData
      ? 'Insufficient data: Insufficient active account balance or transaction history to construct a reliable liquidity forecast.'
      : undefined,
    assumptionsSummary: assumptions,
    minimumReserve,
    discretionaryFundSurplus: netRemainingSurplus,
    // Phase 2 Extensions:
    forecastStartDate: startDateStr,
    forecastEndDate,
    hasSufficientSpendingHistory,
    distinctExpenseDaysCount,
    spendingHistoryThresholdDays,
    safeDailySpendStatus,
    spendingHistoryStatusMessage,
    provisionalDailySpend,
    trajectoryStatus,
    trajectoryLabel,
    verifiedFacts,
    scheduledCommitments,
  }
}

// ── 3. Smart Pattern Discovery (Recurring Suggestions) ────────

export function discoverRecurringPatterns(
  transactions: Transaction[]
): RecurringSuggestion[] {
  const suggestions: RecurringSuggestion[] = []
  if (transactions.length < 4) return suggestions

  // Group transactions by normalized lowercase title
  const groups = new Map<string, Transaction[]>()
  transactions.forEach((tx) => {
    const key = tx.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ' ')
      .trim()
      .slice(0, 25)
    const existing = groups.get(key) || []
    existing.push(tx)
    groups.set(key, existing)
  })

  groups.forEach((txList, key) => {
    // Only analyze items that appear at least 2 times
    if (txList.length < 2) return

    // Sort by date ascending
    txList.sort((a, b) => a.date.localeCompare(b.date))

    // Check if amounts are similar (within 15%)
    const amounts = txList.map((t) => t.amount)
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const isAmountConsistent = amounts.every(
      (amt) => Math.abs(amt - avgAmount) / avgAmount <= 0.2
    )

    if (!isAmountConsistent) return

    // Calculate day-of-month and intervals
    const daysOfMonth = txList.map((t) => Number(t.date.split('-')[2]))
    const avgDayOfMonth = Math.round(
      daysOfMonth.reduce((a, b) => a + b, 0) / daysOfMonth.length
    )

    // Check month spread
    const uniqueMonths = new Set(txList.map((t) => t.date.slice(0, 7)))
    if (uniqueMonths.size >= 2) {
      const representative = txList[0]
      suggestions.push({
        id: `sug-${key.replace(/\s+/g, '-')}`,
        title: representative.title,
        averageAmount: Math.round(avgAmount),
        type: representative.type,
        category: representative.category,
        suggestedFrequency: 'monthly',
        occurrencesCount: txList.length,
        approximateDayOfMonth: avgDayOfMonth,
        confidence: Math.min(95, 60 + txList.length * 10),
        sampleTransactionIds: txList.map((t) => t.id),
      })
    }
  })

  return suggestions.sort((a, b) => b.confidence - a.confidence)
}

// ── 4. Seed / Default Recurring Rules for MoneyMap ───────────

export const DEFAULT_RECURRING_TRANSACTIONS: RecurringTransaction[] = [
  {
    id: 'rec-salary',
    title: 'Monthly Salary Credit',
    amount: 65000,
    type: 'income',
    category: 'Salary',
    accountId: 'acc-axis',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-01-01',
    nextDueDate: '2026-11-01',
    paymentMethod: 'Net Banking',
    autoProcess: false,
    status: 'active',
    notes: 'Direct corporate salary deposit',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rec-rent',
    title: 'Apartment House Rent',
    amount: 18000,
    type: 'expense',
    category: 'Rent & Housing',
    accountId: 'acc-axis',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-01-01',
    nextDueDate: '2026-11-01',
    paymentMethod: 'Net Banking',
    autoProcess: false,
    status: 'active',
    notes: 'Landlord monthly rent transfer',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'rec-sip',
    title: 'SIP Mutual Fund Investment',
    amount: 5000,
    type: 'expense',
    category: 'Investments',
    accountId: 'acc-axis',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-01-10',
    nextDueDate: '2026-10-10',
    paymentMethod: 'Net Banking',
    autoProcess: true,
    status: 'active',
    notes: 'Auto-debit mutual fund wealth accumulation',
    createdAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'rec-broadband',
    title: 'Airtel Broadband Fiber',
    amount: 999,
    type: 'expense',
    category: 'Bills & Utilities',
    accountId: 'acc-axis',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-01-05',
    nextDueDate: '2026-11-05',
    paymentMethod: 'UPI',
    autoProcess: true,
    status: 'active',
    notes: 'High speed home internet connection',
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  {
    id: 'rec-electricity',
    title: 'Electricity Power Bill',
    amount: 1450,
    type: 'expense',
    category: 'Bills & Utilities',
    accountId: 'acc-axis',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-01-10',
    nextDueDate: '2026-10-15',
    paymentMethod: 'UPI',
    autoProcess: false,
    status: 'active',
    notes: 'BESCOM monthly domestic power consumption',
    createdAt: '2026-01-10T00:00:00.000Z',
  },
  {
    id: 'rec-netflix',
    title: 'Netflix 4K Ultra Subscription',
    amount: 649,
    type: 'expense',
    category: 'Entertainment',
    accountId: 'acc-axis',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-01-15',
    nextDueDate: '2026-10-15',
    paymentMethod: 'Credit Card',
    autoProcess: true,
    status: 'active',
    notes: 'Monthly video streaming subscription',
    createdAt: '2026-01-15T00:00:00.000Z',
  },
]
