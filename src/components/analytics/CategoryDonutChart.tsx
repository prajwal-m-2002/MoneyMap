import { useState } from 'react'
import { formatINR } from '@/lib/utils'
import type { CategorySpendingItem } from '@/types/finance'
import { PieChart as PieChartIcon } from 'lucide-react'

interface CategoryDonutChartProps {
  categories: CategorySpendingItem[]
  totalSpent: number
  isCoverageUnavailable?: boolean
}

const PALETTE = [
  '#10b981', // emerald
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#f97316', // orange
  '#64748b', // slate
]

export function CategoryDonutChart({ categories, totalSpent, isCoverageUnavailable }: CategoryDonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (isCoverageUnavailable) {
    return (
      <div className="card p-6 border border-[var(--border)] bg-[var(--bg-surface)] flex flex-col items-center justify-center min-h-[320px] text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
          <PieChartIcon size={24} />
        </div>
        <p className="text-sm font-bold text-[var(--text-primary)]">Ledger coverage unavailable</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs">
          Historical ledger tracking begins on October 10, 2026. No category breakdown exists for this period.
        </p>
      </div>
    )
  }

  const activeCategories = categories.filter((c) => c.totalSpent > 0)

  if (activeCategories.length === 0 || totalSpent === 0) {
    return (
      <div className="card p-6 border border-[var(--border)] bg-[var(--bg-surface)] flex flex-col items-center justify-center min-h-[320px] text-center">
        <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] mb-3">
          <PieChartIcon size={24} />
        </div>
        <p className="text-sm font-bold text-[var(--text-primary)]">No expense data to chart</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-xs">
          Record expenses to see your visual category distribution breakdown.
        </p>
      </div>
    )
  }

  // Pre-calculate SVG arcs
  // SVG size: 240x240, Center: 120, 120, Radius: 90, Inner Radius: 58 (donut hole)
  const size = 240
  const center = size / 2
  const radius = 90
  const innerRadius = 58

  let currentAngle = -Math.PI / 2 // Start from top (12 o'clock)

  const slices = activeCategories.map((cat, idx) => {
    const fraction = cat.totalSpent / totalSpent
    const angleSpan = fraction * 2 * Math.PI
    const startAngle = currentAngle
    const endAngle = currentAngle + angleSpan
    currentAngle = endAngle

    const color = PALETTE[idx % PALETTE.length]

    // Calculate arc coordinates
    const x1 = center + radius * Math.cos(startAngle)
    const y1 = center + radius * Math.sin(startAngle)
    const x2 = center + radius * Math.cos(endAngle)
    const y2 = center + radius * Math.sin(endAngle)

    const x3 = center + innerRadius * Math.cos(endAngle)
    const y3 = center + innerRadius * Math.sin(endAngle)
    const x4 = center + innerRadius * Math.cos(startAngle)
    const y4 = center + innerRadius * Math.sin(startAngle)

    const largeArcFlag = angleSpan > Math.PI ? 1 : 0

    // Path command for donut sector
    const pathData =
      activeCategories.length === 1
        ? `M ${center - radius} ${center} A ${radius} ${radius} 0 1 0 ${center + radius} ${center} A ${radius} ${radius} 0 1 0 ${center - radius} ${center} M ${center - innerRadius} ${center} A ${innerRadius} ${innerRadius} 0 1 1 ${center + innerRadius} ${center} A ${innerRadius} ${innerRadius} 0 1 1 ${center - innerRadius} ${center} Z`
        : `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`

    return {
      category: cat.category,
      amount: cat.totalSpent,
      percentage: cat.percentageOfTotal,
      color,
      pathData,
    }
  })

  const currentHovered = hoveredIdx !== null ? slices[hoveredIdx] : null

  return (
    <div className="card p-5 border border-[var(--border)] bg-[var(--bg-surface)] space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Category Outflow Share</h3>
          <p className="text-xs text-[var(--text-secondary)]">Proportionate breakdown of monthly spending</p>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
          {activeCategories.length} Categories
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-2">
        {/* Interactive SVG Donut */}
        <div className="relative w-[240px] h-[240px] shrink-0">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="w-full h-full transform transition-transform"
          >
            {slices.map((slice, idx) => {
              const isHovered = hoveredIdx === idx
              return (
                <path
                  key={slice.category}
                  d={slice.pathData}
                  fill={slice.color}
                  opacity={hoveredIdx === null || isHovered ? 1 : 0.45}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  stroke="var(--bg-surface)"
                  strokeWidth={2}
                />
              )
            })}
          </svg>

          {/* Donut Center Metrics */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)] truncate max-w-[110px]">
              {currentHovered ? currentHovered.category : 'Total Spent'}
            </span>
            <span className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] tabular mt-0.5 truncate max-w-[120px]">
              {currentHovered ? formatINR(currentHovered.amount) : formatINR(totalSpent)}
            </span>
            <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400 tabular">
              {currentHovered ? `${currentHovered.percentage}%` : '100%'}
            </span>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 w-full max-h-[220px] overflow-y-auto space-y-2 pr-1 text-xs">
          {slices.map((slice, idx) => {
            const isHovered = hoveredIdx === idx
            return (
              <div
                key={slice.category}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all cursor-pointer ${
                  isHovered
                    ? 'border-brand-500 bg-[var(--bg-subtle)] shadow-2xs'
                    : 'border-transparent hover:bg-[var(--bg-subtle)]/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="font-semibold text-[var(--text-primary)] truncate">
                    {slice.category}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-[var(--text-primary)] tabular">
                    {formatINR(slice.amount)}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] ml-1 tabular">
                    ({slice.percentage}%)
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
