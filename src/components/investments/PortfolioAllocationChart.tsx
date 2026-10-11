import React, { useState } from 'react'
import { PieChart, TrendingUp } from 'lucide-react'
import type { PortfolioAssetAllocationItem } from '@/types/finance'

interface PortfolioAllocationChartProps {
  allocations: PortfolioAssetAllocationItem[]
  totalCurrentValue: number
  overallGainPct: number
}

export const PortfolioAllocationChart: React.FC<PortfolioAllocationChartProps> = ({
  allocations,
  totalCurrentValue,
  overallGainPct,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (allocations.length === 0 || totalCurrentValue <= 0) {
    return (
      <div className="card p-5 flex flex-col items-center justify-center text-center py-10">
        <PieChart size={32} className="text-[var(--text-muted)] mb-2" />
        <p className="text-sm font-semibold text-[var(--text-secondary)]">No Investment Allocation Yet</p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Add assets to see your diversified portfolio distribution.
        </p>
      </div>
    )
  }

  // SVG Donut calculation
  const size = 220
  const center = size / 2
  const strokeWidth = 28
  const radius = center - strokeWidth / 2 - 4
  const circumference = 2 * Math.PI * radius

  let cumulativeOffset = 0
  const arcs = allocations.map((item, idx) => {
    const fraction = item.percentageOfPortfolio / 100
    const strokeDasharray = `${fraction * circumference} ${circumference}`
    const strokeDashoffset = -cumulativeOffset * circumference
    cumulativeOffset += fraction
    return {
      ...item,
      idx,
      strokeDasharray,
      strokeDashoffset,
    }
  })

  const activeItem = hoveredIdx !== null ? allocations[hoveredIdx] : null

  return (
    <div className="card p-5 flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm text-[var(--text-primary)] flex items-center gap-2">
          <PieChart size={16} className="text-[var(--accent-primary)]" />
          Portfolio Asset Allocation
        </h3>
        <span className="text-xs text-[var(--text-muted)] font-medium">
          {allocations.length} Asset Classes
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-2">
        {/* SVG Donut */}
        <div className="relative w-[220px] h-[220px] shrink-0">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90"
          >
            {/* Background ring */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--bg-subtle)"
              strokeWidth={strokeWidth}
            />

            {/* Allocation arcs */}
            {arcs.map((arc) => (
              <circle
                key={arc.assetType}
                cx={center}
                cy={center}
                r={radius}
                fill="transparent"
                stroke={arc.color}
                strokeWidth={hoveredIdx === arc.idx ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={arc.strokeDasharray}
                strokeDashoffset={arc.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(arc.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            ))}
          </svg>

          {/* Center Info */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
            {activeItem ? (
              <>
                <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                  {activeItem.label}
                </p>
                <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                  ₹{activeItem.totalCurrentValue.toLocaleString('en-IN')}
                </p>
                <p className="text-xs font-semibold text-emerald-500 mt-0.5">
                  {activeItem.percentageOfPortfolio}% share
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                  Portfolio Value
                </p>
                <p className="text-lg font-black text-[var(--text-primary)] mt-0.5">
                  ₹{totalCurrentValue.toLocaleString('en-IN')}
                </p>
                <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-500 mt-0.5">
                  <TrendingUp size={11} /> +{overallGainPct}%
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 w-full space-y-2">
          {allocations.map((item, idx) => (
            <div
              key={item.assetType}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`p-2 rounded-xl transition-all flex items-center justify-between text-xs cursor-pointer border ${
                hoveredIdx === idx
                  ? 'bg-[var(--bg-subtle)] border-[var(--border-hover)]'
                  : 'border-transparent hover:bg-[var(--bg-subtle)]/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-md shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-[var(--text-secondary)]">
                  {item.label}
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold text-[var(--text-primary)]">
                  ₹{item.totalCurrentValue.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-[var(--text-muted)] ml-1.5 font-medium">
                  ({item.percentageOfPortfolio}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
