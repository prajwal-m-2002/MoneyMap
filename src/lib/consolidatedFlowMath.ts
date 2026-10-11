import type { Account, Transaction, Investment, EMI, EMIPayment } from '@/types/finance'

export type FlowPeriodPreset =
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'custom'

export interface FlowPeriodBounds {
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  label: string
  isCurrentMonth: boolean
}

/**
 * Calculates start and end date bounds for reporting period presets.
 */
export function getFlowPeriodBounds(
  preset: FlowPeriodPreset,
  customStart?: string,
  customEnd?: string
): FlowPeriodBounds {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  const pad = (n: number) => String(n).padStart(2, '0')

  switch (preset) {
    case 'this_month': {
      const startDate = `${year}-${pad(month + 1)}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const endDate = `${year}-${pad(month + 1)}-${pad(lastDay)}`
      return {
        startDate,
        endDate,
        label: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
        isCurrentMonth: true,
      }
    }
    case 'last_month': {
      const prevDate = new Date(year, month - 1, 1)
      const prevYear = prevDate.getFullYear()
      const prevMonth = prevDate.getMonth()
      const startDate = `${prevYear}-${pad(prevMonth + 1)}-01`
      const lastDay = new Date(prevYear, prevMonth + 1, 0).getDate()
      const endDate = `${prevYear}-${pad(prevMonth + 1)}-${pad(lastDay)}`
      return {
        startDate,
        endDate,
        label: prevDate.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
        isCurrentMonth: false,
      }
    }
    case 'last_3_months': {
      const startDateObj = new Date(year, month - 2, 1)
      const startDate = `${startDateObj.getFullYear()}-${pad(startDateObj.getMonth() + 1)}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const endDate = `${year}-${pad(month + 1)}-${pad(lastDay)}`
      return {
        startDate,
        endDate,
        label: 'Last 3 Months',
        isCurrentMonth: true,
      }
    }
    case 'last_6_months': {
      const startDateObj = new Date(year, month - 5, 1)
      const startDate = `${startDateObj.getFullYear()}-${pad(startDateObj.getMonth() + 1)}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const endDate = `${year}-${pad(month + 1)}-${pad(lastDay)}`
      return {
        startDate,
        endDate,
        label: 'Last 6 Months',
        isCurrentMonth: true,
      }
    }
    case 'custom': {
      const s = customStart || `${year}-${pad(month + 1)}-01`
      const e = customEnd || `${year}-${pad(month + 1)}-${pad(new Date(year, month + 1, 0).getDate())}`
      return {
        startDate: s <= e ? s : e,
        endDate: s <= e ? e : s,
        label: `${s} to ${e}`,
        isCurrentMonth: false,
      }
    }
  }
}

/**
 * Account classification order matching exact specification:
 * 1. Axis Bank (Salary receiving account)
 * 2. Kotak Bank (Primary savings account)
 * 3. SBI (EMI and small purchases)
 * 4. Federal Bank (Larger purchases & spending)
 * 5. Physical Cash
 * 6. Other active accounts
 */
export function sortAccountsByRequiredOrder(accounts: Account[]): Account[] {
  const getScore = (acc: Account): number => {
    const name = acc.name.toLowerCase()
    if (/axis/i.test(name) || acc.type === 'salary') return 1
    if (/kotak/i.test(name)) return 2
    if (/sbi|state bank/i.test(name)) return 3
    if (/federal/i.test(name)) return 4
    if (acc.type === 'cash' || /cash/i.test(name)) return 5
    return 6
  }

  return [...accounts].sort((a, b) => {
    const scoreA = getScore(a)
    const scoreB = getScore(b)
    if (scoreA !== scoreB) return scoreA - scoreB
    return a.name.localeCompare(b.name)
  })
}

export interface DestinationAllocationItem {
  destinationId: string
  destinationName: string
  destinationType: string
  amount: number
  txCount: number
  percentageOfSalary: number | null
  color: string
}

export interface ClassifiedAccountTransaction {
  transaction: Transaction
  date: string
  description: string
  type: 'income' | 'expense' | 'transfer'
  destinationOrSource: string
  amount: number
  isOutflow: boolean
  classification: string
  runningBalance: number
}

export interface SingleAccountFlowSummary {
  account: Account
  openingBalance: number
  effectiveOpeningDate?: string
  ledgerCoverageStartDate?: string
  isPeriodPartiallyCovered: boolean
  partialCoverageNotice?: string
  isPeriodBeforeCoverage: boolean
  isOpeningDateAfterPeriod?: boolean
  hasHistoricalDataWarning: boolean
  historicalWarningMessage?: string
  totalMoneyReceived: number
  externalMoneyReceived: number
  salaryReceived: number
  otherIncomeReceived: number
  transfersIn: number
  transfersFromAxis: number
  transfersOut: number
  transfersToKotak: number
  transfersToSBI: number
  transfersToFederal: number
  transfersToCash: number
  otherTransfersOut: number
  actualExpenses: number
  directExpenses: number
  emiExpenses: number
  otherOutflows: number
  totalOutflows: number
  closingBalance: number
  liveBalance: number
  isReconciled: boolean
  reconciliationDiscrepancy: number
  // 3-tier Reconciliation Status
  isLedgerBalanced: boolean
  isBalanceMatchedToLive: boolean
  isStatementReconciled: boolean
  statementReconciledDate?: string
  reconciliationStatusLabel: string
  asOfDate: string
  latestTransactionDate?: string
  isPeriodEndingInFuture: boolean
  closingBalanceLabel: string
  openingBalanceSemantics?: string
  allocationBreakdown: DestinationAllocationItem[]
  transactions: ClassifiedAccountTransaction[]
  // Kotak Savings specific analysis
  kotakSavingsAnalysis?: {
    grossSavings: number
    returnedToAxis: number
    netSavings: number
    savingsPercentageOfSalary: number | null
  }
}

export interface ConsolidatedFlowSummary {
  period: FlowPeriodBounds
  openingBankAndCashBalance: number
  externalIncome: number
  salaryIncome: number
  otherIncome: number
  actualExpenses: number
  internalTransferEventsCount: number
  internalTransfersTotal: number
  closingBankAndCashBalance: number
  investmentValue: number
  investmentValuationDate: string
  liabilities: number
  netWorth: number
  isReconciled: boolean
  isPeriodPartiallyCovered: boolean
  partialCoverageNotice?: string
  hasHistoricalDataWarning: boolean
  isLedgerCoverageUnavailable?: boolean
  historicalWarningMessage?: string
  reconciliationDiscrepancy: number
  asOfDate: string
  latestTransactionDate?: string
  isPeriodEndingInFuture: boolean
  closingBalanceLabel: string
  openingBalanceSemantics?: string
  ledgerCoverageStartDate?: string
  effectiveOpeningDate?: string
  // 3-tier Reconciliation Status
  isLedgerBalanced: boolean
  isBalanceMatchedToLive: boolean
  isStatementReconciled: boolean
  statementReconciliationCount: number
  reconciliationStatusLabel: string
  accountSummaries: SingleAccountFlowSummary[]
}

/**
 * Checks whether an incoming transaction is salary
 */
function isSalaryTransaction(tx: Transaction): boolean {
  if (tx.type !== 'income') return false
  const cat = (tx.category || '').toLowerCase()
  const title = (tx.title || '').toLowerCase()
  const notes = (tx.notes || '').toLowerCase()

  return (
    cat.includes('salary') ||
    title.includes('salary') ||
    notes.includes('salary') ||
    title.includes('payroll') ||
    title.includes('stipend')
  )
}

/**
 * Checks whether an expense transaction is an EMI payment
 */
function isEMITransaction(tx: Transaction): boolean {
  if (tx.type !== 'expense') return false
  const cat = (tx.category || '').toLowerCase()
  const title = (tx.title || '').toLowerCase()
  const notes = (tx.notes || '').toLowerCase()

  return (
    cat.includes('emi') ||
    cat.includes('loan') ||
    title.includes('emi') ||
    notes.includes('emi') ||
    Boolean((tx as any).emiId)
  )
}

/**
 * Compute opening balance of an account as of period start date.
 * If period starts on YYYY-MM-DD, the opening balance is the balance
 * right before any transactions on that date.
 */
export function getAccountBalanceAtPeriodStart(
  account: Account,
  transactions: Transaction[],
  periodStartDate: string
): number {
  const opening = Number(account.openingBalance ?? account.balance) || 0
  const openingPaise = Math.round(opening * 100)
  const effOpeningDate =
    account.openingBalanceDate ||
    (account.createdAt ? account.createdAt.slice(0, 10) : undefined)

  let priorNetPaise = 0
  for (const tx of transactions) {
    if (tx.date < periodStartDate) {
      const amtPaise = Math.round((Number(tx.amount) || 0) * 100)
      if (tx.type === 'income' && tx.accountId === account.id) {
        priorNetPaise += amtPaise
      } else if (tx.type === 'expense' && tx.accountId === account.id) {
        priorNetPaise -= amtPaise
      } else if (tx.type === 'transfer') {
        if (tx.accountId === account.id) priorNetPaise -= amtPaise
        if (tx.toAccountId === account.id) priorNetPaise += amtPaise
      }
    }
  }

  // If opening balance effective date is after period start, transactions before opening date are only prior activity
  if (effOpeningDate && effOpeningDate > periodStartDate) {
    return priorNetPaise / 100
  }

  return (openingPaise + priorNetPaise) / 100
}

/**
 * Main calculation engine for Consolidated Summary and Individual Account Flow.
 */
export function calculateConsolidatedFlow(params: {
  accounts: Account[]
  transactions: Transaction[]
  period: FlowPeriodBounds
  investments?: Investment[]
  emis?: EMI[]
  emiPayments?: EMIPayment[]
}): ConsolidatedFlowSummary {
  const { accounts, transactions, period, investments = [], emis = [], emiPayments = [] } = params
  const { startDate, endDate } = period

  const activeAccounts = accounts.filter((a) => a.isActive !== false)
  const accountMap = new Map<string, Account>(accounts.map((a) => [a.id, a]))
  const sortedAccounts = sortAccountsByRequiredOrder(activeAccounts)

  // Identify Axis account ID for salary flow & transfersFromAxis tracking
  const axisAccount = sortedAccounts.find(
    (a) => /axis/i.test(a.name) || a.type === 'salary'
  )
  const axisId = axisAccount?.id

  // Filter transactions within period
  const periodTxs = transactions.filter(
    (tx) => tx.date >= startDate && tx.date <= endDate
  )

  // Sort chronologically for running balance calculations
  const sortedPeriodTxs = [...periodTxs].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.time || '').localeCompare(b.time || '')
  })

  // 1. Consolidated metrics counters (in paise to ensure integer precision)
  let totalOpeningPaise = 0
  let externalIncomePaise = 0
  let salaryIncomePaise = 0
  let otherIncomePaise = 0
  let actualExpensesPaise = 0
  let internalTransfersPaise = 0
  let internalTransferEventsCount = 0

  // Single-counted set of transfer transaction IDs
  const countedTransferIds = new Set<string>()

  // Calculate total salary received across Axis (or all accounts) for % allocation
  let totalSalaryReceivedPaise = 0
  for (const tx of sortedPeriodTxs) {
    if (tx.type === 'income' && isSalaryTransaction(tx)) {
      if (!axisId || tx.accountId === axisId) {
        totalSalaryReceivedPaise += Math.round(tx.amount * 100)
      }
    }
  }
  const totalSalaryReceived = totalSalaryReceivedPaise / 100

  // Tally consolidated transactions
  for (const tx of sortedPeriodTxs) {
    const amtPaise = Math.round(tx.amount * 100)
    const isSourceActive = accountMap.has(tx.accountId) && accountMap.get(tx.accountId)!.isActive !== false

    if (tx.type === 'income' && isSourceActive) {
      externalIncomePaise += amtPaise
      if (isSalaryTransaction(tx)) {
        salaryIncomePaise += amtPaise
      } else {
        otherIncomePaise += amtPaise
      }
    } else if (tx.type === 'expense' && isSourceActive) {
      actualExpensesPaise += amtPaise
    } else if (tx.type === 'transfer') {
      const isDestActive = Boolean(tx.toAccountId && accountMap.has(tx.toAccountId) && accountMap.get(tx.toAccountId)!.isActive !== false)
      if (isSourceActive && isDestActive) {
        // Internal transfer between owned accounts
        if (!countedTransferIds.has(tx.id)) {
          countedTransferIds.add(tx.id)
          internalTransfersPaise += amtPaise
          internalTransferEventsCount += 1
        }
      }
    }
  }

  // 2. Individual Account Flows
  const accountSummaries: SingleAccountFlowSummary[] = []
  let totalClosingPaise = 0

  for (const acc of sortedAccounts) {
    const opening = Number(acc.openingBalance ?? acc.balance) || 0
    const openingPaise = Math.round(opening * 100)
    const effOpeningDate =
      acc.openingBalanceDate ||
      (acc.createdAt ? acc.createdAt.slice(0, 10) : undefined)
    const coverageStartDate =
      acc.ledgerCoverageStartDate || effOpeningDate

    // Calculate prior net from transactions strictly before period.startDate
    let priorNetPaise = 0
    for (const tx of transactions) {
      if (tx.date < startDate) {
        const amtPaise = Math.round((Number(tx.amount) || 0) * 100)
        if (tx.type === 'income' && tx.accountId === acc.id) {
          priorNetPaise += amtPaise
        } else if (tx.type === 'expense' && tx.accountId === acc.id) {
          priorNetPaise -= amtPaise
        } else if (tx.type === 'transfer') {
          if (tx.accountId === acc.id) priorNetPaise -= amtPaise
          if (tx.toAccountId === acc.id) priorNetPaise += amtPaise
        }
      }
    }

    let openingBalPaise = 0
    let isPeriodPartiallyCovered = false
    let isPeriodBeforeCoverage = false
    let hasHistoricalDataWarning = false
    let historicalWarningMessage: string | undefined = undefined

    if (!effOpeningDate || effOpeningDate <= startDate) {
      // Opening balance was effective on or before period start
      openingBalPaise = openingPaise + priorNetPaise
      if (coverageStartDate && coverageStartDate > startDate) {
        isPeriodPartiallyCovered = true
        historicalWarningMessage = `Ledger transaction history begins on ${coverageStartDate}. Historical activity before ${coverageStartDate} is not recorded.`
      }
    } else if (effOpeningDate <= endDate) {
      // Pre-existing opening balance effective mid-period
      // Classify as opening balance as of its effective date. Do NOT count as new capital inflow.
      openingBalPaise = openingPaise + priorNetPaise
      isPeriodPartiallyCovered = true
      historicalWarningMessage = `Reporting period begins before opening-balance effective date (${effOpeningDate}). Initial balance of ₹${opening.toLocaleString('en-IN')} is effective as of ${effOpeningDate}. Historical transactions prior to ${effOpeningDate} are unavailable.`
    } else {
      // Opening balance effective date is AFTER the reporting period entirely
      openingBalPaise = priorNetPaise
      isPeriodBeforeCoverage = true
      hasHistoricalDataWarning = true
      historicalWarningMessage = `Account was initialized on ${effOpeningDate} (after this reporting period). Historical ledger data is unavailable.`
    }

    totalOpeningPaise += openingBalPaise
    let runningBalancePaise = openingBalPaise

    let accSalaryPaise = 0
    let accOtherIncomePaise = 0
    let accTransfersInPaise = 0
    let accTransfersFromAxisPaise = 0

    let accTransfersOutPaise = 0
    let accTransfersToKotakPaise = 0
    let accTransfersToSBIPaise = 0
    let accTransfersToFederalPaise = 0
    let accTransfersToCashPaise = 0
    let accOtherTransfersOutPaise = 0

    let accDirectExpensesPaise = 0
    let accEMIExpensesPaise = 0
    let accOtherOutflowsPaise = 0

    // Destination allocation map (for destination-wise breakdown)
    const destMap = new Map<string, { name: string; type: string; amountPaise: number; count: number; color: string }>()

    const classifiedTxs: ClassifiedAccountTransaction[] = []

    // Transactions involving this account in chronological order
    for (const tx of sortedPeriodTxs) {
      const isSource = tx.accountId === acc.id
      const isDest = tx.toAccountId === acc.id
      if (!isSource && !isDest) continue

      const amtPaise = Math.round(tx.amount * 100)
      let classification = ''
      let isOutflow = false
      let destinationOrSource = ''

      if (tx.type === 'income' && isSource) {
        isOutflow = false
        runningBalancePaise += amtPaise
        destinationOrSource = tx.category || 'Income'

        if (isSalaryTransaction(tx)) {
          accSalaryPaise += amtPaise
          classification = 'Salary Received'
        } else {
          accOtherIncomePaise += amtPaise
          classification = 'Other Income'
        }
      } else if (tx.type === 'expense' && isSource) {
        isOutflow = true
        runningBalancePaise -= amtPaise
        destinationOrSource = tx.category || 'Direct Expense'

        if (isEMITransaction(tx)) {
          accEMIExpensesPaise += amtPaise
          classification = 'EMI Payment'
        } else {
          accDirectExpensesPaise += amtPaise
          classification = 'Direct Expense'
        }

        // Add to destination breakdown
        const destKey = `exp-${tx.category || 'expenses'}`
        const existing = destMap.get(destKey) || {
          name: tx.category || 'Direct Expenses',
          type: 'expense',
          amountPaise: 0,
          count: 0,
          color: '#ef4444',
        }
        existing.amountPaise += amtPaise
        existing.count += 1
        destMap.set(destKey, existing)
      } else if (tx.type === 'transfer') {
        if (isDest) {
          // Incoming transfer
          isOutflow = false
          runningBalancePaise += amtPaise
          accTransfersInPaise += amtPaise

          const srcAcc = accountMap.get(tx.accountId)
          destinationOrSource = srcAcc ? srcAcc.name : 'Another Account'

          if (axisId && tx.accountId === axisId) {
            accTransfersFromAxisPaise += amtPaise
            classification = 'Transfer from Axis'
          } else {
            classification = 'Internal Transfer In'
          }
        } else if (isSource) {
          // Outgoing transfer
          isOutflow = true
          runningBalancePaise -= amtPaise
          accTransfersOutPaise += amtPaise

          const destAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : undefined
          destinationOrSource = destAcc ? destAcc.name : 'Unknown Destination'

          const destName = destAcc?.name.toLowerCase() || ''
          const destType = destAcc?.type || 'savings'

          if (/kotak/i.test(destName)) {
            accTransfersToKotakPaise += amtPaise
            classification = 'Transfer to Kotak (Savings)'
          } else if (/sbi|state bank/i.test(destName)) {
            accTransfersToSBIPaise += amtPaise
            classification = 'Transfer to SBI'
          } else if (/federal/i.test(destName)) {
            accTransfersToFederalPaise += amtPaise
            classification = 'Transfer to Federal Bank'
          } else if (destType === 'cash' || /cash/i.test(destName)) {
            accTransfersToCashPaise += amtPaise
            classification = 'Cash Withdrawal'
          } else {
            accOtherTransfersOutPaise += amtPaise
            classification = 'Other Internal Transfer'
          }

          // Add to destination breakdown
          const destKey = tx.toAccountId || 'unknown-dest'
          const existing = destMap.get(destKey) || {
            name: destAcc?.name || 'Destination Transfer',
            type: destType,
            amountPaise: 0,
            count: 0,
            color: destAcc?.color ? `#${destAcc.color}` : '#3b82f6',
          }
          existing.amountPaise += amtPaise
          existing.count += 1
          destMap.set(destKey, existing)
        }
      }

      classifiedTxs.push({
        transaction: tx,
        date: tx.date,
        description: tx.title || classification,
        type: tx.type,
        destinationOrSource,
        amount: tx.amount,
        isOutflow,
        classification,
        runningBalance: runningBalancePaise / 100,
      })
    }

    const totalReceivedPaise = accSalaryPaise + accOtherIncomePaise + accTransfersInPaise
    const actualExpensesPaiseTotal = accDirectExpensesPaise + accEMIExpensesPaise
    const totalOutflowsPaise = accTransfersOutPaise + actualExpensesPaiseTotal + accOtherOutflowsPaise
    const closingBalPaise = openingBalPaise + totalReceivedPaise - totalOutflowsPaise
    const closingBalance = closingBalPaise / 100

    totalClosingPaise += closingBalPaise

    // Live balance
    const liveBalance = Number(acc.balance) || 0

    // Reconciliation check for this account:
    // Closing = Opening + Total Received - Total Sent Out
    const expectedClosing = openingBalPaise + totalReceivedPaise - totalOutflowsPaise
    const isLedgerBalanced = closingBalPaise === expectedClosing
    const isReconciled = !hasHistoricalDataWarning && isLedgerBalanced
    const discrepancy = (closingBalPaise - expectedClosing) / 100

    // Live balance comparison
    const isBalanceMatchedToLive = closingBalance === liveBalance

    // Bank statement external reconciliation:
    // True ONLY when account has an explicit external statement reconciliation on or after period.startDate
    const isStatementReconciled = Boolean(
      acc.lastStatementReconciledDate && acc.lastStatementReconciledDate >= period.startDate
    )
    const statementReconciledDate = acc.lastStatementReconciledDate || undefined

    let reconciliationStatusLabel = 'Internal Ledger Balanced'
    if (hasHistoricalDataWarning) {
      reconciliationStatusLabel = 'Historical Records Incomplete'
    } else if (!isLedgerBalanced) {
      reconciliationStatusLabel = `Discrepancy: ₹${Math.abs(discrepancy)}`
    } else if (isStatementReconciled) {
      reconciliationStatusLabel = `Bank Statement Reconciled (${statementReconciledDate})`
    } else if (isPeriodPartiallyCovered) {
      reconciliationStatusLabel = 'Internal Ledger Balanced (Partial History)'
    } else {
      reconciliationStatusLabel = 'Internal Ledger Balanced'
    }

    // Build allocation breakdown array
    const allocationBreakdown: DestinationAllocationItem[] = Array.from(destMap.entries()).map(
      ([id, item]) => {
        const amt = item.amountPaise / 100
        const pct = totalSalaryReceived > 0 ? Number(((amt / totalSalaryReceived) * 100).toFixed(2)) : null
        return {
          destinationId: id,
          destinationName: item.name,
          destinationType: item.type,
          amount: amt,
          txCount: item.count,
          percentageOfSalary: pct,
          color: item.color,
        }
      }
    )

    // Kotak Savings Analysis (if account is Kotak)
    let kotakSavingsAnalysis: SingleAccountFlowSummary['kotakSavingsAnalysis'] = undefined
    if (/kotak/i.test(acc.name)) {
      // Find transfers back to Axis
      let returnedToAxisPaise = 0
      for (const tx of sortedPeriodTxs) {
        if (tx.type === 'transfer' && tx.accountId === acc.id && axisId && tx.toAccountId === axisId) {
          returnedToAxisPaise += Math.round(tx.amount * 100)
        }
      }
      const grossSavingsPaise = accTransfersInPaise // All savings contributions received
      const netSavingsPaise = grossSavingsPaise - returnedToAxisPaise
      const grossSavings = grossSavingsPaise / 100
      const returnedToAxis = returnedToAxisPaise / 100
      const netSavings = netSavingsPaise / 100
      const savingsPct = totalSalaryReceived > 0 ? Number(((netSavings / totalSalaryReceived) * 100).toFixed(2)) : null

      kotakSavingsAnalysis = {
        grossSavings,
        returnedToAxis,
        netSavings,
        savingsPercentageOfSalary: savingsPct,
      }
    }

    // Account-specific latest transaction date
    let accLatestTxDate: string | undefined = undefined
    for (const ctx of classifiedTxs) {
      if (!accLatestTxDate || ctx.date > accLatestTxDate) {
        accLatestTxDate = ctx.date
      }
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    const isPeriodEndingInFuture = endDate > todayStr || (accLatestTxDate ? endDate > accLatestTxDate : false)
    const accAsOfDate = isPeriodEndingInFuture ? (accLatestTxDate || todayStr) : endDate
    const accClosingBalanceLabel = isPeriodEndingInFuture
      ? `Reconciled Balance as of ${accAsOfDate}`
      : `Historical Closing Balance as of ${endDate}`
    const openingBalanceSemantics = effOpeningDate
      ? `Opening balance of ₹${opening.toLocaleString('en-IN')} is effective ${effOpeningDate} (Start of Day 00:00:00). Subsequent same-day transactions are accounted for in net cash flow.`
      : undefined

    accountSummaries.push({
      account: acc,
      openingBalance: openingBalPaise / 100,
      effectiveOpeningDate: effOpeningDate,
      ledgerCoverageStartDate: coverageStartDate,
      isPeriodPartiallyCovered,
      partialCoverageNotice: isPeriodPartiallyCovered
        ? `Ledger coverage: ${coverageStartDate || effOpeningDate}–${endDate}. Account balance effective ${effOpeningDate}. Historical data unavailable before ${coverageStartDate || effOpeningDate}.`
        : undefined,
      isPeriodBeforeCoverage,
      isOpeningDateAfterPeriod: isPeriodBeforeCoverage,
      hasHistoricalDataWarning,
      historicalWarningMessage,
      asOfDate: accAsOfDate,
      latestTransactionDate: accLatestTxDate,
      isPeriodEndingInFuture,
      closingBalanceLabel: accClosingBalanceLabel,
      openingBalanceSemantics,
      totalMoneyReceived: totalReceivedPaise / 100,
      externalMoneyReceived: (accSalaryPaise + accOtherIncomePaise) / 100,
      salaryReceived: accSalaryPaise / 100,
      otherIncomeReceived: accOtherIncomePaise / 100,
      transfersIn: accTransfersInPaise / 100,
      transfersFromAxis: accTransfersFromAxisPaise / 100,
      transfersOut: accTransfersOutPaise / 100,
      transfersToKotak: accTransfersToKotakPaise / 100,
      transfersToSBI: accTransfersToSBIPaise / 100,
      transfersToFederal: accTransfersToFederalPaise / 100,
      transfersToCash: accTransfersToCashPaise / 100,
      otherTransfersOut: accOtherTransfersOutPaise / 100,
      actualExpenses: actualExpensesPaiseTotal / 100,
      directExpenses: accDirectExpensesPaise / 100,
      emiExpenses: accEMIExpensesPaise / 100,
      otherOutflows: accOtherOutflowsPaise / 100,
      totalOutflows: totalOutflowsPaise / 100,
      closingBalance,
      liveBalance,
      isReconciled,
      reconciliationDiscrepancy: discrepancy,
      isLedgerBalanced,
      isBalanceMatchedToLive,
      isStatementReconciled,
      statementReconciledDate,
      reconciliationStatusLabel,
      allocationBreakdown,
      transactions: classifiedTxs,
      kotakSavingsAnalysis,
    })
  }

  // 3. Consolidated Totals
  const openingBankAndCash = totalOpeningPaise / 100
  const extIncome = externalIncomePaise / 100
  const salIncome = salaryIncomePaise / 100
  const othIncome = otherIncomePaise / 100
  const actExpenses = actualExpensesPaise / 100
  const intTransfers = internalTransfersPaise / 100
  const closingBankAndCash = totalClosingPaise / 100

  // Historical data completeness across accounts
  const accountsBeforeCoverage = accountSummaries.filter((a) => a.isPeriodBeforeCoverage)
  const accountsPartiallyCovered = accountSummaries.filter((a) => a.isPeriodPartiallyCovered)

  const combinedHasHistoricalWarning = accountsBeforeCoverage.length > 0
  const combinedWarningMessage = combinedHasHistoricalWarning
    ? `Historical ledger data is unavailable for ${accountsBeforeCoverage
        .map((a) => a.account.name)
        .join(', ')} (account initialized after this reporting period).`
    : undefined

  const earliestCoverageDate = Array.from(
    new Set(
      accountsPartiallyCovered.map(
        (a) => a.ledgerCoverageStartDate || a.effectiveOpeningDate || a.account.openingBalanceDate
      )
    )
  ).filter(Boolean)[0] || '2026-10-10'

  const combinedIsPartiallyCovered = !combinedHasHistoricalWarning && accountsPartiallyCovered.length > 0
  const combinedPartialNotice = combinedIsPartiallyCovered
    ? `Ledger coverage: ${earliestCoverageDate}–${endDate}. Ledger coverage begins on ${earliestCoverageDate} (Start of Day 00:00:00). Initial combined opening balance of ₹${openingBankAndCash.toLocaleString('en-IN')} is effective as of ${earliestCoverageDate}. Historical data unavailable before ${earliestCoverageDate} (October 1–9 transactions are unrecorded).`
    : undefined

  const combinedOpeningBalanceSemantics = combinedIsPartiallyCovered
    ? `Effective ${earliestCoverageDate} (Start of Day 00:00:00). Historical data unavailable before ${earliestCoverageDate} (October 1–9 transactions are unrecorded).`
    : `Effective at period start (${startDate} 00:00:00).`

  // Latest transaction date across the entire period
  let latestTxDate: string | undefined = undefined
  for (const tx of sortedPeriodTxs) {
    if (!latestTxDate || tx.date > latestTxDate) {
      latestTxDate = tx.date
    }
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const isPeriodEndingInFuture = endDate > todayStr || (latestTxDate ? endDate > latestTxDate : false)
  const asOfDate = isPeriodEndingInFuture ? (latestTxDate || todayStr) : endDate
  const combinedClosingBalanceLabel = isPeriodEndingInFuture
    ? `Reconciled Balance as of ${asOfDate} (Period end ${endDate} pending)`
    : `Historical Closing Balance as of ${endDate}`

  // Combined reconciliation formula:
  // Closing = Opening + External Income - Actual Expenses
  const expectedCombinedClosingPaise =
    totalOpeningPaise + externalIncomePaise - actualExpensesPaise
  const isCombinedLedgerBalanced = totalClosingPaise === expectedCombinedClosingPaise
  const isCombinedReconciled =
    !combinedHasHistoricalWarning && isCombinedLedgerBalanced
  const combinedDiscrepancy = (totalClosingPaise - expectedCombinedClosingPaise) / 100

  // 3-tier Reconciliation Status across consolidated accounts
  const isCombinedBalanceMatchedToLive =
    accounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0) === closingBankAndCash
  const statementReconciledAccounts = accountSummaries.filter((a) => a.isStatementReconciled)
  const isCombinedStatementReconciled =
    statementReconciledAccounts.length === accountSummaries.length && accountSummaries.length > 0

  let combinedStatusLabel = 'Internal Ledger Balanced'
  if (combinedHasHistoricalWarning) {
    combinedStatusLabel = 'Historical Records Incomplete'
  } else if (!isCombinedLedgerBalanced) {
    combinedStatusLabel = `Discrepancy: ₹${Math.abs(combinedDiscrepancy)}`
  } else if (isCombinedStatementReconciled) {
    combinedStatusLabel = 'Bank Statement Externally Reconciled'
  } else if (combinedIsPartiallyCovered) {
    combinedStatusLabel = 'Internal Ledger Balanced (Partially Covered Period)'
  } else {
    combinedStatusLabel = 'Internal Ledger Balanced'
  }

  // Investment Valuation
  const totalInvestmentValue = investments.reduce(
    (sum, inv) => sum + (Number(inv.currentValue ?? inv.buyPrice) || 0),
    0
  )
  const valuationDateStr = period.isCurrentMonth
    ? new Date().toISOString().slice(0, 10)
    : period.endDate

  // Liabilities (tracked outstanding principal)
  const totalLiabilities = emis.reduce((sum, emi) => {
    if (emi.status === 'completed') return sum
    if ((emi as any).outstandingPrincipal !== undefined) {
      return sum + Number((emi as any).outstandingPrincipal || 0)
    }
    if ((emi as any).remainingAmount !== undefined) {
      return sum + Number((emi as any).remainingAmount || 0)
    }
    const principalPaid = (emiPayments || [])
      .filter((p) => p.emiId === emi.id && p.status === 'paid')
      .reduce((pSum, p) => pSum + (p.principalComponent || 0), 0)
    return sum + Math.max(0, (Number(emi.principal) || 0) - principalPaid)
  }, 0)

  // Net Worth
  const netWorth = closingBankAndCash + totalInvestmentValue - totalLiabilities

  return {
    period,
    openingBankAndCashBalance: openingBankAndCash,
    externalIncome: extIncome,
    salaryIncome: salIncome,
    otherIncome: othIncome,
    actualExpenses: actExpenses,
    internalTransferEventsCount,
    internalTransfersTotal: intTransfers,
    closingBankAndCashBalance: closingBankAndCash,
    investmentValue: totalInvestmentValue,
    investmentValuationDate: valuationDateStr,
    liabilities: totalLiabilities,
    netWorth,
    isReconciled: isCombinedReconciled,
    isPeriodPartiallyCovered: combinedIsPartiallyCovered,
    partialCoverageNotice: combinedPartialNotice,
    hasHistoricalDataWarning: combinedHasHistoricalWarning,
    isLedgerCoverageUnavailable: combinedHasHistoricalWarning,
    historicalWarningMessage: combinedWarningMessage,
    reconciliationDiscrepancy: combinedDiscrepancy,
    asOfDate,
    latestTransactionDate: latestTxDate,
    isPeriodEndingInFuture,
    closingBalanceLabel: combinedClosingBalanceLabel,
    openingBalanceSemantics: combinedOpeningBalanceSemantics,
    ledgerCoverageStartDate: earliestCoverageDate,
    effectiveOpeningDate: earliestCoverageDate,
    isLedgerBalanced: isCombinedLedgerBalanced,
    isBalanceMatchedToLive: isCombinedBalanceMatchedToLive,
    isStatementReconciled: isCombinedStatementReconciled,
    statementReconciliationCount: statementReconciledAccounts.length,
    reconciliationStatusLabel: combinedStatusLabel,
    accountSummaries,
  }
}
