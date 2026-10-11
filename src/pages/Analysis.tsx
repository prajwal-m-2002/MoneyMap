import { useState, useMemo } from 'react'
import {
  Wallet,
  BarChart3,
  Plus,
  Edit3,
  Coins,
  ShieldCheck,
  CreditCard,
  Building,
  Calendar,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { formatINR } from '@/lib/utils'
import { AddAccountModal } from '@/components/modals/AddAccountModal'
import { EditAccountModal } from '@/components/modals/EditAccountModal'
import { EditTransactionModal } from '@/components/modals/EditTransactionModal'
import type { Account, Transaction, CategorySpendingItem } from '@/types/finance'
import { computeFinancialHealthScore } from '@/lib/financialHealth'
import { HealthScoreCard } from '@/components/analytics/HealthScoreCard'
import { CategoryDonutChart } from '@/components/analytics/CategoryDonutChart'
import { CashflowBarChart } from '@/components/analytics/CashflowBarChart'
import { DatePicker } from '@/components/ui/DatePicker'
import {
  calculateConsolidatedFlow,
  getFlowPeriodBounds,
  type FlowPeriodPreset,
} from '@/lib/consolidatedFlowMath'
import { CombinedSummaryCard } from '@/components/analytics/accountFlow/CombinedSummaryCard'
import { SingleAccountSummaryCard } from '@/components/analytics/accountFlow/SingleAccountSummaryCard'

export default function Analysis() {
  const { summary, accounts, transactions, investments, emis, emiPayments, loadingAccounts } = useFinance()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  // Global Date Filter State
  const [periodPreset, setPeriodPreset] = useState<FlowPeriodPreset>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Compute Period Bounds
  const periodBounds = useMemo(() => {
    return getFlowPeriodBounds(periodPreset, customStart, customEnd)
  }, [periodPreset, customStart, customEnd])

  // Compute Consolidated Flow & Individual Account Flows
  const consolidatedFlow = useMemo(() => {
    return calculateConsolidatedFlow({
      accounts,
      transactions,
      period: periodBounds,
      investments,
      emis,
      emiPayments,
    })
  }, [accounts, transactions, periodBounds, investments, emis, emiPayments])

  // Compute live Financial Health Score
  const healthScore = useMemo(() => {
    return computeFinancialHealthScore({
      summary,
      accounts,
      transactions,
      emis,
      investments,
      isPeriodPartiallyCovered: consolidatedFlow.isPeriodPartiallyCovered,
      hasHistoricalDataWarning: consolidatedFlow.hasHistoricalDataWarning,
      period: periodBounds,
    })
  }, [summary, accounts, transactions, emis, investments, consolidatedFlow.isPeriodPartiallyCovered, consolidatedFlow.hasHistoricalDataWarning, periodBounds])

  // Compute Category spending dynamically for the selected reporting period
  const { periodCategoryItems, periodTotalSpent } = useMemo(() => {
    const periodExpenses = transactions.filter((tx) => {
      if (tx.type !== 'expense' || !tx.date) return false
      if (tx.date < periodBounds.startDate || tx.date > periodBounds.endDate) return false
      const cat = (tx.category || '').toLowerCase()
      // Exclude investment contributions from consumption expenses
      if (cat.includes('investment')) return false
      return true
    })

    const totalSpent = periodExpenses.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)

    const catMap: Record<string, Transaction[]> = {}
    for (const tx of periodExpenses) {
      const cat = (tx.category || 'Uncategorized').trim()
      if (!catMap[cat]) catMap[cat] = []
      catMap[cat].push(tx)
    }

    const items: CategorySpendingItem[] = Object.entries(catMap).map(([cat, txList]) => {
      const total = txList.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
      const percentageOfTotal =
        totalSpent > 0 ? Number(((total / totalSpent) * 100).toFixed(1)) : 0
      return {
        category: cat,
        totalSpent: total,
        percentageOfTotal,
        transactionCount: txList.length,
        transactions: txList,
      }
    })

    items.sort((a, b) => b.totalSpent - a.totalSpent)
    return { periodCategoryItems: items, periodTotalSpent: totalSpent }
  }, [transactions, periodBounds])

  // Asset Breakdown Calculations
  const liquidCashBank = accounts
    .filter((a) => a.isActive !== false && (a.type === 'savings' || a.type === 'salary' || a.type === 'current' || a.type === 'cash'))
    .reduce((sum, a) => sum + (Number(a.balance) || 0), 0)

  const investmentAssets = summary.investmentValue
  const totalLiabilities = consolidatedFlow.liabilities
  const grossAssets = liquidCashBank + investmentAssets
  const netWorthCalculated = grossAssets - totalLiabilities

  const liquidPct = grossAssets > 0 ? Math.round((liquidCashBank / grossAssets) * 100) : 0
  const investPct = grossAssets > 0 ? Math.round((investmentAssets / grossAssets) * 100) : 0

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-slide-up">
      {/* ── Page Header & Global Date Filters ───────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Analytics & Net Worth
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
              Understand your total money position and where each account&apos;s money goes.
            </p>
          </div>

          <button
            type="button"
            id="add-account-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Add Account</span>
          </button>
        </div>

        {/* Global Date Filter Controls */}
        <div className="p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-500/10 text-brand-500">
              <Calendar size={15} />
            </span>
            <span className="text-xs font-bold text-[var(--text-primary)]">Reporting Period:</span>
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
              {periodBounds.label}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs">
              <button
                type="button"
                onClick={() => setPeriodPreset('this_month')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  periodPreset === 'this_month'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setPeriodPreset('last_month')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  periodPreset === 'last_month'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Previous Month
              </button>
              <button
                type="button"
                onClick={() => setPeriodPreset('last_3_months')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  periodPreset === 'last_3_months'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Last 3 Months
              </button>
              <button
                type="button"
                onClick={() => setPeriodPreset('last_6_months')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  periodPreset === 'last_6_months'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Last 6 Months
              </button>
              <button
                type="button"
                onClick={() => setPeriodPreset('custom')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  periodPreset === 'custom'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {periodPreset === 'custom' && (
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-wrap items-center gap-3 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] font-medium">Start:</span>
              <DatePicker
                value={customStart || periodBounds.startDate}
                onChange={(d) => setCustomStart(d)}
                placeholder="Start date"
                className="w-36 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-muted)] font-medium">End:</span>
              <DatePicker
                value={customEnd || periodBounds.endDate}
                onChange={(d) => setCustomEnd(d)}
                placeholder="End date"
                className="w-36 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── 1. Combined Summary — All Accounts (MUST BE AT THE TOP) ── */}
      <section aria-label="Combined Summary — All Accounts">
        <CombinedSummaryCard summary={consolidatedFlow} />
      </section>

      {/* ── 2 to 7. Individual Account Money Flow in Exact Order ──── */}
      {/* 2. Axis Bank, 3. Kotak Bank, 4. SBI, 5. Federal Bank, 6. Physical Cash, 7. Other active accounts */}
      <section aria-label="Individual Account Money Flow" className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Individual Account Money Flow
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Detailed inflows, transfers out, destination breakdowns, and running transaction ledgers
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)]">
            {consolidatedFlow.accountSummaries.length} Accounts
          </span>
        </div>

        {consolidatedFlow.accountSummaries.length === 0 ? (
          <div className="card p-8 text-center text-[var(--text-muted)] border border-[var(--border)]">
            No active accounts found in the ledger. Click &quot;Add Account&quot; above to create one.
          </div>
        ) : (
          <div className="space-y-6">
            {consolidatedFlow.accountSummaries.map((accSummary, idx) => (
              <SingleAccountSummaryCard
                key={accSummary.account.id}
                summary={accSummary}
                onEditTransaction={setEditingTx}
                totalSalaryReceived={consolidatedFlow.salaryIncome}
                defaultExpanded={idx === 0} // Expand Axis by default
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Financial Health Score Engine Card ──────────────── */}
      <section aria-label="Financial Health Score">
        <HealthScoreCard healthScore={healthScore} />
      </section>

      {/* ── Visual Charts Grid (Donut Breakdown & Bar Chart) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section aria-label="Category Spending Breakdown">
          <CategoryDonutChart
            categories={periodCategoryItems}
            totalSpent={periodTotalSpent}
            isCoverageUnavailable={consolidatedFlow.hasHistoricalDataWarning}
          />
        </section>

        <section aria-label="Cashflow Bar Chart">
          <CashflowBarChart
            transactions={transactions}
            ledgerCoverageStartDate={consolidatedFlow.ledgerCoverageStartDate || '2026-10-10'}
          />
        </section>
      </div>

      {/* ── Account Ledger & Asset Distribution ───────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Account Balances & Ledger (7 cols) */}
        <section className="lg:col-span-7 card p-5 border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Account Balances & Ledger</h2>
              <p className="text-xs text-[var(--text-secondary)]">Live balances across bank accounts & cash</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              {accounts.length} Accounts
            </span>
          </div>

          {loadingAccounts ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-[var(--bg-subtle)] rounded-xl animate-pulse" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">
              <p>No accounts added yet.</p>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="mt-2 text-brand-500 font-semibold text-xs hover:underline"
              >
                + Add your first account
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {accounts.map((acc) => {
                const getAccountBadge = (type: string) => {
                  switch (type) {
                    case 'salary':
                      return { label: 'Salary', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' }
                    case 'savings':
                      return { label: 'Savings', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' }
                    case 'current':
                      return { label: 'Current', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' }
                    case 'cash':
                      return { label: 'Cash', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' }
                    case 'credit':
                      return { label: 'Credit Card', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' }
                    case 'investment':
                      return { label: 'Investment', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' }
                    default:
                      return { label: type, color: 'bg-gray-500/10 text-gray-600' }
                  }
                }
                const badge = getAccountBadge(acc.type)

                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] transition-colors border border-transparent hover:border-[var(--border)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] flex items-center justify-center font-bold text-sm text-[var(--text-secondary)] shadow-xs">
                        {acc.type === 'cash' ? (
                          <Coins size={16} className="text-amber-500" />
                        ) : acc.type === 'salary' ? (
                          <Wallet size={16} className="text-emerald-500" />
                        ) : acc.type === 'credit' ? (
                          <CreditCard size={16} className="text-rose-500" />
                        ) : (
                          <Building size={16} className="text-blue-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[var(--text-primary)]">
                            {acc.name}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${badge.color}`}>
                            {badge.label}
                          </span>
                        </div>
                        {acc.accountNumber && (
                          <p className="text-xs text-[var(--text-muted)] font-mono">
                            {acc.accountNumber}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-extrabold text-sm text-[var(--text-primary)] tabular">
                          {formatINR(acc.balance)}
                        </span>
                        <p className="text-[10px] text-[var(--text-muted)]">Active Balance</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingAccount(acc)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface)] transition-colors"
                        title="Edit Account"
                      >
                        <Edit3 size={15} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Asset Distribution Card (5 cols) */}
        <section className="lg:col-span-5 card p-5 border border-[var(--border)] bg-[var(--bg-surface)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Asset Allocation</h2>
                <p className="text-xs text-[var(--text-secondary)]">Ratio of liquid cash to long-term wealth</p>
              </div>
              <span className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                <BarChart3 size={18} />
              </span>
            </div>

            {/* Proportion Bar */}
            <div className="space-y-2 mb-6">
              <div className="h-4 w-full bg-[var(--bg-subtle)] rounded-full overflow-hidden flex shadow-inner">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${liquidPct}%` }}
                  title={`Liquid: ${liquidPct}%`}
                />
                <div
                  className="bg-blue-500 h-full transition-all duration-500"
                  style={{ width: `${investPct}%` }}
                  title={`Investments: ${investPct}%`}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--text-muted)] font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Liquid Cash ({liquidPct}%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  Investments ({investPct}%)
                </span>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <Wallet size={16} className="text-emerald-500" />
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">Liquid Bank & Cash</span>
                    <p className="text-[10px] text-[var(--text-muted)]">Readily available funds</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-[var(--text-primary)] tabular">
                  {formatINR(liquidCashBank)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <BarChart3 size={16} className="text-blue-500" />
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">Investment Portfolio</span>
                    <p className="text-[10px] text-[var(--text-muted)]">Stocks, mutual funds, gold</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 tabular">
                  {formatINR(investmentAssets)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <CreditCard size={16} className="text-rose-500" />
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)]">Tracked Liabilities</span>
                    <p className="text-[10px] text-[var(--text-muted)]">Outstanding principal from active loans</p>
                  </div>
                </div>
                <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 tabular">
                  {formatINR(totalLiabilities)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)] mt-4">
            <span className="flex items-center gap-1.5 font-medium">
              {consolidatedFlow.isReconciled ? (
                <>
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ledger reconciled</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} className="text-amber-500" />
                  <span className="text-amber-600 dark:text-amber-400 font-semibold">Ledger discrepancy detected</span>
                </>
              )}
            </span>
            <span className="font-bold text-[var(--text-primary)] tabular">
              Net Worth: {formatINR(netWorthCalculated)}
            </span>
          </div>
        </section>
      </div>

      {/* Account Modals */}
      <AddAccountModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <EditAccountModal
        account={editingAccount}
        isOpen={Boolean(editingAccount)}
        onClose={() => setEditingAccount(null)}
      />

      <EditTransactionModal
        transaction={editingTx}
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
      />
    </div>
  )
}
