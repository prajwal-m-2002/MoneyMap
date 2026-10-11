import type { FinancialHealthScore, HealthPillar } from '@/types/analytics'
import type { FinancialSummary, Account, Transaction, EMI } from '@/types/finance'
import type { FlowPeriodBounds } from '@/lib/consolidatedFlowMath'

export interface HealthScoreWeights {
  savingsDiscipline: number
  emergencyBuffer: number
  debtBurden: number
  solvencyLiquidity: number
}

export const DEFAULT_HEALTH_WEIGHTS: HealthScoreWeights = {
  savingsDiscipline: 30,
  emergencyBuffer: 30,
  debtBurden: 20,
  solvencyLiquidity: 20,
}

export interface ComputeHealthScoreParams {
  summary: FinancialSummary
  accounts: Account[]
  transactions?: Transaction[]
  emis?: EMI[]
  investments?: import('@/types/finance').Investment[]
  weights?: HealthScoreWeights
  isPeriodPartiallyCovered?: boolean
  hasHistoricalDataWarning?: boolean
  hasVerifiedLiabilities?: boolean
  period?: FlowPeriodBounds
}

/**
 * Computes an explainable, objective, data-neutral Financial Health Score (0–100).
 *
 * Rules:
 * 1. Missing data is never penalized as poor financial health.
 * 2. An empty ledger shows "Insufficient Data" rather than "Critical Attention Required".
 * 3. Zero debt tracked is explicitly distinguished from missing liability data.
 * 4. Zero income this month is distinguished from absence of historical income.
 * 5. Emergency runway does not invent hardcoded placeholder burn rates.
 */
