import { Building2, Landmark, ShoppingCart } from 'lucide-react'
import type { AxisSalaryFlowSummary } from '@/lib/salaryFlowMath'
import { formatINR } from '@/lib/utils'

interface DestinationAccountTrackingProps {
  summary: AxisSalaryFlowSummary
}

export const DestinationAccountTracking: React.FC<DestinationAccountTrackingProps> = ({
  summary,
}) => {
  const { sbiDetails, federalDetails, salaryReceived } = summary
  const hasSalary = salaryReceived > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Destination Account Allocation & Spend Tracking
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Transfers to SBI & Federal Bank are capital allocations — actual expenses are tracked independently
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── 1. SBI Allocation Card ───────────────────────── */}
        <div className="card p-4 sm:p-5 border border-[var(--border)] bg-[var(--bg-surface)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                <Building2 size={16} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">State Bank of India (SBI)</h4>
                <p className="text-[11px] text-[var(--text-muted)]">Operational & bill payment buffer</p>
              </div>
            </div>
            {hasSalary && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                {sbiDetails.percentageOfSalary}% of salary
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <span className="text-[11px] text-[var(--text-muted)]">Transferred from Axis</span>
              <p className="text-base font-extrabold text-[var(--text-primary)] mt-1 tabular">
                {formatINR(sbiDetails.transferredFromAxis)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Allocation received</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <ShoppingCart size={11} className="text-rose-500" /> Actual Expenses from SBI
              </span>
              <p className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-1 tabular">
                {formatINR(sbiDetails.actualExpensesFromSBI)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Real debits during period</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Unspent Transfer Allocation</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                Allocation minus actual SBI spend
              </p>
            </div>
            <span className="font-extrabold text-blue-600 dark:text-blue-400 tabular text-sm">
              {formatINR(sbiDetails.unspentAllocation)}
            </span>
          </div>

          <div className="pt-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Current Total SBI Balance:</span>
            <span className="font-bold text-[var(--text-primary)] tabular">
              {formatINR(sbiDetails.remainingBalance)}
            </span>
          </div>
        </div>

        {/* ── 2. Federal Bank Allocation Card ─────────────── */}
        <div className="card p-4 sm:p-5 border border-[var(--border)] bg-[var(--bg-surface)] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                <Landmark size={16} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Federal Bank</h4>
                <p className="text-[11px] text-[var(--text-muted)]">Daily expenses & transactions account</p>
              </div>
            </div>
            {hasSalary && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {federalDetails.percentageOfSalary}% of salary
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <span className="text-[11px] text-[var(--text-muted)]">Transferred from Axis</span>
              <p className="text-base font-extrabold text-[var(--text-primary)] mt-1 tabular">
                {formatINR(federalDetails.transferredFromAxis)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Allocation received</p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <span className="text-[11px] text-[var(--text-muted)] flex items-center gap-1">
                <ShoppingCart size={11} className="text-rose-500" /> Actual Expenses from Federal
              </span>
              <p className="text-base font-extrabold text-rose-600 dark:text-rose-400 mt-1 tabular">
                {formatINR(federalDetails.actualExpensesFromFederal)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Real debits during period</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Unspent Transfer Allocation</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                Allocation minus actual Federal spend
              </p>
            </div>
            <span className="font-extrabold text-purple-600 dark:text-purple-400 tabular text-sm">
              {formatINR(federalDetails.unspentAllocation)}
            </span>
          </div>

          <div className="pt-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Current Total Federal Balance:</span>
            <span className="font-bold text-[var(--text-primary)] tabular">
              {formatINR(federalDetails.remainingBalance)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
