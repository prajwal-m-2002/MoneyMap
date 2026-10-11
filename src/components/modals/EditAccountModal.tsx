import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Edit3, Trash2, Check, AlertTriangle } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { useToast } from '@/context/ToastContext'
import { DatePicker } from '@/components/ui/DatePicker'
import type { Account, AccountType } from '@/types/finance'

interface EditAccountModalProps {
  account: Account | null
  isOpen: boolean
  onClose: () => void
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'savings', label: 'Savings Account' },
  { value: 'salary', label: 'Salary Account' },
  { value: 'current', label: 'Current Account' },
  { value: 'cash', label: 'Physical Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'investment', label: 'Investment Portfolio' },
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

export function EditAccountModal({ account, isOpen, onClose }: EditAccountModalProps) {
  const { updateAccount, deleteAccount, transactions } = useFinance()
  const { showToast } = useToast()

  const todayStr = new Date().toISOString().split('T')[0]

  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('savings')
  const [openingBalance, setOpeningBalance] = useState('')
  const [openingBalanceDate, setOpeningBalanceDate] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [color, setColor] = useState('emerald')
  const [isActive, setIsActive] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (account) {
      setName(account.name)
      setType(account.type)
      setOpeningBalance(String(account.openingBalance ?? account.balance))
      const effectiveDate = account.openingBalanceDate || account.createdAt?.slice(0, 10) || todayStr
      setOpeningBalanceDate(effectiveDate)
      setAccountNumber(account.accountNumber ? account.accountNumber.replace(/\D/g, '') : '')
      setColor(account.color || 'emerald')
      setIsActive(account.isActive !== false)
      setError(null)
    }
  }, [account, isOpen, todayStr])

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

  if (!isOpen || !account) return null

  // Check if transactions exist for this account
  const accountTransactionsCount = transactions.filter(
    (t) => t.accountId === account.id || t.toAccountId === account.id
  ).length

  const originalOpeningBalance = account.openingBalance ?? account.balance
  const originalOpeningDate = account.openingBalanceDate || account.createdAt?.slice(0, 10) || todayStr
  const isOpeningModified =
    Number(openingBalance) !== originalOpeningBalance || openingBalanceDate !== originalOpeningDate

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please provide an account name.')
      return
    }

    const opening = openingBalance.trim() === '' ? 0 : Number(openingBalance)
    if (isNaN(opening)) {
      setError('Please enter a valid numeric opening balance.')
      return
    }

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
        setError('Please enter a valid date in YYYY-MM-DD format.')
        return
      }
    }

    setSubmitting(true)
    try {
      const res = await updateAccount(account.id, {
        name: name.trim(),
        type,
        openingBalance: opening,
        openingBalanceDate: openingBalanceDate || todayStr,
        accountNumber: accountNumber.trim() ? `•••• ${accountNumber.trim().slice(-4)}` : undefined,
        color,
        isActive,
      })

      if (res.success) {
        showToast(`Account "${name.trim()}" updated successfully!`, 'success')
        onClose()
      } else {
        setError(res.error || 'Failed to update account.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating the account.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${account.name}? This will remove associated ledger records.`)) {
      return
    }

    setDeleting(true)
    try {
      const res = await deleteAccount(account.id)
      if (res.success) {
        showToast(`Account "${account.name}" deleted.`, 'info')
        onClose()
      } else {
        setError(res.error || 'Failed to delete account.')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete account.')
    } finally {
      setDeleting(false)
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
        aria-labelledby="edit-account-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Edit3 size={18} />
            </div>
            <div>
              <h2 id="edit-account-title" className="text-base font-bold text-[var(--text-primary)]">
                Edit {account.name}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">Adjust details, opening balance, or status</p>
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

        {accountTransactionsCount > 0 && isOpeningModified && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2">
            <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold">Historical Ledger Notice</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                This account has {accountTransactionsCount} existing transaction{accountTransactionsCount > 1 ? 's' : ''}. Modifying the opening balance or its date will shift historical ledger calculations while safely preserving all transaction records.
              </p>
            </div>
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
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
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
                  {t.label}
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
                className="w-full pl-7 pr-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
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
              placeholder="4821"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
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
              <p className="text-[10px] text-[var(--text-secondary)]">Archived accounts are hidden from quick actions</p>
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

          <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || submitting}
              className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Trash2 size={14} />
              <span>{deleting ? 'Deleting...' : 'Delete'}</span>
            </button>

            <div className="flex items-center gap-2">
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
                className="btn-primary px-5 py-2 text-xs font-semibold rounded-xl shadow-sm"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

