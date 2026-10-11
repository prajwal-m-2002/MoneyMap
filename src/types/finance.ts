export type AccountType =
  | 'savings'
  | 'current'
  | 'salary'
  | 'cash'
  | 'credit'
  | 'credit_card'
  | 'investment'

export interface Account {
  id: string
  userId?: string
  name: string
  type: AccountType
  balance: number // in INR (computed from openingBalance + net credits/debits)
  openingBalance: number
  openingBalanceDate?: string // YYYY-MM-DD: effective date the entered balance represents
  trackingStartDate?: string // YYYY-MM-DD: date tracking began (alias for ledgerCoverageStartDate)
  ledgerCoverageStartDate?: string // YYYY-MM-DD: date from which ledger transaction history is complete
  lastStatementReconciledDate?: string // YYYY-MM-DD: date up to which bank statement has been externally reconciled
  accountNumber?: string
  color?: string
  isDefault?: boolean
  isActive?: boolean
  createdAt?: string // ISO timestamp when account was registered in MoneyMap
  updatedAt?: string
}

export interface CreateAccountInput {
  name: string
  type: AccountType
  openingBalance: number
  openingBalanceDate?: string
  trackingStartDate?: string
  ledgerCoverageStartDate?: string
  lastStatementReconciledDate?: string
  accountNumber?: string
  color?: string
}

export interface UpdateAccountInput {
  name?: string
  type?: AccountType
  openingBalance?: number
  openingBalanceDate?: string
  trackingStartDate?: string
  ledgerCoverageStartDate?: string
  lastStatementReconciledDate?: string
  accountNumber?: string
  color?: string
  isActive?: boolean
}

export type TransactionType = 'expense' | 'income' | 'transfer'

export type PaymentMethod = 'UPI' | 'Debit Card' | 'Credit Card' | 'Net Banking' | 'Cash'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number // in INR
  title: string
  category: string
  accountId: string // source account for expense & transfer, destination for income
  fromAccountId?: string // source account for transfer (alias for accountId)
  toAccountId?: string // destination account for transfer
  date: string // YYYY-MM-DD
  time?: string // HH:mm
  paymentMethod?: PaymentMethod
  notes?: string
  createdAt: string
}

export interface FinancialSummary {
  totalAvailable: number // bank accounts + cash
  incomeThisMonth: number // income in current calendar month
  expensesThisMonth: number // expenses in current calendar month
  netSavings: number
  investmentValue: number
  emiDueThisMonth: number
  netWorth: number
}

export interface ExpenseInput {
  amount: number
  title: string
  category: string
  accountId: string
  date: string
  time?: string
  paymentMethod?: PaymentMethod
  notes?: string
}

export interface IncomeInput {
  amount: number
  title: string // source
  accountId: string // destination account
  category?: string
  date: string
  notes?: string
}

export interface TransferInput {
  amount: number
  fromAccountId: string
  toAccountId: string
  date: string
  purpose?: string
}

export interface Budget {
  id: string
  category: string
  monthlyLimit: number
  month: string // YYYY-MM
  createdAt?: string
  updatedAt?: string
}

export interface CategoryBudgetProgress {
  category: string
  monthlyLimit: number
  spentThisMonth: number
  remaining: number
  spentPercentage: number
  status: 'normal' | 'warning' | 'exceeded' // normal: <80%, warning: 80-100%, exceeded: >100%
  budgetId?: string
}

export interface CategorySpendingItem {
  category: string
  totalSpent: number
  percentageOfTotal: number // share of actual spending (0-100)
  transactionCount: number
  transactions: Transaction[]
  // Optional user-configured budget fields:
  monthlyLimit?: number | null
  budgetRemaining?: number | null
  budgetUsedPercent?: number | null // e.g. 17.5%
  budgetStatus?: 'normal' | 'warning' | 'exceeded' | null
  budgetId?: string | null
}

// ── Monthly Budget / Planning Allocation Types ───────────────

export interface MonthlyBudgetAllocationItem {
  id: string
  name: string
  categoryKey:
    | 'kotak_savings'
    | 'sbi_emi_spending'
    | 'federal_purchases'
    | 'cash_spending'
    | 'axis_retained'
    | 'custom'
  targetAccountId?: string
  plannedAmount: number
  color?: string
  notes?: string
}

