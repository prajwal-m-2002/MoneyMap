import { AlertTriangle, AlertCircle, CheckCircle2, Edit3 } from 'lucide-react'
import type { CategoryBudgetProgress } from '@/types/finance'
import { formatINR } from '@/lib/utils'

interface CategoryBudgetCardProps {
  budget: CategoryBudgetProgress
  onEdit: (budget: CategoryBudgetProgress) => void
}

export function CategoryBudgetCard({ budget, onEdit }: CategoryBudgetCardProps) {
  const isExceeded = budget.status === 'exceeded'
  const isWarning = budget.status === 'warning'
  const isNormal = budget.status === 'normal'

  const clampedPercentage = Math.min(100, budget.spentPercentage)
  const overspentAmount = budget.spentThisMonth > budget.monthlyLimit ? budget.spentThisMonth - budget.monthlyLimit : 0

  return (
    <div
      className={`card p-4 sm:p-5 border transition-all hover:shadow-md flex flex-col justify-between ${
        isExceeded
          ? 'border-rose-300 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
          : isWarning
          ? 'border-amber-300 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
          : 'border-[var(--border)] bg-[var(--bg-surface)]'
      }`}
    >
      <div>
        {/* Header: Title, Status Badge, Edit Button */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
              {budget.category}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Limit: {formatINR(budget.monthlyLimit)}/month
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isExceeded && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                <AlertCircle size={11} />
                Exceeded by {formatINR(overspentAmount)}
              </span>
            )}
            {isWarning && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <AlertTriangle size={11} />
                Nearing Limit ({budget.spentPercentage}%)
              </span>
            )}
            {isNormal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
                <CheckCircle2 size={11} />
                On Track ({budget.spentPercentage}%)
              </span>
            )}

            <button
              type="button"
              onClick={() => onEdit(budget)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-brand-600 hover:bg-[var(--bg-subtle)] transition-colors"
              title="Edit Budget Limit"
            >
              <Edit3 size={14} />
            </button>
          </div>
        </div>

        {/* Amount Spent Display */}
        <div className="mt-4 flex items-baseline justify-between text-xs">
          <span className="text-[var(--text-secondary)]">Spent This Month</span>
          <span className="font-extrabold text-sm sm:text-base text-[var(--text-primary)] tabular">
            {formatINR(budget.spentThisMonth)}{' '}
            <span className="text-xs font-normal text-[var(--text-muted)]">
              / {formatINR(budget.monthlyLimit)}
            </span>
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 w-full h-2.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] overflow-hidden">
          <div
            style={{ width: `${clampedPercentage}%` }}
            className={`h-full transition-all duration-300 rounded-full ${
              isExceeded
                ? 'bg-rose-500'
                : isWarning
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* Footer: Remaining / Overspent text */}
      <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
        {isExceeded ? (
          <span className="font-semibold text-rose-600 dark:text-rose-400">
            Over budget by {formatINR(overspentAmount)}
          </span>
        ) : (
          <span className="text-[var(--text-muted)]">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatINR(budget.remaining)}
            </span>{' '}
            remaining
          </span>
        )}
        <span className="text-[11px] font-semibold text-[var(--text-secondary)] tabular">
          {budget.spentPercentage}%
        </span>
      </div>
    </div>
  )
}
