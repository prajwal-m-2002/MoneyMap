import { describe, it, expect } from 'vitest'
import { generateCashFlowForecast } from '@/lib/predictionEngine'
import { computeFinancialHealthScore } from '@/lib/financialHealth'
import { calculateConsolidatedFlow } from '@/lib/consolidatedFlowMath'
import { calculateNetWorthBreakdown, calculatePortfolioSummary } from '@/lib/portfolioMath'
import { calculateAccountBalance } from '@/context/FinanceContext'
import type {
  Account,
  Transaction,
  Investment,
  EMI,
  EMIPayment,
  RecurringTransaction,
  FinancialSummary,
} from '@/types/finance'

describe('MoneyMap — Phase 6 Automated Accuracy & Audit Suite (13 Scenarios)', () => {
  const createStandardAccounts = (): Account[] => [
    {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      balance: 19700,
      openingBalanceDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
    {
      id: 'acc-kotak',
      name: 'Kotak Bank',
      type: 'savings',
      openingBalance: 5000,
      balance: 13000,
      openingBalanceDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
    {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      openingBalance: 2000,
      balance: 6300,
      openingBalanceDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
    {
      id: 'acc-federal',
      name: 'Federal Bank',
      type: 'savings',
      openingBalance: 2000,
      balance: 5600,
      openingBalanceDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
    {
      id: 'acc-cash',
      name: 'Physical Cash',
      type: 'cash',
      openingBalance: 500,
      balance: 900,
      openingBalanceDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
  ]

  const create1DayTransactions = (accounts: Account[]): Transaction[] => [
    {
      id: 'tx-sal',
      type: 'income',
      amount: 27000,
      title: 'Salary credit',
      category: 'Salary',
      accountId: accounts[0].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T10:00:00Z',
    },
    {
      id: 'tx-tr1',
      type: 'transfer',
      amount: 8000,
      title: 'Monthly Savings',
      category: 'Transfer',
      accountId: accounts[0].id,
      toAccountId: accounts[1].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T10:05:00Z',
    },
    {
      id: 'tx-tr2',
      type: 'transfer',
      amount: 5000,
      title: 'Monthly Spending Fund',
      category: 'Transfer',
      accountId: accounts[0].id,
      toAccountId: accounts[2].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T10:10:00Z',
    },
    {
      id: 'tx-tr3',
      type: 'transfer',
      amount: 4000,
      title: 'Purchase Fund',
      category: 'Transfer',
      accountId: accounts[0].id,
      toAccountId: accounts[3].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T10:15:00Z',
    },
    {
      id: 'tx-tr4',
      type: 'transfer',
      amount: 500,
      title: 'ATM Cash Withdrawal',
      category: 'Transfer',
      accountId: accounts[2].id,
      toAccountId: accounts[4].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T10:20:00Z',
    },
    {
      id: 'tx-exp1',
      type: 'expense',
      amount: 300,
      title: 'Lunch',
      category: 'Food & Dining',
      accountId: accounts[0].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T12:00:00Z',
    },
    {
      id: 'tx-exp2',
      type: 'expense',
      amount: 200,
      title: 'Transport',
      category: 'Transportation',
      accountId: accounts[2].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T13:00:00Z',
    },
    {
      id: 'tx-exp3',
      type: 'expense',
      amount: 400,
      title: 'Household Items',
      category: 'Shopping',
      accountId: accounts[3].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T14:00:00Z',
    },
    {
      id: 'tx-exp4',
      type: 'expense',
      amount: 100,
      title: 'Tea & Snacks',
      category: 'Food & Dining',
      accountId: accounts[4].id,
      date: '2026-10-10',
      createdAt: '2026-10-10T16:00:00Z',
    },
  ]

  // ── Scenario 1: No historical spending data ─────────────
  it('1. No historical spending data: withholds safe daily allowance and runway, labels forecast as provisional', () => {
    const accounts = createStandardAccounts()
    const forecast = generateCashFlowForecast({
      currentLiquidBalance: 45500,
      transactions: [],
      recurringTransactions: [],
      emis: [],
      emiPayments: [],
      horizonDays: 30,
      forecastStartDate: '2026-10-10',
    })

    expect(forecast.hasSufficientSpendingHistory).toBe(false)
    expect(forecast.safeDailySpendStatus).toBe('insufficient_history')
    expect(forecast.spendingHistoryStatusMessage).toContain('Not enough spending history to estimate safely')
    expect(forecast.trajectoryStatus).toBe('provisional')
    expect(forecast.trajectoryLabel).toContain('Provisional Trajectory')

    const summary: FinancialSummary = {
      totalAvailable: 45500,
      incomeThisMonth: 0,
      expensesThisMonth: 0,
      netSavings: 0,
      investmentValue: 0,
      emiDueThisMonth: 0,
      netWorth: 45500,
    }
    const health = computeFinancialHealthScore({
      summary,
      accounts,
      transactions: [],
    })
    expect(health.pillars.emergencyBuffer.description).toContain('Expense burn unestablished — emergency runway cannot be calculated')
    expect(health.pillars.emergencyBuffer.score).toBe(0)
  })

  // ── Scenario 2: One day of expense history ───────────────
  it('2. One day of expense history: withholds confident daily allowance, displays provisional scenario, withholds 45.5-mo runway', () => {
    const accounts = createStandardAccounts()
    const txs = create1DayTransactions(accounts)

    const forecast = generateCashFlowForecast({
      currentLiquidBalance: 45500,
      transactions: txs,
      recurringTransactions: [],
      emis: [],
      emiPayments: [],
      horizonDays: 30,
      forecastStartDate: '2026-10-10',
    })

    // Withheld safe spending
    expect(forecast.hasSufficientSpendingHistory).toBe(false)
    expect(forecast.distinctExpenseDaysCount).toBe(1)
    expect(forecast.safeDailySpendStatus).toBe('insufficient_history')
    expect(forecast.spendingHistoryStatusMessage).toBe('Not enough spending history to estimate safely')
    expect(forecast.provisionalDailySpend).toBeGreaterThan(0)
    expect(forecast.trajectoryStatus).toBe('provisional')

    // Health Score Emergency Buffer
    const summary: FinancialSummary = {
      totalAvailable: 45500,
      incomeThisMonth: 27000,
      expensesThisMonth: 1000,
      netSavings: 26000,
      investmentValue: 0,
      emiDueThisMonth: 0,
      netWorth: 45500,
    }
    const health = computeFinancialHealthScore({
      summary,
      accounts,
      transactions: txs,
      isPeriodPartiallyCovered: true,
    })
    expect(health.pillars.emergencyBuffer.description).toBe('Insufficient history to calculate runway')
    expect(health.pillars.emergencyBuffer.score).toBe(0)
  })

  // ── Scenario 3: Exactly 30 days of continuous history ───
  it('3. Exactly 30 days of continuous history: unlocks verified safe daily allowance and calculates verified emergency runway', () => {
    const accounts = createStandardAccounts()
    // Generate 30 days of daily expenses from 2026-09-11 to 2026-10-10 (30 continuous days)
    const thirtyDayTxs: Transaction[] = [
      {
        id: 'tx-sal',
        type: 'income',
        amount: 50000,
        title: 'Monthly Salary',
        category: 'Salary',
        accountId: accounts[0].id,
        date: '2026-09-11',
        createdAt: '2026-09-11T10:00:00Z',
      },
      {
        id: 'tx-savings-transfer',
        type: 'transfer',
        amount: 15000,
        title: 'Monthly Savings',
        category: 'Transfer',
        accountId: accounts[0].id,
        toAccountId: accounts[1].id,
        date: '2026-09-11',
        createdAt: '2026-09-11T10:05:00Z',
      },
    ]

    for (let day = 11; day <= 30; day++) {
      thirtyDayTxs.push({
        id: `tx-sep-${day}`,
        type: 'expense',
        amount: 500,
        title: `Groceries Sep ${day}`,
        category: 'Food & Dining',
        accountId: accounts[0].id,
        date: `2026-09-${String(day).padStart(2, '0')}`,
        createdAt: `2026-09-${String(day).padStart(2, '0')}T12:00:00Z`,
      })
    }
    for (let day = 1; day <= 10; day++) {
      thirtyDayTxs.push({
        id: `tx-oct-${day}`,
        type: 'expense',
        amount: 500,
        title: `Groceries Oct ${day}`,
        category: 'Food & Dining',
        accountId: accounts[0].id,
        date: `2026-10-${String(day).padStart(2, '0')}`,
        createdAt: `2026-10-${String(day).padStart(2, '0')}T12:00:00Z`,
      })
    }

    const forecast = generateCashFlowForecast({
      currentLiquidBalance: 45500,
      transactions: thirtyDayTxs,
      recurringTransactions: [],
      emis: [],
      emiPayments: [],
      horizonDays: 30,
      forecastStartDate: '2026-10-10',
    })

    expect(forecast.hasSufficientSpendingHistory).toBe(true)
    expect(forecast.distinctExpenseDaysCount).toBe(30)
    expect(forecast.safeDailySpendStatus).toBe('verified')
    expect(forecast.spendingHistoryStatusMessage).toContain('Verified spending baseline')
    expect(forecast.trajectoryStatus).toBe('healthy')

    // Verified Emergency runway in Health Score
    const summary: FinancialSummary = {
      totalAvailable: 45500,
      incomeThisMonth: 50000,
      expensesThisMonth: 15000,
      netSavings: 35000,
      investmentValue: 0,
      emiDueThisMonth: 0,
      netWorth: 45500,
    }
    const health = computeFinancialHealthScore({
      summary,
      accounts,
      transactions: thirtyDayTxs,
      isPeriodPartiallyCovered: false,
      hasVerifiedLiabilities: true,
    })
    expect(health.pillars.emergencyBuffer.status).toBe('good')
    expect(health.pillars.emergencyBuffer.score).toBeGreaterThan(0)
    expect(health.pillars.emergencyBuffer.description).toContain('3 months of living expenses covered')
  })

  // ── Scenario 4: Missing months and partial months ────────
  it('4. Missing months and partial months: clearly flags partial coverage and historical unavailability', () => {
    const accounts = createStandardAccounts()
    const txs = create1DayTransactions(accounts)

    // A. Current month partially covered (Oct 10-31)
    const octoberFlow = calculateConsolidatedFlow({
      accounts,
      transactions: txs,
      period: {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        label: 'October 2026',
        isCurrentMonth: true,
      },
    })
    expect(octoberFlow.isPeriodPartiallyCovered).toBe(true)
    expect(octoberFlow.partialCoverageNotice).toContain('Ledger coverage: 2026-10-10–2026-10-31')
    expect(octoberFlow.partialCoverageNotice).toContain('Historical data unavailable before 2026-10-10')

    // B. Prior month completely before coverage (September 2026)
    const septemberFlow = calculateConsolidatedFlow({
      accounts,
      transactions: txs,
      period: {
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        label: 'September 2026',
        isCurrentMonth: false,
      },
    })
    expect(septemberFlow.hasHistoricalDataWarning).toBe(true)
    expect(septemberFlow.historicalWarningMessage).toContain('Historical ledger data is unavailable')
    expect(septemberFlow.externalIncome).toBe(0)
    expect(septemberFlow.actualExpenses).toBe(0)
  })

  // ── Scenario 5: Genuine zero-expense period with complete coverage ─
  it('5. Genuine zero-expense period: correctly distinguishes genuine zero spending from missing data', () => {
    const accounts: Account[] = [
      {
        id: 'acc-full',
        name: 'Axis Bank',
        type: 'salary',
        openingBalance: 10000,
        balance: 37000,
        openingBalanceDate: '2026-10-01', // Coverage from start of month
        ledgerCoverageStartDate: '2026-10-01',
        isActive: true,
      },
    ]

    const txs: Transaction[] = [
      {
        id: 'tx-sal',
        type: 'income',
        amount: 27000,
        title: 'Salary credit',
        category: 'Salary',
        accountId: 'acc-full',
        date: '2026-10-01',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ]

    const flow = calculateConsolidatedFlow({
      accounts,
      transactions: txs,
      period: {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        label: 'October 2026',
        isCurrentMonth: true,
      },
    })

    expect(flow.isPeriodPartiallyCovered).toBe(false)
    expect(flow.hasHistoricalDataWarning).toBe(false)
    expect(flow.externalIncome).toBe(27000)
    expect(flow.actualExpenses).toBe(0)
    expect(flow.closingBankAndCashBalance).toBe(37000)
    expect(flow.isReconciled).toBe(true)
  })

  // ── Scenario 6: Forecasts with and without scheduled income ─
  it('6. Forecasts with and without scheduled income: updates timeline projections accurately on schedule dates', () => {
    const recurringWithIncome: RecurringTransaction[] = [
      {
        id: 'rec-inc',
        title: 'Freelance Retainer',
        type: 'income',
        amount: 15000,
        category: 'Freelance',
        frequency: 'monthly',
        interval: 1,
        startDate: '2026-10-01',
        nextDueDate: '2026-10-20',
        paymentMethod: 'UPI',
        autoProcess: false,
        status: 'active',
        accountId: 'acc-axis',
        createdAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'rec-exp',
        title: 'Broadband Bill',
        type: 'expense',
        amount: 1000,
        category: 'Utilities',
        frequency: 'monthly',
        interval: 1,
        startDate: '2026-10-01',
        nextDueDate: '2026-10-15',
        paymentMethod: 'UPI',
        autoProcess: false,
        status: 'active',
        accountId: 'acc-axis',
        createdAt: '2026-10-01T00:00:00Z',
      },
    ]

    const forecastWithIncome = generateCashFlowForecast({
      currentLiquidBalance: 45500,
      transactions: [],
      recurringTransactions: recurringWithIncome,
      emis: [],
      emiPayments: [],
      horizonDays: 30,
      forecastStartDate: '2026-10-10',
    })

    expect(forecastWithIncome.totalUpcomingInflows).toBe(15000)
    expect(forecastWithIncome.totalUpcomingOutflows).toBe(1000)
    expect(forecastWithIncome.days[forecastWithIncome.days.length - 1].projectedBalance).toBe(45500 + 15000 - 1000)

    const forecastWithoutIncome = generateCashFlowForecast({
      currentLiquidBalance: 45500,
      transactions: [],
      recurringTransactions: recurringWithIncome.filter((r) => r.type === 'expense'),
      emis: [],
      emiPayments: [],
      horizonDays: 30,
      forecastStartDate: '2026-10-10',
    })

    expect(forecastWithoutIncome.totalUpcomingInflows).toBe(0)
    expect(forecastWithoutIncome.totalUpcomingOutflows).toBe(1000)
    expect(forecastWithoutIncome.days[forecastWithoutIncome.days.length - 1].projectedBalance).toBe(45500 - 1000)
  })

  // ── Scenario 7: Forecasts with unpaid and completed EMIs ─
  it('7. Forecasts with unpaid and completed EMIs: unpaid EMIs are scheduled commitments, completed EMIs are not re-subtracted', () => {
    const emi: EMI = {
      id: 'emi-laptop',
      name: 'Laptop EMI',
      lender: 'HDFC',
      principal: 60000,
      interestRate: 12,
      tenureMonths: 12,
      emiAmount: 5331,
      startDate: '2026-09-01',
      dueDay: 15,
      status: 'active',
      createdAt: '2026-09-01T00:00:00Z',
    }

    // A. Unpaid EMI due Oct 15
    const forecastUnpaid = generateCashFlowForecast({
      currentLiquidBalance: 45500,
      transactions: [],
      recurringTransactions: [],
      emis: [emi],
      emiPayments: [], // Not paid yet for Oct
      horizonDays: 30,
      forecastStartDate: '2026-10-10',
    })

    expect(forecastUnpaid.totalUpcomingOutflows).toBe(5331)
    expect(forecastUnpaid.days[forecastUnpaid.days.length - 1].projectedBalance).toBe(45500 - 5331)

    // B. EMI already paid on Oct 10
    const paidPayment: EMIPayment = {
      id: 'pay-laptop-oct',
      emiId: emi.id,
      instalmentNumber: 2,
      amount: 5331,
      principalComponent: 4800,
      interestComponent: 531,
      paymentDate: '2026-10-10',
      status: 'paid',
    }

    const forecastPaid = generateCashFlowForecast({
      currentLiquidBalance: 45500,
      transactions: [],
      recurringTransactions: [],
      emis: [emi],
      emiPayments: [paidPayment],
      horizonDays: 30,
      forecastStartDate: '2026-10-10',
    })

    expect(forecastPaid.totalUpcomingOutflows).toBe(0)
    expect(forecastPaid.days[forecastPaid.days.length - 1].projectedBalance).toBe(45500)
  })

  // ── Scenario 8: Internal transfers and transfers to cash ─
  it('8. Internal transfers and transfers to cash: affect individual accounts but net to zero in consolidated balance', () => {
    const accounts = createStandardAccounts()
    const txs = create1DayTransactions(accounts)

    const flow = calculateConsolidatedFlow({
      accounts,
      transactions: txs,
      period: {
        startDate: '2026-10-10',
        endDate: '2026-10-31',
        label: 'October 2026',
        isCurrentMonth: true,
      },
    })

    expect(flow.internalTransferEventsCount).toBe(4)
    expect(flow.internalTransfersTotal).toBe(17500) // 8000 + 5000 + 4000 + 500
    expect(flow.closingBankAndCashBalance).toBe(45500)

    // Verify individual balances
    const axisBal = calculateAccountBalance(accounts[0], txs)
    const kotakBal = calculateAccountBalance(accounts[1], txs)
    const sbiBal = calculateAccountBalance(accounts[2], txs)
    const fedBal = calculateAccountBalance(accounts[3], txs)
    const cashBal = calculateAccountBalance(accounts[4], txs)

    expect(axisBal).toBe(19700)
    expect(kotakBal).toBe(13000)
    expect(sbiBal).toBe(6300)
    expect(fedBal).toBe(5600)
    expect(cashBal).toBe(900)
    expect(axisBal + kotakBal + sbiBal + fedBal + cashBal).toBe(45500)
  })

  // ── Scenario 9: Changes to account balances and transactions ─
  it('9. Changes to account balances and transactions: recalculates flows, balances, and health dynamically', () => {
    const accounts = createStandardAccounts()
    const initialTxs = create1DayTransactions(accounts)

    // Add a new expense of ₹1,000 to SBI
    const updatedTxs: Transaction[] = [
      ...initialTxs,
      {
        id: 'tx-new-exp',
        type: 'expense',
        amount: 1000,
        title: 'Dinner with friends',
        category: 'Food & Dining',
        accountId: accounts[2].id,
        date: '2026-10-10',
        createdAt: '2026-10-10T20:00:00Z',
      },
    ]

    const updatedFlow = calculateConsolidatedFlow({
      accounts,
      transactions: updatedTxs,
      period: {
        startDate: '2026-10-10',
        endDate: '2026-10-31',
        label: 'October 2026',
        isCurrentMonth: true,
      },
    })

    expect(updatedFlow.actualExpenses).toBe(2000) // 1000 previous + 1000 new
    expect(updatedFlow.closingBankAndCashBalance).toBe(44500)
    expect(updatedFlow.isReconciled).toBe(true)
  })

  // ── Scenario 10: Investment contributions versus investment valuation ─
  it('10. Investment contributions vs valuation: contributions are asset transfers, market value is not added to invested capital twice', () => {
    const investments: Investment[] = [
      {
        id: 'inv-mf',
        name: 'Nifty 50 Index Fund',
        assetType: 'mutual_funds',
        investedAmount: 50000,
        currentValue: 55000,
        lastUpdated: '2026-10-10',
      },
    ]

    const accounts = createStandardAccounts()
    const netWorth = calculateNetWorthBreakdown({
      liquidAccounts: accounts,
      investments,
      emis: [],
      emiPayments: [],
    })

    expect(netWorth.liquidCash).toBe(45500)
    expect(netWorth.investmentTotal).toBe(55000) // Market value
    expect(netWorth.totalDebt).toBe(0)
    expect(netWorth.netWorth).toBe(45500 + 55000) // 100,500

    const portfolio = calculatePortfolioSummary(investments)
    expect(portfolio.totalInvested).toBe(50000)
    expect(portfolio.totalCurrentValue).toBe(55000)
    expect(portfolio.totalGainLoss).toBe(5000)
    expect(portfolio.gainLossPercentage).toBe(10)
  })

  // ── Scenario 11: Unverified and verified liabilities ────
  it('11. Unverified vs verified liabilities: never awards perfect debt score when unverified, displays correct warning label', () => {
    const accounts = createStandardAccounts()
    const summary: FinancialSummary = {
      totalAvailable: 45500,
      incomeThisMonth: 27000,
      expensesThisMonth: 1000,
      netSavings: 26000,
      investmentValue: 0,
      emiDueThisMonth: 0,
      netWorth: 45500,
    }

    // A. Unverified (default)
    const unverifiedScore = computeFinancialHealthScore({
      summary,
      accounts,
      transactions: create1DayTransactions(accounts),
      emis: [],
      hasVerifiedLiabilities: false,
    })

    expect(unverifiedScore.pillars.emiBurden.score).toBe(14) // 70% of 20
    expect(unverifiedScore.pillars.emiBurden.status).toBe('fair')
    expect(unverifiedScore.pillars.emiBurden.description).toBe('No liabilities recorded — unverified')

    // B. Explicitly verified
    const verifiedScore = computeFinancialHealthScore({
      summary,
      accounts,
      transactions: create1DayTransactions(accounts),
      emis: [],
      hasVerifiedLiabilities: true,
    })

    expect(verifiedScore.pillars.emiBurden.score).toBe(20)
    expect(verifiedScore.pillars.emiBurden.status).toBe('excellent')
    expect(verifiedScore.pillars.emiBurden.description).toBe('Verified Zero Debt Obligations')
  })

  // ── Scenario 12: Month-end and February date boundaries ──
  it('12. Month-end and February date boundaries: handles leap and non-leap Februaries and 30/31 day months without off-by-one errors', () => {
    // Non-leap February 2025
    const feb2025End = new Date(2025, 2, 0).getDate()
    expect(feb2025End).toBe(28)

    // Leap February 2024
    const feb2024End = new Date(2024, 2, 0).getDate()
    expect(feb2024End).toBe(29)

    // October 2026 (31 days)
    const oct2026End = new Date(2026, 10, 0).getDate()
    expect(oct2026End).toBe(31)

    // Forecast from Feb 20, 2025 to month end (9 days inclusive: Feb 20 to Feb 28)
    const forecastFeb = generateCashFlowForecast({
      currentLiquidBalance: 10000,
      transactions: [],
      recurringTransactions: [],
      emis: [],
      emiPayments: [],
      horizonDays: 9,
      forecastStartDate: '2025-02-20',
    })
    expect(forecastFeb.forecastEndDate).toBe('2025-02-28')
    expect(forecastFeb.days.length).toBe(9) // Day 0 to Day 8 (9 days)
  })

  // ── Scenario 13: Reconciliation between account balances, combined balances, and net worth ─
  it('13. Reconciliation: combined closing balance matches sum of active accounts, and net worth balances perfectly', () => {
    const accounts = createStandardAccounts()
    const txs = create1DayTransactions(accounts)

    const axis = calculateAccountBalance(accounts[0], txs)
    const kotak = calculateAccountBalance(accounts[1], txs)
    const sbi = calculateAccountBalance(accounts[2], txs)
    const federal = calculateAccountBalance(accounts[3], txs)
    const cash = calculateAccountBalance(accounts[4], txs)

    expect(axis).toBe(19700)
    expect(kotak).toBe(13000)
    expect(sbi).toBe(6300)
    expect(federal).toBe(5600)
    expect(cash).toBe(900)

    const sumAccounts = axis + kotak + sbi + federal + cash
    expect(sumAccounts).toBe(45500)

    const flow = calculateConsolidatedFlow({
      accounts,
      transactions: txs,
      period: {
        startDate: '2026-10-10',
        endDate: '2026-10-31',
        label: 'October 2026',
        isCurrentMonth: true,
      },
    })

    expect(flow.openingBankAndCashBalance).toBe(19500)
    expect(flow.externalIncome).toBe(27000)
    expect(flow.actualExpenses).toBe(1000)
    expect(flow.closingBankAndCashBalance).toBe(45500)
    expect(flow.closingBankAndCashBalance).toBe(sumAccounts)
    expect(flow.isReconciled).toBe(true)
    expect(flow.reconciliationDiscrepancy).toBe(0)
    expect(flow.netWorth).toBe(45500)
  })
})
