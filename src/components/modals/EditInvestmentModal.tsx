import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, TrendingUp, AlertCircle, Building2, FolderKanban } from 'lucide-react'
import type { Investment, UpdateInvestmentInput, InvestmentAssetType } from '@/types/finance'
import { ASSET_TYPE_METADATA } from '@/lib/portfolioMath'

interface EditInvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdate: (id: string, input: UpdateInvestmentInput) => Promise<{ success: boolean; error?: string }>
  investment: Investment
}

const ASSET_TYPES: { type: InvestmentAssetType; label: string }[] = Object.entries(
  ASSET_TYPE_METADATA
).map(([key, val]) => ({
  type: key as InvestmentAssetType,
  label: val.label,
}))

export const EditInvestmentModal: React.FC<EditInvestmentModalProps> = ({
  isOpen,
  onClose,
  onUpdate,
  investment,
}) => {
  const [name, setName] = useState(investment.name)
  const [assetType, setAssetType] = useState<InvestmentAssetType>(investment.assetType)
  const [investedAmountStr, setInvestedAmountStr] = useState(String(investment.investedAmount))
  const [currentValueStr, setCurrentValueStr] = useState(String(investment.currentValue))
  const [unitsStr, setUnitsStr] = useState(investment.units != null ? String(investment.units) : '')
  const [institution, setInstitution] = useState(investment.institution || '')
  const [portfolio, setPortfolio] = useState(investment.portfolio || '')
  const [notes, setNotes] = useState(investment.notes || '')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name cannot be empty')
      return
    }

    const investedAmount = parseFloat(investedAmountStr)
    const currentValue = parseFloat(currentValueStr)

    if (isNaN(investedAmount) || investedAmount < 0) {
      setError('Please enter a valid invested amount')
      return
    }
    if (isNaN(currentValue) || currentValue < 0) {
      setError('Please enter a valid current value')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const units = unitsStr ? parseFloat(unitsStr) : undefined
      const res = await onUpdate(investment.id, {
        name: name.trim(),
        assetType,
        investedAmount,
        currentValue,
        units: units && !isNaN(units) ? units : null,
        institution: institution.trim() || null,
        portfolio: portfolio.trim() || null,
        notes: notes.trim() || null,
      })

      if (!res.success) {
        setError(res.error || 'Failed to update investment')
      } else {
        onClose()
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update investment')
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Edit Investment</h2>
              <p className="text-xs text-[var(--text-secondary)]">Modify asset details or holding quantities</p>
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
          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Asset Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input text-sm w-full"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Asset Category
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Invested Capital (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={investedAmountStr}
                onChange={(e) => setInvestedAmountStr(e.target.value)}
                className="input text-sm w-full"
                required
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Current Market Value (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={currentValueStr}
                onChange={(e) => setCurrentValueStr(e.target.value)}
                className="input text-sm w-full font-bold text-base"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Units / Quantity
              </label>
              <input
                type="number"
                step="any"
                value={unitsStr}
                onChange={(e) => setUnitsStr(e.target.value)}
                className="input text-sm w-full"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Platform / Broker
              </label>
              <div className="relative">
                <input
                  type="text"
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

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Portfolio Classification
            </label>
            <div className="relative">
              <input
                type="text"
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

          <div>
            <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input text-sm w-full"
            />
          </div>

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
              className="btn-primary text-xs px-5 py-2"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