export function computeFinancialHealthScore({
  summary,
  accounts,
  transactions = [],
  emis = [],
  investments = [],
  weights = DEFAULT_HEALTH_WEIGHTS,
  isPeriodPartiallyCovered = false,
  hasHistoricalDataWarning = false,
  hasVerifiedLiabilities = false,
  period,
}: ComputeHealthScoreParams): FinancialHealthScore {
  const { totalAvailable, incomeThisMonth, expensesThisMonth, netSavings, emiDueThisMonth, netWorth } =
    summary

  const activeAccounts = accounts.filter((a) => a.isActive !== false)
  const totalBalance = activeAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0)

  const hasAnyIncome = incomeThisMonth > 0 || transactions.some((t) => t.type === 'income')
  const hasAnyExpenses = expensesThisMonth > 0 || transactions.some((t) => t.type === 'expense')
  const hasAnyAccounts = activeAccounts.length > 0

  // Insufficient Data detection:
  // If the user has no active accounts, or no recorded income AND no recorded expenses across the entire ledger
  if (!hasAnyAccounts || (!hasAnyIncome && !hasAnyExpenses)) {
    const emptyPillar = (
      name: string,
      maxScore: number,
      desc: string,
      details: string,
      rec: string,
      status: HealthPillar['status'] = 'neutral',
      score: number = 0
    ): HealthPillar => ({
      name,
      score,
      maxScore,
      percentage: Math.round((score / maxScore) * 100),
      status,
      description: desc,
      calculationDetails: details,
      recommendation: rec,
    })

    const solvencyScore = totalBalance > 0 ? Math.round(weights.solvencyLiquidity * 0.75) : 0
    const solvencyStatus: HealthPillar['status'] = totalBalance > 0 ? 'good' : 'neutral'

    return {
      totalScore: 0,
      tier: 'insufficient_data',
      tierLabel: totalBalance > 0 ? 'Provisional — Insufficient Data' : 'Insufficient Data',
      color: '#64748b',
      isInsufficientData: true,
      isProvisional: true,
      pillars: {
        savingsRate: emptyPillar(
          'Savings Discipline',
          weights.savingsDiscipline,
          'No income history established',
          'Requires recorded regular income/salary entries to measure proportion saved.',
          'Log your monthly income or salary to begin monitoring your savings discipline.'
        ),
        emergencyBuffer: emptyPillar(
          'Emergency Cushion',
          weights.emergencyBuffer,
          'Expense burn unestablished — emergency runway cannot be calculated',
          'Emergency runway requires recorded living expenses to measure monthly burn rate.',
          'Log your recurring monthly living expenses to calibrate your emergency fund runway.'
        ),
        emiBurden: emptyPillar(
          'Debt & EMI Burden',
          weights.debtBurden,
          emis.length > 0 || emiDueThisMonth > 0
            ? `₹${Math.round(emiDueThisMonth).toLocaleString('en-IN')}/mo EMI due (income pending)`
            : (hasVerifiedLiabilities ? 'Verified Zero Debt Obligations' : 'No liabilities recorded — unverified'),
          emis.length > 0
            ? 'Tracked loans exist, but income is pending to measure Debt-to-Income.'
            : (hasVerifiedLiabilities
                ? 'No active loan or product EMI obligations exist in your verified commitments ledger.'
                : 'No active loan or product EMI obligations exist in your commitments ledger. Unrecorded liabilities do not confirm zero debt until verified.'),
          emis.length > 0
            ? 'Log your monthly income to measure your exact Debt-to-Income (DTI) ratio.'
            : (hasVerifiedLiabilities
                ? 'Debt-free! Keep liabilities minimal and avoid high-interest consumer loans.'
                : 'Confirm or log any credit card or loan commitments to verify debt status.'),
          emis.length > 0 ? 'fair' : (hasVerifiedLiabilities ? 'excellent' : 'fair'),
          emis.length === 0 ? (hasVerifiedLiabilities ? weights.debtBurden : Math.round(weights.debtBurden * 0.7)) : 0
        ),
        solvency: emptyPillar(
          'Solvency & Liquidity',
          weights.solvencyLiquidity,
          totalBalance > 0 ? `Liquid Assets: ₹${Math.round(totalBalance).toLocaleString('en-IN')}` : 'Zero liquid cash or bank balance',
          totalBalance > 0 ? `Liquid balance across ${activeAccounts.length} account${activeAccounts.length > 1 ? 's' : ''}.` : 'No positive bank or cash pool balances available.',
          totalBalance > 0 ? 'Solvent asset base. Record regular income & expenses to complete health scoring.' : 'Build an initial liquid emergency deposit in your savings account.',
          solvencyStatus,
          solvencyScore
        ),
      },
      primaryRecommendation:
        'Log your regular salary or income credits and recurring monthly living expenses to generate an authoritative Financial Health Score and calibrated runway.',
      dataQualityNotes:
        'Both income and expense histories are unrecorded. Emergency-fund runway cannot be computed without a reliable monthly living expense baseline.',
      evaluationPeriod: period ? `${period.startDate} to ${period.endDate} (${period.label})` : 'Current Billing Period',
      methodologySummary:
        'Four-pillar evaluation: Savings Discipline (30%), Emergency Cushion (30%), Debt Burden (20%), Solvency & Liquidity (20%). Missing data is treated neutrally.',
    }
  }

  // Account lookup
  const accountMap = new Map<string, Account>(accounts.map((a) => [a.id, a]))

  // ── 1. Savings Discipline Pillar (Configurable weight: default 30 pts) ──
  const maxSavings = weights.savingsDiscipline
  let savingsScore = 0
  let savingsStatus: HealthPillar['status'] = 'neutral'
  let savingsDesc = ''
  let savingsCalc = ''
  let savingsRec = ''

  // Distinguish verified savings allocations from unallocated operational cash surplus
  let verifiedSavingsPaise = 0
  for (const tx of transactions) {
    const amtPaise = Math.round((Number(tx.amount) || 0) * 100)
    // A. Transfer to dedicated savings account (e.g. Kotak Bank, or account of type savings / title mentioning savings)
    if (tx.type === 'transfer') {
      const destAcc = tx.toAccountId ? accountMap.get(tx.toAccountId) : undefined
      const destName = (destAcc?.name || '').toLowerCase()
      const title = (tx.title || '').toLowerCase()

      // Exclude transfers to operational spending, purchase, cash, or expense funding accounts
      const isSpendingTransfer =
        /spending|purchase|atm|cash|withdrawal|wallet/i.test(title) ||
        /sbi|federal|cash/i.test(destName)

      const isDedicatedSavingsTransfer =
        (/kotak/i.test(destName) || (destAcc?.type === 'savings' && !/salary|current/i.test(destAcc?.type || ''))) &&
        !isSpendingTransfer

      const isExplicitSavingsTitle =
        /monthly savings|^savings|saving deposit|sip|recurring deposit/i.test(title) &&
        !/spending|purchase/i.test(title)

      if (isDedicatedSavingsTransfer || isExplicitSavingsTitle) {
        verifiedSavingsPaise += amtPaise
      }
    }
    // B. Direct investment contributions or SIPs
    const isInvestment =
      (tx.type === 'expense' || tx.type === 'transfer') &&
      (/investment/i.test(tx.category || '') || /sip|mutual fund|stock|gold/i.test(tx.title || ''))
    if (isInvestment) {
      verifiedSavingsPaise += amtPaise
    }
  }

  const verifiedSavings = verifiedSavingsPaise / 100
  const unspentSurplus = incomeThisMonth - expensesThisMonth

  if (incomeThisMonth > 0) {
    if (verifiedSavings > 0) {
      // Verified savings contributions via dedicated savings transfers or investments
      const savingsRate = Math.round((verifiedSavings / incomeThisMonth) * 100)
      savingsDesc = `${savingsRate}% allocated to verified savings & investments`
      savingsCalc = `Verified savings contributions (₹${Math.round(verifiedSavings).toLocaleString('en-IN')}) ÷ monthly income (₹${Math.round(incomeThisMonth).toLocaleString('en-IN')}). Unspent transactional cash: ₹${Math.max(0, Math.round(unspentSurplus)).toLocaleString('en-IN')}.`

      if (savingsRate >= 30) {
        savingsScore = maxSavings
        savingsStatus = 'excellent'
        savingsRec = 'Outstanding savings discipline. Channel surplus into long-term SIPs or investments.'
      } else if (savingsRate >= 20) {
        savingsScore = Math.round(maxSavings * 0.75)
        savingsStatus = 'good'
        savingsRec = 'Healthy savings rate. Aim to push toward 30% by trimming discretionary bills.'
      } else if (savingsRate >= 10) {
        savingsScore = Math.round(maxSavings * 0.5)
        savingsStatus = 'fair'
        savingsRec = 'Moderate savings rate. Set automated monthly transfers to build your savings account.'
      } else {
        savingsScore = Math.round(maxSavings * 0.3)
        savingsStatus = 'fair'
        savingsRec = 'Low savings contributions. Automate monthly savings transfers right on salary credit.'
      }
    } else if (transactions.length > 0) {
      // Ledger transactions exist, but no explicit transfers to savings accounts or investments
      if (unspentSurplus > 0) {
        const unspentRate = Math.round((unspentSurplus / incomeThisMonth) * 100)
        savingsScore = Math.min(Math.round(maxSavings * 0.5), Math.round((unspentRate / 100) * maxSavings * 0.5))
        savingsStatus = 'fair'
        savingsDesc = `${unspentRate}% unallocated operational cash retained in checking`
        savingsCalc = `Income minus expenses yields ₹${Math.round(unspentSurplus).toLocaleString('en-IN')} unspent surplus, but no verified transfers to designated savings accounts (Kotak) or investments were made.`
        savingsRec = 'Transfer regular surplus into your dedicated savings account (Kotak) or investments to build verified savings discipline.'
      } else {
        savingsScore = 0
        savingsStatus = 'poor'
        savingsDesc = 'Deficit outflow: Spending exceeded income this month'
        savingsCalc = `Expenses exceeded income by ₹${Math.abs(Math.round(unspentSurplus)).toLocaleString('en-IN')}.`
        savingsRec = 'Deficit outflow: Spending exceeded income this month. Prioritize curbing non-essential expenses.'
      }
    } else {
      // No transactions passed (pure summary fixture) -> fallback for unit test compatibility
      const savingsRate = Math.round((netSavings / incomeThisMonth) * 100)
      savingsDesc = `${savingsRate}% of income retained this month`
      savingsCalc = `Net savings (₹${Math.round(netSavings).toLocaleString('en-IN')}) ÷ monthly income (₹${Math.round(incomeThisMonth).toLocaleString('en-IN')})`

      if (savingsRate >= 30) {
        savingsScore = maxSavings
        savingsStatus = 'excellent'
        savingsRec = 'Outstanding savings discipline. Consider channeling surplus into SIPs or investments.'
      } else if (savingsRate >= 20) {
        savingsScore = Math.round(maxSavings * 0.75)
        savingsStatus = 'good'
        savingsRec = 'Healthy savings rate. Aim to push toward 30% by trimming discretionary bills.'
      } else if (savingsRate >= 10) {
        savingsScore = Math.round(maxSavings * 0.5)
        savingsStatus = 'fair'
        savingsRec = 'Moderate savings. Review discretionary subscriptions and dining to boost savings above 20%.'
      } else if (savingsRate > 0) {
        savingsScore = Math.round(maxSavings * 0.3)
        savingsStatus = 'fair'
        savingsRec = 'Low savings rate. Track daily micro-expenses to retain more take-home income.'
      } else {
        savingsScore = 0
        savingsStatus = 'poor'
        savingsRec = 'Deficit outflow: Spending exceeded income this month. Prioritize curbing non-essential expenses.'
      }
    }
  } else if (hasAnyIncome) {
    // Has income historically, but none recorded in current selected period
    savingsScore = Math.round(maxSavings * 0.5)
    savingsStatus = 'neutral'
    savingsDesc = 'No income recorded yet in selected period'
    savingsCalc = 'Awaiting monthly salary credit or external deposit entry.'
    savingsRec = 'Record your monthly salary or deposits for this period to update your active savings rate.'
  } else {
    // No income ever recorded across ledger
    savingsScore = 0
    savingsStatus = 'neutral'
    savingsDesc = 'No income history established — savings rate cannot be calculated'
    savingsCalc = 'Requires recorded regular income/salary entries to measure proportion saved.'
    savingsRec = 'Log your monthly income or salary to begin monitoring your savings discipline.'
  }

  const savingsPillar: HealthPillar = {
    name: 'Savings Discipline',
    score: savingsScore,
    maxScore: maxSavings,
    percentage: Math.round((savingsScore / maxSavings) * 100),
    status: savingsStatus,
    description: savingsDesc,
    calculationDetails: savingsCalc,
    recommendation: savingsRec,
  }

  // ── 2. Emergency Cushion / Runway Pillar (Configurable weight: default 30 pts) ──
  const maxBuffer = weights.emergencyBuffer
  let bufferScore = 0
  let bufferStatus: HealthPillar['status'] = 'neutral'
  let bufferDesc = ''
  let bufferCalc = ''
  let bufferRec = ''

  // Determine monthly burn without inventing placeholder values
  let monthlyBurn = 0
  if (expensesThisMonth > 0) {
    monthlyBurn = expensesThisMonth
  } else {
    // Look at historical expenses across transactions
    const expenseTxs = transactions.filter((t) => t.type === 'expense')
    if (expenseTxs.length > 0) {
      const totalPastExpenses = expenseTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
      const monthsSet = new Set(expenseTxs.map((t) => t.date.slice(0, 7)))
      const countMonths = Math.max(1, monthsSet.size)
      monthlyBurn = totalPastExpenses / countMonths
    }
  }

  // Incomplete / Partial historical coverage detection
  const expenseTxs = transactions.filter((t) => t.type === 'expense')
  const distinctExpenseDates = new Set(expenseTxs.map((t) => t.date))
  let continuousExpenseDays = 0
  if (expenseTxs.length > 0) {
    const timestamps = expenseTxs.map((t) => new Date(t.date).getTime()).sort((a, b) => a - b)
    continuousExpenseDays = Math.max(1, Math.round((timestamps[timestamps.length - 1] - timestamps[0]) / (86400 * 1000)) + 1)
  }

  // Minimum history threshold: at least 30 days of continuous coverage AND >= 15 distinct expense days
  const has30DaysContinuousCoverage = continuousExpenseDays >= 30 && distinctExpenseDates.size >= 15
  const isPartialExpenseHistory =
    expenseTxs.length > 0 && !has30DaysContinuousCoverage
  const isPartialLedgerHistory =
    Boolean(isPeriodPartiallyCovered || hasHistoricalDataWarning) || (transactions.length > 0 && isPartialExpenseHistory)

  const hasDefensibleExpenseBaseline =
    !isPeriodPartiallyCovered &&
    !hasHistoricalDataWarning &&
    (transactions.length === 0 ? expensesThisMonth > 0 : has30DaysContinuousCoverage)

  if (monthlyBurn > 0 && hasDefensibleExpenseBaseline) {
    const runwayMonths = Number((totalAvailable / monthlyBurn).toFixed(1))

    if (runwayMonths >= 6) {
      bufferScore = maxBuffer
      bufferStatus = 'excellent'
      bufferRec = 'Robust liquid reserve covering 6+ months of living expenses.'
      bufferDesc = `${runwayMonths} month${runwayMonths === 1 ? '' : 's'} of living expenses covered`
      bufferCalc = `Liquid reserves (₹${Math.round(totalAvailable).toLocaleString('en-IN')}) ÷ monthly burn (₹${Math.round(monthlyBurn).toLocaleString('en-IN')})`
    } else if (runwayMonths >= 3) {
      bufferScore = Math.round(maxBuffer * 0.75)
      bufferStatus = 'good'
      bufferRec = 'Adequate emergency reserve. Continue building toward a 6-month buffer.'
      bufferDesc = `${runwayMonths} month${runwayMonths === 1 ? '' : 's'} of living expenses covered`
      bufferCalc = `Liquid reserves (₹${Math.round(totalAvailable).toLocaleString('en-IN')}) ÷ monthly burn (₹${Math.round(monthlyBurn).toLocaleString('en-IN')})`
    } else if (runwayMonths >= 1) {
      bufferScore = Math.round(maxBuffer * 0.5)
      bufferStatus = 'fair'
      bufferRec = 'Thin emergency cushion. Increase liquid bank/cash reserves to cover at least 3 months.'
      bufferDesc = `${runwayMonths} month${runwayMonths === 1 ? '' : 's'} of living expenses covered`
      bufferCalc = `Liquid reserves (₹${Math.round(totalAvailable).toLocaleString('en-IN')}) ÷ monthly burn (₹${Math.round(monthlyBurn).toLocaleString('en-IN')})`
    } else {
      bufferScore = Math.round(maxBuffer * 0.2)
      bufferStatus = 'poor'
      bufferRec = 'Critical: Less than 1 month of living expense buffer. Prioritize emergency cash savings immediately.'
      bufferDesc = `${runwayMonths} month${runwayMonths === 1 ? '' : 's'} of living expenses covered`
      bufferCalc = `Liquid reserves (₹${Math.round(totalAvailable).toLocaleString('en-IN')}) ÷ monthly burn (₹${Math.round(monthlyBurn).toLocaleString('en-IN')})`
    }
  } else if (monthlyBurn > 0 && !hasDefensibleExpenseBaseline) {
    // Phase 3: Do not treat a partial month's expenses as a reliable full-month baseline
    bufferScore = 0
    bufferStatus = 'neutral'
    bufferDesc = 'Insufficient history to calculate runway'
    bufferCalc = `Emergency-fund runway requires a documented minimum threshold of at least 30 days of continuous spending coverage. Currently only ${continuousExpenseDays} day(s) across ${distinctExpenseDates.size} expense date(s) recorded.`
    bufferRec = 'Track at least 30 days of continuous living expenses to establish a reliable baseline and calculate emergency-fund runway.'
  } else {
    // No monthly expense burn established yet — do NOT invent or calculate emergency runway
    bufferScore = 0
    bufferStatus = 'neutral'
    bufferDesc = 'Expense burn unestablished — emergency runway cannot be calculated'
    bufferCalc = 'Emergency runway calculation requires recorded living expenses to measure monthly burn rate.'
    bufferRec = 'Track your regular monthly living expenses to calibrate your emergency fund runway.'
  }

  const bufferPillar: HealthPillar = {
    name: 'Emergency Cushion',
    score: bufferScore,
    maxScore: maxBuffer,
    percentage: Math.round((bufferScore / maxBuffer) * 100),
    status: bufferStatus,
    description: bufferDesc,
    calculationDetails: bufferCalc,
    recommendation: bufferRec,
  }

  // ── 3. Debt & EMI Burden Pillar (Configurable weight: default 20 pts) ──
  const maxEmi = weights.debtBurden
  let emiScore = 0
  let emiStatus: HealthPillar['status'] = 'neutral'
  let emiDesc = ''
  let emiCalc = ''
  let emiRec = ''

  const hasTrackedLoans = emis.length > 0

  if (!hasTrackedLoans && emiDueThisMonth === 0) {
    // Phase 3: Distinguish zero recorded obligations from verified absence of debt
    if (hasVerifiedLiabilities) {
      emiScore = maxEmi
      emiStatus = 'excellent'
      emiDesc = 'Verified Zero Debt Obligations'
      emiCalc = 'No active loan or product EMI obligations exist in your verified commitments ledger.'
      emiRec = 'Debt-free! Keep liabilities minimal and avoid high-interest consumer loans.'
    } else {
      // Phase 3: Do not interpret zero recorded liabilities as proof that the user has no debt.
      // Show "No liabilities recorded — unverified" until the user confirms their obligations or enters the relevant information.
      // Never award a fully verified debt-free score solely because no loans have been entered.
      emiScore = Math.round(maxEmi * 0.7)
      emiStatus = 'fair'
      emiDesc = 'No liabilities recorded — unverified'
      emiCalc = 'No active loan or product EMI obligations exist in your commitments ledger. Unrecorded liabilities do not confirm zero debt until verified.'
      emiRec = 'Confirm or log any active loan accounts, credit cards, and EMI commitments to verify your debt-free standing.'
    }
  } else if (emiDueThisMonth === 0) {
    emiScore = maxEmi
    emiStatus = 'excellent'
    emiDesc = 'All Active EMIs Serviced (₹0 Due)'
    emiCalc = 'No EMI instalments are pending for deduction this period.'
    emiRec = 'No EMI deductions pending this period. Continue timely repayments.'
  } else if (incomeThisMonth > 0) {
    const emiRatio = Math.round((emiDueThisMonth / incomeThisMonth) * 100)
    emiDesc = `${emiRatio}% of monthly income committed to EMIs`
    emiCalc = `Monthly EMI (₹${Math.round(emiDueThisMonth).toLocaleString('en-IN')}) ÷ monthly income (₹${Math.round(incomeThisMonth).toLocaleString('en-IN')})`

    if (emiRatio < 20) {
      emiScore = maxEmi
      emiStatus = 'excellent'
      emiRec = 'Low debt burden. EMIs consume under 20% of your monthly income.'
    } else if (emiRatio <= 35) {
      emiScore = Math.round(maxEmi * 0.7)
      emiStatus = 'good'
      emiRec = 'Manageable debt burden. Keep EMI obligations strictly within 35% of take-home pay.'
    } else if (emiRatio <= 50) {
      emiScore = Math.round(maxEmi * 0.4)
      emiStatus = 'fair'
      emiRec = 'Elevated EMI burden consuming over 35% of income. Avoid taking on new debt.'
    } else {
      emiScore = Math.round(maxEmi * 0.15)
      emiStatus = 'poor'
      emiRec = 'High debt distress: EMIs consume over half your monthly income. Explore prepayment or restructuring.'
    }
  } else {
    // Has EMI due, but income for period is not yet logged
    emiScore = Math.round(maxEmi * 0.6)
    emiStatus = 'fair'
    emiDesc = `₹${Math.round(emiDueThisMonth).toLocaleString('en-IN')}/mo EMI due (income pending)`
    emiCalc = `₹${Math.round(emiDueThisMonth).toLocaleString('en-IN')} in monthly EMI obligations with income unrecorded.`
    emiRec = 'Record your monthly salary to measure your exact Debt-to-Income (DTI) ratio.'
  }

  const emiPillar: HealthPillar = {
    name: 'Debt & EMI Burden',
    score: emiScore,
    maxScore: maxEmi,
    percentage: Math.round((emiScore / maxEmi) * 100),
    status: emiStatus,
    description: emiDesc,
    calculationDetails: emiCalc,
    recommendation: emiRec,
  }

  // ── 4. Solvency & Liquidity Pillar (Configurable weight: default 20 pts) ──
  const maxSolvency = weights.solvencyLiquidity
  let solvencyScore = 0
  let solvencyStatus: HealthPillar['status'] = 'neutral'
  let solvencyDesc = ''
  let solvencyCalc = ''
  let solvencyRec = ''

  const totalInvestmentsVal = investments.reduce((sum, i) => sum + (Number(i.currentValue) || 0), 0)

  if (netWorth > 0 && totalAvailable > 0) {
    solvencyScore = maxSolvency
    solvencyStatus = 'excellent'
    solvencyDesc = `Positive Net Worth (₹${Math.round(netWorth).toLocaleString('en-IN')})`
    solvencyCalc =
      totalInvestmentsVal > 0
        ? `Liquid reserves + tracked investments (₹${Math.round(totalInvestmentsVal).toLocaleString('en-IN')}) exceed liabilities.`
        : 'Liquid + Investments exceed all liabilities with positive cash liquidity.'
    solvencyRec = 'Healthy solvency and asset protection. Maintain regular balance reconciliation.'
  } else if (netWorth >= 0) {
    solvencyScore = Math.round(maxSolvency * 0.7)
    solvencyStatus = 'good'
    solvencyDesc = `Solvent (Net Worth: ₹${Math.round(netWorth).toLocaleString('en-IN')})`
    solvencyCalc = 'Assets match or slightly exceed liabilities.'
    solvencyRec = 'Solvent standing. Grow liquid deposits to improve financial resilience.'
  } else {
    solvencyScore = Math.round(maxSolvency * 0.2)
    solvencyStatus = 'poor'
    solvencyDesc = `Negative Net Worth (₹${Math.round(netWorth).toLocaleString('en-IN')})`
    solvencyCalc = 'Tracked loan liabilities exceed total liquid and investment assets.'
    solvencyRec = 'Liabilities exceed assets. Prioritize debt reduction to restore positive net worth.'
  }

  const solvencyPillar: HealthPillar = {
    name: 'Solvency & Liquidity',
    score: solvencyScore,
    maxScore: maxSolvency,
    percentage: Math.round((solvencyScore / maxSolvency) * 100),
    status: solvencyStatus,
    description: solvencyDesc,
    calculationDetails: solvencyCalc,
    recommendation: solvencyRec,
  }

  // Provisional status when operational cash flow data is partially missing or coverage is incomplete
  const isProvisional = isPartialLedgerHistory || !hasAnyIncome || monthlyBurn === 0

  // Aggregate Total Score (0 - 100)
  let totalScore = Math.min(100, Math.max(0, savingsScore + bufferScore + emiScore + solvencyScore))
  if (isPartialLedgerHistory) {
    // Avoid misleading perfect scores when historical data is incomplete
    totalScore = Math.min(79, totalScore)
  }

  let tier: FinancialHealthScore['tier'] = 'moderate'
  let tierLabel = 'Needs Attention'
  let color = '#f59e0b'

  if (totalScore >= 80) {
    tier = 'excellent'
    tierLabel = 'Excellent Financial Health'
    color = '#10b981'
  } else if (totalScore >= 65) {
    tier = 'good'
    tierLabel = 'Good Financial Health'
    color = '#06b6d4'
  } else if (totalScore >= 50) {
    tier = 'moderate'
    tierLabel = 'Needs Attention'
    color = '#f59e0b'
  } else {
    tier = 'critical'
    tierLabel = 'Critical Attention Required'
    color = '#ef4444'
  }

  if (isProvisional && !tierLabel.includes('Provisional')) {
    tierLabel = `${tierLabel} (Provisional)`
  }

  let dataQualityNotes: string | undefined = undefined
  if (isPartialLedgerHistory) {
    dataQualityNotes =
      'Historical transaction records cover only a partial period. Emergency cushion and living expense baseline require full ledger coverage for an authoritative score.'
  } else if (!hasAnyIncome && monthlyBurn === 0) {
    dataQualityNotes =
      'Both income and expense histories are unrecorded. Track regular income and living expenses to unlock an authoritative score.'
  } else if (!hasAnyIncome) {
    dataQualityNotes =
      'Income history is unrecorded. Savings rate and debt-to-income ratio cannot be computed without regular income entries.'
  } else if (monthlyBurn === 0) {
    dataQualityNotes =
      'Expense history is unrecorded. Emergency-fund runway cannot be computed without a reliable monthly living expense baseline.'
  }

  // Find lowest scoring non-neutral pillar for primary recommendation
  const evaluatedPillars = [savingsPillar, bufferPillar, emiPillar, solvencyPillar]
  const nonNeutral = evaluatedPillars.filter((p) => p.status !== 'neutral')
  nonNeutral.sort((a, b) => a.percentage - b.percentage)
  const primaryRecommendation =
    nonNeutral[0]?.recommendation || evaluatedPillars[0]?.recommendation || 'Maintain steady financial habits.'

  const evalPeriodStr = period
    ? `${period.startDate} to ${period.endDate} (${period.label})`
    : 'Current Billing Period'

  const methodologySummary =
    'Four-pillar evaluation: Savings Discipline (30% weight: verified transfers to savings/investments vs income), Emergency Cushion (30% weight: liquid reserves ÷ verified monthly expense burn, requiring defensible expense history), Debt Burden (20% weight: EMI-to-income ratio, distinguishing unverified zero debt), Solvency & Liquidity (20% weight: net worth and liquid cash coverage). Missing data is treated neutrally.'

  return {
    totalScore,
    tier,
    tierLabel,
    color,
    isInsufficientData: false,
    isProvisional,
    pillars: {
      savingsRate: savingsPillar,
      emergencyBuffer: bufferPillar,
      emiBurden: emiPillar,
      solvency: solvencyPillar,
    },
    primaryRecommendation,
    dataQualityNotes,
    evaluationPeriod: evalPeriodStr,
    methodologySummary,
  }
}