export type MonthlyBudgetItem = MonthlyBudgetAllocationItem

export interface MonthlyBudgetPlan {
  month: string // YYYY-MM
  expectedSalary: number
  allocations: MonthlyBudgetAllocationItem[]
  lastUpdated?: string
}

export interface MonthlyBudgetAllocationProgress {
  id: string
  name: string
  categoryKey: MonthlyBudgetAllocationItem['categoryKey']
  targetAccountId?: string
  targetAccountName?: string
  plannedAmount: number
  transferredAmount: number // actual transfers into target account
  spentAmount: number // actual direct expenses from target account
  actualOutflow: number // transferred amount for savings/transfer targets, or spent amount
  remainingAmount: number // plannedAmount - actualOutflow
  percentUsed: number // Math.round((actualOutflow / plannedAmount) * 100) or 0
  status: 'on_track' | 'approaching' | 'exceeded' | 'unfunded'
  color: string
}

export interface MonthlyBudgetAllocationSummary {
  month: string
  expectedSalary: number
  actualSalaryReceived: number
  totalPlanned: number
  totalTransferred: number
  totalSpent: number
  unallocatedPlanned: number
  items: MonthlyBudgetAllocationProgress[]
}

export interface NameSpendingItem {
  name: string
  category: string
  totalSpent: number
  percentageOfTotal: number
  transactionCount: number
  transactions: Transaction[]
}

export interface Preset {
  id: string
  type: TransactionType
  title: string
  category: string
  defaultAmount?: number | null
  accountId?: string | null
  paymentMethod?: PaymentMethod | null
  notes?: string | null
  createdAt?: string
}

export interface CreatePresetInput {
  type: TransactionType
  title: string
  category: string
  defaultAmount?: number | null
  accountId?: string | null
  paymentMethod?: PaymentMethod | null
  notes?: string | null
}

export interface UpdatePresetInput {
  type?: TransactionType
  title?: string
  category?: string
  defaultAmount?: number | null
  accountId?: string | null
  paymentMethod?: PaymentMethod | null
  notes?: string | null
}

export type EMIStatus = 'active' | 'completed' | 'foreclosed' | 'paused'

export type EMIPaymentStatus = 'paid' | 'pending' | 'overdue' | 'skipped'

export interface EMI {
  id: string
  name: string
  lender: string
  principal: number // original principal / product price
  interestRate: number // annual interest rate in % (e.g. 8.5)
  tenureMonths: number
  emiAmount: number // monthly instalment
  startDate: string // YYYY-MM-DD
  dueDay: number // 1-31
  accountId?: string | null
  category?: string
  status: EMIStatus
  notes?: string | null

  // Product purchase EMI extensions
  purchasedFrom?: string | null
  purchaseDate?: string | null
  emiType?: string | null
  firstPaymentAmount?: number | null
  firstPaymentDate?: string | null
  regularEmiAmount?: number | null
  totalInstalments?: number | null
  downPayment?: number | null
  orderReference?: string | null

  createdAt?: string
  updatedAt?: string
}

export interface EMIPayment {
  id: string
  emiId: string
  transactionId?: string | null
  instalmentNumber: number
  amount: number
  principalComponent: number
  interestComponent: number
  paymentDate: string // YYYY-MM-DD
  status: EMIPaymentStatus
  createdAt?: string
}

export interface CreateEMIInput {
  name: string
  lender: string
  principal: number
  interestRate: number
  tenureMonths: number
  emiAmount?: number
  startDate: string
  dueDay: number
  accountId?: string | null
  category?: string
  notes?: string | null

  // Product purchase EMI extensions
  purchasedFrom?: string | null
  purchaseDate?: string | null
  emiType?: string | null
  firstPaymentAmount?: number | null
  firstPaymentDate?: string | null
  regularEmiAmount?: number | null
  totalInstalments?: number | null
  downPayment?: number | null
  orderReference?: string | null
}

export interface UpdateEMIInput {
  name?: string
  lender?: string
  principal?: number
  interestRate?: number
  tenureMonths?: number
  emiAmount?: number
  startDate?: string
  dueDay?: number
  accountId?: string | null
  category?: string
  status?: EMIStatus
  notes?: string | null

