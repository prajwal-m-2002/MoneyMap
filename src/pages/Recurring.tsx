import { useState } from 'react'
import {
  CalendarSync,
  Plus,
  Play,
  Pause,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { CashFlowForecastWidget } from '@/components/recurring/CashFlowForecastWidget'
import { UpcomingBillsCard } from '@/components/recurring/UpcomingBillsCard'
import { SmartSuggestionsCard } from '@/components/recurring/SmartSuggestionsCard'
import { AddRecurringModal } from '@/components/modals/AddRecurringModal'
import type { RecurringSuggestion } from '@/types/finance'
import { formatINR } from '@/lib/utils'

export default function Recurring() {
  const {
    accounts,
    recurringTransactions,
    cashFlowForecast,
    recurringSuggestions,
    createRecurringTransaction,
    toggleRecurringStatus,
    deleteRecurringTransaction,
    processRecurringTransaction,
  } = useFinance()

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedSuggestion, setSelectedSuggestion] = useState<RecurringSuggestion | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all')

  const handleAcceptSuggestion = (sug: RecurringSuggestion) => {
    setSelectedSuggestion(sug)
    setIsAddModalOpen(true)
  }

  const filteredRules = recurringTransactions.filter((r) => {
    if (filterType === 'all') return true
    return r.type === filterType
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-slide-up pb-12">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2.5">
            <CalendarSync className="text-[var(--accent-primary)]" size={26} />
            Recurring & Predictive Cash Flow
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Automate recurring bills, monitor liquidity forecasts, and receive cash-dip warnings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedSuggestion(null)
            setIsAddModalOpen(true)
          }}
          className="btn-primary text-xs px-4 py-2.5 flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>New Recurring Rule</span>
        </button>
      </div>

      {/* ── 1. 30-Day Predictive Cash Flow Forecast ──────────── */}
      <CashFlowForecastWidget forecast={cashFlowForecast} />

      {/* ── 2. Smart Discovered Patterns / Suggestions ───────── */}
      <SmartSuggestionsCard
        suggestions={recurringSuggestions}
        onAccept={handleAcceptSuggestion}
      />

      {/* ── 3. Upcoming Scheduled Bills & Actions ────────────── */}
      <UpcomingBillsCard
        recurringItems={recurringTransactions}
        accounts={accounts}
        onProcess={(id, post) => processRecurringTransaction(id, post)}
      />

      {/* ── 4. All Configured Recurring Rules ────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Configured Recurring Rules ({recurringTransactions.length})
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Manage automatic debit rules, pause subscriptions, or adjust cadences.
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[var(--bg-subtle)] p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterType === 'all'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({recurringTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('expense')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterType === 'expense'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Expenses
            </button>
            <button
              type="button"
              onClick={() => setFilterType('income')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                filterType === 'income'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Incomes
            </button>
          </div>
        </div>

        {filteredRules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredRules.map((rule) => {
              const account =
                accounts.find((a) => a.id === rule.accountId) ||
                accounts.find((a) => a.name.toLowerCase().includes('axis')) ||
                accounts[0]
              const isPaused = rule.status === 'paused'

              return (
                <div
                  key={rule.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                    isPaused
                      ? 'bg-[var(--bg-subtle)]/40 border-[var(--border)] opacity-70'
                      : 'bg-[var(--bg-surface)] border-[var(--border)] hover:border-brand-500/40 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                          rule.type === 'income'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-rose-500/15 text-rose-500'
                        }`}
                      >
                        {rule.type === 'income' ? (
                          <ArrowDownRight size={18} />
                        ) : (
                          <ArrowUpRight size={18} />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[var(--text-primary)]">
                            {rule.title}
                          </h4>
                          {isPaused ? (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/15 text-amber-500">
                              Paused
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-500">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          {rule.category} • {account?.name || 'Primary Account'} • {rule.paymentMethod}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-base font-extrabold whitespace-nowrap ${
                        rule.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {rule.type === 'income' ? '+' : '-'}
                      {formatINR(rule.amount)}
                    </span>
                  </div>

                  {/* Footer Stats & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] text-xs text-[var(--text-muted)]">
                    <div className="flex items-center gap-2">
                      <span>Next: <strong className="text-[var(--text-secondary)]">{rule.nextDueDate}</strong></span>
                      <span>({rule.frequency})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Pause / Resume */}
                      <button
                        type="button"
                        onClick={() => toggleRecurringStatus(rule.id)}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] transition-colors"
                        title={isPaused ? 'Resume recurring rule' : 'Pause recurring rule'}
                      >
                        {isPaused ? <Play size={14} className="text-emerald-500" /> : <Pause size={14} />}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => deleteRecurringTransaction(rule.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                        title="Delete recurring rule"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">
            No recurring rules found in this category.
          </div>
        )}
      </div>

      {/* ── Add Recurring Modal ─────────────────────────────── */}
      <AddRecurringModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setSelectedSuggestion(null)
        }}
        onAdd={createRecurringTransaction}
        accounts={accounts}
        prefill={selectedSuggestion}
      />
    </div>
  )
}
