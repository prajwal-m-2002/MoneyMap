import React from 'react'
import { Sparkles, Plus } from 'lucide-react'
import type { RecurringSuggestion } from '@/types/finance'
import { formatINR } from '@/lib/utils'

interface SmartSuggestionsCardProps {
  suggestions: RecurringSuggestion[]
  onAccept: (suggestion: RecurringSuggestion) => void
}

export const SmartSuggestionsCard: React.FC<SmartSuggestionsCardProps> = ({
  suggestions,
  onAccept,
}) => {
  if (suggestions.length === 0) return null

  return (
    <div className="card p-5 space-y-4 border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            Smart Recurring Pattern Detection
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            MoneyMap detected recurring payment cadences in your historical records. Convert them to scheduled rules with 1 click.
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
          {suggestions.length} Detected
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suggestions.map((sug) => (
          <div
            key={sug.id}
            className="p-3.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-amber-500/30 transition-all flex flex-col justify-between gap-3 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[var(--text-primary)]">
                  {sug.title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                  {sug.confidence}% Match
                </span>
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                <span>Avg: <strong className="text-[var(--text-primary)]">{formatINR(sug.averageAmount)}</strong></span>
                <span>•</span>
                <span>~Day {sug.approximateDayOfMonth} of month</span>
                <span>•</span>
                <span>{sug.occurrencesCount} past times</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
              <span className="text-[10px] text-[var(--text-muted)]">
                Category: {sug.category}
              </span>
              <button
                type="button"
                onClick={() => onAccept(sug)}
                className="btn-primary text-[11px] px-3 py-1 flex items-center gap-1.5"
              >
                <Plus size={12} /> Convert to Rule
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