  // Product purchase EMI extensions
  purchasedFrom?: string | null
  purchaseDate?: string | null
  emiType?: string | null
  firstPaymentAmount?: number | null
  firstPaymentDate?: string | null
  regularEmiAmount?: number | null
  totalInstalments?: number | null
  downPayment?: number | null
  orderReference?: string | null
}

export interface AmortizationScheduleItem {
  instalmentNumber: number
  paymentDate: string // YYYY-MM-DD
  openingBalance: number
  emiAmount: number
  principalPaid: number
  interestPaid: number
  closingBalance: number
  status: EMIPaymentStatus
  paymentId?: string
  transactionId?: string
  actualPaidDate?: string
}

export interface PrepaymentSimulationResult {
  prepaymentAmount: number
  strategy: 'reduce_tenure' | 'reduce_emi'
  currentPrincipalRemaining: number
  originalRemainingMonths: number
  originalRemainingInterest: number
  newTenureMonths: number
  newEmiAmount: number
  interestSaved: number
  monthsSaved: number
}

export type InvestmentAssetType =
  | 'mutual_funds'
  | 'stocks'
  | 'gold'
  | 'fixed_deposit'
  | 'epf_ppf'
  | 'crypto'
  | 'real_estate'
  | 'other'

export interface Investment {
  id: string
  name: string
  assetType: InvestmentAssetType
  investedAmount: number // in INR
  currentValue: number // in INR
  units?: number | null
  buyPrice?: number | null
  currentPrice?: number | null
  portfolio?: string | null // e.g. "Long Term Wealth", "Retirement"
  institution?: string | null // e.g. "Zerodha", "Groww", "SBI"
  notes?: string | null
  lastUpdated: string // YYYY-MM-DD
  createdAt?: string
  updatedAt?: string
}

export interface CreateInvestmentInput {
  name: string
  assetType: InvestmentAssetType
  investedAmount: number
  currentValue: number
  units?: number | null
  buyPrice?: number | null
  currentPrice?: number | null
  portfolio?: string | null
  institution?: string | null
  notes?: string | null
}

export interface UpdateInvestmentInput {
  name?: string
  assetType?: InvestmentAssetType
  investedAmount?: number
  currentValue?: number
  units?: number | null
  buyPrice?: number | null
  currentPrice?: number | null
  portfolio?: string | null
  institution?: string | null
  notes?: string | null
}

export interface PortfolioAssetAllocationItem {
  assetType: InvestmentAssetType
  label: string
  color: string
  totalInvested: number
  totalCurrentValue: number
  totalGainLoss: number
  gainLossPct: number
  percentageOfPortfolio: number // 0-100
  itemCount: number
}

export interface PortfolioSummary {
  totalInvested: number
  totalCurrentValue: number
  totalGainLoss: number
  gainLossPercentage: number
  allocations: PortfolioAssetAllocationItem[]
  topGainer?: { name: string; gainPct: number; gainAmount: number } | null
}

export interface NetWorthBreakdown {
  liquidCash: number
  investmentTotal: number
  grossAssets: number
  totalDebt: number
  netWorth: number
  debtRatio: number // debt / grossAssets
  liquidRatio: number // liquid / grossAssets
  investRatio: number // invest / grossAssets
}

// ── Phase 11: Statement Parsing & Bank Import Types ──────────

export type BankPresetId =
  | 'auto'
  | 'hdfc'
  | 'sbi'
  | 'icici'
  | 'axis'
  | 'kotak'
  | 'generic'

export interface ParsedRawTransaction {
  id: string
  date: string // YYYY-MM-DD
  time?: string
  rawNarration: string
  cleanedTitle: string
  type: 'expense' | 'income'
  amount: number
  category: string
  paymentMethod: PaymentMethod
  referenceNo?: string
  balance?: number
  isDuplicate?: boolean
  selected: boolean
}

export interface StatementColumnMapping {
  dateIndex: number
  narrationIndex: number
  withdrawalIndex: number // or -1 if single amount
  depositIndex: number // or -1 if single amount
  amountIndex?: number // if single amount
  typeIndex?: number // if single amount with Dr/Cr
  refIndex?: number
  balanceIndex?: number
}

export interface StatementParseResult {
  transactions: ParsedRawTransaction[]
  detectedBank: string
  totalCount: number
  duplicateCount: number
  totalInflow: number
  totalOutflow: number
  headers: string[]
  rows: string[][]
  errors: string[]
}

