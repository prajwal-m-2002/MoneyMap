import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, TrendingDown, Sparkles } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { useToast } from '@/context/ToastContext'
import type { PaymentMethod } from '@/types/finance'
import { formatINR } from '@/lib/utils'
import { DatePicker } from '@/components/ui/DatePicker'

interface AddExpenseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultAccountId?: string
}

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Snacks',
  'Groceries',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Entertainment',
  'Health & Medical',
  'Education',
  'Rent & Housing',
  'Other',
]

const PAYMENT_METHODS: PaymentMethod[] = ['UPI', 'Debit Card', 'Credit Card', 'Net Banking', 'Cash']

export function AddExpenseModal({ open, onOpenChange, defaultAccountId }: AddExpenseModalProps) {
  const { accounts, addExpense, presets } = useFinance()
  const { success, error } = useToast()

  const todayStr = new Date().toISOString().split('T')[0]
  const timeStr = new Date().toTimeString().substring(0, 5)

  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0])
  const [accountId, setAccountId] = useState(defaultAccountId || accounts[0]?.id || '')
  const [date, setDate] = useState(todayStr)
  const [time, setTime] = useState(timeStr)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI')
  const [notes, setNotes] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Ensure default account is set when accounts list changes or modal opens
  React.useEffect(() => {
    if (open) {
      if (defaultAccountId) {
        setAccountId(defaultAccountId)
      } else if (!accountId && accounts.length > 0) {
        setAccountId(accounts[0].id)
      }
    }
  }, [open, defaultAccountId, accounts, accountId])

  const expensePresets = presets.filter((p) => p.type === 'expense')

  const handlePresetClick = (preset: {
    title?: string
    name?: string
    category: string
    defaultAmount?: number | null
    paymentMethod?: PaymentMethod | null
    accountId?: string | null
  }) => {
    setTitle(preset.title || preset.name || '')
    if (EXPENSE_CATEGORIES.includes(preset.category)) {
      setCategory(preset.category)
    }
    if (preset.defaultAmount != null && preset.defaultAmount > 0) {
      setAmount(String(preset.defaultAmount))
    }
    if (preset.paymentMethod) {
      setPaymentMethod(preset.paymentMethod)
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
      setFormError('Please enter a valid expense amount greater than ₹0')
      return
    }

    if (!title.trim()) {
      setFormError('Please enter an expense name or choose a preset')
      return
    }

    if (!accountId) {
      setFormError('Please select a payment account')
      return
    }

    setSubmitting(true)
    const result = await addExpense({
      amount: parsedAmount,
      title: title.trim(),
      category,
      accountId,
      date,
      time,
      paymentMethod,
      notes: notes.trim() || undefined,
    })
    setSubmitting(false)

    if (result.success) {
      success(`Added expense of ${formatINR(parsedAmount)} for "${title.trim()}"`)
      // Reset form
      setAmount('')
      setTitle('')
      setNotes('')
      onOpenChange(false)
    } else {
      setFormError(result.error || 'Failed to save expense. Please check your data.')
      error(result.error || 'Failed to save expense')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 animate-fade-in" />
        <Dialog.Content
          aria-describedby="add-expense-description"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl animate-scale-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-expense text-expense">
                <TrendingDown size={20} />
              </span>
              <div>
                <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                  Add Expense
                </Dialog.Title>
                <p id="add-expense-description" className="text-xs text-[var(--text-secondary)]">
                  Record spending to update your account balance
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
              <Sparkles size={13} className="text-brand-500" /> Quick Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              {expensePresets.slice(0, 8).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => handlePresetClick(p)}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] hover:border-brand-500 hover:text-brand-600 transition-colors"
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

            {/* Amount input */}
            <div>
              <label htmlFor="expense-amount" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-[var(--text-muted)]">
                  ₹
                </span>
                <input
                  id="expense-amount"
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xl font-bold bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:border-brand-500 transition-all outline-hidden"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Name / Preset */}
            <div>
              <label htmlFor="expense-name" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Expense Name *
              </label>
              <input
                id="expense-name"
                type="text"
                placeholder="e.g. Food Court, Uber to office, Wifi Bill"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:border-brand-500 transition-all outline-hidden"
                required
              />
            </div>

            {/* Category and Account (Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="expense-category" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Category *
                </label>
                <select
                  id="expense-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:border-brand-500 transition-all outline-hidden cursor-pointer"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="expense-account" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Paid From Account *
                </label>
                <select
                  id="expense-account"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:border-brand-500 transition-all outline-hidden cursor-pointer"
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

            {/* Date, Time, Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="expense-date" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Date *
                </label>
                <DatePicker
                  id="expense-date"
                  value={date}
                  onChange={setDate}
                  required
                />
              </div>

              <div>
                <label htmlFor="expense-time" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Time (Optional)
                </label>
                <input
                  id="expense-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-brand-500 transition-all outline-hidden"
                />
              </div>

              <div>
                <label htmlFor="expense-method" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Payment Method
                </label>
                <select
                  id="expense-method"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-brand-500 transition-all outline-hidden cursor-pointer"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label htmlFor="expense-notes" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Notes (Optional)
              </label>
              <input
                id="expense-notes"
                type="text"
                placeholder="Bill reference, receipt tag, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:border-brand-500 transition-all outline-hidden"
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
                id="submit-expense-btn"
                disabled={submitting}
                className="btn-primary text-xs px-5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white"
              >
                {submitting ? 'Saving...' : 'Add Expense'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
