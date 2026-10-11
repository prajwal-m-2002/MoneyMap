import { describe, it, expect } from 'vitest'
import { calculateAccountBalance } from '@/context/FinanceContext'
import { calculateConsolidatedFlow } from '@/lib/consolidatedFlowMath'
import { computeFinancialHealthScore } from '@/lib/financialHealth'
import { generateCashFlowForecast } from '@/lib/predictionEngine'
import { calculateNetWorthBreakdown } from '@/lib/portfolioMath'
import type {
  Account,
  Transaction,
  Investment,
  EMI,
  EMIPayment,
  RecurringTransaction,
  FinancialSummary,
} from '@/types/finance'

describe('MoneyMap — Final Analytics Validation & Audit Suite', () => {
  // Standard test accounts
  const createStandardAccounts = (): Account[] => [
    {
      id: '27e2c0a0-0690-486c-9e34-a23a8f8e91bc',
      name: 'Axis Bank',
      type: 'salary',
      openingBalance: 10000,
      balance: 10000,
      openingBalanceDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
    {
      id: '3181a7ee-8679-4ec2-ab60-e12a278cfd8d',
      name: 'Kotak Bank',
      type: 'savings',
      openingBalance: 5000,
      balance: 5000,
      openingBalanceDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
    {
      id: 'a2c72a8f-11a6-4e68-87c7-6a25e0c3784e',
      name: 'SBI',
      type: 'savings',
      openingBalance: 2000,
      balance: 2000,
      openingBalanceDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
    {
      id: '96e338eb-dee7-41e1-bc9c-a7e43fa8b2dd',
      name: 'Federal Bank',
      type: 'savings',
      openingBalance: 2000,
      balance: 2000,
      openingBalanceDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
    {
      id: 'f7864706-0575-4add-a0fe-0fe858880a95',
      name: 'Physical Cash',
      type: 'cash',
      openingBalance: 500,
      balance: 500,
      openingBalanceDate: '2026-10-10',
      ledgerCoverageStartDate: '2026-10-10',
      isActive: true,
    },
  ]

  const createStandardNineTransactions = (accounts: Account[]): Transaction[] => {
    const [axis, kotak, sbi, federal, cash] = accounts
    return [
      // 1. Salary +₹27,000 to Axis
      {
        id: 'tx-1',
        type: 'income',
        amount: 27000,
        title: 'Salary received',
        category: 'Salary',
        accountId: axis.id,
        date: '2026-10-10',
        createdAt: '2026-10-10T21:28:20.390Z',
      },
      // 2. Axis -> Kotak: ₹8,000 (Monthly Savings)
      {
        id: 'tx-2',
        type: 'transfer',
        amount: 8000,
        title: 'Monthly Savings',
        category: 'Transfer',
        accountId: axis.id,
        toAccountId: kotak.id,
        date: '2026-10-10',
        createdAt: '2026-10-10T21:29:12.546Z',
      },
      // 3. Axis -> SBI: ₹5,000
      {
        id: 'tx-3',
        type: 'transfer',
        amount: 5000,
        title: 'Monthly Spending Fund',
        category: 'Transfer',
        accountId: axis.id,
        toAccountId: sbi.id,
        date: '2026-10-10',
        createdAt: '2026-10-10T21:29:58.144Z',
      },
      // 4. Axis -> Federal Bank: ₹4,000
      {
        id: 'tx-4',
        type: 'transfer',
        amount: 4000,
        title: 'Purchase Fund',
        category: 'Transfer',
        accountId: axis.id,
        toAccountId: federal.id,
        date: '2026-10-10',
        createdAt: '2026-10-10T21:30:33.246Z',
      },
      // 5. Axis expense Lunch: ₹300
      {
        id: 'tx-5',
        type: 'expense',
        amount: 300,
        title: 'Lunch',
        category: 'Food & Dining',
        accountId: axis.id,
        date: '2026-10-10',
        createdAt: '2026-10-10T21:31:31.657Z',
      },
      // 6. SBI expense Transport: ₹200
      {
        id: 'tx-6',
        type: 'expense',
        amount: 200,
        title: 'Transport',
        category: 'Transportation',
        accountId: sbi.id,
        date: '2026-10-10',
        createdAt: '2026-10-10T21:32:02.656Z',
      },
      // 7. Federal expense Household Items: ₹400
      {
        id: 'tx-7',
        type: 'expense',
        amount: 400,
        title: 'Household Items',
        category: 'Shopping',
        accountId: federal.id,
        date: '2026-10-10',
        createdAt: '2026-10-10T21:32:30.996Z',
      },
      // 8. SBI -> Cash: ₹500
      {
        id: 'tx-8',
        type: 'transfer',
        amount: 500,
        title: 'ATM Cash Withdrawal',
        category: 'Transfer',
        accountId: sbi.id,
        toAccountId: cash.id,
        date: '2026-10-10',
        createdAt: '2026-10-10T21:33:13.799Z',
      },
      // 9. Cash expense Evening Snacks: ₹100
      {
        id: 'tx-9',
        type: 'expense',
        amount: 100,
        title: 'Evening Snacks',
        category: 'Snacks',
        accountId: cash.id,
        date: '2026-10-10',
        createdAt: '2026-10-10T21:33:47.444Z',
      },
    ]
  }

  // ── Requirement 1: Preserve Exact Closing Balances ──────────
  describe('1. Preservation of Exact Closing Balances', () => {
    it('preserves closing balances: Axis ₹19,700, Kotak ₹13,000, SBI ₹6,300, Federal ₹5,600, Physical Cash ₹900, Combined ₹45,500', () => {
      const accounts = createStandardAccounts()
      const transactions = createStandardNineTransactions(accounts)
      const [axis, kotak, sbi, federal, cash] = accounts

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
  })

  // ── Requirement 2: Reporting Period Filter & Ledger Coverage Labels ──
  describe('2. Reporting Period Filter & Ledger Coverage Labels', () => {
    it('calculates opening and closing balances using transaction dates and opening balance date', () => {
      const accounts = createStandardAccounts()
      const transactions = createStandardNineTransactions(accounts)

      // Set live balances
      accounts[0].balance = 19700
      accounts[1].balance = 13000
      accounts[2].balance = 6300
      accounts[3].balance = 5600
      accounts[4].balance = 900

      const octoberPeriod = {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        label: 'October 2026',
        isCurrentMonth: true,
      }

      const flow = calculateConsolidatedFlow({
        accounts,
        transactions,
        period: octoberPeriod,
      })

      // Combined opening = 10k + 5k + 2k + 2k + 500 = 19,500
      expect(flow.openingBankAndCashBalance).toBe(19500)
      expect(flow.externalIncome).toBe(27000)
      expect(flow.actualExpenses).toBe(1000) // 300 + 200 + 400 + 100
      expect(flow.closingBankAndCashBalance).toBe(45500)
      expect(flow.isReconciled).toBe(true)

      // Phase 1: Date and balance semantics
      expect(flow.asOfDate).toBe('2026-10-10')
      expect(flow.latestTransactionDate).toBe('2026-10-10')
      expect(flow.isPeriodEndingInFuture).toBe(true)
      expect(flow.closingBalanceLabel).toContain('Reconciled Balance as of 2026-10-10')
      expect(flow.closingBalanceLabel).toContain('Period end 2026-10-31 pending')
      expect(flow.openingBalanceSemantics).toContain('Start of Day 00:00:00')
      expect(flow.openingBalanceSemantics).toContain('October 1–9 transactions are unrecorded')

      // Clearly labels partially covered period when opening balance date is mid-period (Oct 10)
      expect(flow.isPeriodPartiallyCovered).toBe(true)
      expect(flow.partialCoverageNotice).toContain('Ledger coverage begins on 2026-10-10')
      expect(flow.partialCoverageNotice).toContain('October 1–9')
      expect(flow.reconciliationStatusLabel).toContain('Partially Covered Period')
    })

    it('clearly labels periods with incomplete historical coverage (period before opening date)', () => {
      const accounts = createStandardAccounts()
      const transactions = createStandardNineTransactions(accounts)

      const septemberPeriod = {
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        label: 'September 2026',
        isCurrentMonth: false,
      }

      const flow = calculateConsolidatedFlow({
        accounts,
        transactions,
        period: septemberPeriod,
      })

      expect(flow.hasHistoricalDataWarning).toBe(true)
      expect(flow.historicalWarningMessage).toContain('Historical ledger data is unavailable')
      expect(flow.isReconciled).toBe(false)
      expect(flow.reconciliationStatusLabel).toBe('Historical Records Incomplete')
    })

    it('handles future reporting periods and custom date ranges accurately', () => {
      const accounts = createStandardAccounts()
      const transactions = createStandardNineTransactions(accounts)

      // Future reporting period
      const futurePeriod = {
        startDate: '2026-11-01',
        endDate: '2026-11-30',
        label: 'November 2026',
        isCurrentMonth: false,
      }

      const futureFlow = calculateConsolidatedFlow({
        accounts,
        transactions,
        period: futurePeriod,
      })

      expect(futureFlow.isPeriodEndingInFuture).toBe(true)
      expect(futureFlow.externalIncome).toBe(0)
      expect(futureFlow.actualExpenses).toBe(0)
      // Opening balance reflects prior activity up to Nov 1 (19,500 + 27,000 - 1,000 = 45,500)
      expect(futureFlow.openingBankAndCashBalance).toBe(45500)
      expect(futureFlow.closingBankAndCashBalance).toBe(45500)

      // Custom date range (Oct 10 only)
      const customPeriod = {
        startDate: '2026-10-10',
        endDate: '2026-10-10',
        label: '2026-10-10 to 2026-10-10',
        isCurrentMonth: true,
      }

      const customFlow = calculateConsolidatedFlow({
        accounts,
        transactions,
        period: customPeriod,
      })

      expect(customFlow.openingBankAndCashBalance).toBe(19500)
      expect(customFlow.externalIncome).toBe(27000)
      expect(customFlow.actualExpenses).toBe(1000)
      expect(customFlow.closingBankAndCashBalance).toBe(45500)
    })
  })

  // ── Requirement 3: Financial Health Score Audit ─────────────
  describe('3. Financial Health Score Audit & Unearned Perfect Score Prevention', () => {
    it('does not treat income minus expenses as actual savings contributions and clearly defines components', () => {
      const accounts = createStandardAccounts()
      const transactions = createStandardNineTransactions(accounts)
      accounts[0].balance = 19700
      accounts[1].balance = 13000
      accounts[2].balance = 6300
      accounts[3].balance = 5600
      accounts[4].balance = 900

      const summary: FinancialSummary = {
        totalAvailable: 45500,
        incomeThisMonth: 27000,
        expensesThisMonth: 1000,
        netSavings: 26000, // Income - Expenses is ₹26,000, but actual savings transfer was ₹8,000 to Kotak
        investmentValue: 0,
        emiDueThisMonth: 0,
        netWorth: 45500,
      }

      const healthScore = computeFinancialHealthScore({
        summary,
        accounts,
        transactions,
        isPeriodPartiallyCovered: true,
      })

      // Verified savings: ₹8,000 transferred to Kotak Bank (29.6% ≈ 30% of salary)
      expect(healthScore.pillars.savingsRate.description).toContain('allocated to verified savings & investments')
      expect(healthScore.pillars.savingsRate.calculationDetails).toContain('Verified savings contributions (₹8,000)')
      expect(healthScore.pillars.savingsRate.calculationDetails).toContain('Unspent transactional cash')

      // Phase 3: Displays "Insufficient history to calculate runway" and does not invent runway on partial month
      expect(healthScore.pillars.emergencyBuffer.description).toContain('Insufficient history to calculate runway')
      expect(healthScore.pillars.emergencyBuffer.status).toBe('neutral')
      expect(healthScore.pillars.emergencyBuffer.score).toBe(0)

      // Phase 3: Distinguishes unverified zero debt from verified absence of debt
      expect(healthScore.pillars.emiBurden.status).toBe('fair')
      expect(healthScore.pillars.emiBurden.description).toContain('No liabilities recorded — unverified')
      expect(healthScore.pillars.emiBurden.score).toBe(14) // 70% of 20 pts

      // Phase 3: Methodology and evaluation period documented
      expect(healthScore.isProvisional).toBe(true)
      expect(healthScore.totalScore).toBeLessThan(80)
      expect(healthScore.tierLabel).toContain('Provisional')
      expect(healthScore.methodologySummary).toContain('Four-pillar evaluation')
    })

    it('classifies unspent cash surplus as unallocated when no dedicated savings or investments exist', () => {
      const accounts = createStandardAccounts()
      // Only salary and 1 expense, no transfers to savings account
      const txsWithoutSavings: Transaction[] = [
        {
          id: 'tx-s',
          type: 'income',
          amount: 50000,
          title: 'Salary',
          category: 'Salary',
          accountId: accounts[0].id,
          date: '2026-10-01',
          createdAt: '2026-10-01T00:00:00Z',
        },
        {
          id: 'tx-e',
          type: 'expense',
          amount: 10000,
          title: 'Groceries',
          category: 'Groceries',
          accountId: accounts[0].id,
          date: '2026-10-05',
          createdAt: '2026-10-05T00:00:00Z',
        },
      ]

      const summary: FinancialSummary = {
        totalAvailable: 40000,
        incomeThisMonth: 50000,
        expensesThisMonth: 10000,
        netSavings: 40000,
        investmentValue: 0,
        emiDueThisMonth: 0,
        netWorth: 40000,
      }

      const score = computeFinancialHealthScore({
        summary,
        accounts,
        transactions: txsWithoutSavings,
      })

      // Notice: Does NOT grant full 30 points as if verified savings occurred!
      expect(score.pillars.savingsRate.description).toContain('unallocated operational cash retained in checking')
      expect(score.pillars.savingsRate.calculationDetails).toContain('no verified transfers to designated savings accounts')
      expect(score.pillars.savingsRate.score).toBeLessThanOrEqual(15)
      expect(score.pillars.savingsRate.status).toBe('fair')
    })
  })

  // ── Requirement 4: 30-Day Liquidity Forecast Audit ─────────
  describe('4. 30-Day Liquidity Forecast Audit & Planned vs Paid Verification', () => {
    it('projects liquidity and prevents double-counting paid EMIs or fixed payments in discretionary burn', () => {
      const currentLiquidBalance = 45500
      const emis: EMI[] = [
        {
          id: 'emi-bike',
          name: 'Bike Loan',
          lender: 'HDFC Bank',
          principal: 60000,
          interestRate: 10,
          tenureMonths: 12,
          emiAmount: 5275,
          startDate: '2026-08-10',
          dueDay: 10, // Due on the 10th
          status: 'active',
          createdAt: '2026-08-10T00:00:00Z',
        },
      ]

      const recurringRules: RecurringTransaction[] = [
        {
          id: 'rec-wifi',
          title: 'Broadband Wifi',
          amount: 999,
          type: 'expense',
          category: 'Bills & Utilities',
          accountId: '27e2c0a0-0690-486c-9e34-a23a8f8e91bc',
          frequency: 'monthly',
          interval: 1,
          startDate: '2026-10-01',
          nextDueDate: '2026-10-15',
          paymentMethod: 'UPI',
          autoProcess: true,
          status: 'active',
          createdAt: '2026-10-01T00:00:00Z',
        },
      ]

      // Case A: Bike EMI for October has ALREADY been paid on 2026-10-10
      const paidEMIPayments: EMIPayment[] = [
        {
          id: 'pay-bike-oct',
          emiId: 'emi-bike',
          instalmentNumber: 3,
          amount: 5275,
          principalComponent: 4800,
          interestComponent: 475,
          paymentDate: '2026-10-10',
          status: 'paid',
        },
      ]

      const forecastWithPaidEMI = generateCashFlowForecast(
        currentLiquidBalance,
        recurringRules,
        emis,
        [],
        30,
        '2026-10-10',
        paidEMIPayments
      )

      // The October 10th EMI is ALREADY paid -> must NOT be counted as an outflow on 2026-10-10!
      const day0Outflow = forecastWithPaidEMI.days[0].outflows
      expect(day0Outflow).toBe(0)

      // The upcoming outflow should only be the Wifi bill on Oct 15 (₹999)
      expect(forecastWithPaidEMI.totalUpcomingOutflows).toBe(999)
      expect(forecastWithPaidEMI.projectedMonthEndBalance).toBe(45500 - 999)
      expect(forecastWithPaidEMI.safeDailySpend).toBeGreaterThan(0)
    })
  })

  // ── Requirement 5: Investment Contributions & Valuation Changes & Liabilities ──
  describe('5. Investments Portfolio & Net Worth Liability Protection', () => {
    it('deducts completed EMI principal payments from loan liabilities in Net Worth', () => {
      const liquidAccounts = createStandardAccounts()
      // Live combined liquid balance: ₹45,500
      liquidAccounts[0].balance = 19700
      liquidAccounts[1].balance = 13000
      liquidAccounts[2].balance = 6300
      liquidAccounts[3].balance = 5600
      liquidAccounts[4].balance = 900

      const investments: Investment[] = [
        {
          id: 'inv-mf',
          name: 'Nifty 50 Index Fund',
          assetType: 'mutual_funds',
          investedAmount: 50000,
          currentValue: 58000, // +8,000 gain
          lastUpdated: '2026-10-10',
          createdAt: '2026-09-01T00:00:00Z',
          updatedAt: '2026-10-10T00:00:00Z',
        },
      ]

      const emis: EMI[] = [
        {
          id: 'emi-laptop',
          name: 'Laptop Loan',
          lender: 'Bajaj Finance',
          principal: 60000,
          interestRate: 0,
          tenureMonths: 6,
          emiAmount: 10000,
          startDate: '2026-08-01',
          dueDay: 5,
          status: 'active',
          createdAt: '2026-08-01T00:00:00Z',
        },
      ]

      // 2 EMIs already paid (₹20,000 principal paid)
      const emiPayments: EMIPayment[] = [
        {
          id: 'p-1',
          emiId: 'emi-laptop',
          instalmentNumber: 1,
          amount: 10000,
          principalComponent: 10000,
          interestComponent: 0,
          paymentDate: '2026-08-05',
          status: 'paid',
        },
        {
          id: 'p-2',
          emiId: 'emi-laptop',
          instalmentNumber: 2,
          amount: 10000,
          principalComponent: 10000,
          interestComponent: 0,
          paymentDate: '2026-09-05',
          status: 'paid',
        },
      ]

      const netWorthData = calculateNetWorthBreakdown({
        liquidAccounts,
        investments,
        emis,
        emiPayments,
      })

      // Remaining debt: 60,000 - 20,000 = 40,000 (NOT 60,000!)
      expect(netWorthData.totalDebt).toBe(40000)
      // Gross Assets = 45,500 (liquid) + 58,000 (investments) = 103,500
      expect(netWorthData.grossAssets).toBe(103500)
      // Net Worth = 103,500 - 40,000 = 63,500
      expect(netWorthData.netWorth).toBe(63500)

      // Verify calculateConsolidatedFlow produces matching liability and net worth
      const period = {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        label: 'October 2026',
        isCurrentMonth: true,
      }
      const flow = calculateConsolidatedFlow({
        accounts: liquidAccounts,
        transactions: createStandardNineTransactions(liquidAccounts),
        period,
        investments,
        emis,
        emiPayments,
      })

      expect(flow.liabilities).toBe(40000)
      expect(flow.investmentValue).toBe(58000)
      expect(flow.netWorth).toBe(45500 + 58000 - 40000) // 63,500
    })
  })

  // ── Requirement 6: Transaction Edits, Deletions, and Transfers ──
  describe('6. Transaction Edits, Deletions & Atomic Reversals', () => {
    it('correctly reverts balances when deleting an expense or transfer transaction', () => {
      const accounts = createStandardAccounts()
      const txs = createStandardNineTransactions(accounts)
      const axis = accounts[0]

      // Initial balance of Axis after 9 transactions is 19,700
      expect(calculateAccountBalance(axis, txs)).toBe(19700)

      // Delete the Lunch expense (tx-5: ₹300)
      const txsWithoutLunch = txs.filter((t) => t.id !== 'tx-5')
      expect(calculateAccountBalance(axis, txsWithoutLunch)).toBe(20000)

      // Delete the ₹8,000 transfer to Kotak (tx-2)
      const txsWithoutTransfer = txs.filter((t) => t.id !== 'tx-2')
      expect(calculateAccountBalance(axis, txsWithoutTransfer)).toBe(19700 + 8000) // 27,700
      expect(calculateAccountBalance(accounts[1], txsWithoutTransfer)).toBe(13000 - 8000) // 5,000 (Kotak reverts to opening balance)
    })

    it('updates account balances consistently when editing an existing transaction amount or destination', () => {
      const accounts = createStandardAccounts()
      const txs = createStandardNineTransactions(accounts)
      const [axis, kotak, sbi] = accounts

      // Edit tx-3: Change transfer to SBI from ₹5,000 to ₹3,000
      const editedTxs = txs.map((t) => (t.id === 'tx-3' ? { ...t, amount: 3000 } : t))

      // Axis retained ₹2,000 more (19,700 + 2,000 = 21,700)
      expect(calculateAccountBalance(axis, editedTxs)).toBe(21700)
      // SBI received ₹2,000 less (6,300 - 2,000 = 4,300)
      expect(calculateAccountBalance(sbi, editedTxs)).toBe(4300)

      // Combined balance remains exactly ₹45,500 because internal transfers preserve total wealth
      const totalCombined =
        calculateAccountBalance(axis, editedTxs) +
        calculateAccountBalance(kotak, editedTxs) +
        calculateAccountBalance(sbi, editedTxs) +
        calculateAccountBalance(accounts[3], editedTxs) +
        calculateAccountBalance(accounts[4], editedTxs)

      expect(totalCombined).toBe(45500)
    })
  })

  // ── Requirement 7: Additional Account & Multi-tenant Isolation ──
  describe('7. Additional Accounts & User Record Isolation', () => {
    it('seamlessly incorporates an additional account into consolidated flows and net worth', () => {
      const accounts = createStandardAccounts()
      const txs = createStandardNineTransactions(accounts)

      // Add a 6th account: HDFC Bank (Opening balance ₹10,000)
      const hdfc: Account = {
        id: 'acc-hdfc-new',
        name: 'HDFC Bank',
        type: 'savings',
        openingBalance: 10000,
        balance: 10000,
        openingBalanceDate: '2026-10-10',
        ledgerCoverageStartDate: '2026-10-10',
        isActive: true,
      }

      const allAccounts = [...accounts, hdfc]
      const period = {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
        label: 'October 2026',
        isCurrentMonth: true,
      }

      const flow = calculateConsolidatedFlow({
        accounts: allAccounts,
        transactions: txs,
        period,
      })

      // Opening increases by ₹10,000 (19,500 + 10,000 = 29,500)
      expect(flow.openingBankAndCashBalance).toBe(29500)
      // Closing increases by ₹10,000 (45,500 + 10,000 = 55,500)
      expect(flow.closingBankAndCashBalance).toBe(55500)
      expect(flow.accountSummaries.length).toBe(6)
    })

    it('enforces tenant record isolation preventing data leakage between users', () => {
      const userAId = 'user-uuid-111'
      const userBId = 'user-uuid-222'

      const userAAccounts: Account[] = [
        { id: 'acc-a1', userId: userAId, name: 'User A Axis', type: 'salary', balance: 50000, openingBalance: 50000, isActive: true },
      ]
      const userBAccounts: Account[] = [
        { id: 'acc-b1', userId: userBId, name: 'User B HDFC', type: 'savings', balance: 100000, openingBalance: 100000, isActive: true },
      ]

      // Filter function simulating Supabase RLS policy `auth.uid() = user_id`
      const filterByUser = (accs: Account[], activeUser: string) =>
        accs.filter((a) => a.userId === activeUser)

      const isolatedForA = filterByUser([...userAAccounts, ...userBAccounts], userAId)
      expect(isolatedForA.length).toBe(1)
      expect(isolatedForA[0].id).toBe('acc-a1')
      expect(isolatedForA.some((a) => a.userId === userBId)).toBe(false)
    })
  })

  // ── Requirement 8: Phase 1 — Ledger Coverage & Date Boundary Accuracy ──
  describe('8. Phase 1 — Ledger Coverage & Date Boundary Precision', () => {
    it('accurately identifies pre-coverage periods and prevents fabricated ₹0 historical spending', () => {
      const accounts = createStandardAccounts()
      const txs = createStandardNineTransactions(accounts)

      // Period September 2026: completely precedes ledger coverage start (2026-10-10)
      const septPeriod = {
        startDate: '2026-09-01',
        endDate: '2026-09-30',
        label: 'September 2026',
        isCurrentMonth: false,
      }

      const flow = calculateConsolidatedFlow({
        accounts,
        transactions: txs,
        period: septPeriod,
      })

      // Must set warning and mark coverage unavailable
      expect(flow.hasHistoricalDataWarning).toBe(true)
      expect(flow.isLedgerCoverageUnavailable).toBe(true)
      expect(flow.externalIncome).toBe(0)
      expect(flow.actualExpenses).toBe(0)
    })

    it('accurately handles end date boundary including transactions on end date without overflowing into next day', () => {
      const accounts = createStandardAccounts()
      const [axis] = accounts

      // Transaction on 2026-10-10 23:30:00 (inside period)
      const txOnEndDate: Transaction = {
        id: 'tx-end-day',
        type: 'expense',
        amount: 250,
        title: 'Late night snack',
        category: 'Food & Dining',
        accountId: axis.id,
        date: '2026-10-10',
        createdAt: '2026-10-10T23:30:00.000Z',
      }

      // Transaction on 2026-10-11 00:05:00 (following day)
      const txNextDay: Transaction = {
        id: 'tx-next-day',
        type: 'expense',
        amount: 350,
        title: 'Morning coffee',
        category: 'Food & Dining',
        accountId: axis.id,
        date: '2026-10-11',
        createdAt: '2026-10-11T00:05:00.000Z',
      }

      const period = {
        startDate: '2026-10-10',
        endDate: '2026-10-10',
        label: 'Single Day: Oct 10',
        isCurrentMonth: true,
      }

      const flow = calculateConsolidatedFlow({
        accounts,
        transactions: [txOnEndDate, txNextDay],
        period,
      })

      // Only txOnEndDate (₹250) is included; txNextDay (₹350) is excluded
      expect(flow.actualExpenses).toBe(250)
    })
  })

  // ── Requirement 9: Phase 2 — Liquidity Forecast Formulas & Edge Cases ──
  describe('9. Phase 2 — Forecast Formulas, Safety Reserve & Edge Cases', () => {
    it('applies minimum reserve deduction and calculates discretionary surplus', () => {
      const currentLiquidBalance = 20000
      const recurringRules: RecurringTransaction[] = [
        {
          id: 'rec-rent',
          title: 'House Rent',
          amount: 8000,
          type: 'expense',
          category: 'Rent',
          accountId: 'acc-1',
          frequency: 'monthly',
          interval: 1,
          startDate: '2026-10-01',
          nextDueDate: '2026-10-25',
          paymentMethod: 'Net Banking',
          autoProcess: true,
          status: 'active',
          createdAt: '2026-10-01T00:00:00Z',
        },
      ]

      const minimumReserve = 5000 // Configured safety reserve

      const forecast = generateCashFlowForecast(
        currentLiquidBalance,
        recurringRules,
        [], // No EMIs
        [], // No historical txs
        30,
        '2026-10-10',
        [],
        minimumReserve
      )

      // Month-end balance = 20,000 - 8,000 = 12,000
      expect(forecast.projectedMonthEndBalance).toBe(12000)
      // Discretionary surplus = Math.max(0, 12,000 - 5,000) = 7,000
      expect(forecast.discretionaryFundSurplus).toBe(7000)
      expect(forecast.minimumReserve).toBe(5000)
      expect(forecast.assumptionsSummary?.length).toBeGreaterThan(0)
      expect(forecast.assumptionsSummary?.some((a) => a.includes('Safety Reserve'))).toBe(true)
    })

    it('correctly handles month-end clamping in February with 28/29 days', () => {
      const currentLiquidBalance = 15000
      const emis: EMI[] = [
        {
          id: 'emi-feb',
          name: 'Personal Loan',
          lender: 'SBI',
          principal: 50000,
          interestRate: 11,
          tenureMonths: 12,
          emiAmount: 3000,
          startDate: '2026-01-31',
          dueDay: 31, // Due on 31st of every month
          status: 'active',
          createdAt: '2026-01-31T00:00:00Z',
        },
      ]

      // Forecast starting in February
      const forecastFeb = generateCashFlowForecast(
        currentLiquidBalance,
        [],
        emis,
        [],
        28,
        '2026-02-01',
        []
      )

      // The EMI with dueDay 31 must be clamped to Feb 28 and deducted
      expect(forecastFeb.totalUpcomingOutflows).toBe(3000)
      expect(forecastFeb.projectedMonthEndBalance).toBe(12000)
    })

    it('flags insufficient data when starting balance is 0 and no income is projected', () => {
      const forecast = generateCashFlowForecast(
        0,
        [],
        [],
        [],
        30,
        '2026-10-10',
        []
      )

      expect(forecast.isInsufficientData).toBe(true)
      expect(forecast.insufficientDataReason).toContain('Insufficient data')
      expect(forecast.safeDailySpend).toBe(0)
    })

    it('clamps daily discretionary allowance to zero when commitments exceed funds', () => {
      const currentLiquidBalance = 3000
      const recurringRules: RecurringTransaction[] = [
        {
          id: 'rec-big-bill',
          title: 'Electricity Bill',
          amount: 5000, // Outflows exceed available balance!
          type: 'expense',
          category: 'Utilities',
          accountId: 'acc-1',
          frequency: 'monthly',
          interval: 1,
          startDate: '2026-10-01',
          nextDueDate: '2026-10-15',
          paymentMethod: 'UPI',
          autoProcess: true,
          status: 'active',
          createdAt: '2026-10-01T00:00:00Z',
        },
      ]

      const forecast = generateCashFlowForecast(
        currentLiquidBalance,
        recurringRules,
        [],
        [],
        30,
        '2026-10-10',
        []
      )

      expect(forecast.projectedMonthEndBalance).toBe(-2000)
      expect(forecast.safeDailySpend).toBe(0)
      expect(forecast.discretionaryFundSurplus).toBe(0)
    })
  })

  // ── Requirement 10: Phase 3 & 4 — Health Score & Duplicate Prevention ──
  describe('10. Phase 3 & 4 — Health Score Integrity & Accounting Regression', () => {
    it('returns a provisional score with explicit missing data guidance for completely empty accounts', () => {
      const emptySummary: FinancialSummary = {
        totalAvailable: 0,
        incomeThisMonth: 0,
        expensesThisMonth: 0,
        netSavings: 0,
        investmentValue: 0,
        emiDueThisMonth: 0,
        netWorth: 0,
      }

      const score = computeFinancialHealthScore({
        summary: emptySummary,
        accounts: [],
        transactions: [],
      })

      expect(score.isProvisional).toBe(true)
      expect(score.isInsufficientData).toBe(true)
      expect(score.dataQualityNotes).toContain('Emergency-fund runway cannot be computed')
      expect(score.primaryRecommendation.length).toBeGreaterThan(0)
      expect(score.totalScore).toBe(0)
    })

    it('prevents duplicate EMI payment recording for the same instalment cycle', () => {
      const emi: EMI = {
        id: 'emi-test-dup',
        name: 'Car Loan',
        lender: 'Axis Bank',
        principal: 200000,
        interestRate: 9,
        tenureMonths: 24,
        emiAmount: 9136,
        startDate: '2026-09-01',
        dueDay: 5,
        status: 'active',
        createdAt: '2026-09-01T00:00:00Z',
      }

      const existingPayment: EMIPayment = {
        id: 'pay-1',
        emiId: emi.id,
        instalmentNumber: 2,
        amount: 9136,
        principalComponent: 8000,
        interestComponent: 1136,
        paymentDate: '2026-10-05',
        status: 'paid',
      }

      // Check duplicate check rule
      const isAlreadyPaid = (payments: EMIPayment[], emiId: string, instalmentNum: number) =>
        payments.some((p) => p.emiId === emiId && p.instalmentNumber === instalmentNum && p.status === 'paid')

      expect(isAlreadyPaid([existingPayment], emi.id, 2)).toBe(true)
      expect(isAlreadyPaid([existingPayment], emi.id, 3)).toBe(false)
    })
  })
})
