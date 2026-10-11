import React, { useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  CreditCard,
  Building2,
  Percent,
  Calculator,
  AlertCircle,
} from 'lucide-react'
import type { CreateEMIInput, Account } from '@/types/finance'
import { calculateEMIAmount, calculateTotalInterest } from '@/lib/emiMath'
import { DatePicker } from '@/components/ui/DatePicker'

interface AddEMIModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (input: CreateEMIInput) => Promise<{ success: boolean; error?: string }>
  accounts: Account[]
}

const CATEGORIES = [
  'Home Loan',
  'Vehicle',
  'Electronics',
  'Personal Loan',
  'Education',
  'Medical',
  'Credit Card EMI',
  'Other',
]

const TENURE_PRESETS = [6, 12, 24, 36, 48, 60, 120, 240]

export const AddEMIModal: React.FC<AddEMIModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  accounts,
}) => {
  const [name, setName] = useState('')
  const [lender, setLender] = useState('')
  const [category, setCategory] = useState('Personal Loan')
  const [customCategory, setCustomCategory] = useState('')
  const [principalStr, setPrincipalStr] = useState('')
  const [interestRateStr, setInterestRateStr] = useState('8.5')
  const [tenureMonthsStr, setTenureMonthsStr] = useState('24')
  const [dueDayStr, setDueDayStr] = useState('5')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Field refs for focus on error
  const nameInputRef = useRef<HTMLInputElement>(null)
  const lenderInputRef = useRef<HTMLInputElement>(null)
  const principalInputRef = useRef<HTMLInputElement>(null)

  React.useEffect(() => {
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

  const principal = Math.max(0, parseFloat(principalStr) || 0)
  const interestRate = Math.max(0, parseFloat(interestRateStr) || 0)
  const tenureMonths = Math.max(1, parseInt(tenureMonthsStr, 10) || 1)
  const dueDay = Math.min(31, Math.max(1, parseInt(dueDayStr, 10) || 5))

  // Real-time calculated values
  const preview = useMemo(() => {
    if (principal <= 0) return { emi: 0, totalInterest: 0, totalPayable: 0 }
    const emi = calculateEMIAmount(principal, interestRate, tenureMonths)
    const totalInterest = calculateTotalInterest(principal, emi, tenureMonths)
    const totalPayable = principal + totalInterest
    return { emi, totalInterest, totalPayable }
  }, [principal, interestRate, tenureMonths])

  if (!isOpen) return null

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) {
      errs.name = 'Please enter a loan or EMI name'
    }
    if (!lender.trim()) {
      errs.lender = 'Please specify the lending institution or merchant'
    }
    if (principal <= 0) {
      errs.principal = 'Please enter a valid principal amount greater than ₹0'
    }
    setFieldErrors(errs)
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      if (errs.name) nameInputRef.current?.focus()
      else if (errs.lender) lenderInputRef.current?.focus()
      else if (errs.principal) principalInputRef.current?.focus()
      return
    }

    setIsSubmitting(true)

    try {
      const res = await onAdd({
        name: name.trim(),
        lender: lender.trim(),
        category: category === 'Other' ? (customCategory.trim() || 'Other') : category,
        principal,
        interestRate,
        tenureMonths,
        emiAmount: preview.emi,
        startDate,
        dueDay,
        accountId: accountId || null,
        notes: notes.trim() || null,
      })

      if (!res.success) {
        setFormError(res.error || 'Failed to save loan')
      } else {
        onClose()
      }
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      {/* ── Bounded Modal Container: rounded corners and overflow hidden ── */}
      <div
        className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl relative text-[var(--text-primary)] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Region A: Header (Fixed at top) ───────────────────────── */}
        <div className="flex items-center justify-between p-5 sm:p-6 pb-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Add Loan / EMI</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Track amortization schedules, reducing balance interest, and payments
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Form with Region B (Scrollable body) & Region C (Fixed footer) ── */}
        <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* ── Region B: Scrollable Form Body ────────────────────── */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Loan Name & Lender */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Loan / EMI Name *
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  placeholder="e.g. HDFC Home Loan, MacBook M3"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }))
                  }}
                  className={`input text-sm w-full ${fieldErrors.name ? 'border-rose-500 focus:border-rose-500' : ''}`}
                />
                {fieldErrors.name && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Lender / Bank *
                </label>
                <div className="relative">
                  <input
                    ref={lenderInputRef}
                    type="text"
                    placeholder="e.g. HDFC Bank, SBI, Bajaj"
                    value={lender}
                    onChange={(e) => {
                      setLender(e.target.value)
                      if (fieldErrors.lender) setFieldErrors((prev) => ({ ...prev, lender: '' }))
                    }}
                    className={`input text-sm w-full pl-8 ${fieldErrors.lender ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  />
                  <Building2
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  />
                </div>
                {fieldErrors.lender && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.lender}</p>
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input text-sm w-full"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* When Category is 'Other', show a text box to type the product name (e.g. shoes, watch, etc.) */}
              {category === 'Other' && (
                <div className="mt-2.5 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] animate-fade-in space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                    Product / Item Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shoes, Watch, Bicycle, Headphones"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="input text-sm w-full"
                    autoFocus
                  />
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Type what you bought (e.g. shoes, watch) to display on your EMI card & reports.
                  </p>
                </div>
              )}
            </div>

            {/* Principal & Interest Rate */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Loan Principal (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)] pointer-events-none">
                    ₹
                  </span>
                  <input
                    ref={principalInputRef}
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 500000"
                    value={principalStr}
                    onChange={(e) => {
                      setPrincipalStr(e.target.value)
                      if (fieldErrors.principal) setFieldErrors((prev) => ({ ...prev, principal: '' }))
                    }}
                    className={`input text-sm w-full pl-7 font-medium ${fieldErrors.principal ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  />
                </div>
                {fieldErrors.principal && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.principal}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Annual Interest Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 8.5"
                    value={interestRateStr}
                    onChange={(e) => setInterestRateStr(e.target.value)}
                    className="input text-sm w-full pr-8 font-medium"
                  />
                  <Percent
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  />
                </div>
              </div>
            </div>

            {/* Tenure & Presets */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Tenure (Months)
              </label>
              <input
                type="number"
                min="1"
                max="360"
                value={tenureMonthsStr}
                onChange={(e) => setTenureMonthsStr(e.target.value)}
                className="input text-sm w-full mb-2 font-medium"
              />
              <div className="flex flex-wrap gap-1.5">
                {TENURE_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTenureMonthsStr(m.toString())}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all ${
                      parseInt(tenureMonthsStr, 10) === m
                        ? 'bg-brand-500/10 border-brand-500 text-brand-600 dark:text-brand-400 font-bold'
                        : 'border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    {m < 12 ? `${m}m` : `${m / 12}y (${m}m)`}
                  </button>
                ))}
              </div>
            </div>

            {/* Real-time Amortization Preview Card */}
            {principal > 0 && (
              <div className="p-3.5 rounded-xl bg-brand-500/5 border border-brand-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                  <Calculator size={14} />
                  <span>Calculated EMI Breakdown</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">
                      Monthly EMI
                    </span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] tabular">
                      ₹{Math.round(preview.emi).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">
                      Total Interest
                    </span>
                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 tabular">
                      ₹{Math.round(preview.totalInterest).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block uppercase font-bold">
                      Total Payable
                    </span>
                    <span className="text-sm font-extrabold text-[var(--text-primary)] tabular">
                      ₹{Math.round(preview.totalPayable).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Start Date & Due Day */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Start Date
                </label>
                <DatePicker
                  value={startDate}
                  onChange={setStartDate}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Monthly Due Day (1–31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDayStr}
                  onChange={(e) => setDueDayStr(e.target.value)}
                  className="input text-sm w-full"
                />
              </div>
            </div>

            {/* Linked Bank Account */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Auto-Debit Account (Optional)
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="input text-sm w-full"
              >
                <option value="">None / Manual Payment</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} (Balance: ₹{Number(acc.balance).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Loan Account # 987654321, fixed rate"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input text-sm w-full"
              />
            </div>
          </div>

          {/* ── Region C: Footer (Pinned at bottom, inside modal) ──── */}
          <div className="flex items-center justify-end gap-3 p-4 sm:px-6 bg-[var(--bg-surface)] border-t border-[var(--border)] shrink-0">
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
              className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Saving...' : 'Add Loan'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
