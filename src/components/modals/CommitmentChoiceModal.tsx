import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ShoppingBag, Clock, ArrowRight, ShieldCheck } from 'lucide-react'

interface CommitmentChoiceModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectEMI: () => void
  onSelectSubscription: () => void
}

export const CommitmentChoiceModal: React.FC<CommitmentChoiceModalProps> = ({
  isOpen,
  onClose,
  onSelectEMI,
  onSelectSubscription,
}) => {
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

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="commitment-choice-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl relative text-[var(--text-primary)] max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Region A: Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg-surface)]">
          <div>
            <h2 id="commitment-choice-title" className="text-lg font-extrabold text-[var(--text-primary)]">
              Add Commitment
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Choose the financial commitment you want to track
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Region B: Scrollable Options */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-3">
          {/* Option 1: Add EMI */}
          <button
            type="button"
            onClick={() => {
              onClose()
              onSelectEMI()
            }}
            className="w-full p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] hover:border-brand-500/50 transition-all text-left flex items-start gap-3.5 group shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ShoppingBag size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  Add EMI
                </h3>
                <ArrowRight size={15} className="text-[var(--text-muted)] group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Track a product or purchase, first EMI amount, regular EMI amount, deduction dates, and duration.
              </p>
            </div>
          </button>

          {/* Option 2: Add Subscription */}
          <button
            type="button"
            onClick={() => {
              onClose()
              onSelectSubscription()
            }}
            className="w-full p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] hover:border-indigo-500/50 transition-all text-left flex items-start gap-3.5 group shadow-xs"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  Add Subscription
                </h3>
                <ArrowRight size={15} className="text-[var(--text-muted)] group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                Track subscription periods, providers, payment accounts, and receive a reminder 1 day before it ends.
              </p>
            </div>
          </button>

          <div className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/15 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <ShieldCheck size={14} className="text-brand-500 shrink-0" />
            <span>Scheduled commitments are never counted as expenses until actually paid.</span>
          </div>
        </div>

        {/* Region C: Footer */}
        <div className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border)] shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs px-4 py-2"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
