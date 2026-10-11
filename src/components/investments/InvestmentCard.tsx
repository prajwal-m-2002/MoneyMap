import React, { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Edit2,
  Trash2,
  RefreshCw,
  FolderKanban,
} from 'lucide-react'
import type { Investment } from '@/types/finance'
import { ASSET_TYPE_METADATA } from '@/lib/portfolioMath'

interface InvestmentCardProps {
  investment: Investment
  onUpdateValue: (investment: Investment) => void
  onEdit: (investment: Investment) => void
  onDelete: (investment: Investment) => void
}

export const InvestmentCard: React.FC<InvestmentCardProps> = ({
  investment,
  onUpdateValue,
  onEdit,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const meta = ASSET_TYPE_METADATA[investment.assetType] || ASSET_TYPE_METADATA.other

  const gainLoss = investment.currentValue - investment.investedAmount
  const isProfit = gainLoss >= 0
  const gainLossPct =
    investment.investedAmount > 0
      ? Math.round(((gainLoss / investment.investedAmount) * 100) * 100) / 100
      : 0

  return (
    <div className="card p-5 hover:border-[var(--border-hover)] transition-all flex flex-col justify-between gap-4 relative">
      <div>
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: `${meta.color}15`,
                borderColor: `${meta.color}30`,
                color: meta.color,
              }}
            >
              {isProfit ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-base text-[var(--text-primary)] leading-tight">
                  {investment.name}
                </h3>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border"
                  style={{
                    backgroundColor: `${meta.color}10`,
                    borderColor: `${meta.color}25`,
                    color: meta.color,
                  }}
                >
                  {meta.shortLabel}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-1 flex-wrap">
                {investment.institution && (
                  <span className="flex items-center gap-1">
                    <Building2 size={12} className="text-[var(--text-muted)]" />
                    {investment.institution}
                  </span>
                )}
                {investment.portfolio && (
                  <span className="flex items-center gap-1 text-[var(--text-muted)]">
                    <FolderKanban size={12} />
                    {investment.portfolio}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              title="Options"
            >
              <span className="text-lg leading-none font-bold px-1">⋮</span>
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-8 w-36 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl py-1 z-30 animate-fade-in text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      onUpdateValue(investment)
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <RefreshCw size={13} /> Update Value
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      onEdit(investment)
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  >
                    <Edit2 size={13} /> Edit Asset
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      onDelete(investment)
                    }}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Investment Numbers Grid */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-[var(--border-subtle)]">
          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Invested</p>
            <p className="text-sm font-semibold text-[var(--text-secondary)] mt-0.5">
              ₹{investment.investedAmount.toLocaleString('en-IN')}
            </p>
          </div>

          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Current Value</p>
            <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">
              ₹{investment.currentValue.toLocaleString('en-IN')}
            </p>
          </div>

          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Returns</p>
            <div className="mt-0.5">
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                  isProfit
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-rose-500/10 text-rose-500'
                }`}
              >
                {isProfit ? '+' : ''}
                {gainLossPct}%
              </span>
              <p
                className={`text-[10px] font-medium mt-0.5 ${
                  isProfit ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {isProfit ? '+' : ''}₹{gainLoss.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>

        {/* Optional units / price specs */}
        {(investment.units != null || investment.currentPrice != null) && (
          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mt-2 pt-2 border-t border-[var(--border-subtle)]">
            {investment.units != null && (
              <span>Units: <strong>{investment.units}</strong></span>
            )}
            {investment.currentPrice != null && (
              <span>Price: <strong>₹{investment.currentPrice.toLocaleString('en-IN')}</strong></span>
            )}
          </div>
        )}
      </div>

      {/* Footer Info & Quick Update */}
      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
        <span className="flex items-center gap-1">
          <Calendar size={11} /> Updated: {investment.lastUpdated}
        </span>
        <button
          type="button"
          onClick={() => onUpdateValue(investment)}
          className="text-xs text-[var(--accent-primary)] hover:underline font-medium flex items-center gap-1"
        >
          <RefreshCw size={12} /> Update Value
        </button>
      </div>
    </div>
  )
}
