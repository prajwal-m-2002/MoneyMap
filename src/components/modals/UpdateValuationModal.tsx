import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, RefreshCw, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import type { Investment } from '@/types/finance'

interface UpdateValuationModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, newCurrentValue: number) => Promise<{ success: boolean; error?: string }>
  investment: Investment
}

export const UpdateValuationModal: React.FC<UpdateValuationModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  investment,
}) => {
  const [newValueStr, setNewValueStr] = useState(String(investment.currentValue))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const newValue = parseFloat(newValueStr) || 0
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

  const returnAmt = newValue - investment.investedAmount
  const isProfit = returnAmt >= 0
  const returnPct =
    investment.investedAmount > 0
      ? Math.round(((returnAmt / investment.investedAmount) * 100) * 100) / 100
      : 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newValue < 0) {
      setError('Value cannot be negative')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await onUpdate(investment.id, newValue)
      if (!res.success) {
        setError(res.error || 'Failed to update value')
      } else {
        onClose()
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update value')
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm p-6 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl shadow-2xl relative text-[var(--text-primary)]">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center">
              <RefreshCw size={16} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[var(--text-primary)]">Update Valuation</h3>
              <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[200px]">
                {investment.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-center gap-2">
            <AlertCircle size={13} className="shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-xs space-y-1">
            <div className="flex items-center justify-between text-[var(--text-muted)]">
              <span>Invested Capital:</span>
              <span className="font-semibold text-[var(--text-primary)]">
                ₹{investment.investedAmount.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex items-center justify-between text-[var(--text-muted)]">
              <span>Previous Value:</span>
              <span className="font-semibold text-[var(--text-primary)]">
                ₹{investment.currentValue.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Current Market Value (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)]">
                ₹
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={newValueStr}
                onChange={(e) => setNewValueStr(e.target.value)}
                className="input text-base w-full pl-7 font-bold"
                required
                autoFocus
              />
            </div>
          </div>

          {/* New return preview */}
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)] font-medium">New Return:</span>
            <span
              className={`font-bold flex items-center gap-1 ${
                isProfit ? 'text-emerald-500' : 'text-rose-500'
              }`}
            >
              {isProfit ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {isProfit ? '+' : ''}₹{returnAmt.toLocaleString('en-IN')} ({isProfit ? '+' : ''}{returnPct}%)
            </span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary text-xs px-4 py-1.5"
            >
              {isSubmitting ? 'Updating...' : 'Save Value'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
