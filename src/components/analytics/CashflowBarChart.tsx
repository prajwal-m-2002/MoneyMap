import { useState, useMemo } from 'react'
import type { Transaction } from '@/types/finance'
import { formatINR } from '@/lib/utils'

interface CashflowBarChartProps {
  transactions: Transaction[]
  ledgerCoverageStartDate?: string
}

export function CashflowBarChart({
  transactions,
  ledgerCoverageStartDate = '2026-10-10',
}: CashflowBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const coverageMonthKey = ledgerCoverageStartDate.slice(0, 7)

  // Compute 6-month historical data
  const monthlyData = useMemo(() => {
    const now = new Date()
    const months: {
      key: string // YYYY-MM
      label: string // e.g. "May", "Jun"
      income: number
      expenses: number
      netSavings: number
      isBeforeCoverage: boolean
      isPartialCoverage: boolean
    }[] = []

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const y = d.getFullYear()
      const m = d.getMonth()
      const key = `${y}-${String(m + 1).padStart(2, '0')}`
      const label = new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(d)
      const isBeforeCoverage = key < coverageMonthKey
      const isPartialCoverage = key === coverageMonthKey

      let income = 0
      let expenses = 0

      if (!isBeforeCoverage) {
        for (const tx of transactions) {
          if (!tx.date) continue
          // Use prefix matching to avoid timezone offsets shifting day-1 transactions
          if (tx.date.startsWith(key)) {
            if (tx.type === 'income') {
              income += Number(tx.amount) || 0
            } else if (tx.type === 'expense') {
              const cat = (tx.category || '').toLowerCase()
              // Exclude investment contributions from consumption expenses
              if (!cat.includes('investment')) {
                expenses += Number(tx.amount) || 0
              }
            }
          }
        }
      }

      months.push({
        key,
        label,
        income,
        expenses,
        netSavings: income - expenses,
        isBeforeCoverage,
        isPartialCoverage,
      })
    }

    return months
  }, [transactions, coverageMonthKey])

  const hasData = useMemo(() => {
    return monthlyData.some((m) => m.income > 0 || m.expenses > 0)
  }, [monthlyData])

  // Find max value across all months for proportional scaling
  const maxVal = useMemo(() => {
    let peak = 1000
    for (const m of monthlyData) {
      if (m.income > peak) peak = m.income
      if (m.expenses > peak) peak = m.expenses
    }
    return Math.ceil(peak * 1.15) // 15% headroom
  }, [monthlyData])

  const chartHeight = 160 // px

  return (
    <div className="card p-5 border border-[var(--border)] bg-[var(--bg-surface)] space-y-4">
      {/* Header & Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">Income vs Expense Trend</h3>
          <p className="text-xs text-[var(--text-secondary)]">6-Month historical cashflow inflow vs outflow</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span className="text-[var(--text-secondary)]">Income</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span className="text-[var(--text-secondary)]">Expenses</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas or Empty State */}
      {!hasData ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium text-[var(--text-secondary)]">
            No income or expense data found in the past 6 months
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            As you record transactions, monthly cashflow trends and savings rates will appear here.
          </p>
        </div>
      ) : (
        <div className="pt-4">
          <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-[160px] border-b border-[var(--border)] pb-2 relative">
            {monthlyData.map((item, idx) => {
              const isHovered = hoveredIdx === idx
              const incomeH = Math.max(4, Math.round((item.income / maxVal) * chartHeight))
              const expenseH = Math.max(4, Math.round((item.expenses / maxVal) * chartHeight))

              return (
                <div
                  key={item.key}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="flex flex-col items-center justify-end h-full relative cursor-pointer group"
                >
                  {/* Floating Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-14 z-20 px-2.5 py-1.5 rounded-xl bg-zinc-900 text-white text-[10px] shadow-lg pointer-events-none whitespace-nowrap animate-scale-in text-center">
                      <p className="font-bold">{item.label}</p>
                      {item.isBeforeCoverage ? (
                        <p className="text-zinc-400 italic">Ledger coverage unavailable</p>
                      ) : (
                        <>
                          <p className="text-emerald-400">+{formatINR(item.income)}</p>
                          <p className="text-rose-400">-{formatINR(item.expenses)}</p>
                          {item.isPartialCoverage && (
                            <p className="text-amber-400 text-[9px] font-medium">Partial month coverage</p>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Bars Group */}
                  <div className="flex items-end gap-1 sm:gap-1.5 w-full justify-center max-w-[44px]">
                    {item.isBeforeCoverage ? (
                      <div className="w-full h-8 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-t-md flex items-center justify-center bg-zinc-100/50 dark:bg-zinc-800/30">
                        <span className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500">N/A</span>
                      </div>
                    ) : (
                      <>
                        {/* Income Bar */}
                        <div
                          style={{ height: `${incomeH}px` }}
                          className={`w-1/2 rounded-t-md transition-all duration-300 ${
                            item.income > 0 ? 'bg-emerald-500 group-hover:bg-emerald-400' : 'bg-zinc-200 dark:bg-zinc-800'
                          }`}
                        />
                        {/* Expense Bar */}
                        <div
                          style={{ height: `${expenseH}px` }}
                          className={`w-1/2 rounded-t-md transition-all duration-300 ${
                            item.expenses > 0 ? 'bg-rose-500 group-hover:bg-rose-400' : 'bg-zinc-200 dark:bg-zinc-800'
                          }`}
                        />
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* X-Axis Labels */}
          <div className="grid grid-cols-6 gap-2 sm:gap-4 pt-2 text-center text-xs">
            {monthlyData.map((item, idx) => (
              <div key={item.key} className="truncate">
                <span
                  className={`font-semibold ${
                    idx === 5
                      ? 'text-brand-600 dark:text-brand-400 font-bold'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {item.label}
                </span>
                {item.isBeforeCoverage ? (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500 italic truncate">
                    No ledger
                  </p>
                ) : (
                  <p className="text-[10px] text-[var(--text-muted)] tabular truncate">
                    {item.netSavings >= 0 ? `+${formatINR(item.netSavings)}` : `-${formatINR(Math.abs(item.netSavings))}`}
                    {item.isPartialCoverage && <span className="text-[9px] text-amber-500 ml-0.5">*</span>}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
