import {
  Scale,
  Minus,
  Plus,
  Equal,
  Info,
  PiggyBank,
  CheckCircle2,
} from 'lucide-react'
import type { AxisSalaryFlowSummary } from '@/lib/salaryFlowMath'
import { formatINR } from '@/lib/utils'

interface SalaryReconciliationCardProps {
  summary: AxisSalaryFlowSummary
}

export const SalaryReconciliationCard: React.FC<SalaryReconciliationCardProps> = ({ summary }) => {
  const {
    salaryReceived,
    kotakSavingsGross,
    sbiTransfers,
    federalTransfers,
    otherOutflows,
    directAxisExpenses,
    netSalaryRemaining,
    percentSalaryRemaining,
    currentAxisBalance,
    kotakSavingsDetails,
  } = summary

  const hasSalary = salaryReceived > 0

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── 1. Monthly Salary Reconciliation Waterfall ─────── */}
      <div className="card p-5 border border-[var(--border)] bg-[var(--bg-surface)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Scale size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Salary Reconciliation Waterfall
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Formula: Salary Received − Outgoing Allocations & Expenses
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
            {summary.period.label}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {/* Step 1: Salary Received */}
          <div className="p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Plus size={13} /> Salary Credited to Axis
            </span>
            <span className="font-bold text-emerald-700 dark:text-emerald-400 tabular text-sm">
              +{formatINR(salaryReceived)}
            </span>
          </div>

          {/* Step 2: Kotak Savings */}
          <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Minus size={13} className="text-rose-500" /> Transferred to Kotak Savings
            </span>
            <span className="font-semibold text-[var(--text-primary)] tabular">
              −{formatINR(kotakSavingsGross)}
            </span>
          </div>

          {/* Step 3: SBI Allocation */}
          <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Minus size={13} className="text-rose-500" /> Transferred to SBI
            </span>
            <span className="font-semibold text-[var(--text-primary)] tabular">
              −{formatINR(sbiTransfers)}
            </span>
          </div>

          {/* Step 4: Federal Allocation */}
          <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Minus size={13} className="text-rose-500" /> Transferred to Federal Bank
            </span>
            <span className="font-semibold text-[var(--text-primary)] tabular">
              −{formatINR(federalTransfers)}
            </span>
          </div>

          {/* Step 5: Direct Axis Expenses */}
          <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              <Minus size={13} className="text-rose-500" /> Direct Axis Purchases, Bills & EMIs
            </span>
            <span className="font-semibold text-[var(--text-primary)] tabular">
              −{formatINR(directAxisExpenses)}
            </span>
          </div>

          {/* Step 6: Other Outflows */}
          {otherOutflows > 0 && (
            <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between">
              <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
                <Minus size={13} className="text-rose-500" /> Other Transfers & Cash Withdrawals
              </span>
              <span className="font-semibold text-[var(--text-primary)] tabular">
                −{formatINR(otherOutflows)}
              </span>
            </div>
          )}

          {/* Final Step: Net Salary Remaining */}
          <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-between mt-2">
            <div>
              <span className="font-bold text-brand-700 dark:text-brand-300 flex items-center gap-1.5">
                <Equal size={14} /> Net Salary Remaining
              </span>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                Unallocated portion of this period's salary
              </p>
            </div>
            <div className="text-right">
              <span className="font-extrabold text-brand-700 dark:text-brand-300 tabular text-sm">
                {formatINR(netSalaryRemaining)}
              </span>
              {hasSalary && (
                <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400">
                  {percentSalaryRemaining}% of salary
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Ledger Distinction Note */}
        <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-[var(--text-secondary)] flex items-start gap-2">
          <Info size={15} className="shrink-0 mt-0.5 text-blue-500" />
          <div>
            <p className="font-semibold text-[var(--text-primary)]">
              Ledger Accounting Note
            </p>
            <p className="opacity-90 mt-0.5 leading-relaxed">
              <strong>Net Salary Remaining ({formatINR(netSalaryRemaining)})</strong> measures period salary allocation only. It does not replace the actual live Axis Bank balance (<strong>{formatINR(currentAxisBalance)}</strong>), which also reflects baseline opening balances and accumulated funds from previous periods.
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Dedicated Savings Analysis ────────────────────── */}
      <div className="card p-5 border border-[var(--border)] bg-[var(--bg-surface)] space-y-4 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center">
                <PiggyBank size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Kotak Savings Pool Analysis
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Tracking deliberate savings transfers and net contributions
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              Savings Goal
            </span>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                <p className="text-[11px] text-[var(--text-muted)]">Gross Transferred to Kotak</p>
                <p className="text-base font-extrabold text-[var(--text-primary)] mt-1 tabular">
                  {formatINR(kotakSavingsGross)}
                </p>
                <p className="text-[10px] text-cyan-600 dark:text-cyan-400 mt-0.5 font-semibold">
                  {hasSalary ? `${kotakSavingsDetails.percentageOfSalary}% of salary` : 'N/A'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                <p className="text-[11px] text-[var(--text-muted)]">Transfers Returned to Axis</p>
                <p className="text-base font-extrabold text-[var(--text-primary)] mt-1 tabular">
                  {formatINR(kotakSavingsDetails.returnedTransfers)}
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Money moved back
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
              <div>
                <p className="font-bold text-cyan-800 dark:text-cyan-300">
                  Net Period Savings Allocation
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Gross transfers minus returns
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-cyan-800 dark:text-cyan-300 tabular">
                  {formatINR(kotakSavingsDetails.netSavings)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">
                Current Kotak Bank Balance
              </span>
              <span className="font-bold text-[var(--text-primary)] tabular text-sm">
                {formatINR(kotakSavingsDetails.remainingBalance)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
          <CheckCircle2 size={14} className="text-cyan-500 shrink-0" />
          <span>
            Savings transfers are strictly treated as asset allocations, never as expenses.
          </span>
        </div>
      </div>
    </div>
  )
}
