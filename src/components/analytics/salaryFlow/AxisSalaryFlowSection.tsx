import React, { useState, useMemo } from 'react'
import { Wallet } from 'lucide-react'
import type { Account, Transaction } from '@/types/finance'
import {
  calculateAxisSalaryFlow,
  getSalaryPeriodBounds,
  identifyAccounts,
  type SalaryPeriodPreset,
} from '@/lib/salaryFlowMath'
import { SalaryFlowSummaryCards } from './SalaryFlowSummaryCards'
import { SalaryAllocationChart } from './SalaryAllocationChart'
import { SalaryReconciliationCard } from './SalaryReconciliationCard'
import { DestinationAccountTracking } from './DestinationAccountTracking'
import { AxisTransactionsTable } from './AxisTransactionsTable'
import { DatePicker } from '@/components/ui/DatePicker'

interface AxisSalaryFlowSectionProps {
  accounts: Account[]
  transactions: Transaction[]
  onEditTransaction: (tx: Transaction) => void
}

export const AxisSalaryFlowSection: React.FC<AxisSalaryFlowSectionProps> = ({
  accounts,
  transactions,
  onEditTransaction,
}) => {
  const detected = useMemo(() => identifyAccounts(accounts), [accounts])

  // Selected primary salary account (defaults to Axis Bank)
  const [selectedAxisId, setSelectedAxisId] = useState<string>(() => {
    return detected.axis ? detected.axis.id : accounts[0]?.id || ''
  })

  // Selected reporting period preset
  const [periodPreset, setPeriodPreset] = useState<SalaryPeriodPreset>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Compute period bounds
  const periodBounds = useMemo(() => {
    return getSalaryPeriodBounds(periodPreset, customStart, customEnd)
  }, [periodPreset, customStart, customEnd])

  // Compute Axis salary flow metrics
  const flowSummary = useMemo(() => {
    return calculateAxisSalaryFlow({
      accounts,
      transactions,
      selectedAxisId,
      period: periodBounds,
    })
  }, [accounts, transactions, selectedAxisId, periodBounds])


  return (
    <section
      aria-label="Axis Salary Flow"
      className="space-y-6 pt-2 pb-6 border-y border-[var(--border)]"
    >
      {/* ── Section Header & Filter Controls ───────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center font-bold">
              <Wallet size={18} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
                Axis Salary Flow
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Track where your salary goes after it reaches Axis Bank
              </p>
            </div>
          </div>
        </div>

        {/* Account & Period Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Account Selector (allows user to confirm or choose primary salary account) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[var(--text-muted)]">Source:</span>
            <select
              value={selectedAxisId}
              onChange={(e) => setSelectedAxisId(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {accounts
                .filter((a) => a.isActive !== false)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type})
                  </option>
                ))}
            </select>
          </div>

          {/* Period Selector Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs">
            <button
              type="button"
              onClick={() => setPeriodPreset('this_month')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                periodPreset === 'this_month'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Current Month
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset('last_month')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                periodPreset === 'last_month'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Previous Month
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset('last_3_months')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                periodPreset === 'last_3_months'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Last 3M
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset('last_6_months')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                periodPreset === 'last_6_months'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Last 6M
            </button>
            <button
              type="button"
              onClick={() => setPeriodPreset('custom')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                periodPreset === 'custom'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Custom
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Range Pickers if selected */}
      {periodPreset === 'custom' && (
        <div className="p-3.5 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-wrap items-center gap-3 animate-fade-in text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-secondary)]">From:</span>
            <div className="w-36">
              <DatePicker value={customStart} onChange={setCustomStart} placeholder="Start date" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-secondary)]">To:</span>
            <div className="w-36">
              <DatePicker value={customEnd} onChange={setCustomEnd} placeholder="End date" />
            </div>
          </div>
          <span className="text-[11px] text-[var(--text-muted)] ml-auto">
            Reporting window: {periodBounds.startDate} to {periodBounds.endDate}
          </span>
        </div>
      )}

      {/* ── 1. Salary Flow Summary Metrics Cards ───────────── */}
      <SalaryFlowSummaryCards summary={flowSummary} />

      {/* ── 2. Visual Salary Allocation Breakdown Chart ───── */}
      <SalaryAllocationChart summary={flowSummary} />

      {/* ── 3. Monthly Reconciliation Waterfall & Savings ──── */}
      <SalaryReconciliationCard summary={flowSummary} />

      {/* ── 4. Destination Account Tracking (SBI & Federal) ── */}
      <DestinationAccountTracking summary={flowSummary} />

      {/* ── 5. Detailed Axis Transaction Breakdown Table ────── */}
      <AxisTransactionsTable
        transactions={flowSummary.classifiedTransactions}
        onEditTransaction={onEditTransaction}
      />
    </section>
  )
}
