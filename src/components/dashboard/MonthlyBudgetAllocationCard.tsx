import { useState, useMemo } from 'react'
import {
  Banknote,
  Settings2,
  CheckCircle2,
  ShieldCheck,
  PiggyBank,
  Landmark,
  ShoppingBag,
  Coins,
  Wallet,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  PlusCircle,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { formatINR } from '@/lib/utils'
import type { MonthlyBudgetPlan, Account } from '@/types/finance'
import {
  getDefaultMonthlyBudgetPlan,
} from '@/lib/monthlyBudgetMath'
import {
  calculateMonthlyCycleOverview,
  getPreviousMonthStr,
  getNextMonthStr,
  getMonthlyPlanStorageKey,
} from '@/lib/monthlyCycleMath'
import { EditBudgetAllocationModal } from '@/components/modals/EditBudgetAllocationModal'
import { TransferAllocationModal } from '@/components/modals/TransferAllocationModal'
import { RecordSalaryModal } from '@/components/modals/RecordSalaryModal'

export function MonthlyBudgetAllocationCard() {
  const { accounts, transactions } = useFinance()

  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), [])
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [transferTargetAccount, setTransferTargetAccount] = useState<Account | undefined>(undefined)
  const [transferSuggestedAmount, setTransferSuggestedAmount] = useState<number>(0)
  const [transferCategoryTitle, setTransferCategoryTitle] = useState<string>('')

  const [isRecordSalaryModalOpen, setIsRecordSalaryModalOpen] = useState(false)

  // Load persisted plan for selected month, or fallback to default
  const [plan, setPlan] = useState<MonthlyBudgetPlan>(() => {
    try {
      const stored = localStorage.getItem(getMonthlyPlanStorageKey(selectedMonth))
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && Array.isArray(parsed.allocations)) {
          return parsed
        }
      }
    } catch {
      // ignore
    }
    return getDefaultMonthlyBudgetPlan(accounts, 27000, selectedMonth)
  })

  // Whenever selectedMonth changes, update plan state
  const handleSelectMonth = (newMonth: string) => {
    setSelectedMonth(newMonth)
    try {
      const stored = localStorage.getItem(getMonthlyPlanStorageKey(newMonth))
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && Array.isArray(parsed.allocations)) {
          setPlan(parsed)
          return
        }
      }
    } catch {
      // ignore
    }
    setPlan(getDefaultMonthlyBudgetPlan(accounts, 27000, newMonth))
  }

  // Handle plan save
  const handleSavePlan = (newPlan: MonthlyBudgetPlan) => {
    setPlan(newPlan)
    try {
      localStorage.setItem(getMonthlyPlanStorageKey(selectedMonth), JSON.stringify(newPlan))
    } catch {
      // ignore
    }
  }

  // Calculate comprehensive recurring monthly cycle overview
  const cycleOverview = useMemo(() => {
    return calculateMonthlyCycleOverview(selectedMonth, accounts, transactions, plan)
  }, [selectedMonth, accounts, transactions, plan])

  const getItemIcon = (key: string) => {
    switch (key) {
      case 'kotak_savings':
        return <PiggyBank size={16} className="text-emerald-500" />
      case 'sbi_emi_spending':
        return <Landmark size={16} className="text-blue-500" />
      case 'federal_purchases':
        return <ShoppingBag size={16} className="text-purple-500" />
      case 'cash_spending':
        return <Coins size={16} className="text-amber-500" />
      case 'axis_retained':
      default:
        return <Wallet size={16} className="text-cyan-500" />
    }
  }

  const handleOpenTransfer = (
    targetAccountId?: string,
    suggestedAmt?: number,
    title?: string
  ) => {
    const acc = accounts.find((a) => a.id === targetAccountId)
    setTransferTargetAccount(acc)
    setTransferSuggestedAmount(suggestedAmt || 0)
    setTransferCategoryTitle(title || '')
    setIsTransferModalOpen(true)
  }

  const axisAccount = accounts.find(
    (a) => a.name.toLowerCase().includes('axis') || a.type === 'salary'
  )

  return (
    <div className="card p-5 sm:p-6 border border-[var(--border)] bg-[var(--bg-surface)] space-y-5 shadow-sm">
      {/* ── Header with Month Selector ─────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <Banknote size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-extrabold text-[var(--text-primary)] tracking-tight">
                Monthly Salary & Account Allocation Cycle
              </h2>
              {cycleOverview.isSalaryCredited ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 size={11} />
                  Salary Credited ({formatINR(cycleOverview.actualSalaryReceived)})
                  {cycleOverview.salaryCreditDate && (
                    <span className="opacity-80">on {cycleOverview.salaryCreditDate}</span>
                  )}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <AlertCircle size={11} />
                  Salary Pending / Uncredited
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Cycle: {cycleOverview.bounds.startDate} to {cycleOverview.bounds.endDate} ({cycleOverview.bounds.lastDay} calendar days)
            </p>
          </div>
        </div>

        {/* Month Selector & Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => handleSelectMonth(getPreviousMonthStr(selectedMonth))}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
              title="Previous Month"
            >
              <ChevronLeft size={14} />
            </button>
            <div className="px-2.5 py-1 font-bold text-[var(--text-primary)] flex items-center gap-1">
              <Calendar size={12} className="text-brand-500" />
              <span>{cycleOverview.monthLabel}</span>
            </div>
            <button
              type="button"
              onClick={() => handleSelectMonth(getNextMonthStr(selectedMonth))}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]"
              title="Next Month"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <Settings2 size={14} />
            <span>Plan Budget</span>
          </button>

          {!cycleOverview.isSalaryCredited && (
            <button
              type="button"
              onClick={() => setIsRecordSalaryModalOpen(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <PlusCircle size={14} />
              <span>Record Salary</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Monthly Overview 9-Point Financial Summary ────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs">
        {/* 1. Previous Month Closing */}
        <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)] block">1. Prev Month Closing</span>
          <span className="font-extrabold text-[var(--text-primary)] text-sm tabular">
            {formatINR(cycleOverview.previousMonthClosingBalance)}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5 truncate">
            As of month-end
          </span>
        </div>

        {/* 2. Current Month Opening */}
        <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)] block">2. Current Month Opening</span>
          <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm tabular">
            {formatINR(cycleOverview.currentMonthOpeningBalance)}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
            ✓ Carried Forward
          </span>
        </div>

        {/* 3. Actual Salary Received */}
        <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)] block">3. Actual Salary</span>
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm tabular">
            {formatINR(cycleOverview.actualSalaryReceived)}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5 truncate">
            {cycleOverview.isSalaryCredited
              ? `Credited on ${cycleOverview.salaryCreditDate?.slice(5)}`
              : 'Delayed / Pending'}
          </span>
        </div>

        {/* 4. Actual Transfers Completed */}
        <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)] block">4. Transfers Completed</span>
          <span className="font-extrabold text-brand-600 dark:text-brand-400 text-sm tabular">
            {formatINR(cycleOverview.actualTransfersCompletedTotal)}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
            Internal transfers
          </span>
        </div>

        {/* 5. Actual Spending & Purchases */}
        <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <span className="text-[10px] text-[var(--text-muted)] block">5. Actual Spending</span>
          <span className="font-extrabold text-rose-600 dark:text-rose-400 text-sm tabular">
            {formatINR(cycleOverview.actualSpendingTotal)}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
            Purchases & expenses
          </span>
        </div>
      </div>

      {/* ── Carry-Forward & Month-End Closing Row ─────────────── */}
      <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
          <span className="text-[var(--text-secondary)]">
            <strong>Accounting Guarantee:</strong> Opening balances are not income. Carry-forward balances are never treated as new income or expenses. Internal transfers leave consolidated funds unchanged.
          </span>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <span className="text-[10px] text-[var(--text-muted)] block">
              {cycleOverview.closingBalanceLabel}
            </span>
            <span className="font-extrabold text-[var(--text-primary)] text-sm tabular">
              {formatINR(cycleOverview.monthEndClosingBalance)}
            </span>
          </div>
          {!cycleOverview.isMonthEnded && cycleOverview.projectedMonthEndBalance !== undefined && (
            <div className="pl-3 border-l border-[var(--border)]">
              <span className="text-[10px] text-[var(--text-muted)] block">Projected Month-End</span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm tabular">
                {formatINR(cycleOverview.projectedMonthEndBalance)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Current Balances by Account ──────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)] px-1">
          <span>
            Account Balances & Flow (Opening → Net Inflows/Transfers → {cycleOverview.isMonthEnded ? 'Month-End Closing' : 'MTD Closing'})
          </span>
          <span className="tabular">Combined Live: {formatINR(cycleOverview.currentBalancesTotal)}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {cycleOverview.accounts.map((accRes) => {
            const acc = accounts.find((a) => a.id === accRes.accountId)
            return (
              <div
                key={accRes.accountId}
                className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-brand-500/30 transition-all space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {accRes.accountName}
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {acc?.type}
                  </span>
                </div>

                <div className="space-y-0.5 text-[11px]">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Opening:</span>
                    <span className="font-semibold tabular">{formatINR(accRes.openingBalance)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Inflows/Transfers:</span>
                    <span className="font-semibold tabular">+{formatINR(accRes.inflows)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>Outflows/Spent:</span>
                    <span className="font-semibold tabular">-{formatINR(accRes.outflows)}</span>
                  </div>
                  <div className="pt-1 border-t border-[var(--border)] flex justify-between font-bold text-[var(--text-primary)]">
                    <span>Closing:</span>
                    <span className="tabular">{formatINR(accRes.closingBalance)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Planned vs Actual Budget Allocation ──────────────── */}
      <div className="space-y-3 pt-2 border-t border-[var(--border)]">
        <div className="flex items-center justify-between text-xs font-bold">
          <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
            <ArrowRightLeft size={14} className="text-brand-500" />
            <span>Planned vs Actual Budget Allocations</span>
          </div>
          <span className="text-[var(--text-secondary)] tabular">
            Total Planned: {formatINR(cycleOverview.plannedAllocationsTotal)} | Funded: {formatINR(cycleOverview.plannedVsActualSummary.totalTransferred)}
          </span>
        </div>

        {/* Stacked Visual Bar */}
        <div className="w-full h-3 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] overflow-hidden flex">
          {cycleOverview.budgetAllocations.map((item) => {
            const widthPct =
              cycleOverview.plannedAllocationsTotal > 0
                ? Math.round((item.plannedAmount / cycleOverview.plannedAllocationsTotal) * 100)
                : 0
            return (
              <div
                key={item.id}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: item.color,
                }}
                className="h-full transition-all duration-300"
                title={`${item.name}: ${formatINR(item.plannedAmount)} (${widthPct}%)`}
              />
            )
          })}
        </div>

        {/* Itemized Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {cycleOverview.budgetAllocations.map((item) => {
            const isFunded = item.actualOutflow >= item.plannedAmount
            const isRetained = item.categoryKey === 'axis_retained'

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:border-brand-500/40 transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-[var(--bg-subtle)] shrink-0">
                      {getItemIcon(item.categoryKey)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">
                        Target: {item.targetAccountName || 'Operational'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      item.status === 'exceeded'
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        : isFunded || item.status === 'on_track'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {isFunded ? '100% Funded' : `${item.percentUsed}% Funded`}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, item.percentUsed)}%`,
                      backgroundColor: item.color,
                    }}
                    className="h-full rounded-full transition-all duration-300"
                  />
                </div>

                {/* Metrics & Quick Transfer Button */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--border)]">
                  <div>
                    <span className="text-[9px] text-[var(--text-muted)] block">Planned</span>
                    <span className="font-bold text-[var(--text-primary)] tabular">
                      {formatINR(item.plannedAmount)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--text-muted)] block">Transferred</span>
                    <span className="font-bold text-brand-600 dark:text-brand-400 tabular">
                      {formatINR(item.actualOutflow)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--text-muted)] block">Remaining</span>
                    <span
                      className={`font-bold tabular ${
                        item.remainingAmount <= 0 ? 'text-emerald-500' : 'text-amber-500'
                      }`}
                    >
                      {item.remainingAmount <= 0 ? '₹0' : formatINR(item.remainingAmount)}
                    </span>
                  </div>
                </div>

                {/* Action button: Transfer Allocation */}
                {!isRetained && item.targetAccountId && (
                  <button
                    type="button"
                    onClick={() =>
                      handleOpenTransfer(
                        item.targetAccountId,
                        item.remainingAmount > 0 ? item.remainingAmount : item.plannedAmount,
                        item.name
                      )
                    }
                    className="w-full mt-1 py-1 px-2 text-[10px] font-semibold rounded-lg border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-brand-500 hover:text-white hover:border-brand-500 transition-colors flex items-center justify-center gap-1"
                  >
                    <ArrowRightLeft size={11} />
                    <span>
                      {isFunded ? 'Transfer Additional' : 'Transfer Allocation'}
                    </span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Edit Budget Plan Modal */}
      <EditBudgetAllocationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentPlan={plan}
        accounts={accounts}
        onSave={handleSavePlan}
      />

      {/* Execute Allocation Transfer Modal */}
      <TransferAllocationModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        targetAccount={transferTargetAccount}
        suggestedAmount={transferSuggestedAmount}
        categoryTitle={transferCategoryTitle}
      />

      {/* Record Salary Modal */}
      <RecordSalaryModal
        isOpen={isRecordSalaryModalOpen}
        onClose={() => setIsRecordSalaryModalOpen(false)}
        defaultDate={cycleOverview.bounds.endDate}
        defaultAmount={plan.expectedSalary || 27000}
        axisAccount={axisAccount}
      />
    </div>
  )
}
