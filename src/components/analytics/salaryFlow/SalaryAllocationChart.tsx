import React from 'react'
import { PieChart, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { AxisSalaryFlowSummary } from '@/lib/salaryFlowMath'
import { formatINR } from '@/lib/utils'

interface SalaryAllocationChartProps {
  summary: AxisSalaryFlowSummary
}

export const SalaryAllocationChart: React.FC<SalaryAllocationChartProps> = ({ summary }) => {
  const { salaryReceived, allocationBreakdown, netSalaryRemaining, percentSalaryRemaining } = summary

  const hasSalary = salaryReceived > 0

  const items = [
    ...allocationBreakdown,
    ...(hasSalary
      ? [
          {
            destination: 'Remaining in Axis',
            amount: netSalaryRemaining,
            percentage: percentSalaryRemaining ?? 0,
            color: '#10b981', // emerald-500
          },
        ]
      : []),
  ]

  return (
    <div className="card p-5 border border-[var(--border)] bg-[var(--bg-surface)] space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center">
            <PieChart size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Salary Allocation Breakdown
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Where each rupee of your {formatINR(salaryReceived)} salary went
            </p>
          </div>
        </div>

        {hasSalary ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            <CheckCircle2 size={13} />
            <span>100% of recorded salary mapped</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            <AlertCircle size={13} />
            <span>No salary credit recorded in this period</span>
          </div>
        )}
      </div>

      {hasSalary ? (
        <>
          {/* Stacked Proportional Bar */}
          <div className="w-full h-4 rounded-full overflow-hidden flex bg-[var(--bg-subtle)] border border-[var(--border)]">
            {items
              .filter((item) => item.percentage > 0)
              .map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    width: `${Math.max(item.percentage, 0)}%`,
                    backgroundColor: item.color,
                  }}
                  className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full hover:opacity-90"
                  title={`${item.destination}: ${formatINR(item.amount)} (${item.percentage}%)`}
                />
              ))}
          </div>

          {/* Allocation Legend & Metrics Grid (visible without hover) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {item.destination}
                    </p>
                    <p className="text-[11px] text-[var(--text-muted)] tabular font-medium">
                      {formatINR(item.amount)}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-extrabold text-[var(--text-primary)] tabular">
                    {item.percentage}%
                  </span>
                  <p className="text-[10px] text-[var(--text-muted)]">of salary</p>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="py-8 text-center text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)]">
          <p className="font-semibold text-[var(--text-secondary)]">No salary credit detected in {summary.period.label}.</p>
          <p className="text-[11px] mt-1">Select a different month or date range to view your salary allocation flow.</p>
        </div>
      )}
    </div>
  )
}
