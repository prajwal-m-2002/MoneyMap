import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ArrowRightLeft, AlertCircle } from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { useToast } from '@/context/ToastContext'
import { formatINR } from '@/lib/utils'
import { DatePicker } from '@/components/ui/DatePicker'

interface TransferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const COMMON_PURPOSES = [
  'ATM Cash Withdrawal',
  'Savings Buffer',
  'Credit Card Settlement',
  'Self Account Transfer',
]

export function TransferModal({ open, onOpenChange }: TransferModalProps) {
  const { accounts, transferMoney } = useFinance()
  const { success, error } = useToast()

  const todayStr = new Date().toISOString().split('T')[0]

  const [amount, setAmount] = useState('')
  const [fromAccountId, setFromAccountId] = useState(accounts[0]?.id || '')
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '')
  const [date, setDate] = useState(todayStr)
  const [purpose, setPurpose] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  React.useEffect(() => {
    if (accounts.length >= 2) {
      if (!fromAccountId) setFromAccountId(accounts[0].id)
      if (!toAccountId || toAccountId === fromAccountId) {
        const next = accounts.find((a) => a.id !== accounts[0].id)
        if (next) setToAccountId(next.id)
      }
    }
  }, [accounts, fromAccountId, toAccountId])

  const selectedFromAcc = accounts.find((a) => a.id === fromAccountId)
  const selectedToAcc = accounts.find((a) => a.id === toAccountId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const parsedAmount = parseFloat(amount)
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Please enter a valid transfer amount greater than ₹0')
      return
    }

    if (!fromAccountId || !toAccountId) {
      setFormError('Please select both source and destination accounts')
      return
    }

    if (fromAccountId === toAccountId) {
      setFormError('Source and destination accounts must be different')
      return
    }

    if (selectedFromAcc && parsedAmount > selectedFromAcc.balance) {
      // Alert user about overdraft/insufficient balance
      const proceed = window.confirm(
        `Warning: Selected source account "${selectedFromAcc.name}" balance (${formatINR(
          selectedFromAcc.balance
        )}) is lower than transfer amount (${formatINR(parsedAmount)}). Do you wish to proceed?`
      )
      if (!proceed) return
    }

    setSubmitting(true)
    const result = await transferMoney({
      amount: parsedAmount,
      fromAccountId,
      toAccountId,
      date,
      purpose: purpose.trim() || undefined,
    })
    setSubmitting(false)

    if (result.success) {
      success(
        `Transferred ${formatINR(parsedAmount)} from ${selectedFromAcc?.name} to ${
          selectedToAcc?.name
        }`
      )
      setAmount('')
      setPurpose('')
      onOpenChange(false)
    } else {
      setFormError(result.error || 'Failed to complete transfer.')
      error(result.error || 'Failed to complete transfer')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 animate-fade-in" />
        <Dialog.Content
          aria-describedby="transfer-modal-description"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl animate-scale-up"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-transfer text-transfer">
                <ArrowRightLeft size={20} />
              </span>
              <div>
                <Dialog.Title className="text-lg font-bold text-[var(--text-primary)]">
                  Transfer Money
                </Dialog.Title>
                <p id="transfer-modal-description" className="text-xs text-[var(--text-secondary)]">
                  Move funds between your accounts (does not count as expense or income)
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 my-4">
            {formError && (
              <div className="p-3 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-950/60 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Amount */}
            <div>
              <label htmlFor="transfer-amount" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Amount (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-[var(--text-muted)]">
                  ₹
                </span>
                <input
                  id="transfer-amount"
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xl font-bold bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:border-purple-500 transition-all outline-hidden"
                  autoFocus
                  required
                />
              </div>
            </div>

            {/* Account selection: From -> To */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <div>
                <label htmlFor="from-account" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  From (Source Account) *
                </label>
                <select
                  id="from-account"
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-purple-500 transition-all outline-hidden cursor-pointer"
                  required
                >
                  {accounts.length === 0 ? (
                    <option value="" disabled>No accounts found</option>
                  ) : (
                    accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({formatINR(acc.balance)})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label htmlFor="to-account" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  To (Destination Account) *
                </label>
                <select
                  id="to-account"
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[var(--bg-surface)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-purple-500 transition-all outline-hidden cursor-pointer"
                  required
                >
                  {accounts.length === 0 ? (
                    <option value="" disabled>No accounts found</option>
                  ) : (
                    accounts.map((acc) => (
                      <option
                        key={acc.id}
                        value={acc.id}
                        disabled={acc.id === fromAccountId}
                      >
                        {acc.name} ({formatINR(acc.balance)}) {acc.id === fromAccountId ? '(Same)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="transfer-date" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Date *
              </label>
              <DatePicker
                id="transfer-date"
                value={date}
                onChange={setDate}
                required
              />
            </div>

            {/* Transfer Purpose / Note */}
            <div>
              <label htmlFor="transfer-purpose" className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                Purpose / Note
              </label>
              <input
                id="transfer-purpose"
                type="text"
                placeholder="e.g. ATM Cash Withdrawal, Savings Transfer"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:border-purple-500 transition-all outline-hidden"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {COMMON_PURPOSES.map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPurpose(p)}
                    className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] border border-[var(--border)] hover:border-purple-400 text-[var(--text-secondary)] hover:text-purple-600 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
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
                id="submit-transfer-btn"
                disabled={submitting}
                className="btn-primary text-xs px-5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white"
              >
                {submitting ? 'Transferring...' : 'Transfer Money'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
