import type {
  Investment,
  InvestmentAssetType,
  PortfolioAssetAllocationItem,
  PortfolioSummary,
  NetWorthBreakdown,
  Account,
  EMI,
  EMIPayment,
} from '@/types/finance'

export const ASSET_TYPE_METADATA: Record<
  InvestmentAssetType,
  { label: string; shortLabel: string; color: string }
> = {
  mutual_funds: {
    label: 'Mutual Funds (Equity & Hybrid)',
    shortLabel: 'Mutual Funds',
    color: '#10B981', // emerald-500
  },
  stocks: {
    label: 'Direct Equities / Stocks',
    shortLabel: 'Stocks',
    color: '#3B82F6', // blue-500
  },
  gold: {
    label: 'Sovereign Gold Bonds & Gold',
    shortLabel: 'Gold / SGB',
    color: '#F59E0B', // amber-500
  },
  fixed_deposit: {
    label: 'Fixed & Recurring Deposits',
    shortLabel: 'Fixed Deposits',
    color: '#8B5CF6', // purple-500
  },
  epf_ppf: {
    label: 'EPF / PPF & Provident Fund',
    shortLabel: 'EPF / PPF',
    color: '#06B6D4', // cyan-500
  },
  crypto: {
    label: 'Crypto Assets',
    shortLabel: 'Crypto',
    color: '#EC4899', // pink-500
  },
  real_estate: {
    label: 'Real Estate & REITs',
    shortLabel: 'Real Estate',
    color: '#14B8A6', // teal-500
  },
  other: {
    label: 'Bonds, NPS & Other Assets',
    shortLabel: 'Other',
    color: '#64748B', // slate-500
  },
}

/**
 * Calculates complete summary metrics and asset allocation distribution of an investment portfolio
 */
export function calculatePortfolioSummary(investments: Investment[]): PortfolioSummary {
  if (!investments || investments.length === 0) {
    return {
      totalInvested: 0,
      totalCurrentValue: 0,
      totalGainLoss: 0,
      gainLossPercentage: 0,
      allocations: [],
      topGainer: null,
    }
  }

  const totalInvested = investments.reduce((sum, i) => sum + (Number(i.investedAmount) || 0), 0)
  const totalCurrentValue = investments.reduce((sum, i) => sum + (Number(i.currentValue) || 0), 0)
  const totalGainLoss = totalCurrentValue - totalInvested
  const gainLossPercentage =
    totalInvested > 0 ? Math.round(((totalGainLoss / totalInvested) * 100) * 100) / 100 : 0

  // Group by Asset Type
  const groupMap = new Map<
    InvestmentAssetType,
    { invested: number; current: number; count: number }
  >()

  for (const inv of investments) {
    const type = inv.assetType || 'other'
    const cur = groupMap.get(type) || { invested: 0, current: 0, count: 0 }
    cur.invested += Number(inv.investedAmount) || 0
    cur.current += Number(inv.currentValue) || 0
    cur.count += 1
    groupMap.set(type, cur)
  }

  const allocations: PortfolioAssetAllocationItem[] = []
  for (const [type, data] of groupMap.entries()) {
    const meta = ASSET_TYPE_METADATA[type] || ASSET_TYPE_METADATA.other
    const diff = data.current - data.invested
    const pct = data.invested > 0 ? Math.round(((diff / data.invested) * 100) * 100) / 100 : 0
    const share =
      totalCurrentValue > 0
        ? Math.round(((data.current / totalCurrentValue) * 100) * 10) / 10
        : 0

    allocations.push({
      assetType: type,
      label: meta.shortLabel,
      color: meta.color,
      totalInvested: Math.round(data.invested),
      totalCurrentValue: Math.round(data.current),
      totalGainLoss: Math.round(diff),
      gainLossPct: pct,
      percentageOfPortfolio: share,
      itemCount: data.count,
    })
  }

  // Sort allocations by current value descending
  allocations.sort((a, b) => b.totalCurrentValue - a.totalCurrentValue)

  // Top gainer
  let topGainer: { name: string; gainPct: number; gainAmount: number } | null = null
  let maxGainPct = -Infinity

  for (const inv of investments) {
    if (inv.investedAmount > 0) {
      const gain = inv.currentValue - inv.investedAmount
      const pct = (gain / inv.investedAmount) * 100
      if (pct > maxGainPct) {
        maxGainPct = pct
        topGainer = {
          name: inv.name,
          gainPct: Math.round(pct * 100) / 100,
          gainAmount: Math.round(gain),
        }
      }
    }
  }

  return {
    totalInvested: Math.round(totalInvested),
    totalCurrentValue: Math.round(totalCurrentValue),
    totalGainLoss: Math.round(totalGainLoss),
    gainLossPercentage,
    allocations,
    topGainer,
  }
}

/**
 * Calculates complete multi-pillar Net Worth breakdown
 */
export function calculateNetWorthBreakdown(params: {
  liquidAccounts: Account[]
  investments: Investment[]
  emis: EMI[]
  emiPayments: EMIPayment[]
}): NetWorthBreakdown {
  const { liquidAccounts, investments, emis, emiPayments } = params

  const liquidCash = liquidAccounts
    .filter(
      (a) =>
        a.isActive !== false &&
        (a.type === 'savings' || a.type === 'salary' || a.type === 'current' || a.type === 'cash')
    )
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0)

  const investmentTotal = investments.reduce((sum, i) => sum + (Number(i.currentValue) || 0), 0)
  const grossAssets = liquidCash + investmentTotal

  let totalDebt = 0
  for (const e of emis) {
    if (e.status === 'active' || e.status === 'paused') {
      const principalPaid = emiPayments
        .filter((p) => p.emiId === e.id && p.status === 'paid')
        .reduce((sum, p) => sum + (p.principalComponent || 0), 0)
      totalDebt += Math.max(0, e.principal - principalPaid)
    }
  }

  const netWorth = grossAssets - totalDebt

  const debtRatio = grossAssets > 0 ? Math.round((totalDebt / grossAssets) * 100) / 100 : 0
  const liquidRatio = grossAssets > 0 ? Math.round((liquidCash / grossAssets) * 100) / 100 : 0
  const investRatio = grossAssets > 0 ? Math.round((investmentTotal / grossAssets) * 100) / 100 : 0

  return {
    liquidCash: Math.round(liquidCash),
    investmentTotal: Math.round(investmentTotal),
    grossAssets: Math.round(grossAssets),
    totalDebt: Math.round(totalDebt),
    netWorth: Math.round(netWorth),
    debtRatio,
    liquidRatio,
    investRatio,
  }
}
