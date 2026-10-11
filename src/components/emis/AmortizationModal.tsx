import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Calculator,
} from 'lucide-react'
import type { EMI, EMIPayment } from '@/types/finance'
import {
  generateAmortizationSchedule,
  generateProductEMISchedule,
  calculateLoanProgress,
  simulatePrepayment,
} from '@/lib/emiMath'

interface AmortizationModalProps {
  isOpen: boolean
  onClose: () => void
  emi: EMI
  payments: EMIPayment[]
}

export const AmortizationModal: React.FC<AmortizationModalProps> = ({
  isOpen,
  onClose,
  emi,
  payments,
}) => {
  const [activeTab, setActiveTab] = useState<'schedule' | 'prepayment'>('schedule')
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'paid' | 'pending'>('all')
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Keyboard accessibility and body scroll lock
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus close button on open
    setTimeout(() => {
      closeButtonRef.current?.focus()
    }, 50)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, onClose])

  // Prepayment Simulator State
  const progress = useMemo(() => calculateLoanProgress(emi, payments), [emi, payments])
  const [prepayAmountStr, setPrepayAmountStr] = useState('50000')
  const [strategy, setStrategy] = useState<'reduce_tenure' | 'reduce_emi'>('reduce_tenure')

  const prepayAmount = Math.max(0, parseFloat(prepayAmountStr) || 0)

  const prepayResult = useMemo(() => {
    return simulatePrepayment({
      principalRemaining: progress.remainingPrincipal,
      annualRatePercent: emi.interestRate,
      currentEmi: emi.emiAmount,
      currentTenureRemaining: progress.remainingInstalments,
      prepaymentAmount: prepayAmount,
      strategy,
    })
  }, [progress, emi, prepayAmount, strategy])

  const schedule = useMemo(() => {
    if (emi.emiType === 'product' || emi.firstPaymentAmount !== undefined) {
      const productItems = generateProductEMISchedule({
        emi,
        payments,
      })
      let runningBalance = emi.principal
      return productItems.map((item) => {
        const opening = runningBalance
        const principalPaid = item.actualPaidAmount !== undefined ? item.actualPaidAmount : item.scheduledAmount
        const closing = Math.max(0, runningBalance - principalPaid)
        if (item.status === 'paid') {
          runningBalance = closing
        }
        return {
          instalmentNumber: item.instalmentNumber,
          paymentDate: item.dueDate,
          openingBalance: opening,
          emiAmount: item.scheduledAmount,
          principalPaid,
          interestPaid: 0,
          closingBalance: closing,
          status: item.status === 'upcoming' ? 'pending' : item.status,
          paymentId: undefined,
          transactionId: item.transactionId ?? undefined,
          actualPaidDate: item.paymentDate,
        }
      })
    }

    return generateAmortizationSchedule({
      principal: emi.principal,
      interestRate: emi.interestRate,
      tenureMonths: emi.tenureMonths,
      startDate: emi.startDate,
      dueDay: emi.dueDay,
      emiAmount: emi.emiAmount,
      payments,
    })
  }, [emi, payments])

  const filteredSchedule = useMemo(() => {
    if (scheduleFilter === 'paid') return schedule.filter((s) => s.status === 'paid')
    if (scheduleFilter === 'pending') return schedule.filter((s) => s.status !== 'paid')
    return schedule
  }, [schedule, scheduleFilter])

  if (!isOpen) return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="amortization-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 animate-fade-in overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl p-5 sm:p-6 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl relative my-auto max-h-[92vh] flex flex-col z-50 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Calculator size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="amortization-modal-title" className="text-lg font-extrabold text-[var(--text-primary)]">
                  {emi.name}
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] font-medium border border-[var(--border)]">
                  {emi.lender}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">
                Principal: ₹{emi.principal.toLocaleString('en-IN')} • {emi.interestRate}% p.a. • {emi.tenureMonths} Months
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close amortization schedule"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 pt-4 pb-3 border-b border-[var(--border)] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${
              activeTab === 'schedule'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            Amortization Schedule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prepayment')}
            className={`text-xs px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'prepayment'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
            }`}
          >
            <Sparkles size={14} /> Prepayment Simulator
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 py-4 pr-1">
          {activeTab === 'schedule' ? (
            <div className="space-y-4">
              {/* Summary Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">Original Loan</p>
                  <p className="text-base sm:text-lg font-black text-[var(--text-primary)] mt-0.5 tabular-nums">
                    ₹{emi.principal.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">Total Interest</p>
                  <p className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums">
                    ₹{progress.totalExpectedInterest.toLocaleString('en-IN')}
                    {emi.interestRate === 0 && (
                      <span className="text-[11px] font-normal text-[var(--text-muted)] ml-1">(0% APR)</span>
                    )}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">Principal Paid</p>
                  <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                    ₹{progress.actualPrincipalPaid.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <p className="text-xs font-semibold text-[var(--text-secondary)]">Remaining Principal</p>
                  <p className="text-base sm:text-lg font-black text-[var(--text-primary)] mt-0.5 tabular-nums">
                    ₹{progress.remainingPrincipal.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Table Filters */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[var(--text-secondary)] font-semibold">
                  Showing {filteredSchedule.length} of {schedule.length} instalments
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setScheduleFilter('all')}
                    className={`px-3 py-1 rounded-lg border font-semibold transition-all ${
                      scheduleFilter === 'all'
                        ? 'bg-brand-500 text-white border-brand-500 shadow-2xs'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    All ({schedule.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleFilter('paid')}
                    className={`px-3 py-1 rounded-lg border font-semibold transition-all ${
                      scheduleFilter === 'paid'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    Paid ({progress.paidInstalmentsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduleFilter('pending')}
                    className={`px-3 py-1 rounded-lg border font-semibold transition-all ${
                      scheduleFilter === 'pending'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    Pending ({progress.remainingInstalments})
                  </button>
                </div>
              </div>

              {/* Schedule Table */}
              <div className="overflow-x-auto border border-[var(--border)] rounded-xl max-h-[52vh] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="sticky top-0 bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold border-b border-[var(--border-strong)] z-10 shadow-2xs">
                      <th className="py-3 px-3.5">#</th>
                      <th className="py-3 px-3.5">Due Date</th>
                      <th className="py-3 px-3.5 text-right">Opening (₹)</th>
                      <th className="py-3 px-3.5 text-right">Principal (₹)</th>
                      <th className="py-3 px-3.5 text-right">Interest (₹)</th>
                      <th className="py-3 px-3.5 text-right">EMI (₹)</th>
                      <th className="py-3 px-3.5 text-right">Closing (₹)</th>
                      <th className="py-3 px-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] bg-[var(--bg-surface)]">
                    {filteredSchedule.map((row) => (
                      <tr
                        key={row.instalmentNumber}
                        className="hover:bg-[var(--bg-subtle)] transition-colors"
                      >
                        <td className="py-2.5 px-3.5 font-bold text-[var(--text-secondary)]">
                          {row.instalmentNumber}
                        </td>
                        <td className="py-2.5 px-3.5 text-[var(--text-primary)] font-semibold whitespace-nowrap">
                          {row.paymentDate}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-medium text-[var(--text-primary)] tabular-nums">
                          {row.openingBalance.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {row.principalPaid.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                          {row.interestPaid.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-extrabold text-[var(--text-primary)] tabular-nums">
                          {row.emiAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-medium text-[var(--text-primary)] tabular-nums">
                          {row.closingBalance.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3.5 text-center whitespace-nowrap">
                          {row.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 size={12} /> Paid
                            </span>
                          ) : row.status === 'overdue' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                              <AlertTriangle size={12} /> Overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-500/30 px-2.5 py-0.5 rounded-full">
                              <Clock size={12} /> Pending
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Prepayment & Payoff Simulator Tab */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <h3 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-500" />
                  Prepayment & Early Foreclosure Calculator
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                  Paying extra towards your loan reduces your outstanding principal immediately.
                  Under standard reducing balance math, every rupee of principal prepaid saves you compound interest!
                </p>
              </div>

              {/* Prepayment Input & Strategy Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-primary)] block mb-1">
                      Lump-Sum Prepayment Amount (₹)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="1000"
                        max={progress.remainingPrincipal}
                        value={prepayAmountStr}
                        onChange={(e) => setPrepayAmountStr(e.target.value)}
                        className="input text-sm w-full pl-7 font-bold text-base"
                      />
                    </div>
                  </div>

                  {/* Quick percentage buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {[10000, 25000, 50000, 100000].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setPrepayAmountStr(String(amt))}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
                      >
                        ₹{(amt / 1000).toFixed(0)}k
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPrepayAmountStr(String(progress.remainingPrincipal))}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    >
                      Full Foreclosure
                    </button>
                  </div>

                  {/* Strategy Choice */}
                  <div className="pt-2">
                    <label className="text-xs font-bold text-[var(--text-primary)] block mb-2">
                      Prepayment Strategy
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setStrategy('reduce_tenure')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          strategy === 'reduce_tenure'
                            ? 'bg-brand-500/15 border-brand-500 text-[var(--text-primary)]'
                            : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        <p className="text-xs font-bold text-[var(--text-primary)]">Reduce Tenure</p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          Keep EMI same, finish loan months earlier (Maximum interest saved)
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStrategy('reduce_emi')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          strategy === 'reduce_emi'
                            ? 'bg-brand-500/15 border-brand-500 text-[var(--text-primary)]'
                            : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        <p className="text-xs font-bold text-[var(--text-primary)]">Reduce EMI</p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          Keep tenure same, lower monthly outflow
                        </p>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Simulation Impact Highlights */}
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                      Estimated Financial Savings
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Total Interest Saved</p>
                        <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                          ₹{prepayResult.interestSaved.toLocaleString('en-IN')}
                        </p>
                      </div>

                      {strategy === 'reduce_tenure' ? (
                        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
                          <p className="text-xs font-semibold text-[var(--text-secondary)]">Time Saved</p>
                          <p className="text-lg font-black text-[var(--text-primary)] mt-0.5 tabular-nums">
                            {prepayResult.monthsSaved} Months Earlier
                          </p>
                          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium">
                            Tenure drops from {progress.remainingInstalments} to {prepayResult.newTenureMonths} months
                          </p>
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
                          <p className="text-xs font-semibold text-[var(--text-secondary)]">New Monthly EMI</p>
                          <p className="text-lg font-black text-[var(--text-primary)] mt-0.5 tabular-nums">
                            ₹{prepayResult.newEmiAmount.toLocaleString('en-IN')}
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 ml-1.5">
                              (-₹{(emi.emiAmount - prepayResult.newEmiAmount).toLocaleString('en-IN')}/mo)
                            </span>
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-[var(--text-secondary)] pt-2 border-t border-[var(--border)] font-medium">
                    Outstanding balance will reduce from ₹{progress.remainingPrincipal.toLocaleString('en-IN')} to ₹{Math.max(0, progress.remainingPrincipal - prepayAmount).toLocaleString('en-IN')}.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
