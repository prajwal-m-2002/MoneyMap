import React, { useState, useMemo } from 'react'
import {
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  TrendingDown,
  Edit2,
  Trash2,
} from 'lucide-react'
import type { EMI, EMIPayment, Account } from '@/types/finance'
import { calculateLoanProgress, generateProductEMISchedule } from '@/lib/emiMath'

interface EMICardProps {
  emi: EMI
  payments: EMIPayment[]
  accounts: Account[]
  onPay: (emi: EMI) => void
  onViewSchedule: (emi: EMI) => void
  onEdit: (emi: EMI) => void
  onDelete: (emi: EMI) => void
}

export const EMICard: React.FC<EMICardProps> = ({
  emi,
  payments,
  accounts,
  onPay,
  onViewSchedule,
  onEdit,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const linkedAccount = accounts.find((a) => a.id === emi.accountId)
  const progress = calculateLoanProgress(emi, payments)
  const paidPayments = payments.filter((p) => p.status === 'paid')
  const nextInstalmentNumber = paidPayments.length + 1
  const totalInstalments = emi.totalInstalments ?? emi.tenureMonths
  const isAllPaid = nextInstalmentNumber > totalInstalments || emi.status === 'completed'

  let nextAmount = emi.emiAmount
  if (nextInstalmentNumber === 1 && emi.firstPaymentAmount) {
    nextAmount = emi.firstPaymentAmount
  } else if (nextInstalmentNumber > 1 && emi.regularEmiAmount) {
    nextAmount = emi.regularEmiAmount
  }

  // Upcoming Due Date logic:
  // If this month's instalment is already paid, shows the next cycle's due date.
  // If this month's instalment is not yet paid, shows this month's due date.
  const nextDueDate = useMemo(() => {
    if (isAllPaid) return null

    if (emi.emiType === 'product' || emi.firstPaymentAmount !== undefined) {
      const schedule = generateProductEMISchedule({ emi, payments })
      const nextUnpaidItem = schedule.find((s) => s.status !== 'paid')
      return nextUnpaidItem?.dueDate || null
    }

    const nextUnpaidItem = progress.nextInstalment
    return nextUnpaidItem?.paymentDate || null
  }, [emi, payments, isAllPaid, progress.nextInstalment])

  const formattedDueDate = useMemo(() => {
    if (!nextDueDate) return isAllPaid ? 'Completed' : 'N/A'
    try {
      const [year, month, day] = nextDueDate.split('-').map(Number)
      if (!year || !month || !day) return nextDueDate
      const d = new Date(year, month - 1, day)
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return nextDueDate
    }
  }, [nextDueDate, isAllPaid])

  // Status styling
  const statusBadge = () => {
    switch (emi.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Closed / Paid Off
          </span>
        )
      case 'paused':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock size={12} /> Paused
          </span>
        )
      case 'foreclosed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-500 border border-blue-500/20">
            Foreclosed
          </span>
        )
      case 'active':
      default:
        if (progress.paidThisMonth) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <CheckCircle2 size={12} /> Paid This Month
            </span>
          )
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <AlertTriangle size={12} /> Due on {emi.dueDay}th
          </span>
        )
    }
  }

  return (
    <div className="card p-5 hover:border-[var(--border-hover)] transition-all flex flex-col justify-between gap-4 relative">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0 text-[var(--accent-primary)]">
              <CreditCard size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base text-[var(--text-primary)] leading-tight">
                  {emi.name}
                </h3>
                {emi.category && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                    {emi.category}
                  </span>
                )}
              </div>
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">
                <Building2 size={12} className="text-[var(--text-muted)]" />
                {emi.purchasedFrom || emi.lender}
                {linkedAccount && (
                  <span className="text-[var(--text-muted)]">
                    • Auto-debit: {linkedAccount.name}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusBadge()}

            {/* Overflow / Actions button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                title="Options"
              >
                <span className="text-lg leading-none font-bold px-1">⋮</span>
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-8 w-36 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl py-1 z-30 animate-fade-in text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false)
                        onEdit(emi)
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                    >
                      <Edit2 size={13} /> Edit Loan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false)
                        onDelete(emi)
                      }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-rose-500 hover:bg-rose-500/10"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* EMI Amount & Principal Specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-[var(--border-subtle)]">
          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">
              {emi.firstPaymentAmount && emi.regularEmiAmount && emi.firstPaymentAmount !== emi.regularEmiAmount
                ? 'Regular EMI'
                : 'Monthly EMI'}
            </p>
            <p className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
              ₹{(emi.regularEmiAmount ?? emi.emiAmount).toLocaleString('en-IN')}
              <span className="text-xs font-normal text-[var(--text-secondary)]">/mo</span>
            </p>
            {emi.firstPaymentAmount && emi.regularEmiAmount && emi.firstPaymentAmount !== emi.regularEmiAmount && (
              <span className="text-[10px] text-[var(--text-muted)] block">
                1st: ₹{emi.firstPaymentAmount.toLocaleString('en-IN')}
              </span>
            )}
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">
              {emi.emiType === 'product' ? 'Total Scheduled' : 'Original Principal'}
            </p>
            <p className="text-sm font-semibold text-[var(--text-secondary)] mt-1">
              ₹{emi.principal.toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Due Date</p>
            <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
              {formattedDueDate}
            </p>
            {!isAllPaid && nextDueDate && (
              <span
                className={`text-[10px] font-medium block mt-0.5 ${
                  progress.paidThisMonth ? 'text-emerald-500' : 'text-amber-500'
                }`}
              >
                {progress.paidThisMonth ? 'Next Due' : 'Due This Month'}
              </span>
            )}
          </div>
          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Tenure</p>
            <p className="text-sm font-semibold text-[var(--text-secondary)] mt-1">
              {emi.totalInstalments ?? emi.tenureMonths} mos
            </p>
          </div>
        </div>
      </div>

      {/* Repayment Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">
            <strong className="text-[var(--text-primary)]">
              {progress.paidInstalmentsCount}
            </strong>{' '}
            of {progress.totalInstalments} paid ({progress.progressPercent}%)
          </span>
          <span className="font-semibold text-emerald-500 flex items-center gap-1">
            <TrendingDown size={13} /> ₹{progress.remainingPrincipal.toLocaleString('en-IN')} left
          </span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${Math.max(4, progress.progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={() => onViewSchedule(emi)}
          className="text-xs text-[var(--accent-primary)] hover:underline font-medium flex items-center gap-1 py-1"
        >
          Amortization & Schedule <ChevronRight size={14} />
        </button>

        {/* Paid / Mark as Paid Button */}
        {emi.status === 'active' && !isAllPaid ? (
          <button
            type="button"
            onClick={() => onPay(emi)}
            className="text-xs px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-95 cursor-pointer"
            title={`Confirm payment of instalment #${nextInstalmentNumber} (₹${nextAmount.toLocaleString('en-IN')})`}
          >
            <CheckCircle2 size={14} />
            Paid (₹{nextAmount.toLocaleString('en-IN')})
          </button>
        ) : (
          <span className="text-xs px-3 py-1.5 rounded-xl font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-1.5">
            <CheckCircle2 size={13} /> Completed
          </span>
        )}
      </div>
    </div>
  )
}
