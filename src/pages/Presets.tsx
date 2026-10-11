import { useState } from 'react'
import {
  BookMarked,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Zap,
  Edit3,
  CreditCard,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { useToast } from '@/context/ToastContext'
import { formatINR } from '@/lib/utils'
import type { Preset, CategoryBudgetProgress } from '@/types/finance'
import { AddPresetModal } from '@/components/modals/AddPresetModal'
import { EditPresetModal } from '@/components/modals/EditPresetModal'
import { SetBudgetModal } from '@/components/modals/SetBudgetModal'
import { CategoryBudgetCard } from '@/components/budget/CategoryBudgetCard'

export default function Presets() {
  const { presets, categoryBudgets, accounts, addExpense, addIncome } = useFinance()
  const { success, error } = useToast()

  const [activeTab, setActiveTab] = useState<'presets' | 'budgets'>('presets')
  const [presetTypeFilter, setPresetTypeFilter] = useState<'all' | 'expense' | 'income'>('all')

  // Modals state
  const [addPresetModalOpen, setAddPresetModalOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null)
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<CategoryBudgetProgress | null>(null)

  // One-tap recording loading state
  const [recordingPresetId, setRecordingPresetId] = useState<string | null>(null)

  // Filtered presets
  const filteredPresets = presets.filter((p) => {
    if (presetTypeFilter === 'all') return true
    return p.type === presetTypeFilter
  })

  // Quick 1-Tap Record Handler
  const handleQuickRecord = async (preset: Preset) => {
    if (!accounts || accounts.length === 0) {
      error('Please create an account first.')
      return
    }

    const targetAccount = accounts.find((a) => a.id === preset.accountId) || accounts[0]
    const todayStr = new Date().toISOString().split('T')[0]
    const timeStr = new Date().toTimeString().substring(0, 5)

    if (!preset.defaultAmount || preset.defaultAmount <= 0) {
      // If no default amount, open edit or prompt
      const enteredAmount = window.prompt(`Enter amount in ₹ for "${preset.title}":`, '100')
      if (!enteredAmount) return
      const parsedAmt = Number(enteredAmount)
      if (isNaN(parsedAmt) || parsedAmt <= 0) {
        error('Invalid amount.')
        return
      }

      setRecordingPresetId(preset.id)
      let res
      if (preset.type === 'expense') {
        res = await addExpense({
          amount: parsedAmt,
          title: preset.title,
          category: preset.category,
          accountId: targetAccount.id,
          date: todayStr,
          time: timeStr,
          paymentMethod: preset.paymentMethod || 'UPI',
          notes: preset.notes || undefined,
        })
      } else {
        res = await addIncome({
          amount: parsedAmt,
          title: preset.title,
          category: preset.category,
          accountId: targetAccount.id,
          date: todayStr,
          notes: preset.notes || undefined,
        })
      }
      setRecordingPresetId(null)

      if (res.success) {
        success(`Recorded "${preset.title}" (${formatINR(parsedAmt)})`)
      } else {
        error(res.error || 'Failed to record transaction.')
      }
      return
    }

    // Has default amount -> 1-tap instant entry!
    setRecordingPresetId(preset.id)
    let res
    if (preset.type === 'expense') {
      res = await addExpense({
        amount: preset.defaultAmount,
        title: preset.title,
        category: preset.category,
        accountId: targetAccount.id,
        date: todayStr,
        time: timeStr,
        paymentMethod: preset.paymentMethod || 'UPI',
        notes: preset.notes || undefined,
      })
    } else {
      res = await addIncome({
        amount: preset.defaultAmount,
        title: preset.title,
        category: preset.category,
        accountId: targetAccount.id,
        date: todayStr,
        notes: preset.notes || undefined,
      })
    }
    setRecordingPresetId(null)

    if (res.success) {
      success(`1-Tap recorded: "${preset.title}" (${formatINR(preset.defaultAmount)})`)
    } else {
      error(res.error || 'Failed to record transaction.')
    }
  }

  // Budget alerts analysis
  const exceededBudgets = categoryBudgets.filter((b) => b.status === 'exceeded')
  const warningBudgets = categoryBudgets.filter((b) => b.status === 'warning')

  const totalMonthlyBudget = categoryBudgets.reduce((sum, b) => sum + b.monthlyLimit, 0)
  const totalCategorySpent = categoryBudgets.reduce((sum, b) => sum + b.spentThisMonth, 0)
  const totalBudgetPercentage = totalMonthlyBudget > 0 ? Math.round((totalCategorySpent / totalMonthlyBudget) * 100) : 0

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-slide-up">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Presets & Category Budgets
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Configure 1-tap quick transactions and track monthly category budget limits
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            id="open-set-budget-btn"
            onClick={() => {
              setEditingBudget(null)
              setBudgetModalOpen(true)
            }}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Target size={15} className="text-brand-500" />
            <span>Set Budget</span>
          </button>

          <button
            type="button"
            id="open-add-preset-btn"
            onClick={() => setAddPresetModalOpen(true)}
            className="btn-primary px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={15} />
            <span>Add Preset</span>
          </button>
        </div>
      </div>

      {/* ── Active Budget Alerts Banner ─────────────────────── */}
      {(exceededBudgets.length > 0 || warningBudgets.length > 0) && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            exceededBudgets.length > 0
              ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/50 text-rose-900 dark:text-rose-200'
              : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                exceededBudgets.length > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
              }`}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold">
                {exceededBudgets.length > 0
                  ? `${exceededBudgets.length} Category Budget${exceededBudgets.length > 1 ? 's' : ''} Exceeded!`
                  : `${warningBudgets.length} Category Budget${warningBudgets.length > 1 ? 's' : ''} Nearing Monthly Limit`}
              </p>
              <p className="text-xs opacity-90 mt-0.5">
                {exceededBudgets.map((b) => `${b.category} (+${formatINR(b.spentThisMonth - b.monthlyLimit)})`).join(', ')}
                {exceededBudgets.length > 0 && warningBudgets.length > 0 ? ' | ' : ''}
                {warningBudgets.map((b) => `${b.category} (${b.spentPercentage}%)`).join(', ')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('budgets')}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white/80 dark:bg-black/40 border border-current self-start sm:self-auto hover:opacity-80 transition-opacity"
          >
            View Budgets
          </button>
        </div>
      )}

      {/* ── Main Tab Navigation ─────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
            activeTab === 'presets'
              ? 'bg-brand-500 text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BookMarked size={16} />
          <span>Quick Presets ({presets.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('budgets')}
          className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
            activeTab === 'budgets'
              ? 'bg-brand-500 text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Target size={16} />
          <span>Category Budgets ({categoryBudgets.length})</span>
        </button>
      </div>

      {/* ── TAB 1: PRESETS CONTENT ───────────────────────────── */}
      {activeTab === 'presets' && (
        <div className="space-y-4">
          {/* Filters & Subtitle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)] self-start">
              <button
                type="button"
                onClick={() => setPresetTypeFilter('all')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  presetTypeFilter === 'all'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                All ({presets.length})
              </button>
              <button
                type="button"
                onClick={() => setPresetTypeFilter('expense')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  presetTypeFilter === 'expense'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Expenses ({presets.filter((p) => p.type === 'expense').length})
              </button>
              <button
                type="button"
                onClick={() => setPresetTypeFilter('income')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  presetTypeFilter === 'income'
                    ? 'bg-emerald-500 text-white shadow-2xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Income ({presets.filter((p) => p.type === 'income').length})
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Tap <span className="font-bold text-brand-600">⚡ 1-Tap Record</span> to instantly log frequent entries
            </p>
          </div>

          {/* Grid of Presets */}
          {filteredPresets.length === 0 ? (
            <div className="card p-12 text-center border border-[var(--border)] bg-[var(--bg-surface)] flex flex-col items-center">
              <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] text-[var(--text-muted)] mb-3">
                <BookMarked size={24} />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">No presets found</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                Create custom presets to speed up recording regular coffee, fuel, food, or salary entries.
              </p>
              <button
                type="button"
                onClick={() => setAddPresetModalOpen(true)}
                className="mt-4 btn-primary px-4 py-2 text-xs font-bold rounded-xl"
              >
                + Create First Preset
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredPresets.map((preset) => {
                const isExpense = preset.type === 'expense'
                const isRecording = recordingPresetId === preset.id

                return (
                  <div
                    key={preset.id}
                    className="card p-4 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Top Bar: Icon, Title, Category */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isExpense
                                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                            }`}
                          >
                            {isExpense ? (
                              <TrendingDown size={17} strokeWidth={2.4} />
                            ) : (
                              <TrendingUp size={17} strokeWidth={2.4} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] truncate">
                              {preset.title}
                            </h3>
                            <span className="inline-block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                              {preset.category}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setEditingPreset(preset)}
                          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-brand-600 hover:bg-[var(--bg-subtle)] transition-colors"
                          title="Edit Preset"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>

                      {/* Amount & Details */}
                      <div className="mt-3.5 flex items-baseline justify-between text-xs">
                        <span className="text-[var(--text-secondary)]">Default Amount:</span>
                        <span className="text-sm font-extrabold text-[var(--text-primary)] tabular">
                          {preset.defaultAmount != null ? formatINR(preset.defaultAmount) : 'Flexible'}
                        </span>
                      </div>

                      {preset.paymentMethod && (
                        <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span>Method:</span>
                          <span className="flex items-center gap-1 font-medium">
                            <CreditCard size={11} /> {preset.paymentMethod}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 1-Tap Record Button */}
                    <div className="mt-4 pt-3 border-t border-[var(--border)]">
                      <button
                        type="button"
                        disabled={isRecording}
                        onClick={() => handleQuickRecord(preset)}
                        className={`w-full py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                          isExpense
                            ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60'
                            : 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60'
                        } active:scale-[0.98]`}
                      >
                        <Zap size={13} className="fill-current" />
                        <span>{isRecording ? 'Recording...' : '1-Tap Record'}</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: BUDGETS CONTENT ───────────────────────────── */}
      {activeTab === 'budgets' && (
        <div className="space-y-4">
          {/* Total Budget Progress Card */}
          <div className="card p-5 border border-[var(--border)] bg-[var(--bg-surface)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                  Total Monthly Budget Utilization
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Sum of all category limits vs current month actual outflows
                </p>
              </div>
              <div className="text-right">
                <p className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] tabular">
                  {formatINR(totalCategorySpent)}{' '}
                  <span className="text-xs font-normal text-[var(--text-muted)]">
                    / {formatINR(totalMonthlyBudget)}
                  </span>
                </p>
                <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatINR(Math.max(0, totalMonthlyBudget - totalCategorySpent))} total headroom remaining
                </p>
              </div>
            </div>

            <div className="w-full h-3 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] overflow-hidden">
              <div
                style={{ width: `${Math.min(100, totalBudgetPercentage)}%` }}
                className={`h-full transition-all duration-300 ${
                  totalBudgetPercentage >= 100
                    ? 'bg-rose-500'
                    : totalBudgetPercentage >= 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[var(--text-muted)] pt-1">
              <span>{categoryBudgets.length} monitored categories</span>
              <span className="font-bold text-[var(--text-primary)] tabular">{totalBudgetPercentage}% Allocated</span>
            </div>
          </div>

          {/* Category Budgets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {categoryBudgets.map((b) => (
              <CategoryBudgetCard
                key={b.category}
                budget={b}
                onEdit={(budget) => {
                  setEditingBudget(budget)
                  setBudgetModalOpen(true)
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────── */}
      <AddPresetModal
        open={addPresetModalOpen}
        onOpenChange={setAddPresetModalOpen}
        defaultType="expense"
      />

      <EditPresetModal
        preset={editingPreset}
        isOpen={Boolean(editingPreset)}
        onClose={() => setEditingPreset(null)}
      />

      <SetBudgetModal
        open={budgetModalOpen}
        onOpenChange={setBudgetModalOpen}
        existingBudget={editingBudget}
      />
    </div>
  )
}
