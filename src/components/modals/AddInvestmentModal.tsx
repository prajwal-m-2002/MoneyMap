import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  TrendingUp,
  Building2,
  AlertCircle,
  FolderKanban,
} from 'lucide-react'
import type { CreateInvestmentInput, InvestmentAssetType } from '@/types/finance'
import { ASSET_TYPE_METADATA } from '@/lib/portfolioMath'

interface AddInvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (input: CreateInvestmentInput) => Promise<{ success: boolean; error?: string }>
}

const ASSET_TYPES: { type: InvestmentAssetType; label: string }[] = Object.entries(
  ASSET_TYPE_METADATA
).map(([key, val]) => ({
  type: key as InvestmentAssetType,
  label: val.label,
}))

export const AddInvestmentModal: React.FC<AddInvestmentModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState<InvestmentAssetType>('mutual_funds')
  const [investedAmountStr, setInvestedAmountStr] = useState('')
  const [currentValueStr, setCurrentValueStr] = useState('')
  const [unitsStr, setUnitsStr] = useState('')
  const [institution, setInstitution] = useState('')
  const [portfolio, setPortfolio] = useState('Core Wealth')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  const investedAmount = Math.max(0, parseFloat(investedAmountStr) || 0)
  const currentValue = parseFloat(currentValueStr) || investedAmount

  const handleInvestedChange = (val: string) => {
    setInvestedAmountStr(val)
    if (!currentValueStr || currentValueStr === investedAmountStr) {
      setCurrentValueStr(val)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter asset or fund name')
      return
    }
    if (investedAmount <= 0) {
      setError('Please enter a valid invested amount greater than 0')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const units = unitsStr ? parseFloat(unitsStr) : undefined
      const res = await onAdd({
        name: name.trim(),
        assetType,
        investedAmount,
        currentValue: currentValue > 0 ? currentValue : investedAmount,
        units: units && !isNaN(units) ? units : null,
        institution: institution.trim() || null,
        portfolio: portfolio.trim() || null,
        notes: notes.trim() || null,
      })

      if (!res.success) {
        setError(res.error || 'Failed to add investment')
      } else {
        onClose()
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const returnAmt = currentValue - investedAmount
  const returnPct =
    investedAmount > 0
      ? Math.round(((returnAmt / investedAmount) * 100) * 100) / 100
      : 0

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg p-6 bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-2xl shadow-2xl relative my-8 text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Add Investment Asset</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Track stocks, mutual funds, gold, fixed deposits, and provident funds
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-500 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Asset Name */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Asset / Scheme Name *
            </label>
            <input
              type="text"
              placeholder="e.g. Parag Parikh Flexi Cap, UTI Nifty 50, SGB 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input text-sm w-full"
              required
            />
          </div>

          {/* Asset Type */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Asset Category *
            </label>
            <select
              value={assetType}
              onChange={(e) => setAssetType(e.target.value as InvestmentAssetType)}
              className="input text-sm w-full font-medium"
            >
              {ASSET_TYPES.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Invested Amount & Current Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Invested Capital (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)]">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  placeholder="e.g. 50000"
                  value={investedAmountStr}
                  onChange={(e) => handleInvestedChange(e.target.value)}
                  className="input text-sm w-full pl-7 font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Current Market Value (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--text-muted)]">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="e.g. 62000"
                  value={currentValueStr}
                  onChange={(e) => setCurrentValueStr(e.target.value)}
                  className="input text-sm w-full pl-7 font-bold text-base"
                  required
                />
              </div>
            </div>
          </div>

          {/* Live Gain/Loss Preview Banner */}
          {investedAmount > 0 && currentValue > 0 && (
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)] font-medium">Estimated Unrealized Return:</span>
              <span
                className={`font-bold ${
                  returnAmt >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {returnAmt >= 0 ? '+' : ''}₹{returnAmt.toLocaleString('en-IN')} ({returnAmt >= 0 ? '+' : ''}{returnPct}%)
              </span>
            </div>
          )}

          {/* Units / Quantity & Institution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Units / Quantity (Optional)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                placeholder="e.g. 142.5 or 5 grams"
                value={unitsStr}
                onChange={(e) => setUnitsStr(e.target.value)}
                className="input text-sm w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Platform / Broker / Bank
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Groww, Zerodha, SBI"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="input text-sm w-full pl-8"
                />
                <Building2
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                />
              </div>
            </div>
          </div>

          {/* Portfolio Tag */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Portfolio Classification
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. Core Wealth, Retirement, Emergency"
                value={portfolio}
                onChange={(e) => setPortfolio(e.target.value)}
                className="input text-sm w-full pl-8"
              />
              <FolderKanban
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Monthly SIP active, folio number, lock-in period"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input text-sm w-full"
            />
          </div>

          {/* Submit / Cancel Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
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
              disabled={isSubmitting}
              className="btn-primary text-xs px-5 py-2 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Saving...' : 'Add Investment'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