export interface ExportFilterOptions {
  dateRange: 'this_month' | 'last_month' | 'last_3_months' | 'fy_current' | 'all' | 'custom'
  startDate?: string
  endDate?: string
  accountId: string // 'all' or specific accountId
  type: 'all' | 'expense' | 'income' | 'transfer'
}

// ── Phase 12: Recurring Transactions & Prediction Types ────────

export type RecurringFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'

export type RecurringStatus = 'active' | 'paused' | 'completed'

export interface RecurringTransaction {
  id: string
  title: string
  amount: number
  type: TransactionType
  category: string
  accountId: string
  toAccountId?: string
  frequency: RecurringFrequency
  interval: number // default 1
  startDate: string // YYYY-MM-DD
  endDate?: string | null
  nextDueDate: string // YYYY-MM-DD
  lastProcessedDate?: string | null
  paymentMethod: PaymentMethod
  autoProcess: boolean // true = post automatically, false = notify/manual approval
  status: RecurringStatus
  notes?: string
  createdAt: string

  // Subscription Tracker Extensions
  provider?: string | null
  isFreeTrial?: boolean
  remindOneDayBefore?: boolean
  billingCycle?: string
}

export interface CreateRecurringInput {
  title: string
  amount: number
  type: TransactionType
  category: string
  accountId: string
  toAccountId?: string
  frequency: RecurringFrequency
  interval?: number
  startDate: string
  endDate?: string | null
  paymentMethod?: PaymentMethod
  autoProcess?: boolean
  notes?: string

  // Subscription Tracker Extensions
  provider?: string | null
  isFreeTrial?: boolean
  remindOneDayBefore?: boolean
  billingCycle?: string
}

export interface UpdateRecurringInput {
  title?: string
  amount?: number
  type?: TransactionType
  category?: string
  accountId?: string
  toAccountId?: string
  frequency?: RecurringFrequency
  interval?: number
  startDate?: string
  endDate?: string | null
  nextDueDate?: string
  paymentMethod?: PaymentMethod
  autoProcess?: boolean
  status?: RecurringStatus
  notes?: string

  // Subscription Tracker Extensions
  provider?: string | null
  isFreeTrial?: boolean
  remindOneDayBefore?: boolean
  billingCycle?: string
}

export interface ForecastEvent {
  title: string
  amount: number
  type: 'income' | 'expense' | 'transfer' | 'emi'
  category: string
}

export interface CashFlowForecastDay {
  date: string // YYYY-MM-DD
  dayLabel: string
  projectedBalance: number
  inflows: number
  outflows: number
  events: ForecastEvent[]
}

export interface CashFlowForecast {
  currentLiquidBalance: number
  projectedMonthEndBalance: number
  lowestProjectedBalance: { amount: number; date: string }
  totalUpcomingInflows: number
  totalUpcomingOutflows: number
  safeDailySpend: number
  daysLeftInMonth: number
  days: CashFlowForecastDay[]
  hasLowBalanceWarning: boolean
  isInsufficientData?: boolean
  insufficientDataReason?: string
  assumptionsSummary?: string[]
  minimumReserve?: number
  discretionaryFundSurplus?: number
  // Phase 2: Explicit separation of verified facts, scheduled commitments, and spending assumptions
  forecastStartDate: string
  forecastEndDate: string
  hasSufficientSpendingHistory: boolean
  distinctExpenseDaysCount: number
  spendingHistoryThresholdDays: number
  safeDailySpendStatus: 'verified' | 'insufficient_history' | 'provisional'
  spendingHistoryStatusMessage?: string
  provisionalDailySpend: number
  trajectoryStatus: 'healthy' | 'provisional' | 'low_balance' | 'insufficient_data'
  trajectoryLabel: string
  verifiedFacts: {
    startingLiquidBalance: number
    reconciledAsOfDate: string
    historicalExpensesTotal: number
    recordedDaysCount: number
  }
  scheduledCommitments: {
    totalCommitments: number
    upcomingInflows: number
    upcomingOutflows: number
    eventsCount: number
  }
}

export interface RecurringSuggestion {
  id: string
  title: string
  averageAmount: number
  type: TransactionType
  category: string
  suggestedFrequency: RecurringFrequency
  occurrencesCount: number
  approximateDayOfMonth: number
  confidence: number // 0-100
  sampleTransactionIds: string[]
}
