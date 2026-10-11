import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Target, Trash2 } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { useToast } from '@/context/ToastContext'
import type { CategoryBudgetProgress } from '@/types/finance'

interface SetBudgetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingBudget?: CategoryBudgetProgress | null
}

const COMMON_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Bills & Utilities',
  'Rent & Housing',
  'Shopping',
  'Health & Medical',
  'Entertainment',
  'Education',
  'Investments',
  'Personal Care',
  'Other',
]

export function SetBudgetModal({ open, onOpenChange, existingBudget }: SetBudgetModalProps) {
  const { saveBudget, deleteBudget } = useFinance()
  const { success, error } = useToast()

  const [category, setCategory] = useState(existingBudget?.category || COMMON_CATEGORIES[0])
  const [customCategory, setCustomCategory] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [limit, setLimit] = useState(existingBudget ? String(existingBudget.monthlyLimit) : '')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (existingBudget) {
      if (COMMON_CATEGORIES.includes(existingBudget.category)) {
        setCategory(existingBudget.category)
        setIsCustom(false)
      } else {
        setIsCustom(true)
        setCustomCategory(existingBudget.category)
      }
      setLimit(String(existingBudget.monthlyLimit))
    } else {
      setCategory(COMMON_CATEGORIES[0])
      setCustomCategory('')
      setIsCustom(false)
      setLimit('')
    }
  }, [existingBudget, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetCat = isCustom ? customCategory.trim() : category.trim()
    const numLimit = Number(limit)

    if (!targetCat) {
      error('Please select or specify a category name.')
      return
    }

    if (isNaN(numLimit) || numLimit <= 0) {
      error('Please enter a valid monthly limit in ₹.')
      return
    }

    setSubmitting(true)
    const res = await saveBudget(targetCat, numLimit)
    setSubmitting(false)

    if (res.success) {
      success(`Monthly budget for "${targetCat}" set to ₹${numLimit.toLocaleString('en-IN')}`)
      onOpenChange(false)
    } else {
      error(res.error || 'Failed to save budget.')
    }
  }

  const handleDelete = async () => {
    if (!existingBudget?.budgetId) return
    setSubmitting(true)
    const res = await deleteBudget(existingBudget.budgetId)
    setSubmitting(false)

    if (res.success) {
      success(`Budget for "${existingBudget.category}" removed.`)
      onOpenChange(false)
    } else {
      error(res.error || 'Failed to remove budget.')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-fade-in" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] p-6 shadow-2xl animate-scale-in"
          aria-describedby="budget-dialog-desc"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                <Target size={20} strokeWidth={2.2} />
              </div>
              <div>
                <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                  {existingBudget ? 'Edit Category Budget' : 'Set Category Budget'}
                </Dialog.Title>
                <p id="budget-dialog-desc" className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Track monthly spending limits with automatic alerts
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            {/* Category Selection */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Category
              </label>
              {!isCustom ? (
                <div className="space-y-2">
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setIsCustom(true)
                      } else {
                        setCategory(e.target.value)
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    {COMMON_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__custom__">+ Enter Custom Category...</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Streaming Subscriptions"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustom(false)}
                    className="px-2.5 py-2 text-xs rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    Choose preset
                  </button>
                </div>
              )}
            </div>

            {/* Monthly Limit */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Monthly Spending Limit (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">
                  ₹
                </span>
                <input
                  type="number"
                  min="100"
                  step="50"
                  required
                  placeholder="e.g. 15000"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] font-semibold tabular focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                You will receive warning alerts at 80% and 100% threshold.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
              {existingBudget?.budgetId ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Trash2 size={14} />
                  <span>Remove Budget</span>
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="px-3 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-4 py-2 text-xs font-semibold rounded-xl"
                >
                  {submitting ? 'Saving...' : existingBudget ? 'Update Budget' : 'Set Budget'}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
