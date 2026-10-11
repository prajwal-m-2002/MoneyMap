import React from 'react'
import {
  ArrowDownLeft,
  PiggyBank,
  Building2,
  Landmark,
  ShoppingBag,
  ExternalLink,
  Wallet,
  Clock,
} from 'lucide-react'
import type { AxisSalaryFlowSummary } from '@/lib/salaryFlowMath'
import { formatINR } from '@/lib/utils'

interface SalaryFlowSummaryCardsProps {
  summary: AxisSalaryFlowSummary
}

export const SalaryFlowSummaryCards: React.FC<SalaryFlowSummaryCardsProps> = ({ summary }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {/* 1. Salary Received */}
      <div className="card p-4 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Salary Received
          </span>
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ArrowDownLeft size={16} />
          </span>
        </div>
        <p className="text-xl sm:text-2xl font-extrabold tracking-tight mt-2 text-emerald-600 dark:text-emerald-400 tabular">
          {formatINR(summary.salaryReceived)}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          Credited to Axis in {summary.period.label}
        </p>
      </div>

      {/* 2. Transferred to Savings (Kotak) */}
      <div className="card p-4 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            To Kotak Savings
          </span>
          <span className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <PiggyBank size={16} />
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight tabular">
            {formatINR(summary.kotakSavingsGross)}
          </p>
          {summary.salaryReceived > 0 && (
            <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400 px-1.5 py-0.5 rounded-md bg-cyan-500/10">
              {summary.kotakSavingsDetails.percentageOfSalary}%
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          {summary.kotakSavingsReturned > 0
            ? `Net: ${formatINR(summary.kotakSavingsNet)} (₹${summary.kotakSavingsReturned.toLocaleString('en-IN')} returned)`
            : 'Dedicated savings allocation'}
        </p>
      </div>

      {/* 3. Transferred to SBI */}
      <div className="card p-4 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Transferred to SBI
          </span>
          <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Building2 size={16} />
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight tabular">
            {formatINR(summary.sbiTransfers)}
          </p>
          {summary.salaryReceived > 0 && (
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md bg-blue-500/10">
              {summary.sbiDetails.percentageOfSalary}%
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          SBI expenses: {formatINR(summary.sbiDetails.actualExpensesFromSBI)}
        </p>
      </div>

      {/* 4. Transferred to Federal Bank */}
      <div className="card p-4 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            To Federal Bank
          </span>
          <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Landmark size={16} />
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight tabular">
            {formatINR(summary.federalTransfers)}
          </p>
          {summary.salaryReceived > 0 && (
            <span className="text-xs font-bold text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-md bg-purple-500/10">
              {summary.federalDetails.percentageOfSalary}%
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          Federal expenses: {formatINR(summary.federalDetails.actualExpensesFromFederal)}
        </p>
      </div>

      {/* 5. Direct Axis Spending */}
      <div className="card p-4 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Direct Axis Spending
          </span>
          <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <ShoppingBag size={16} />
          </span>
        </div>
        <p className="text-xl sm:text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight mt-2 tabular">
          {formatINR(summary.directAxisExpenses)}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          Purchases, bills & EMIs debited from Axis
        </p>
      </div>

      {/* 6. Other Axis Outflows */}
      <div className="card p-4 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Other Axis Outflows
          </span>
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <ExternalLink size={16} />
          </span>
        </div>
        <p className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight mt-2 tabular">
          {formatINR(summary.otherOutflows)}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          Cash withdrawals (₹{summary.cashWithdrawals.toLocaleString('en-IN')}) & other transfers
        </p>
      </div>

      {/* 7. Net Salary Remaining */}
      <div className="card p-4 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Salary Remaining
          </span>
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Wallet size={16} />
          </span>
        </div>
        <div className="flex items-baseline gap-2 mt-2">
          <p className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight tabular">
            {formatINR(summary.netSalaryRemaining)}
          </p>
          {summary.percentSalaryRemaining !== null && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-md bg-emerald-500/10">
              {summary.percentSalaryRemaining}%
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          Unallocated from {summary.period.label} salary
        </p>
      </div>

      {/* 8. Axis Account Balance (Current vs Period End) */}
      <div className="card p-4 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            Axis Account Balance
          </span>
          <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Clock size={16} />
          </span>
        </div>
        <p className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] tracking-tight mt-2 tabular">
          {formatINR(summary.currentAxisBalance)}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center justify-between">
          <span>Live balance</span>
          <span className="font-semibold text-[var(--text-secondary)]">
            End of period: {formatINR(summary.historicalAxisBalanceAtEnd)}
          </span>
        </p>
      </div>
    </div>
  )
}
