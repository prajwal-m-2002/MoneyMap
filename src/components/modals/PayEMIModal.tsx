import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import type { EMI, Account } from '@/types/finance'
import { generateAmortizationSchedule } from '@/lib/emiMath'
import { DatePicker } from '@/components/ui/DatePicker'

interface PayEMIModalProps {
  isOpen: boolean
  onClose: () => void
  onPay: (
    emiId: string,
    options?: { accountId?: string; paymentDate?: string; customAmount?: number }
  ) => Promise<{ success: boolean; error?: string }>
  emi: EMI
  accounts: Account[]
  paymentsCount?: number
  payments?: any[]
}

export const PayEMIModal: React.FC<PayEMIModalProps> = ({
  isOpen,
  onClose,
  onPay,
  emi,
  accounts,
  paymentsCount,
  payments,
}) => {
  const [accountId, setAccountId] = useState(emi.accountId || accounts[0]?.id || '')
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  // Filter payments specifically for this EMI to get true paid count
  const emiPaidList = (payments || []).filter((p) => p.emiId === emi.id && p.status === 'paid')
  const actualPaymentsCount = paymentsCount ?? emiPaidList.length
  const nextInstalmentNumber = actualPaymentsCount + 1
  const totalInstalments = emi.totalInstalments ?? emi.tenureMonths

  // Determine instalment amount based on product first payment or regular EMI
  let emiAmount = emi.emiAmount
  if (nextInstalmentNumber === 1 && emi.firstPaymentAmount) {
    emiAmount = emi.firstPaymentAmount
  } else if (nextInstalmentNumber > 1 && emi.regularEmiAmount) {
    emiAmount = emi.regularEmiAmount
  }

  // Calculate schedule item to display proper principal and interest split
  const isProductOrNoCost = emi.emiType === 'product' || emi.interestRate === 0
  let principalComp = emiAmount
  let interestComp = 0

  if (!isProductOrNoCost) {
    const schedule = generateAmortizationSchedule({
      principal: emi.principal,
      interestRate: emi.interestRate,
      tenureMonths: emi.tenureMonths,
      startDate: emi.startDate,
      dueDay: emi.dueDay,
      emiAmount: emi.emiAmount,
      payments: emiPaidList,
    })
    const scheduleItem = schedule.find((s) => s.instalmentNumber === nextInstalmentNumber)
    if (scheduleItem) {
      principalComp = scheduleItem.principalPaid
      interestComp = scheduleItem.interestPaid
    }
  }

  const selectedAccount = accounts.find((a) => a.id === accountId)
  const currentBalance = Number(selectedAccount?.balance || 0)
  const balanceAfterPayment = currentBalance - emiAmount
  const hasSufficientBalance = !selectedAccount || currentBalance >= emiAmount

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountId) {
      setError('Please select an account to debit this payment from')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await onPay(emi.id, {
        accountId,
        paymentDate,
        customAmount: emiAmount,
      })

      if (!res.success) {
        setError(res.error || 'Failed to record EMI payment')
      } else {
        onClose()
      }
    } catch (err: any) {
      setError(err?.message || 'Payment recording failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-emi-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      {/* ── Bounded Modal Container: rounded corners and overflow hidden ── */}
      <div
        className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl relative z-50 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Region A: Header (Fixed at top) ───────────────────────── */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 id="pay-emi-title" className="text-lg font-extrabold text-[var(--text-primary)]">
                Confirm EMI Payment
              </h2>
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                {emi.name} • {emi.purchasedFrom || emi.lender}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Form with Region B (Scrollable body) & Region C (Fixed footer) ── */}
        <form onSubmit={handleConfirm} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* ── Region B: Scrollable Form Body ────────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Instalment Badge & Amount Card */}
            <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/15 text-brand-600 dark:text-brand-400">
                Instalment #{nextInstalmentNumber} of {totalInstalments}
              </div>
              <div>
                <p className="text-3xl font-black text-[var(--text-primary)] tabular-nums">
                  ₹{emiAmount.toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                  Amount to be deducted
                </p>
              </div>

              {/* Split Breakdown if interest applies */}
              {!isProductOrNoCost && interestComp > 0 && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)] text-xs">
                  <div className="bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium block">Principal Component</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      ₹{principalComp.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="bg-[var(--bg-surface)] p-2 rounded-lg border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-secondary)] font-medium block">Interest Component</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                      ₹{interestComp.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Debit Account */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Deduct From Bank Account *
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="input text-sm w-full font-medium"
                required
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} — Balance: ₹{Number(acc.balance).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
              {selectedAccount && (
                <div className="text-[11px] text-[var(--text-secondary)] mt-1.5 flex items-center justify-between">
                  <span>Current: <strong>₹{currentBalance.toLocaleString('en-IN')}</strong></span>
                  <span>After payment: <strong className={balanceAfterPayment < 0 ? 'text-rose-500' : 'text-emerald-500'}>₹{balanceAfterPayment.toLocaleString('en-IN')}</strong></span>
                </div>
              )}
              {!hasSufficientBalance && (
                <p className="text-[11px] text-amber-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> Account balance is lower than EMI amount.
                </p>
              )}
            </div>

            {/* Payment Date */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Payment Date
              </label>
              <DatePicker
                value={paymentDate}
                onChange={setPaymentDate}
                required
              />
            </div>

            {/* Confirmation Note matching user request */}
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5 leading-relaxed">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-emerald-500" />
              <div>
                <p className="font-bold text-xs text-[var(--text-primary)]">
                  Confirm Payment & Expense Deduction
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Clicking confirm verifies that you have paid <strong>₹{emiAmount.toLocaleString('en-IN')}</strong>. This amount will be deducted from your <strong>{selectedAccount?.name}</strong> balance and recorded as an <strong>Expense</strong> in your ledger.
                </p>
              </div>
            </div>
          </div>

          {/* ── Region C: Footer (Pinned at bottom, inside modal) ──── */}
          <div className="flex items-center justify-end gap-3 p-4 sm:px-5 bg-[var(--bg-surface)] border-t border-[var(--border)] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CheckCircle2 size={14} />
              {isSubmitting ? 'Deducting...' : `Confirm Paid (Deduct ₹${emiAmount.toLocaleString('en-IN')})`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
