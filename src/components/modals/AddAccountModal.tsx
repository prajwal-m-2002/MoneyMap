import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Wallet, ShieldCheck, Check } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { useToast } from '@/context/ToastContext'
import { DatePicker } from '@/components/ui/DatePicker'
import type { AccountType } from '@/types/finance'

interface AddAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

const ACCOUNT_TYPES: { value: AccountType; label: string; desc: string }[] = [
  { value: 'savings', label: 'Savings Account', desc: 'Regular bank savings account' },
  { value: 'salary', label: 'Salary Account', desc: 'Primary payroll account' },
  { value: 'current', label: 'Current Account', desc: 'Business or operational account' },
  { value: 'cash', label: 'Physical Cash', desc: 'Wallet, petty cash or cash in hand' },
  { value: 'credit_card', label: 'Credit Card', desc: 'Revolving line of credit' },
  { value: 'investment', label: 'Investment Portfolio', desc: 'Brokerage or mutual fund pool' },
]

const COLOR_OPTIONS = [
  { value: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-500' },
  { value: 'rose', label: 'Rose', bg: 'bg-rose-500' },
  { value: 'amber', label: 'Amber', bg: 'bg-amber-500' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-500' },
  { value: 'teal', label: 'Teal', bg: 'bg-teal-500' },
  { value: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
]

export function AddAccountModal({ isOpen, onClose }: AddAccountModalProps) {
  const { createAccount } = useFinance()
  const { showToast } = useToast()

  const todayStr = new Date().toISOString().split('T')[0]

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('savings')
  const [openingBalance, setOpeningBalance] = useState('')
  const [openingBalanceDate, setOpeningBalanceDate] = useState(todayStr)
  const [accountNumber, setAccountNumber] = useState('')
  const [color, setColor] = useState('emerald')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please provide an account name.')
      return
    }

    const opening = openingBalance.trim() === '' ? 0 : Number(openingBalance)
    if (isNaN(opening)) {
      setError('Please provide a valid numeric opening balance.')
      return
    }

    // Require and validate date if opening balance is provided
    if (opening > 0 && !openingBalanceDate) {
      setError('Please provide an opening balance date.')
      return
    }

    if (openingBalanceDate) {
      const isValidFormat = /^\d{4}-\d{2}-\d{2}$/.test(openingBalanceDate)
      const [y, m, d] = openingBalanceDate.split('-').map(Number)
      const date = new Date(Date.UTC(y, m - 1, d))
      const isValidDate =
        isValidFormat &&
        date.getUTCFullYear() === y &&
        date.getUTCMonth() === m - 1 &&
        date.getUTCDate() === d

      if (!isValidDate) {
        setError('Please select a valid date in YYYY-MM-DD format.')
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await createAccount({
        name: name.trim(),
        type,
        openingBalance: opening,
        openingBalanceDate: openingBalanceDate || todayStr,
        accountNumber: accountNumber.trim() ? `•••• ${accountNumber.trim().slice(-4)}` : undefined,
        color,
      })

      if (res.success) {
        showToast(`Account "${name.trim()}" created successfully!`, 'success')
        onClose()
        setName('')
        setOpeningBalance('')
        setOpeningBalanceDate(todayStr)
        setAccountNumber('')
        setIsActive(true)
      } else {
        setError(res.error || 'Failed to create account.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the account.')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-lg p-6 bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl rounded-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-account-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Wallet size={18} />
            </div>
            <div>
              <h2 id="add-account-title" className="text-base font-bold text-[var(--text-primary)]">
                Add Financial Account
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">Create a new bank account, cash pool, or card</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Account Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Account Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. HDFC Bank, ICICI Salary, Emergency Cash"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* 2. Account Type */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Account Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            >
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} ({t.desc})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Opening Balance (₹) */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Opening Balance (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                ₹
              </span>
              <input
                type="number"
                step="any"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Starting baseline balance</p>
          </div>

          {/* 4. Opening Balance Date */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Opening Balance Date {Number(openingBalance) > 0 && <span className="text-rose-500">*</span>}
            </label>
            <DatePicker
              value={openingBalanceDate}
              onChange={setOpeningBalanceDate}
              required={Number(openingBalance) > 0}
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Select from calendar when this opening balance enters the ledger
            </p>
          </div>

          {/* 5. Masked Digits (Last 4) */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Masked Digits (Last 4)
            </label>
            <input
              type="text"
              maxLength={4}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="Last 4 digits (e.g. 4821)"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">For secure display (optional)</p>
          </div>

          {/* 6. Color Accent */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-2">
              Color Accent
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-7 h-7 rounded-full ${c.bg} flex items-center justify-center text-white transition-transform ${
                    color === c.value ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                  }`}
                  title={c.label}
                >
                  {color === c.value && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>

          {/* 7. Active Status */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
            <div>
              <p className="text-xs font-semibold text-[var(--text-primary)]">Active Status</p>
              <p className="text-[10px] text-[var(--text-secondary)]">Active accounts are available for transactions</p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
              }`}
            >
              {isActive ? 'Active' : 'Archived'}
            </button>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <ShieldCheck size={14} />
              <span>{submitting ? 'Creating...' : 'Create Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
