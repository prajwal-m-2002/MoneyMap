import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, BookMarked, Trash2, TrendingDown, TrendingUp } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { useToast } from '@/context/ToastContext'
import type { Preset, TransactionType, PaymentMethod } from '@/types/finance'

interface EditPresetModalProps {
  preset: Preset | null
  isOpen: boolean
  onClose: () => void
}

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Bills & Utilities',
  'Rent & Housing',
  'Shopping',
  'Health & Medical',
  'Entertainment',
  'Education',
  'Other',
]

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investments & Returns',
  'Business',
  'Refund & Cashback',
  'Gift',
  'Other Income',
]

const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Cash']

export function EditPresetModal({ preset, isOpen, onClose }: EditPresetModalProps) {
  const { accounts, updatePreset, deletePreset } = useFinance()
  const { success, error } = useToast()

  const [type, setType] = useState<TransactionType>('expense')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [defaultAmount, setDefaultAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (preset) {
      setType(preset.type)
      setTitle(preset.title)
      setCategory(preset.category)
      setDefaultAmount(preset.defaultAmount != null ? String(preset.defaultAmount) : '')
      setAccountId(preset.accountId || '')
      setPaymentMethod(preset.paymentMethod || 'UPI')
      setNotes(preset.notes || '')
    }
  }, [preset, isOpen])

  if (!preset) return null

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType)
    setCategory(newType === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      error('Preset title is required.')
      return
    }

    const amt = defaultAmount.trim() ? Number(defaultAmount) : null

    setSubmitting(true)
    const res = await updatePreset(preset.id, {
      type,
      title: title.trim(),
      category: category.trim(),
      defaultAmount: amt,
      accountId: accountId || null,
      paymentMethod,
      notes: notes.trim() || null,
    })
    setSubmitting(false)

    if (res.success) {
      success(`Preset "${title}" updated.`)
      onClose()
    } else {
      error(res.error || 'Failed to update preset.')
    }
  }

  const handleDelete = async () => {
    setSubmitting(true)
    const res = await deletePreset(preset.id)
    setSubmitting(false)

    if (res.success) {
      success(`Preset "${preset.title}" removed.`)
      onClose()
    } else {
      error(res.error || 'Failed to remove preset.')
    }
  }

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] p-6 shadow-2xl animate-scale-in"
          aria-describedby="edit-preset-desc"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                <BookMarked size={20} strokeWidth={2.2} />
              </div>
              <div>
                <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                  Edit Preset
                </Dialog.Title>
                <p id="edit-preset-desc" className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Update quick transaction details
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {/* Type selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)]">
              <button
                type="button"
                onClick={() => handleTypeChange('expense')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  type === 'expense'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <TrendingDown size={14} />
                <span>Expense Preset</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('income')}
                className={`py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  type === 'income'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <TrendingUp size={14} />
                <span>Income Preset</span>
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Preset Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Category & Default Amount row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Default Amount (₹)
                </label>
                <input
                  type="number"
                  placeholder="Optional"
                  value={defaultAmount}
                  onChange={(e) => setDefaultAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] tabular focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
            </div>

            {/* Payment Method & Preferred Account */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Preferred Account
                </label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                >
                  <option value="">Default / None</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Notes
              </label>
              <input
                type="text"
                placeholder="Optional notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={handleDelete}
                disabled={submitting}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              >
                <Trash2 size={14} />
                <span>Delete Preset</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-4 py-2 text-xs font-semibold rounded-xl"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
