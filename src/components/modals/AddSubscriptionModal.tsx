import React, { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Building2,
  Bell,
  AlertCircle,
  Sparkles,
  Zap,
} from 'lucide-react'
import type { CreateRecurringInput, Account } from '@/types/finance'
import { formatINR } from '@/lib/utils'
import { DatePicker } from '@/components/ui/DatePicker'

interface AddSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (input: CreateRecurringInput) => Promise<{ success: boolean; error?: string }>
  accounts: Account[]
}

const SUBSCRIPTION_CATEGORIES = [
  'Entertainment',
  'Music',
  'Productivity & AI',
  'Fitness & Health',
  'Cloud Storage',
  'Utilities',
  'Other',
]

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly', freq: 'monthly' as const },
  { value: 'quarterly', label: 'Quarterly', freq: 'quarterly' as const },
  { value: 'half-yearly', label: 'Half-Yearly (6 Mos)', freq: 'quarterly' as const },
  { value: 'yearly', label: 'Yearly', freq: 'yearly' as const },
  { value: 'trial', label: 'Free Trial / Promo Autopay', freq: 'monthly' as const },
]

export const AddSubscriptionModal: React.FC<AddSubscriptionModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  accounts,
}) => {
  // Required fields in exact requested sequence
  const [name, setName] = useState('')
  const [provider, setProvider] = useState('')
  const [category, setCategory] = useState('Entertainment')
  const [customCategory, setCustomCategory] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState(() => {
    // Default 1 month from now
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
    return nextMonth.toISOString().slice(0, 10)
  })
  const [billingCycle, setBillingCycle] = useState('monthly')
  const [amountStr, setAmountStr] = useState('')
  const [accountId, setAccountId] = useState(() => accounts[0]?.id || '')
  const [remindOneDayBefore, setRemindOneDayBefore] = useState(true)
  const [autoProcess, setAutoProcess] = useState(true)
  const [notes, setNotes] = useState('')

  // State & Validation
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Field refs for error focus
  const nameRef = useRef<HTMLInputElement>(null)
  const providerRef = useRef<HTMLInputElement>(null)
  const endDateRef = useRef<HTMLInputElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)

  // Keyboard escape & body scroll lock
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

  // Numeric amount (allow 0 for free trials)
  const amount = parseFloat(amountStr) || 0
  const isFreeTrial = billingCycle === 'trial' || amount === 0

  // 1-Day Before Reminder calculation
  const reminderDateStr = useMemo(() => {
    if (!endDate) return null
    try {
      const [year, month, day] = endDate.split('-').map(Number)
      if (!year || !month || !day) return null
      const d = new Date(Date.UTC(year, month - 1, day))
      d.setUTCDate(d.getUTCDate() - 1)
      return d.toISOString().slice(0, 10)
    } catch {
      return null
    }
  }, [endDate])

  if (!isOpen) return null

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Subscription Name is required'
    if (!provider.trim()) errs.provider = 'Provider / Merchant is required'
    if (!endDate) errs.endDate = 'End Date / Renewal Date is required'
    if (!accountId) errs.accountId = 'Please select a payment account'
    if (billingCycle !== 'trial' && amountStr !== '' && amount < 0) {
      errs.amount = 'Amount cannot be negative'
    }
    setFieldErrors(errs)
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      if (errs.name) nameRef.current?.focus()
      else if (errs.provider) providerRef.current?.focus()
      else if (errs.endDate) endDateRef.current?.focus()
      else if (errs.amount) amountRef.current?.focus()
      return
    }

    setIsSubmitting(true)

    const selectedCycle = BILLING_CYCLES.find((b) => b.value === billingCycle)
    const frequency = selectedCycle?.freq || 'monthly'

    try {
      const res = await onAdd({
        title: name.trim(),
        amount: isFreeTrial ? 0 : amount,
        type: 'expense',
        category: category === 'Other' ? (customCategory.trim() || 'Other') : category,
        accountId,
        frequency,
        interval: billingCycle === 'half-yearly' ? 2 : 1,
        startDate,
        endDate: endDate || null,
        paymentMethod: 'Net Banking',
        autoProcess,
        notes: notes.trim() || undefined,
        provider: provider.trim(),
        isFreeTrial,
        remindOneDayBefore,
        billingCycle,
      })

      if (!res.success) {
        setFormError(res.error || 'Failed to save subscription')
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-subscription-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      {/* ── Bounded Modal Container: rounded corners and overflow hidden ── */}
      <div
        className="w-full max-w-lg bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl relative text-[var(--text-primary)] max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Region A: Header (Fixed at top) ───────────────────────── */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 id="add-subscription-modal-title" className="text-lg font-bold text-[var(--text-primary)]">
                Add Subscription
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Track subscriptions, renewal dates, free trials, and cancellation alerts
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
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

            {/* 1. Subscription Name & 2. Provider / Merchant */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Subscription Name *
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  placeholder="e.g. Amazon Prime, Netflix, Spotify"
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
                  Provider / Merchant *
                </label>
                <div className="relative">
                  <input
                    ref={providerRef}
                    type="text"
                    placeholder="e.g. Amazon, Netflix, Apple, Google"
                    value={provider}
                    onChange={(e) => {
                      setProvider(e.target.value)
                      if (fieldErrors.provider) setFieldErrors((prev) => ({ ...prev, provider: '' }))
                    }}
                    className={`input text-sm w-full pl-8 ${fieldErrors.provider ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  />
                  <Building2
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  />
                </div>
                {fieldErrors.provider && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.provider}</p>
                )}
              </div>
            </div>

            {/* 3. Category & 6. Billing Cycle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="input text-sm w-full font-medium"
                >
                  {SUBSCRIPTION_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Billing Cycle
                </label>
                <select
                  value={billingCycle}
                  onChange={(e) => {
                    const cycle = e.target.value
                    setBillingCycle(cycle)
                    if (cycle === 'trial') {
                      setAmountStr('0')
                    }
                  }}
                  className="input text-sm w-full font-medium"
                >
                  {BILLING_CYCLES.map((cycle) => (
                    <option key={cycle.value} value={cycle.value}>
                      {cycle.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* When Category is 'Other', show custom category input */}
            {category === 'Other' && (
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] animate-fade-in space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                  Category / Service Type *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gaming, Cloud, News, Security"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="input text-sm w-full"
                  autoFocus
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Enter the specific category for this subscription.
                </p>
              </div>
            )}

            {/* 4. Start Date & 5. End Date / Next Renewal Date */}
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
                  End / Next Renewal Date *
                </label>
                <DatePicker
                  value={endDate}
                  onChange={(d) => {
                    setEndDate(d)
                    if (fieldErrors.endDate) setFieldErrors((prev) => ({ ...prev, endDate: '' }))
                  }}
                  required
                  align="right"
                />
                {fieldErrors.endDate && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.endDate}</p>
                )}
              </div>
            </div>

            {/* 7. Amount (₹) & 8. Payment Bank Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[var(--text-secondary)]">
                    Amount (₹)
                  </label>
                  {isFreeTrial && (
                    <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      Free Trial / ₹0
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)] pointer-events-none">
                    ₹
                  </span>
                  <input
                    ref={amountRef}
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0 for free trial, or e.g. 299"
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value)
                      if (fieldErrors.amount) setFieldErrors((prev) => ({ ...prev, amount: '' }))
                    }}
                    className={`input text-sm w-full pl-7 font-bold ${fieldErrors.amount ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                  Enter 0 for promotional free trials (e.g. Amazon Music)
                </span>
                {fieldErrors.amount && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Payment Bank Account *
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="input text-sm w-full font-medium"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) — Balance: {formatINR(acc.balance)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 9. 1-Day Before Reminder & 10. Autopay Enabled */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remindOneDayBefore}
                  onChange={(e) => setRemindOneDayBefore(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div className="text-xs">
                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Bell size={13} className="text-indigo-500" /> Remind me 1 day before end date
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    {reminderDateStr
                      ? `Alert scheduled for ${reminderDateStr} to cancel or renew on time`
                      : 'Notifies you in advance before auto-renewal charges trigger'}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer pt-2 border-t border-[var(--border)]">
                <input
                  type="checkbox"
                  checked={autoProcess}
                  onChange={(e) => setAutoProcess(e.target.checked)}
                  className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <div className="text-xs">
                  <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <Zap size={13} className="text-amber-500" /> Autopay / E-Mandate Enabled
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Bank will automatically deduct renewal charges unless cancelled
                  </p>
                </div>
              </label>
            </div>

            {/* Free Trial Cancellation Callout */}
            {isFreeTrial && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2 leading-relaxed">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-800 dark:text-amber-200">
                    Free Trial / Promotional Offer
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5">
                    Make sure to cancel this subscription before <strong>{endDate}</strong> to avoid getting charged renewal fees!
                  </p>
                </div>
              </div>
            )}

            {/* 11. Notes (Optional) */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Free 3-month trial via bank offer, cancel on Day 89"
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
              className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {isSubmitting ? 'Saving...' : 'Add Subscription'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
