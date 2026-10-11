import { describe, it, expect } from 'vitest'
import {
  calculatePortfolioSummary,
  calculateNetWorthBreakdown,
  ASSET_TYPE_METADATA,
} from '@/lib/portfolioMath'
import type { Investment, Account, EMI, EMIPayment } from '@/types/finance'

describe('Phase 10 — Investment Tracking & Portfolio Net Worth Engine', () => {
  const sampleInvestments: Investment[] = [
    {
      id: 'inv-1',
      name: 'Parag Parikh Flexi Cap Fund',
      assetType: 'mutual_funds',
      investedAmount: 50000,
      currentValue: 62500, // +12,500 (+25%)
      portfolio: 'Core Wealth',
      institution: 'Groww',
      lastUpdated: '2026-10-01',
    },
    {
      id: 'inv-2',
      name: 'Reliance Industries Shares',
      assetType: 'stocks',
      investedAmount: 30000,
      currentValue: 36000, // +6,000 (+20%)
      units: 12,
      portfolio: 'Direct Equities',
      institution: 'Zerodha',
      lastUpdated: '2026-10-01',
    },
    {
      id: 'inv-3',
      name: 'Sovereign Gold Bond (SGB)',
      assetType: 'gold',
      investedAmount: 20000,
      currentValue: 26000, // +6,000 (+30%)
      units: 5,
      portfolio: 'Gold & Hedge',
      institution: 'RBI',
      lastUpdated: '2026-10-01',
    },
    {
      id: 'inv-4',
      name: 'HDFC Tax Saver Fixed Deposit',
      assetType: 'fixed_deposit',
      investedAmount: 10000,
      currentValue: 10500, // +500 (+5%)
      portfolio: 'Fixed Income',
      institution: 'HDFC Bank',
      lastUpdated: '2026-10-01',
    },
  ]

  describe('1. Portfolio Mathematical Metrics & Asset Allocation', () => {
    it('accurately computes total invested, current market value, and returns', () => {
      const summary = calculatePortfolioSummary(sampleInvestments)

      // Invested: 50k + 30k + 20k + 10k = 110,000
      expect(summary.totalInvested).toBe(110000)

      // Current: 62.5k + 36k + 26k + 10.5k = 135,000
      expect(summary.totalCurrentValue).toBe(135000)

      // Returns: 135,000 - 110,000 = +25,000
      expect(summary.totalGainLoss).toBe(25000)

      // Return %: (25000 / 110000) * 100 = 22.73%
      expect(summary.gainLossPercentage).toBe(22.73)
    })

    it('correctly partitions allocations by asset category with proportional shares', () => {
      const summary = calculatePortfolioSummary(sampleInvestments)

      expect(summary.allocations).toHaveLength(4)

      // Sorted by current value descending
      expect(summary.allocations[0].assetType).toBe('mutual_funds')
      expect(summary.allocations[0].totalCurrentValue).toBe(62500)
      expect(summary.allocations[0].percentageOfPortfolio).toBe(46.3) // 62500 / 135000

      expect(summary.allocations[1].assetType).toBe('stocks')
      expect(summary.allocations[1].totalCurrentValue).toBe(36000)
      expect(summary.allocations[1].percentageOfPortfolio).toBe(26.7) // 36000 / 135000

      expect(summary.allocations[2].assetType).toBe('gold')
      expect(summary.allocations[2].totalCurrentValue).toBe(26000)

      expect(summary.allocations[3].assetType).toBe('fixed_deposit')
      expect(summary.allocations[3].totalCurrentValue).toBe(10500)

      // Sum of percentages must approximate 100%
      const totalPct = summary.allocations.reduce(
        (sum, item) => sum + item.percentageOfPortfolio,
        0
      )
      expect(Math.round(totalPct)).toBe(100)
    })

    it('identifies top gainer holding correctly', () => {
      const summary = calculatePortfolioSummary(sampleInvestments)

      // SGB has +30% gain (26000 / 20000)
      expect(summary.topGainer).not.toBeNull()
      expect(summary.topGainer?.name).toBe('Sovereign Gold Bond (SGB)')
      expect(summary.topGainer?.gainPct).toBe(30)
      expect(summary.topGainer?.gainAmount).toBe(6000)
    })

    it('handles empty portfolio gracefully', () => {
      const summary = calculatePortfolioSummary([])

      expect(summary.totalInvested).toBe(0)
      expect(summary.totalCurrentValue).toBe(0)
      expect(summary.totalGainLoss).toBe(0)
      expect(summary.gainLossPercentage).toBe(0)
      expect(summary.allocations).toEqual([])
      expect(summary.topGainer).toBeNull()
    })
  })

  describe('2. Consolidated Net Worth Waterfall Equation', () => {
    it('accurately resolves Net Worth = Liquid Assets + Investments - Total Debt', () => {
      const sampleAccounts: Account[] = [
        {
          id: 'acc-1',
          name: 'Axis Bank',
          type: 'savings',
          balance: 60000,
          openingBalance: 60000,
          isActive: true,
        },
        {
          id: 'acc-2',
          name: 'Cash in Hand',
          type: 'cash',
          balance: 5000,
          openingBalance: 5000,
          isActive: true,
        },
      ]

      const sampleEmis: EMI[] = [
        {
          id: 'emi-1',
          name: 'Car Loan',
          lender: 'HDFC',
          principal: 200000,
          interestRate: 8.5,
          tenureMonths: 24,
          emiAmount: 9000,
          startDate: '2026-01-01',
          dueDay: 5,
          status: 'active',
        },
      ]

      const sampleEmiPayments: EMIPayment[] = [
        {
          id: 'pay-1',
          emiId: 'emi-1',
          instalmentNumber: 1,
          amount: 9000,
          principalComponent: 7500,
          interestComponent: 1500,
          paymentDate: '2026-01-05',
          status: 'paid',
        },
      ]

      const breakdown = calculateNetWorthBreakdown({
        liquidAccounts: sampleAccounts,
        investments: sampleInvestments,
        emis: sampleEmis,
        emiPayments: sampleEmiPayments,
      })

      // Liquid Cash: 60,000 + 5,000 = 65,000
      expect(breakdown.liquidCash).toBe(65000)

      // Investment Total: 135,000
      expect(breakdown.investmentTotal).toBe(135000)

      // Gross Assets: 65,000 + 135,000 = 200,000
      expect(breakdown.grossAssets).toBe(200000)

      // Total Debt: 200,000 - 7,500 = 192,500
      expect(breakdown.totalDebt).toBe(192500)

      // Net Worth: 200,000 - 192,500 = 7,500
      expect(breakdown.netWorth).toBe(7500)

      // Ratios
      expect(breakdown.liquidRatio).toBe(0.33) // 65k / 200k
      expect(breakdown.investRatio).toBe(0.68) // 135k / 200k
      expect(breakdown.debtRatio).toBe(0.96) // 192.5k / 200k
    })
  })

  describe('3. Asset Type Metadata & Configurations', () => {
    it('has metadata configured for all 8 investment asset types with valid colors and labels', () => {
      const keys = Object.keys(ASSET_TYPE_METADATA)
      expect(keys).toContain('mutual_funds')
      expect(keys).toContain('stocks')
      expect(keys).toContain('gold')
      expect(keys).toContain('fixed_deposit')
      expect(keys).toContain('epf_ppf')
      expect(keys).toContain('crypto')
      expect(keys).toContain('real_estate')
      expect(keys).toContain('other')

      for (const key of keys) {
        const meta = ASSET_TYPE_METADATA[key as keyof typeof ASSET_TYPE_METADATA]
        expect(meta.label).toBeDefined()
        expect(meta.shortLabel).toBeDefined()
        expect(meta.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      }
    })
  })
})
