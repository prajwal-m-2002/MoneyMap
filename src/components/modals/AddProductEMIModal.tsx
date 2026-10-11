import React, { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  ShoppingBag,
  Building2,
  AlertCircle,
  Calculator,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { CreateEMIInput, Account } from '@/types/finance'
import { formatINR } from '@/lib/utils'
import { DatePicker } from '@/components/ui/DatePicker'

interface AddProductEMIModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (input: CreateEMIInput) => Promise<{ success: boolean; error?: string }>
  accounts: Account[]
}

const EMI_TYPES = [
  'Product EMI',
  'Credit Card EMI',
  'Consumer Finance',
  'Personal Loan',
  'Other',
]

export const AddProductEMIModal: React.FC<AddProductEMIModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  accounts,
}) => {
  // Required fields in exact specified order
  const [productName, setProductName] = useState('')
  const [purchasedFrom, setPurchasedFrom] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [emiType, setEmiType] = useState('Product EMI')
  const [customType, setCustomType] = useState('')
  const [accountId, setAccountId] = useState(() => accounts[0]?.id || '')
  const [firstEmiAmountStr, setFirstEmiAmountStr] = useState('')
  const [regularEmiAmountStr, setRegularEmiAmountStr] = useState('')
  const [firstEmiDate, setFirstEmiDate] = useState(() => {
    // Default first EMI date to next month on the 5th
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 5)
    return nextMonth.toISOString().slice(0, 10)
  })
  const [dueDayStr, setDueDayStr] = useState('5')
  const [totalEmisStr, setTotalEmisStr] = useState('12')

  // Optional collapsed fields
  const [showOptional, setShowOptional] = useState(false)
  const [orderReference, setOrderReference] = useState('')
  const [notes, setNotes] = useState('')

  // State & Validation
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Field refs for focus on error
  const productNameRef = useRef<HTMLInputElement>(null)
  const purchasedFromRef = useRef<HTMLInputElement>(null)
  const firstEmiAmountRef = useRef<HTMLInputElement>(null)
  const regularEmiAmountRef = useRef<HTMLInputElement>(null)
  const totalEmisRef = useRef<HTMLInputElement>(null)

  // Sync default deduction day from first EMI date
  const handleFirstEmiDateChange = (val: string) => {
    setFirstEmiDate(val)
    if (val) {
      const parts = val.split('-')
      if (parts[2]) {
        const d = parseInt(parts[2], 10)
        if (d >= 1 && d <= 31) {
          setDueDayStr(d.toString())
        }
      }
    }
  }

  // Keyboard escape & body lock
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

  // Numeric parsing
  const firstEmi = Math.max(0, parseFloat(firstEmiAmountStr) || 0)
  const regularEmi = Math.max(0, parseFloat(regularEmiAmountStr) || 0)
  const totalEmis = Math.max(1, parseInt(totalEmisStr, 10) || 1)
  const dueDay = Math.min(31, Math.max(1, parseInt(dueDayStr, 10) || 5))

  // Estimated total scheduled payments:
  // First EMI Amount + (Regular Monthly EMI × (Total Number of EMIs − 1))
  const estimatedTotalScheduledPayments = useMemo(() => {
    if (totalEmis <= 1) return firstEmi
    return firstEmi + regularEmi * (totalEmis - 1)
  }, [firstEmi, regularEmi, totalEmis])

  if (!isOpen) return null

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!productName.trim()) {
      errs.productName = 'Product / EMI Name is required'
    }
    if (!purchasedFrom.trim()) {
      errs.purchasedFrom = 'Purchased From / Merchant is required'
    }
    if (firstEmi <= 0) {
      errs.firstEmi = 'Please enter a valid first EMI amount greater than ₹0'
    }
    if (totalEmis > 1 && regularEmi <= 0) {
      errs.regularEmi = 'Please enter a valid regular monthly EMI amount greater than ₹0'
    }
    if (totalEmis < 1) {
      errs.totalEmis = 'Duration must be at least 1 instalment'
    }
    setFieldErrors(errs)
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const errs = validate()
    if (Object.keys(errs).length > 0) {
      if (errs.productName) productNameRef.current?.focus()
      else if (errs.purchasedFrom) purchasedFromRef.current?.focus()
      else if (errs.firstEmi) firstEmiAmountRef.current?.focus()
      else if (errs.regularEmi) regularEmiAmountRef.current?.focus()
      else if (errs.totalEmis) totalEmisRef.current?.focus()
      return
    }

    setIsSubmitting(true)

    try {
      const finalType = emiType === 'Other' ? (customType.trim() || 'Other') : emiType
      const finalCategory = emiType === 'Other' ? (customType.trim() || 'Other') : 'Electronics'

      const res = await onAdd({
        name: productName.trim(),
        lender: purchasedFrom.trim(),
        purchasedFrom: purchasedFrom.trim(),
        purchaseDate,
        emiType: finalType,
        category: finalCategory,
        principal: estimatedTotalScheduledPayments,
        interestRate: 0,
        tenureMonths: totalEmis,
        totalInstalments: totalEmis,
        firstPaymentAmount: firstEmi,
        firstPaymentDate: firstEmiDate,
        regularEmiAmount: regularEmi,
        emiAmount: regularEmi > 0 ? regularEmi : firstEmi,
        startDate: firstEmiDate,
        dueDay,
        accountId: accountId || null,
        orderReference: orderReference.trim() || null,
        notes: notes.trim() || null,
      })

      if (!res.success) {
        setFormError(res.error || 'Failed to save product EMI')
      } else {
        onClose()
      }
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedAccount = accounts.find((a) => a.id === accountId)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-emi-modal-title"
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
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2 id="add-emi-modal-title" className="text-lg font-bold text-[var(--text-primary)]">
                Add EMI
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Track what you bought, when the instalments are deducted, and how much remains
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

            {/* 1. Product / EMI Name & 2. Purchased From */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Product / EMI Name *
                </label>
                <input
                  ref={productNameRef}
                  type="text"
                  placeholder="e.g. MacBook M3, iPhone 16, TV"
                  value={productName}
                  onChange={(e) => {
                    setProductName(e.target.value)
                    if (fieldErrors.productName) setFieldErrors((prev) => ({ ...prev, productName: '' }))
                  }}
                  className={`input text-sm w-full ${fieldErrors.productName ? 'border-rose-500 focus:border-rose-500' : ''}`}
                />
                {fieldErrors.productName && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.productName}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Purchased From *
                </label>
                <div className="relative">
                  <input
                    ref={purchasedFromRef}
                    type="text"
                    placeholder="e.g. Amazon, Croma, Flipkart"
                    value={purchasedFrom}
                    onChange={(e) => {
                      setPurchasedFrom(e.target.value)
                      if (fieldErrors.purchasedFrom) setFieldErrors((prev) => ({ ...prev, purchasedFrom: '' }))
                    }}
                    className={`input text-sm w-full pl-8 ${fieldErrors.purchasedFrom ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  />
                  <Building2
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
                  />
                </div>
                {fieldErrors.purchasedFrom && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.purchasedFrom}</p>
                )}
              </div>
            </div>

            {/* 3. Purchase Date & 4. EMI Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Purchase Date
                </label>
                <DatePicker
                  value={purchaseDate}
                  onChange={setPurchaseDate}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  EMI Type
                </label>
                <select
                  value={emiType}
                  onChange={(e) => setEmiType(e.target.value)}
                  className="input text-sm w-full"
                >
                  {EMI_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* When EMI Type is 'Other', show a text box to type the item/category name */}
            {emiType === 'Other' && (
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] animate-fade-in space-y-1.5">
                <label className="text-xs font-semibold text-[var(--text-secondary)] block">
                  Product / Item Category *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Shoes, Watch, Bicycle, Furniture"
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  className="input text-sm w-full"
                  autoFocus
                />
                <p className="text-[11px] text-[var(--text-muted)]">
                  Enter the specific product or item type (like Shoes, Watch, etc.).
                </p>
              </div>
            )}

            {/* 5. Bank / Payment Account */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                EMI Deduction Account *
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

            {/* 6. First EMI Amount & 7. Regular Monthly EMI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  First EMI Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)] pointer-events-none">
                    ₹
                  </span>
                  <input
                    ref={firstEmiAmountRef}
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 2000"
                    value={firstEmiAmountStr}
                    onChange={(e) => {
                      setFirstEmiAmountStr(e.target.value)
                      // If regular EMI is empty, conveniently pre-fill with first EMI
                      if (!regularEmiAmountStr) {
                        setRegularEmiAmountStr(e.target.value)
                      }
                      if (fieldErrors.firstEmi) setFieldErrors((prev) => ({ ...prev, firstEmi: '' }))
                    }}
                    className={`input text-sm w-full pl-7 font-bold ${fieldErrors.firstEmi ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  />
                </div>
                {fieldErrors.firstEmi && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.firstEmi}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Regular Monthly EMI (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)] pointer-events-none">
                    ₹
                  </span>
                  <input
                    ref={regularEmiAmountRef}
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 5000"
                    value={regularEmiAmountStr}
                    onChange={(e) => {
                      setRegularEmiAmountStr(e.target.value)
                      if (fieldErrors.regularEmi) setFieldErrors((prev) => ({ ...prev, regularEmi: '' }))
                    }}
                    className={`input text-sm w-full pl-7 font-bold ${fieldErrors.regularEmi ? 'border-rose-500 focus:border-rose-500' : ''}`}
                  />
                </div>
                {fieldErrors.regularEmi && (
                  <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.regularEmi}</p>
                )}
              </div>
            </div>

            {/* 8. First EMI Date & 9. Monthly Deduction Day */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  First EMI Date *
                </label>
                <DatePicker
                  value={firstEmiDate}
                  onChange={(d) => handleFirstEmiDateChange(d)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Deduction Day of Month (1–31) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dueDayStr}
                  onChange={(e) => setDueDayStr(e.target.value)}
                  className="input text-sm w-full font-medium"
                />
                <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                  Subsequent instalments will deduct on this day
                </span>
              </div>
            </div>

            {/* 10. EMI Duration */}
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Total Number of EMIs *
              </label>
              <input
                ref={totalEmisRef}
                type="number"
                min="1"
                max="120"
                value={totalEmisStr}
                onChange={(e) => {
                  setTotalEmisStr(e.target.value)
                  if (fieldErrors.totalEmis) setFieldErrors((prev) => ({ ...prev, totalEmis: '' }))
                }}
                className={`input text-sm w-full font-medium ${fieldErrors.totalEmis ? 'border-rose-500 focus:border-rose-500' : ''}`}
              />
              <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                Includes the 1st EMI + {Math.max(0, totalEmis - 1)} regular monthly instalments
              </span>
              {fieldErrors.totalEmis && (
                <p className="text-[11px] text-rose-500 mt-1 font-medium">{fieldErrors.totalEmis}</p>
              )}
            </div>

            {/* ── 3.3 Compact Read-Only Preview Card ────────────── */}
            {firstEmi > 0 && totalEmis > 0 && (
              <div className="p-3.5 rounded-xl bg-brand-500/5 border border-brand-500/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-brand-600 dark:text-brand-400">
                  <div className="flex items-center gap-1.5">
                    <Calculator size={14} />
                    <span>Scheduled EMI Plan Preview</span>
                  </div>
                  <span>{totalEmis} Instalments Total</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">1st EMI Deduction</span>
                    <span className="font-bold text-[var(--text-primary)] tabular">
                      {formatINR(firstEmi)}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] block">{firstEmiDate}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--text-muted)] block">Regular Monthly EMI</span>
                    <span className="font-bold text-[var(--text-primary)] tabular">
                      {formatINR(regularEmi)}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] block">
                      {Math.max(0, totalEmis - 1)} remaining
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-brand-600 dark:text-brand-400 block font-bold">
                      Total Scheduled Payments
                    </span>
                    <span className="font-extrabold text-brand-600 dark:text-brand-400 tabular text-sm">
                      {formatINR(estimatedTotalScheduledPayments)}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] block">
                      Commitment (not an expense yet)
                    </span>
                  </div>
                </div>

                {selectedAccount && (
                  <p className="text-[10px] text-[var(--text-muted)] pt-1 border-t border-brand-500/10">
                    Auto-deduction set on <strong>{selectedAccount.name}</strong> on day {dueDay} of each month.
                  </p>
                )}
              </div>
            )}

            {/* Optional Collapsed Section */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowOptional(!showOptional)}
                className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-semibold hover:text-[var(--text-primary)] transition-colors"
              >
                {showOptional ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                <span>Optional Reference & Notes</span>
              </button>

              {showOptional && (
                <div className="mt-3 space-y-3 pt-2 border-t border-[var(--border)]">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                      Order / Invoice Reference
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AMZ-9876543-IN"
                      value={orderReference}
                      onChange={(e) => setOrderReference(e.target.value)}
                      className="input text-sm w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0% interest offer, credit card deduction"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="input text-sm w-full"
                    />
                  </div>
                </div>
              )}
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
              {isSubmitting ? 'Saving...' : 'Add EMI'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
