import React, { useMemo } from 'react'
import {
  Sparkles,
  Building2,
  Calendar,
  AlertTriangle,
  Bell,
  CheckCircle2,
  Trash2,
  Clock,
  Zap,
} from 'lucide-react'
import type { RecurringTransaction, Account } from '@/types/finance'
import { formatINR } from '@/lib/utils'

interface SubscriptionCardProps {
  subscription: RecurringTransaction
  accounts: Account[]
  onDelete: (id: string) => void
  onToggleStatus: (id: string) => void
}

export const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  subscription,
  accounts,
  onDelete,
  onToggleStatus,
}) => {
  const linkedAccount = accounts.find((a) => a.id === subscription.accountId)
  const isFreeTrial = subscription.isFreeTrial || subscription.amount === 0
  const todayStr = new Date().toISOString().slice(0, 10)

  // Calculate days remaining until end date / renewal
  const daysRemaining = useMemo(() => {
    if (!subscription.endDate) return null
    try {
      const [y1, m1, d1] = subscription.endDate.split('-').map(Number)
      const [y2, m2, d2] = todayStr.split('-').map(Number)
      const target = Date.UTC(y1, m1 - 1, d1)
      const today = Date.UTC(y2, m2 - 1, d2)
      return Math.round((target - today) / (1000 * 60 * 60 * 24))
    } catch {
      return null
    }
  }, [subscription.endDate, todayStr])

  // Reminder date (1 day before end date)
  const reminderDateStr = useMemo(() => {
    if (!subscription.endDate || !subscription.remindOneDayBefore) return null
    try {
      const [year, month, day] = subscription.endDate.split('-').map(Number)
      if (!year || !month || !day) return null
      const d = new Date(Date.UTC(year, month - 1, day))
      d.setUTCDate(d.getUTCDate() - 1)
      return d.toISOString().slice(0, 10)
    } catch {
      return null
    }
  }, [subscription.endDate, subscription.remindOneDayBefore])

  // Urgent cancellation flag if trial ends soon (<= 3 days)
  const isUrgent = daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0

  return (
    <div className={`card p-5 transition-all flex flex-col justify-between gap-4 relative border ${
      isUrgent
        ? 'border-rose-500/40 bg-rose-500/5'
        : 'hover:border-[var(--border-hover)]'
    }`}>
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isFreeTrial
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
            }`}>
              <Sparkles size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-[var(--text-primary)] leading-tight">
                  {subscription.title}
                </h3>
                {isFreeTrial ? (
                  <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    Free Trial
                  </span>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border)]">
                    {subscription.category || 'Subscription'}
                  </span>
                )}
              </div>

              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">
                <Building2 size={12} className="text-[var(--text-muted)]" />
                {subscription.provider || 'Direct'}
                {linkedAccount && (
                  <span className="text-[var(--text-muted)]">
                    • Auto-debit: {linkedAccount.name}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {subscription.status === 'active' ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                <CheckCircle2 size={12} /> Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                <Clock size={12} /> Paused
              </span>
            )}

            <button
              type="button"
              onClick={() => onDelete(subscription.id)}
              className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Delete Subscription"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Amount & Renewal Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-[var(--border)]">
          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Subscription Cost</p>
            <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
              {isFreeTrial ? (
                <span className="text-amber-500 font-extrabold">₹0 (Trial)</span>
              ) : (
                <>
                  {formatINR(subscription.amount)}
                  <span className="text-xs font-normal text-[var(--text-secondary)]">
                    /{subscription.billingCycle || subscription.frequency}
                  </span>
                </>
              )}
            </p>
          </div>

          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Renewal / End Date</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-1 flex items-center gap-1">
              <Calendar size={13} className="text-[var(--text-muted)]" />
              {subscription.endDate || subscription.nextDueDate}
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Days Left</p>
            <p className="text-sm font-semibold mt-1">
              {daysRemaining !== null ? (
                daysRemaining < 0 ? (
                  <span className="text-rose-500">Expired</span>
                ) : daysRemaining === 0 ? (
                  <span className="text-rose-500 font-bold">Ends Today!</span>
                ) : daysRemaining === 1 ? (
                  <span className="text-amber-500 font-bold">Ends Tomorrow!</span>
                ) : (
                  <span className="text-[var(--text-primary)]">{daysRemaining} days left</span>
                )
              ) : (
                <span className="text-[var(--text-muted)]">Ongoing</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Reminder & Cancellation Alerts */}
      <div className="space-y-2">
        {isUrgent && (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2 font-semibold animate-pulse">
            <AlertTriangle size={15} className="shrink-0 text-rose-500" />
            <span>
              {isFreeTrial ? 'Free trial ends soon! Cancel now to avoid being charged.' : 'Renewal deadline approaching!'}
            </span>
          </div>
        )}

        {subscription.remindOneDayBefore && reminderDateStr && (
          <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 font-medium">
            <Bell size={12} className="text-indigo-500 shrink-0" />
            <span>Reminder scheduled for <strong>{reminderDateStr}</strong> (1 day before)</span>
          </div>
        )}

        {subscription.autoProcess && (
          <div className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
            <Zap size={11} className="text-amber-500 shrink-0" />
            <span>Autopay enabled via {linkedAccount?.name || 'Bank Account'}</span>
          </div>
        )}

        {subscription.notes && (
          <p className="text-[11px] text-[var(--text-muted)] italic">
            Note: {subscription.notes}
          </p>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={() => onToggleStatus(subscription.id)}
          className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium py-1 transition-colors"
        >
          {subscription.status === 'active' ? 'Pause Autopay' : 'Resume Autopay'}
        </button>

        {isFreeTrial && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Mark "${subscription.title}" trial as cancelled? This will stop tracking charges.`)) {
                onToggleStatus(subscription.id)
              }
            }}
            className="text-xs px-3 py-1.5 rounded-xl font-bold transition-all bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 hover:bg-amber-500/20"
          >
            Mark Cancelled
          </button>
        )}
      </div>
    </div>
  )
}
