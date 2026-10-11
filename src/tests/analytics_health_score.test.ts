import { describe, it, expect } from 'vitest'
import { computeFinancialHealthScore } from '@/lib/financialHealth'
import type { FinancialSummary, Account } from '@/types/finance'

describe('Phase 8 — Analytics & Financial Health Score Engine', () => {
  const baseAccounts: Account[] = [
    { id: 'a1', name: 'Axis Bank', type: 'savings', balance: 75000, openingBalance: 75000, isActive: true },
    { id: 'a2', name: 'Cash', type: 'cash', balance: 5000, openingBalance: 5000, isActive: true },
  ]

  it('awards full points for high savings rate (>= 30%)', () => {
    const summary: FinancialSummary = {
      totalAvailable: 80000,
      incomeThisMonth: 100000,
      expensesThisMonth: 60000,
      netSavings: 40000, // 40% savings rate
      investmentValue: 150000,
      emiDueThisMonth: 10000,
      netWorth: 220000,
    }

    const score = computeFinancialHealthScore({ summary, accounts: baseAccounts })

    expect(score.pillars.savingsRate.score).toBe(30)
    expect(score.pillars.savingsRate.status).toBe('excellent')
  })

  it('penalizes negative net savings with 0 points for savings discipline', () => {
    const summary: FinancialSummary = {
      totalAvailable: 20000,
      incomeThisMonth: 50000,
      expensesThisMonth: 65000,
      netSavings: -15000, // Negative savings
      investmentValue: 10000,
      emiDueThisMonth: 12000,
      netWorth: 18000,
    }

    const score = computeFinancialHealthScore({ summary, accounts: baseAccounts })

    expect(score.pillars.savingsRate.score).toBe(0)
    expect(score.pillars.savingsRate.status).toBe('poor')
  })

  it('evaluates emergency buffer accurately based on months of living expenses covered', () => {
    // 6+ months runway: 80,000 / 10,000 = 8 months -> 30 pts (full marks)
    const highBufferSummary: FinancialSummary = {
      totalAvailable: 80000,
      incomeThisMonth: 50000,
      expensesThisMonth: 10000,
      netSavings: 40000,
      investmentValue: 50000,
      emiDueThisMonth: 0,
      netWorth: 130000,
    }

    const highBufferScore = computeFinancialHealthScore({ summary: highBufferSummary, accounts: baseAccounts })
    expect(highBufferScore.pillars.emergencyBuffer.score).toBe(30)
    expect(highBufferScore.pillars.emergencyBuffer.status).toBe('excellent')

    // Under 1 month runway: 5,000 / 20,000 = 0.25 months -> 4 pts
    const lowBufferSummary: FinancialSummary = {
      totalAvailable: 5000,
      incomeThisMonth: 25000,
      expensesThisMonth: 20000,
      netSavings: 5000,
      investmentValue: 0,
      emiDueThisMonth: 0,
      netWorth: 5000,
    }

    const lowBufferScore = computeFinancialHealthScore({ summary: lowBufferSummary, accounts: baseAccounts })
    expect(lowBufferScore.pillars.emergencyBuffer.score).toBe(6)
    expect(lowBufferScore.pillars.emergencyBuffer.status).toBe('poor')
  })

  it('awards full 20 points for verified debt-free profile (0 EMI obligations)', () => {
    const debtFreeSummary: FinancialSummary = {
      totalAvailable: 60000,
      incomeThisMonth: 70000,
      expensesThisMonth: 35000,
      netSavings: 35000,
      investmentValue: 100000,
      emiDueThisMonth: 0, // Debt free!
      netWorth: 160000,
    }

    const score = computeFinancialHealthScore({ summary: debtFreeSummary, accounts: baseAccounts, hasVerifiedLiabilities: true })
    expect(score.pillars.emiBurden.score).toBe(20)
    expect(score.pillars.emiBurden.status).toBe('excellent')
    expect(score.pillars.emiBurden.description).toContain('Verified Zero Debt Obligations')
  })

  it('marks unverified liabilities as provisional (14 pts) when no debt obligations are entered', () => {
    const debtFreeSummary: FinancialSummary = {
      totalAvailable: 60000,
      incomeThisMonth: 70000,
      expensesThisMonth: 35000,
      netSavings: 35000,
      investmentValue: 100000,
      emiDueThisMonth: 0,
      netWorth: 160000,
    }

    const score = computeFinancialHealthScore({ summary: debtFreeSummary, accounts: baseAccounts, hasVerifiedLiabilities: false })
    expect(score.pillars.emiBurden.score).toBe(14)
    expect(score.pillars.emiBurden.status).toBe('fair')
    expect(score.pillars.emiBurden.description).toContain('No liabilities recorded — unverified')
  })

  it('correctly maps overall score into health tiers (excellent >= 80, good 65-79, moderate 50-64, critical < 50)', () => {
    const excellentSummary: FinancialSummary = {
      totalAvailable: 150000,
      incomeThisMonth: 80000,
      expensesThisMonth: 30000,
      netSavings: 50000,
      investmentValue: 200000,
      emiDueThisMonth: 0,
      netWorth: 350000,
    }

    const excellentScore = computeFinancialHealthScore({ summary: excellentSummary, accounts: baseAccounts, hasVerifiedLiabilities: true })
    expect(excellentScore.totalScore).toBeGreaterThanOrEqual(80)
    expect(excellentScore.tier).toBe('excellent')
    expect(excellentScore.tierLabel).toBe('Excellent Financial Health')

    const criticalSummary: FinancialSummary = {
      totalAvailable: 2000,
      incomeThisMonth: 30000,
      expensesThisMonth: 45000,
      netSavings: -15000,
      investmentValue: 0,
      emiDueThisMonth: 20000, // EMI is 67% of income!
      netWorth: -18000,
    }

    const criticalScore = computeFinancialHealthScore({ summary: criticalSummary, accounts: [{ id: 'a1', name: 'A', type: 'savings', balance: 2000, openingBalance: 2000 }] })
    expect(criticalScore.totalScore).toBeLessThan(50)
    expect(criticalScore.tier).toBe('critical')
    expect(criticalScore.tierLabel).toBe('Critical Attention Required')
  })

  it('generates targeted primary recommendation addressing lowest-scoring pillar', () => {
    // Solid profile except high EMI ratio (eating 60% of income)
    const highEmiSummary: FinancialSummary = {
      totalAvailable: 50000,
      incomeThisMonth: 50000,
      expensesThisMonth: 35000,
      netSavings: 15000,
      investmentValue: 50000,
      emiDueThisMonth: 30000, // 60% of income committed to debt!
      netWorth: 70000,
    }

    const score = computeFinancialHealthScore({ summary: highEmiSummary, accounts: baseAccounts })
    expect(score.primaryRecommendation).toContain('debt')
  })

  it('returns neutral insufficient_data tier when no accounts or balances exist instead of claiming critical attention', () => {
    const emptySummary: FinancialSummary = {
      totalAvailable: 0,
      incomeThisMonth: 0,
      expensesThisMonth: 0,
      netSavings: 0,
      investmentValue: 0,
      emiDueThisMonth: 0,
      netWorth: 0,
    }

    const emptyScore = computeFinancialHealthScore({
      summary: emptySummary,
      accounts: [],
    })

    expect(emptyScore.tier).toBe('insufficient_data')
    expect(emptyScore.tierLabel).toBe('Insufficient Data')
    expect(emptyScore.pillars.savingsRate.status).toBe('neutral')
    expect(emptyScore.pillars.emergencyBuffer.status).toBe('neutral')
  })

  it('distinguishes 0 income this month from missing historical income', () => {
    const zeroThisMonthSummary: FinancialSummary = {
      totalAvailable: 40000,
      incomeThisMonth: 0, // 0 in current month
      expensesThisMonth: 5000,
      netSavings: -5000,
      investmentValue: 0,
      emiDueThisMonth: 0,
      netWorth: 40000,
    }

    // Has historical income transaction in previous month
    const pastTx = [
      {
        id: 'tx-past',
        type: 'income' as const,
        amount: 50000,
        title: 'Salary',
        category: 'Salary',
        accountId: 'a1',
        date: '2026-09-01',
        createdAt: '2026-09-01T00:00:00Z',
      },
    ]

    const scoreWithHistory = computeFinancialHealthScore({
      summary: zeroThisMonthSummary,
      accounts: baseAccounts,
      transactions: pastTx,
    })

    expect(scoreWithHistory.pillars.savingsRate.description).toContain('No income recorded yet in selected period')
    expect(scoreWithHistory.pillars.savingsRate.status).toBe('neutral')
  })

  it('supports custom configurable weights', () => {
    const summary: FinancialSummary = {
      totalAvailable: 80000,
      incomeThisMonth: 100000,
      expensesThisMonth: 60000,
      netSavings: 40000,
      investmentValue: 150000,
      emiDueThisMonth: 0,
      netWorth: 230000,
    }

    const customScore = computeFinancialHealthScore({
      summary,
      accounts: baseAccounts,
      weights: {
        savingsDiscipline: 25,
        emergencyBuffer: 25,
        debtBurden: 25,
        solvencyLiquidity: 25,
      },
    })

    expect(customScore.pillars.savingsRate.maxScore).toBe(25)
    expect(customScore.pillars.emergencyBuffer.maxScore).toBe(25)
    expect(customScore.pillars.emiBurden.maxScore).toBe(25)
    expect(customScore.pillars.solvency.maxScore).toBe(25)
  })
})
