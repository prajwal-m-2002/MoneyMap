import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, TrendingUp, Sparkles } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { useToast } from '@/context/ToastContext'
import { formatINR } from '@/lib/utils'
import { DatePicker } from '@/components/ui/DatePicker'

interface AddIncomeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Business',
  'Gift',
  'Refund',
  'Other',
]

export function AddIncomeModal({ open, onOpenChange }: AddIncomeModalProps) {
  const { accounts, addIncome, presets } = useFinance()
  const { success, error } = useToast()

  const todayStr = new Date().toISOString().split('T')[0]

  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(INCOME_CATEGORIES[0])
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [date, setDate] = useState(todayStr)
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  React.useEffect(() => {
    if (!accountId && accounts.length > 0) {
      setAccountId(accounts[0].id)
    }
  }, [accounts, accountId])

  const incomePresets = presets.filter((p) => p.type === 'income')

  const handlePresetClick = (preset: {
    title: string
    category: string
    defaultAmount?: number | null
    accountId?: string | null
  }) => {
    setTitle(preset.title)
    if (INCOME_CATEGORIES.includes(preset.category)) {
      setCategory(preset.category)
    }
    if (preset.defaultAmount != null && preset.defaultAmount > 0) {
      setAmount(String(preset.defaultAmount))
    }
    if (preset.accountId) {
      setAccountId(preset.accountId)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const parsedAmount = parseFloat(amount)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid income amount greater than ₹0')
      return
    }

    if (!title.trim()) {
      setFormError('Please specify the income source')
      return
    }

    if (!accountId) {
      setFormError('Please select destination account')
      return
    }

    setSubmitting(true)
    const result = await addIncome({
      amount: parsedAmount,
      title: title.trim(),
      category,
      accountId,
      date,
      notes: notes.trim() || undefined,
    })
    setSubmitting(false)

    if (result.success) {
      success(`Added income of ${formatINR(parsedAmount)} from "${title.trim()}"`)
      setAmount('')
      setTitle('')
      setNotes('')
      onOpenChange(false)
    } else {
      setFormError(result.error || 'Failed to save income. Please check your data.')
      error(result.error || 'Failed to save income')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 animate-fade-in" />
        <Dialog.Content
          aria-describedby="add-income-description"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl animate-scale-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-income text-income">
                <TrendingUp size={20} />
              </span>
              <div>
                <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                  Add Income
                </Dialog.Title>
                <p id="add-income-description" className="text-xs text-[var(--text-secondary)]">
                  Credit income to your chosen bank account or cash
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          {/* Quick preset chips */}
          <div className="my-4">
            <span className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1 mb-2">
              <Sparkles size={13} className="text-brand-500" /> Common Income Sources
            </span>
            <div className="flex flex-wrap gap-1.5">
              {incomePresets.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handlePresetClick(p)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] hover:border-emerald-500 hover:text-emerald-600 transition-colors"
                >
                  {p.title}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="p-3 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
                {formError}
              </div>
            )}

            {/* Amount */}
            <div>
              <label htmlFor="income-amount" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-[var(--text-muted)]">
                  ₹
                </span>
                <input
                  id="income-amount"
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xl font-bold bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:border-emerald-500 transition-all outline-hidden"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Income Source Name */}
            <div>
              <label htmlFor="income-source" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Income Source *
              </label>
              <input
                id="income-source"
                type="text"
                placeholder="e.g. Monthly Salary, Freelance UX Project, Bonus"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:border-emerald-500 transition-all outline-hidden"
                required
              />
            </div>

            {/* Category and Destination Account */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="income-category" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Category
                </label>
                <select
                  id="income-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-emerald-500 transition-all outline-hidden cursor-pointer"
                >
                  {INCOME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="income-account" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Destination Account *
                </label>
                <select
                  id="income-account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-emerald-500 transition-all outline-hidden cursor-pointer"
                  required
                >
                  {accounts.length === 0 ? (
                    <option value="" disabled>
                      No accounts found — create an account first
                    </option>
                  ) : (
                    accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatINR(acc.balance)})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="income-date" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Date *
              </label>
              <DatePicker
                id="income-date"
                value={date}
                onChange={setDate}
                required
              />
            </div>

            {/* Optional Notes */}
            <div>
              <label htmlFor="income-notes" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Notes (Optional)
              </label>
              <input
                id="income-notes"
                type="text"
                placeholder="Client name, reference ID, remarks"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:border-emerald-500 transition-all outline-hidden"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="btn-ghost text-xs px-4"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                id="submit-income-btn"
                disabled={submitting}
                className="btn-primary text-xs px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white"
              >
                {submitting ? 'Saving...' : 'Add Income'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
