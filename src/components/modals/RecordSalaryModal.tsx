import React, { useState } from 'react'
import { X, CheckCircle2, AlertCircle, ShieldCheck, Banknote } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import type { Account } from '@/types/finance'
import { formatINR } from '@/lib/utils'
import { DatePicker } from '@/components/ui/DatePicker'

interface RecordSalaryModalProps {
  isOpen: boolean
  onClose: () => void
  defaultDate?: string
  defaultAmount?: number
  axisAccount?: Account
}

export const RecordSalaryModal: React.FC<RecordSalaryModalProps> = ({
  isOpen,
  onClose,
  defaultDate = new Date().toISOString().slice(0, 10),
  defaultAmount = 27000,
  axisAccount,
}) => {
  const { accounts, addIncome } = useFinance()

  const defaultAcc =
    axisAccount ||
    accounts.find((a) => a.name.toLowerCase().includes('axis') || a.type === 'salary') ||
    accounts[0]

  const [accountId, setAccountId] = useState<string>(defaultAcc?.id || '')
  const [amount, setAmount] = useState<string>(String(defaultAmount))
  const [date, setDate] = useState<string>(defaultDate)
  const [title, setTitle] = useState<string>('Monthly Salary')
  const [notes, setNotes] = useState<string>('Salary credited to primary salary account')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const parsedAmount = parseFloat(amount) || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (parsedAmount <= 0) {
      setError('Please enter a valid salary amount greater than 0')
      return
    }
    if (!accountId) {
      setError('Please select the receiving account')
      return
    }

    setSubmitting(true)
    try {
      const res = await addIncome({
        amount: parsedAmount,
        accountId,
        title,
        category: 'Salary',
        date,
        notes,
      })

      if (!res.success) {
        setError(res.error || 'Failed to record salary income')
        setSubmitting(false)
        return
      }

      onClose()
    } catch (err: any) {
      setError(err?.message || 'Error recording salary income')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-xl overflow-visible animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Banknote size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                Record Salary Credit
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Credit monthly income on actual receipt date
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Selection */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              Credit Into Account
            </label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatINR(a.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Salary Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="27000"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Credit Date
              </label>
              <DatePicker
                value={date}
                onChange={setDate}
                required
                align="right"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Description
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Accounting Rules Callout */}
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Accounting Rule</span>
            </div>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              Salary belongs strictly to the month in which it is actually credited. Opening balances and carry-forward balances are never treated as income.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || parsedAmount <= 0}
              className="btn-primary px-4 py-1.5 text-xs font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <span>Recording...</span>
              ) : (
                <>
                  <CheckCircle2 size={13} />
                  <span>Record Salary ({formatINR(parsedAmount)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
