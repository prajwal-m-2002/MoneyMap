import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, CalendarClock, Zap } from 'lucide-react'
import type {
  Account,
  RecurringFrequency,
  TransactionType,
  PaymentMethod,
  CreateRecurringInput,
  RecurringSuggestion,
} from '@/types/finance'
import { DatePicker } from '@/components/ui/DatePicker'

interface AddRecurringModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (input: CreateRecurringInput) => Promise<{ success: boolean; error?: string }>
  accounts: Account[]
  prefill?: RecurringSuggestion | null
}

const FREQUENCIES: { id: RecurringFrequency; label: string }[] = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'daily', label: 'Daily' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'yearly', label: 'Yearly' },
]

const EXPENSE_CATEGORIES = [
  'Rent & Housing',
  'Bills & Utilities',
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Entertainment',
  'Health & Medical',
  'Investments',
  'EMI & Loans',
  'Shopping',
  'Salary',
  'Income',
  'Other',
]

const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Debit Card',
  'Credit Card',
  'Net Banking',
  'Cash',
]

export const AddRecurringModal: React.FC<AddRecurringModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  accounts,
  prefill,
}) => {
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<TransactionType>('expense')
  const [category, setCategory] = useState('Bills & Utilities')
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI')
  const [autoProcess, setAutoProcess] = useState(false)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (prefill) {
      setTitle(prefill.title)
      setAmount(String(prefill.averageAmount))
      setType(prefill.type)
      setCategory(prefill.category)
      setFrequency(prefill.suggestedFrequency)
    }
  }, [prefill])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount)
    if (!title.trim()) {
      setError('Title or description is required.')
      return
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.')
      return
    }

    setLoading(true)
    try {
      const res = await onAdd({
        title: title.trim(),
        amount: numAmount,
        type,
        category,
        accountId,
        frequency,
        startDate,
        paymentMethod,
        autoProcess,
        notes: notes.trim() || undefined,
      })

      if (res.success) {
        onClose()
      } else {
        setError(res.error || 'Failed to create recurring rule.')
      }
    } finally {
      setLoading(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-strong)] shadow-2xl p-6 space-y-5 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center font-bold">
              <CalendarClock size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-primary)]">
                Add Recurring Transaction
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Automate repeating bills, subscriptions, or salaries
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 bg-[var(--bg-subtle)] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-1.5 rounded-lg font-bold transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Recurring Expense
            </button>
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-1.5 rounded-lg font-bold transition-all ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              Recurring Income
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block font-semibold text-[var(--text-secondary)] mb-1">
              Title / Description
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. House Rent, Netflix 4K, Broadband Bill"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              required
            />
          </div>

          {/* Amount & Frequency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Amount (₹)
              </label>
              <input
                type="number"
                step="any"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹0.00"
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Account & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Account
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                First Due Date
              </label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Auto Process Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-blue-500" />
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Auto-Debit</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Automatically post transaction on due date without manual prompt
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={autoProcess}
              onChange={(e) => setAutoProcess(e.target.checked)}
              className="rounded accent-[var(--accent-primary)] cursor-pointer w-4 h-4"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-[var(--text-secondary)] mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Account number, contract note, consumer ID"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary text-xs px-3 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs px-4 py-2"
            >
              {loading ? 'Creating...' : 'Save Recurring Rule'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
