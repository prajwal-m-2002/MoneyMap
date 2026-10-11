import { useState, useMemo } from 'react'
import {
  Plus,
  Coins,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { formatINR } from '@/lib/utils'
import type { Investment, InvestmentAssetType } from '@/types/finance'
import {
  calculatePortfolioSummary,
  calculateNetWorthBreakdown,
  ASSET_TYPE_METADATA,
} from '@/lib/portfolioMath'
import { InvestmentCard } from '@/components/investments/InvestmentCard'
import { PortfolioAllocationChart } from '@/components/investments/PortfolioAllocationChart'
import { NetWorthWaterflowCard } from '@/components/investments/NetWorthWaterflowCard'
import { AddInvestmentModal } from '@/components/modals/AddInvestmentModal'
import { EditInvestmentModal } from '@/components/modals/EditInvestmentModal'
import { UpdateValuationModal } from '@/components/modals/UpdateValuationModal'

export default function Investments() {
  const {
    investments,
    accounts,
    transactions,
    emis,
    emiPayments,
    summary,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    updateInvestmentValue,
  } = useFinance()

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingInv, setEditingInv] = useState<Investment | null>(null)
  const [valuingInv, setValuingInv] = useState<Investment | null>(null)
  const [filterType, setFilterType] = useState<'all' | InvestmentAssetType>('all')

  // Portfolio & Net Worth Calculations
  const portfolioSummary = useMemo(
    () => calculatePortfolioSummary(investments),
    [investments]
  )

  const netWorthBreakdown = useMemo(
    () =>
      calculateNetWorthBreakdown({
        liquidAccounts: accounts,
        investments,
        emis,
        emiPayments,
      }),
    [accounts, investments, emis, emiPayments]
  )

  // Filtered Assets List
  const filteredInvestments = useMemo(() => {
    if (filterType === 'all') return investments
    return investments.filter((i) => i.assetType === filterType)
  }, [investments, filterType])

  const handleDelete = async (inv: Investment) => {
    if (window.confirm(`Are you sure you want to delete "${inv.name}" from your portfolio?`)) {
      await deleteInvestment(inv.id)
    }
  }

  const isOverallProfit = portfolioSummary.totalGainLoss >= 0

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-slide-up">
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Investments & Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Track mutual funds, direct equities, gold, fixed deposits, and consolidated net worth
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="btn-primary py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Investment</span>
        </button>
      </div>

      {/* ── 1. Top 4 Metric Cards ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Current Value */}
        <div className="card p-4">
          <p className="text-xs text-[var(--text-muted)] font-medium">Portfolio Value</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {formatINR(portfolioSummary.totalCurrentValue)}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">Current</span>
          </div>
        </div>

        {/* Total Invested */}
        <div className="card p-4">
          <p className="text-xs text-[var(--text-muted)] font-medium">Invested Capital</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {formatINR(portfolioSummary.totalInvested)}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">Principal</span>
          </div>
        </div>

        {/* Overall Returns */}
        <div className="card p-4">
          <p className="text-xs text-[var(--text-muted)] font-medium">Overall Returns</p>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-2xl font-bold ${
                isOverallProfit ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {isOverallProfit ? '+' : ''}
              {portfolioSummary.gainLossPercentage}%
            </span>
            <span
              className={`text-xs font-semibold ${
                isOverallProfit ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {isOverallProfit ? '+' : ''}{formatINR(portfolioSummary.totalGainLoss)}
            </span>
          </div>
        </div>

        {/* Consolidated Net Worth */}
        <div className="card p-4">
          <p className="text-xs text-[var(--text-muted)] font-medium">Total Net Worth</p>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-2xl font-bold ${
                netWorthBreakdown.netWorth >= 0 ? 'text-[var(--text-primary)]' : 'text-rose-500'
              }`}
            >
              {formatINR(netWorthBreakdown.netWorth)}
            </span>
            <span className="text-xs text-emerald-500 font-medium">Assets − Debt</span>
          </div>
        </div>
      </div>

      {/* ── 2. Visual Charts: Allocation Donut & Net Worth Waterfall ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PortfolioAllocationChart
          allocations={portfolioSummary.allocations}
          totalCurrentValue={portfolioSummary.totalCurrentValue}
          overallGainPct={portfolioSummary.gainLossPercentage}
        />

        <NetWorthWaterflowCard
          breakdown={netWorthBreakdown}
          monthlyExpenses={summary.expensesThisMonth}
          transactions={transactions}
          accounts={accounts}
        />
      </div>

      {/* ── 3. Asset Filter Tabs ───────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                filterType === 'all'
                  ? 'bg-[var(--accent-primary)] text-white border-transparent shadow-sm'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
              }`}
            >
              All Assets ({investments.length})
            </button>
            {Object.entries(ASSET_TYPE_METADATA).map(([typeKey, meta]) => {
              const count = investments.filter((i) => i.assetType === typeKey).length
              if (count === 0 && filterType !== typeKey) return null
              return (
                <button
                  type="button"
                  key={typeKey}
                  onClick={() => setFilterType(typeKey as InvestmentAssetType)}
                  className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 ${
                    filterType === typeKey
                      ? 'bg-[var(--accent-primary)] text-white border-transparent shadow-sm'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  {meta.shortLabel} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 4. Investments Grid ─────────────────────────── */}
        {filteredInvestments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInvestments.map((inv) => (
              <InvestmentCard
                key={inv.id}
                investment={inv}
                onUpdateValue={(item) => setValuingInv(item)}
                onEdit={(item) => setEditingInv(item)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <div className="card flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center">
              <Coins size={28} className="text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--text-secondary)]">
                {filterType === 'all' ? 'No Investments Found' : 'No Assets in this Category'}
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">
                Add mutual funds, equities, sovereign gold bonds, or fixed deposits to track growth and asset diversification.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Plus size={14} /> Add Investment
            </button>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      <AddInvestmentModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={createInvestment}
      />

      {editingInv && (
        <EditInvestmentModal
          isOpen={!!editingInv}
          onClose={() => setEditingInv(null)}
          onUpdate={updateInvestment}
          investment={editingInv}
        />
      )}

      {valuingInv && (
        <UpdateValuationModal
          isOpen={!!valuingInv}
          onClose={() => setValuingInv(null)}
          onUpdate={updateInvestmentValue}
          investment={valuingInv}
        />
      )}
    </div>
  )
}
