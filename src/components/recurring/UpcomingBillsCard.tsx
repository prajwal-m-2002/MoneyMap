import React from 'react'
import {
  CalendarClock,
  CheckCircle2,
  FastForward,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from 'lucide-react'
import type { RecurringTransaction, Account } from '@/types/finance'
import { formatINR } from '@/lib/utils'

interface UpcomingBillsCardProps {
  recurringItems: RecurringTransaction[]
  accounts: Account[]
  onProcess: (id: string, postAsTransaction?: boolean) => void
}

export const UpcomingBillsCard: React.FC<UpcomingBillsCardProps> = ({
  recurringItems,
  accounts,
  onProcess,
}) => {
  const todayStr = new Date().toISOString().split('T')[0]

  // Filter active recurring items sorted by nextDueDate
  const upcoming = recurringItems
    .filter((r) => r.status === 'active')
    .sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate))

  // Categorize: Due Today / Overdue
  const dueNowOrOverdue = upcoming.filter((r) => r.nextDueDate <= todayStr)

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <CalendarClock size={18} className="text-brand-500 shrink-0" />
            Upcoming Dues & Scheduled Dues
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Bills and recurring credits scheduled to trigger over the next cycle.
          </p>
        </div>

        {dueNowOrOverdue.length > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse shrink-0">
            {dueNowOrOverdue.length} Due Action Required
          </span>
        )}
      </div>

      {upcoming.length > 0 ? (
        <div className="divide-y divide-[var(--border)]">
          {upcoming.map((item) => {
            const isDueNow = item.nextDueDate <= todayStr
            const account =
              accounts.find((a) => a.id === item.accountId) ||
              accounts.find((a) => a.name.toLowerCase().includes('axis')) ||
              accounts[0]

            return (
              <div
                key={item.id}
                className={`py-3.5 px-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                  isDueNow
                    ? 'bg-amber-500/10 border border-amber-500/30'
                    : 'hover:bg-[var(--bg-subtle)]'
                }`}
              >
                {/* Left: Icon, Title, Badges & Metadata */}
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      item.type === 'income'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {item.type === 'income' ? (
                      <ArrowDownRight size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-[var(--text-primary)] truncate">
                        {item.title}
                      </span>
                      {item.autoProcess ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center gap-1 shrink-0">
                          <Zap size={10} /> Auto-Debit
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-secondary)] flex items-center gap-1 shrink-0">
                          <Clock size={10} /> Manual Confirmation
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                      <span className="font-semibold text-[var(--text-secondary)]">
                        Due: {item.nextDueDate}
                      </span>
                      <span>•</span>
                      <span className="font-medium">{item.frequency.toUpperCase()}</span>
                      <span>•</span>
                      <span className="text-[var(--text-secondary)] font-medium">
                        {account?.name || 'Primary Account'}
                      </span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] border border-[var(--border)] text-[10px] text-[var(--text-secondary)]">
                        {item.paymentMethod}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Actions aligned cleanly */}
                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 w-full md:w-auto mt-1 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-[var(--border)]">
                  {/* Amount with fixed min-width for vertical column alignment */}
                  <div className="text-left md:text-right min-w-[110px]">
                    <span
                      className={`text-base font-extrabold tabular-nums tracking-tight ${
                        item.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {item.type === 'income' ? '+' : '-'}
                      {formatINR(item.amount)}
                    </span>
                  </div>

                  {/* Actions Group */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Post / Pay Now */}
                    <button
                      type="button"
                      onClick={() => onProcess(item.id, true)}
                      className={`px-3 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${
                        item.type === 'income'
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-brand-500 hover:bg-brand-600'
                      }`}
                      title={
                        item.type === 'income'
                          ? 'Post income transaction and advance next due date'
                          : 'Post payment transaction and advance next due date'
                      }
                    >
                      <CheckCircle2 size={13} className="shrink-0" />
                      <span>{item.type === 'income' ? 'Credit Now' : 'Pay Now'}</span>
                    </button>

                    {/* Advance / Skip */}
                    <button
                      type="button"
                      onClick={() => onProcess(item.id, false)}
                      className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-2xs"
                      title="Advance to next cycle without posting transaction"
                    >
                      <FastForward size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-[var(--text-muted)]">
          No scheduled recurring transactions found. Add a rule to start predictive forecasting.
        </div>
      )}
    </div>
  )
}
