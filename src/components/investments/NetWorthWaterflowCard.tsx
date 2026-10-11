import React from 'react'
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import type { NetWorthBreakdown, Transaction, Account } from '@/types/finance'
import { formatINR } from '@/lib/utils'

interface NetWorthWaterflowCardProps {
  breakdown: NetWorthBreakdown
  monthlyExpenses?: number
  transactions?: Transaction[]
  accounts?: Account[]
  hasVerifiedLiabilities?: boolean
}

export const NetWorthWaterflowCard: React.FC<NetWorthWaterflowCardProps> = ({
  breakdown,
  monthlyExpenses = 0,
  transactions,
  accounts,
  hasVerifiedLiabilities = false,
}) => {
  // Check continuous historical coverage duration and distinct expense dates
  const expenseTxs = (transactions || []).filter((tx) => tx.type === 'expense' && tx.date)
  const distinctExpenseDates = new Set(expenseTxs.map((t) => t.date))

  // Earliest coverage date across accounts
  const earliestCoverageDate = (accounts || []).reduce<string | null>((earliest, acc) => {
    const d = acc.openingBalanceDate || acc.ledgerCoverageStartDate
    if (!d) return earliest
    return !earliest || d < earliest ? d : earliest
  }, null)

  const now = new Date()
  let activeCoverageDays = 0
  if (earliestCoverageDate) {
    const start = new Date(earliestCoverageDate)
    const diffMs = now.getTime() - start.getTime()
    activeCoverageDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
  }

  // Minimum threshold: at least 30 days of continuous coverage required
  // If transactions are provided, ensure activeCoverageDays >= 30 and at least 15 distinct expense days
  const hasSufficientRunwayHistory =
    transactions !== undefined
      ? activeCoverageDays >= 30 && distinctExpenseDates.size >= 15
      : monthlyExpenses > 0

  const runwayMonthsNum =
    hasSufficientRunwayHistory && monthlyExpenses > 0
      ? breakdown.liquidCash / monthlyExpenses
      : 0

  const runwayDisplay =
    hasSufficientRunwayHistory && monthlyExpenses > 0
      ? `${runwayMonthsNum.toFixed(1)} mos`
      : 'Insufficient history to calculate runway'

  // Health evaluations
  // Phase 3: Do not interpret zero recorded liabilities as proof of zero debt!
  const debtStatus =
    breakdown.totalDebt === 0 && !hasVerifiedLiabilities
      ? { label: 'No liabilities recorded — unverified', color: 'text-amber-500' }
      : breakdown.debtRatio <= 0.3
      ? { label: 'Conservative', color: 'text-emerald-500' }
      : breakdown.debtRatio <= 0.6
      ? { label: 'Moderate', color: 'text-amber-500' }
      : { label: 'High Debt', color: 'text-rose-500' }

  const runwayStatus =
    !hasSufficientRunwayHistory
      ? { label: 'Needs 30d history', color: 'text-amber-500' }
      : monthlyExpenses <= 0
      ? { label: 'No expenses', color: 'text-[var(--text-muted)]' }
      : runwayMonthsNum >= 6
      ? { label: 'Healthy buffer', color: 'text-emerald-500' }
      : runwayMonthsNum >= 3
      ? { label: 'Moderate', color: 'text-amber-500' }
      : { label: 'Low cushion', color: 'text-rose-500' }

  const isNetWorthPositive = breakdown.netWorth >= 0

  return (
    <div className="card p-5 flex flex-col justify-between gap-4">
      {/* Card Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
          <Scale size={16} className="text-[var(--accent-primary)]" />
          Net Worth Equation & Asset Solvency
        </h3>
        <span className="text-xs text-[var(--text-muted)] font-medium">
          Consolidated Balance Sheet
        </span>
      </div>

      {/* 2x2 Clean Balanced Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-1">
        {/* Box 1: Liquid Cash */}
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-blue-500">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <Wallet size={15} className="shrink-0" /> Liquid Cash
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 whitespace-nowrap">
              {Math.round(breakdown.liquidRatio * 100)}% Assets
            </span>
          </div>
          <div>
            <p className="text-xl font-extrabold text-blue-500 tracking-tight">
              {formatINR(breakdown.liquidCash)}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Bank accounts + physical cash
            </p>
          </div>
        </div>

        {/* Box 2: Investments */}
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-emerald-500">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <TrendingUp size={15} className="shrink-0" /> + Investments
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 whitespace-nowrap">
              {Math.round(breakdown.investRatio * 100)}% Assets
            </span>
          </div>
          <div>
            <p className="text-xl font-extrabold text-emerald-500 tracking-tight">
              {formatINR(breakdown.investmentTotal)}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Mutual funds, stocks, gold, FD
            </p>
          </div>
        </div>

        {/* Box 3: Total Debt */}
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-rose-500">
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <CreditCard size={15} className="shrink-0" /> − Total Debt
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 whitespace-nowrap">
              Liabilities
            </span>
          </div>
          <div>
            <p className="text-xl font-extrabold text-rose-500 tracking-tight">
              {formatINR(breakdown.totalDebt)}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Active loan principals
            </p>
          </div>
        </div>

        {/* Box 4: Net Worth Result */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between gap-2.5 ${
            isNetWorthPositive
              ? 'bg-gradient-to-br from-emerald-500/20 via-teal-500/15 to-transparent border-emerald-500/30'
              : 'bg-gradient-to-br from-rose-500/15 via-amber-500/10 to-transparent border-rose-500/30'
          }`}
        >
          <div
            className={`flex items-center justify-between gap-2 text-xs font-semibold ${
              isNetWorthPositive ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            <span className="flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck size={15} className="shrink-0" /> = True Net Worth
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                isNetWorthPositive ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
              }`}
            >
              Equity
            </span>
          </div>
          <div>
            <p
              className={`text-xl font-black tracking-tight ${
                isNetWorthPositive ? 'text-[var(--text-primary)]' : 'text-rose-500'
              }`}
            >
              {formatINR(breakdown.netWorth)}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
              Gross assets minus liabilities
            </p>
          </div>
        </div>
      </div>

      {/* Financial Health Indicators Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--border-subtle)] text-xs">
        <div className="flex items-center justify-between bg-[var(--bg-subtle)] px-3 py-2.5 rounded-xl">
          <span className="text-[var(--text-muted)]">Debt-to-Asset Ratio:</span>
          <span className="font-bold text-[var(--text-primary)] flex items-center gap-1">
            {(breakdown.debtRatio * 100).toFixed(1)}%
            <span className={`text-[11px] font-semibold ${debtStatus.color}`}>
              ({debtStatus.label})
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between bg-[var(--bg-subtle)] px-3 py-2.5 rounded-xl">
          <span className="text-[var(--text-muted)]">Liquid Runway:</span>
          <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5 text-right">
            <span>{runwayDisplay}</span>
            <span className={`text-[11px] font-semibold ${runwayStatus.color}`}>
              ({runwayStatus.label})
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
