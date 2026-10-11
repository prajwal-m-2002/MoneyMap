import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, X, Trash2, RotateCcw } from 'lucide-react'

interface ItemCount {
  label: string
  count: number
}

interface ConfirmResetModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title: string
  description: string
  itemsSummary?: ItemCount[]
  warningMessage?: string
  actionType: 'reset_all' | 'reset_transactions'
}

export const ConfirmResetModal: React.FC<ConfirmResetModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  itemsSummary,
  warningMessage,
  actionType,
}) => {
  const [inputText, setInputText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const isConfirmValid = inputText.trim().toLowerCase() === 'confirm'

  useEffect(() => {
    if (!isOpen) {
      setInputText('')
      setIsSubmitting(false)
      return
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConfirmValid || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      console.error('Error during reset:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[var(--bg-surface)] border border-rose-500/30 rounded-2xl shadow-2xl relative text-[var(--text-primary)] max-h-[90vh] flex flex-col overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
              {actionType === 'reset_all' ? <Trash2 size={20} /> : <RotateCcw size={20} />}
            </div>
            <div>
              <h2 id="reset-modal-title" className="text-base font-bold text-[var(--text-primary)]">
                {title}
              </h2>
              <span className="text-[11px] font-semibold text-rose-500">
                Irreversible Action
              </span>
            </div>
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

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} noValidate className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4">
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {description}
            </p>

            {/* Impact counts summary */}
            {itemsSummary && itemsSummary.length > 0 && (
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                <span className="text-[11px] font-semibold text-[var(--text-muted)] block uppercase tracking-wider">
                  Data to be deleted:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {itemsSummary.map(({ label, count }) => (
                    <div
                      key={label}
                      className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-xs flex items-center justify-between"
                    >
                      <span className="text-[var(--text-secondary)] truncate">{label}</span>
                      <span className="font-bold text-[var(--text-primary)] ml-1.5">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warning callout */}
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-500" />
              <div>
                <p className="font-bold">Permanent deletion warning</p>
                <p className="text-[11px] text-rose-500/90 mt-0.5">
                  {warningMessage ||
                    'Once deleted, this data cannot be recovered. Local storage and database records will be cleared immediately.'}
                </p>
              </div>
            </div>

            {/* Confirmation Input Field */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-[var(--text-primary)] block">
                Type <span className="font-mono text-rose-500 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">confirm</span> to proceed:
              </label>
              <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                placeholder='Type "confirm" (lower or uppercase)'
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="input text-sm w-full font-mono placeholder:font-sans"
              />
              <p className="text-[11px] text-[var(--text-muted)]">
                Accepted: <span className="font-mono">confirm</span>, <span className="font-mono">CONFIRM</span>, or <span className="font-mono">Confirm</span>.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 sm:px-6 bg-[var(--bg-surface)] border-t border-[var(--border)] shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary text-xs px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmValid || isSubmitting}
              className={`text-xs px-5 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                isConfirmValid
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95 cursor-pointer'
                  : 'bg-rose-500/30 text-rose-300 dark:text-rose-500/60 cursor-not-allowed border border-rose-500/20'
              }`}
            >
              {isSubmitting ? (
                'Deleting...'
              ) : (
                <>
                  <Trash2 size={13} />
                  Confirm & Delete
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
