import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, CreditCard, AlertCircle } from 'lucide-react'
import type { EMI, UpdateEMIInput, Account, EMIStatus } from '@/types/finance'

interface EditEMIModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, input: UpdateEMIInput) => Promise<{ success: boolean; error?: string }>
  emi: EMI
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

const STANDARD_CATEGORIES = [
  'Home Loan',
  'Vehicle',
  'Electronics',
  'Personal Loan',
  'Education',
  'Medical',
  'Credit Card EMI',
]

const STATUSES: { value: EMIStatus; label: string }[] = [
  { value: 'active', label: 'Active (Ongoing)' },
  { value: 'paused', label: 'Paused / Moratorium' },
  { value: 'completed', label: 'Closed / Completed' },
  { value: 'foreclosed', label: 'Foreclosed Early' },
]

export const EditEMIModal: React.FC<EditEMIModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  emi,
  accounts,
}) => {
  const isCustomCategory = Boolean(emi.category && !STANDARD_CATEGORIES.includes(emi.category))
  const initialCategory = isCustomCategory ? 'Other' : (emi.category || 'Other')
  const initialCustomCategory = (isCustomCategory && emi.category && emi.category !== 'Other') ? emi.category : ''

  const [name, setName] = useState(emi.name)
  const [lender, setLender] = useState(emi.lender)
  const [category, setCategory] = useState(initialCategory)
  const [customCategory, setCustomCategory] = useState<string>(initialCustomCategory)
  const [status, setStatus] = useState<EMIStatus>(emi.status)
  const [interestRateStr, setInterestRateStr] = useState(String(emi.interestRate))
  const [dueDayStr, setDueDayStr] = useState(String(emi.dueDay))
  const [accountId, setAccountId] = useState(emi.accountId || '')
  const [notes, setNotes] = useState(emi.notes || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  React.useEffect(() => {
    if (!isOpen) return
    const isCustom = Boolean(emi.category && !STANDARD_CATEGORIES.includes(emi.category))
    setName(emi.name)
    setLender(emi.lender)
    setCategory(isCustom ? 'Other' : (emi.category || 'Other'))
    setCustomCategory((isCustom && emi.category && emi.category !== 'Other') ? emi.category : '')
    setStatus(emi.status)
    setInterestRateStr(String(emi.interestRate))
    setDueDayStr(String(emi.dueDay))
    setAccountId(emi.accountId || '')
    setNotes(emi.notes || '')
    setError(null)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, emi, onClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Loan name cannot be empty')
      return
    }

    setIsSubmitting(true)
    setError(null)

    const finalCategory = category === 'Other' ? (customCategory.trim() || 'Other') : category

    try {
      const res = await onUpdate(emi.id, {
        name: name.trim(),
        lender: lender.trim(),
        category: finalCategory,
        status,
        interestRate: parseFloat(interestRateStr) || emi.interestRate,
        dueDay: parseInt(dueDayStr, 10) || emi.dueDay,
        accountId: accountId || null,
        notes: notes.trim() || null,
      })

      if (!res.success) {
        setError(res.error || 'Failed to update loan')
      } else {
        onClose()
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update loan')
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
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Edit Loan / EMI</h2>
              <p className="text-xs text-[var(--text-secondary)]">Modify loan terms, lender, or status</p>
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
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Loan Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input text-sm w-full"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Lender / Bank *
                </label>
                <input
                  type="text"
                  value={lender}
                  onChange={(e) => setLender(e.target.value)}
                  className="input text-sm w-full"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as EMIStatus)}
                  className="input text-sm w-full font-medium"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

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
              </div>
            </div>

            {/* When Category is 'Other', show a text box to type the product name (e.g. shoes, watch, etc.) */}
            {category === 'Other' && (
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] animate-fade-in space-y-1.5">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Annual Interest Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={interestRateStr}
                  onChange={(e) => setInterestRateStr(e.target.value)}
                  className="input text-sm w-full font-medium"
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
                  className="input text-sm w-full font-medium"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Auto-Debit Account
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

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Notes
              </label>
              <input
                type="text"
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
              className="btn-primary text-xs px-5 py-2"
            >
              {isSubmitting ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
