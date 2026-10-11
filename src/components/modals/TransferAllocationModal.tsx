import React, { useState } from 'react'
import { X, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import type { Account } from '@/types/finance'
import { formatINR } from '@/lib/utils'
import { DatePicker } from '@/components/ui/DatePicker'

interface TransferAllocationModalProps {
  isOpen: boolean
  onClose: () => void
  targetAccount?: Account
  suggestedAmount?: number
  categoryTitle?: string
}

export const TransferAllocationModal: React.FC<TransferAllocationModalProps> = ({
  isOpen,
  onClose,
  targetAccount,
  suggestedAmount = 0,
  categoryTitle,
}) => {
  const { accounts, transferMoney } = useFinance()

  // Find Axis Bank as primary salary source account
  const axisAccount = accounts.find(
    (a) =>
      a.name.toLowerCase().includes('axis') ||
      a.type === 'salary'
  )

  const [fromAccountId, setFromAccountId] = useState<string>(
    axisAccount?.id || accounts[0]?.id || ''
  )
  const [toAccountId, setToAccountId] = useState<string>(
    targetAccount?.id || accounts[1]?.id || ''
  )
  const [amount, setAmount] = useState<string>(
    suggestedAmount > 0 ? String(suggestedAmount) : ''
  )
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState<string>(
    categoryTitle ? `Monthly budget allocation for ${categoryTitle}` : 'Monthly budget allocation'
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const fromAcc = accounts.find((a) => a.id === fromAccountId)
  const toAcc = accounts.find((a) => a.id === toAccountId)
  const parsedAmount = parseFloat(amount) || 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (parsedAmount <= 0) {
      setError('Please enter a valid transfer amount greater than 0')
      return
    }
    if (!fromAccountId || !toAccountId) {
      setError('Please select both source and destination accounts')
      return
    }
    if (fromAccountId === toAccountId) {
      setError('Source and destination accounts must be different')
      return
    }

    setSubmitting(true)
    try {
      const res = await transferMoney({
        amount: parsedAmount,
        fromAccountId,
        toAccountId,
        date,
        purpose: notes,
      })

      if (!res.success) {
        setError(res.error || 'Failed to record transfer')
        setSubmitting(false)
        return
      }

      onClose()
    } catch (err: any) {
      setError(err?.message || 'Error recording allocation transfer')
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
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <ArrowRight size={16} />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                Execute Allocation Transfer
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Record real ledger transfer for planned budget
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

          {/* From -> To Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                From (Source)
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatINR(a.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                To (Destination)
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatINR(a.balance)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Transfer Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
                Transfer Date
              </label>
              <DatePicker
                value={date}
                onChange={setDate}
                required
                align="right"
              />
            </div>
          </div>

          {/* Purpose / Notes */}
          <div>
            <label className="block text-[11px] font-semibold text-[var(--text-secondary)] mb-1">
              Purpose / Description
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Accounting Rules Callout */}
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Accounting Assurance</span>
            </div>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400">
              This executes an authentic internal transfer: {fromAcc?.name} balance decreases by {formatINR(parsedAmount)}, and {toAcc?.name} balance increases by {formatINR(parsedAmount)}. Consolidated funds remain completely unchanged.
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
                  <span>Confirm Transfer ({formatINR(parsedAmount)})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
