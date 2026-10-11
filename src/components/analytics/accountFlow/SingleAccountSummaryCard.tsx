import React, { useState, useMemo } from 'react'
import {
  Building2,
  Landmark,
  Coins,
  Wallet,
  ChevronDown,
  ChevronUp,
  Search,
  Edit3,
  PiggyBank,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  CreditCard,
  Info,
  Banknote,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import type { SingleAccountFlowSummary } from '@/lib/consolidatedFlowMath'
import type { Transaction } from '@/types/finance'
import { formatINR } from '@/lib/utils'

interface SingleAccountSummaryCardProps {
  summary: SingleAccountFlowSummary
  onEditTransaction?: (tx: Transaction) => void
  totalSalaryReceived?: number
  defaultExpanded?: boolean
}

export const SingleAccountSummaryCard: React.FC<SingleAccountSummaryCardProps> = ({
  summary,
  onEditTransaction,
  defaultExpanded = false,
}) => {
  const [isTableExpanded, setIsTableExpanded] = useState(defaultExpanded)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow' | 'transfer'>('all')
  const [sortField, setSortField] = useState<'date' | 'amount'>('date')
  const [sortAsc, setSortAsc] = useState(false)

  const {
    account,
    openingBalance,
    isPeriodPartiallyCovered = false,
    partialCoverageNotice,
    effectiveOpeningDate,
    ledgerCoverageStartDate,
    hasHistoricalDataWarning = false,
    historicalWarningMessage,
    externalMoneyReceived,
    salaryReceived,
    otherIncomeReceived,
    transfersIn,
    transfersFromAxis,
    transfersOut,
    transfersToKotak,
    transfersToSBI,
    transfersToFederal,
    transfersToCash,
    otherTransfersOut,
    actualExpenses,
    directExpenses,
    emiExpenses,
    otherOutflows,
    closingBalance,
    liveBalance,
    isReconciled,
    isStatementReconciled = false,
    allocationBreakdown,
    transactions,
    kotakSavingsAnalysis,
  } = summary

  // Icon based on account type/name
  const getAccountIcon = () => {
    const name = account.name.toLowerCase()
    if (account.type === 'cash' || /cash/i.test(name)) {
      return <Coins size={20} className="text-amber-500" />
    }
    if (/axis/i.test(name) || account.type === 'salary') {
      return <Wallet size={20} className="text-emerald-500" />
    }
    if (/kotak/i.test(name)) {
      return <PiggyBank size={20} className="text-rose-500" />
    }
    if (/sbi|state bank/i.test(name)) {
      return <Landmark size={20} className="text-blue-500" />
    }
    if (/federal/i.test(name)) {
      return <Building2 size={20} className="text-purple-500" />
    }
    return <CreditCard size={20} className="text-brand-500" />
  }

  // Filtered & sorted transactions for the table
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        if (filterType === 'inflow' && tx.isOutflow) return false
        if (filterType === 'outflow' && !tx.isOutflow) return false
        if (filterType === 'transfer' && tx.type !== 'transfer') return false

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase()
          return (
            tx.description.toLowerCase().includes(q) ||
            tx.destinationOrSource.toLowerCase().includes(q) ||
            tx.classification.toLowerCase().includes(q) ||
            tx.amount.toString().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => {
        if (sortField === 'date') {
          const cmp = a.date.localeCompare(b.date)
          return sortAsc ? cmp : -cmp
        } else {
          return sortAsc ? a.amount - b.amount : b.amount - a.amount
        }
      })
  }, [transactions, searchQuery, filterType, sortField, sortAsc])

  const isAxis = /axis/i.test(account.name) || account.type === 'salary'
  const isKotak = /kotak/i.test(account.name)
  const isSBI = /sbi|state bank/i.test(account.name)
  const isFederal = /federal/i.test(account.name)
  const isCash = account.type === 'cash' || /cash/i.test(account.name)

  return (
    <div className="card border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden transition-all shadow-xs">
      {/* ── 1. Account Header Banner ────────────────────────── */}
      <div className="p-5 sm:p-6 bg-[var(--bg-surface)] border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-center shrink-0">
            {getAccountIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)]">
                {account.name}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)]">
                {account.type}
              </span>
              {account.accountNumber && (
                <span className="text-xs text-[var(--text-muted)] font-mono">
                  {account.accountNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isAxis && 'Primary salary receiving account & main fund distribution hub'}
              {isKotak && 'Primary savings account & dedicated savings accumulation'}
              {isSBI && 'Used for EMI payments and daily small purchases'}
              {isFederal && 'Used for larger purchases and lifestyle spending'}
              {isCash && 'Physical liquid cash wallet for offline direct payments'}
              {!isAxis && !isKotak && !isSBI && !isFederal && !isCash && 'Active bank account / asset ledger'}
            </p>
          </div>
        </div>

        {/* Live vs Closing Balance display */}
        <div className="flex items-center gap-4 self-start md:self-auto">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              {summary.isPeriodEndingInFuture ? 'Reconciled Balance' : 'Period Closing Balance'}
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tabular block">
              {formatINR(closingBalance)}
            </span>
            <span className="text-[10px] text-[var(--text-muted)] block">
              {summary.isPeriodEndingInFuture
                ? `As of ${summary.asOfDate} • Live: ${formatINR(liveBalance)}`
                : `Live Balance: ${formatINR(liveBalance)}`}
            </span>
            {hasHistoricalDataWarning ? (
              <span className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold block mt-0.5">
                Historical Incomplete
              </span>
            ) : isStatementReconciled ? (
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                ✓ Bank statement reconciled
              </span>
            ) : isPeriodPartiallyCovered ? (
              <span className="text-[9px] text-brand-600 dark:text-brand-400 font-semibold block mt-0.5">
                Internal ledger balanced (Partial)
              </span>
            ) : isReconciled ? (
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                ✓ Internal ledger balanced
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setIsTableExpanded(!isTableExpanded)}
            className="p-2 rounded-xl bg-[var(--bg-subtle)] hover:bg-[var(--bg-muted)] border border-[var(--border)] text-[var(--text-secondary)] transition-colors"
            title={isTableExpanded ? 'Collapse transaction table' : 'Expand transaction table'}
          >
            {isTableExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Historical Data Warning Banner if applicable */}
        {hasHistoricalDataWarning && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
            <AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
            <span>{historicalWarningMessage || 'Historical ledger records prior to account initialization are unavailable.'}</span>
          </div>
        )}

        {/* Informative Note for Partial Coverage Period */}
        {isPeriodPartiallyCovered && !hasHistoricalDataWarning && (
          <div className="p-3 rounded-xl bg-brand-500/5 border border-brand-500/20 text-[11px] text-[var(--text-secondary)] flex items-center gap-2">
            <Info size={14} className="text-brand-500 shrink-0" />
            <span>
              {partialCoverageNotice || `Account balance effective ${effectiveOpeningDate} (Start of Day). Historical transactions prior to ${ledgerCoverageStartDate || effectiveOpeningDate} are unrecorded.`}
            </span>
          </div>
        )}

        {/* ── 2. Metric Cards Grid (Opening, External Inflow, Transfers In/Out, Expenses, Closing) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Opening Balance */}
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Opening Balance
            </span>
            <p className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] mt-1 tabular">
              {formatINR(openingBalance)}
            </p>
            {isPeriodPartiallyCovered ? (
              <span className="text-[9px] text-brand-600 dark:text-brand-400 block font-medium leading-tight">
                Effective {effectiveOpeningDate} (Start of Day)
              </span>
            ) : (
              <span className="text-[9px] text-[var(--text-muted)] block">
                At period start
              </span>
            )}
          </div>

          {/* 2. External Money Received */}
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                External Money
              </span>
              <ArrowDownLeft size={14} className="text-emerald-500" />
            </div>
            <p className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular">
              +{formatINR(externalMoneyReceived)}
            </p>
            {salaryReceived > 0 && (
              <span className="text-[9px] text-[var(--text-muted)] block">
                Salary: {formatINR(salaryReceived)}
              </span>
            )}
            {otherIncomeReceived > 0 && (
              <span className="text-[9px] text-[var(--text-muted)] block">
                Other Inflow: {formatINR(otherIncomeReceived)}
              </span>
            )}
            {externalMoneyReceived === 0 && (
              <span className="text-[9px] text-[var(--text-muted)] block">
                No external inflow
              </span>
            )}
          </div>

          {/* 3. Transfers In */}
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Transfers In
            </span>
            <p className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] mt-1 tabular">
              +{formatINR(transfersIn)}
            </p>
            {transfersFromAxis > 0 ? (
              <span className="text-[9px] text-[var(--text-muted)] block">
                From Axis: {formatINR(transfersFromAxis)}
              </span>
            ) : transfersIn > 0 ? (
              <span className="text-[9px] text-[var(--text-muted)] block">
                Internal receipts
              </span>
            ) : (
              <span className="text-[9px] text-[var(--text-muted)] block">
                No transfers in
              </span>
            )}
          </div>

          {/* 4. Transfers Out */}
          <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Transfers Out
              </span>
              <ArrowLeftRight size={14} className="text-indigo-500" />
            </div>
            <p className="text-sm sm:text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 tabular">
              −{formatINR(transfersOut)}
            </p>
            <span className="text-[9px] text-[var(--text-muted)] block">
              Internal allocations
            </span>
          </div>

          {/* 5. Actual Expenses */}
          <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Actual Expenses
              </span>
              <ArrowUpRight size={14} className="text-rose-500" />
            </div>
            <p className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400 mt-1 tabular">
              −{formatINR(actualExpenses)}
            </p>
            {emiExpenses > 0 ? (
              <span className="text-[9px] text-[var(--text-muted)] block">
                EMI: {formatINR(emiExpenses)}
              </span>
            ) : directExpenses > 0 ? (
              <span className="text-[9px] text-[var(--text-muted)] block">
                Direct: {formatINR(directExpenses)}
              </span>
            ) : (
              <span className="text-[9px] text-[var(--text-muted)] block">
                No expenses
              </span>
            )}
          </div>

          {/* 6. Closing Balance */}
          <div className="p-3 rounded-xl bg-brand-500/10 border border-brand-500/25">
            <span className="text-[10px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 block">
              {summary.isPeriodEndingInFuture ? 'Reconciled Balance' : 'Closing Balance'}
            </span>
            <p className="text-sm sm:text-base font-extrabold text-brand-600 dark:text-brand-400 mt-1 tabular">
              {formatINR(closingBalance)}
            </p>
            <span className="text-[9px] text-[var(--text-muted)] block">
              {summary.isPeriodEndingInFuture ? `As of ${summary.asOfDate}` : 'Opening + In − Out'}
            </span>
          </div>
        </div>

        {/* ── Specialized Subsection: Kotak Savings Analysis ─────── */}
        {isKotak && (
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PiggyBank size={16} className="text-emerald-500" />
                <span className="text-xs font-extrabold text-[var(--text-primary)]">
                  Kotak Dedicated Savings Analysis
                </span>
              </div>
              {kotakSavingsAnalysis?.savingsPercentageOfSalary !== null && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {kotakSavingsAnalysis?.savingsPercentageOfSalary}% of Total Salary
                </span>
              )}
            </div>
            {kotakSavingsAnalysis && (
              <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Gross Savings Contributions</span>
                  <span className="font-bold text-[var(--text-primary)] tabular">
                    {formatINR(kotakSavingsAnalysis.grossSavings)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Transferred Back to Accounts</span>
                  <span className="font-bold text-rose-500 tabular">
                    −{formatINR(kotakSavingsAnalysis.returnedToAxis)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Net Savings Accumulated</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular">
                    {formatINR(kotakSavingsAnalysis.netSavings)}
                  </span>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 pt-1 border-t border-emerald-500/20 text-[11px] text-[var(--text-secondary)]">
              <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
              <span>Transfers into Kotak are classified as savings allocations, never duplicate external income.</span>
            </div>
          </div>
        )}

        {/* ── Specialized Subsection: Axis Fund Allocation Breakdown ── */}
        {isAxis && (
          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                Axis Fund Allocation Breakdown
              </span>
              {salaryReceived > 0 && (
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Salary Inflow: {formatINR(salaryReceived)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">To Kotak (Savings)</span>
                <span className="font-bold text-[var(--text-primary)] tabular">{formatINR(transfersToKotak)}</span>
                {salaryReceived > 0 && (
                  <span className="text-[10px] text-emerald-500 block font-semibold">
                    {((transfersToKotak / salaryReceived) * 100).toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">To SBI</span>
                <span className="font-bold text-[var(--text-primary)] tabular">{formatINR(transfersToSBI)}</span>
                {salaryReceived > 0 && (
                  <span className="text-[10px] text-blue-500 block font-semibold">
                    {((transfersToSBI / salaryReceived) * 100).toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">To Federal Bank</span>
                <span className="font-bold text-[var(--text-primary)] tabular">{formatINR(transfersToFederal)}</span>
                {salaryReceived > 0 && (
                  <span className="text-[10px] text-purple-500 block font-semibold">
                    {((transfersToFederal / salaryReceived) * 100).toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Direct Axis Spending</span>
                <span className="font-bold text-[var(--text-primary)] tabular">{formatINR(directExpenses)}</span>
                {salaryReceived > 0 && (
                  <span className="text-[10px] text-rose-500 block font-semibold">
                    {((directExpenses / salaryReceived) * 100).toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Other Outflows</span>
                <span className="font-bold text-[var(--text-primary)] tabular">{formatINR(otherTransfersOut + otherOutflows)}</span>
                {salaryReceived > 0 && (
                  <span className="text-[10px] text-indigo-500 block font-semibold">
                    {(((otherTransfersOut + otherOutflows) / salaryReceived) * 100).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-[var(--border)] text-[11px] text-[var(--text-secondary)]">
              <Info size={13} className="text-emerald-500 shrink-0" />
              <span>Fund Distribution Hub: Axis receives salary and distributes it into dedicated accounts. A low closing balance reflects successful deployment into savings and living funds.</span>
            </div>
          </div>
        )}

        {/* ── Specialized Subsection: SBI Breakdown ──────────────── */}
        {isSBI && (
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                SBI Operational Flow (Purchases & EMIs)
              </span>
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                Operating Hub
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Incoming Transfers</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular">+{formatINR(transfersIn)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Outgoing Transfers</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular">−{formatINR(transfersOut)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Small Purchases</span>
                <span className="font-bold text-rose-500 tabular">−{formatINR(directExpenses)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Completed EMI Payments</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 tabular">−{formatINR(emiExpenses)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Transfers to Cash (ATM)</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 tabular">−{formatINR(transfersToCash)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-blue-500/20 text-[11px] text-[var(--text-secondary)]">
              <Info size={13} className="text-blue-500 shrink-0" />
              <span>Handles daily utility purchases, completed EMI instalments, and cash withdrawals.</span>
            </div>
          </div>
        )}

        {/* ── Specialized Subsection: Federal Bank Breakdown ─────── */}
        {isFederal && (
          <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--text-primary)] block">
                Federal Bank Flow (Purchases & EMIs)
              </span>
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                Operating Hub
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Incoming Transfers</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular">+{formatINR(transfersIn)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Outgoing Transfers</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular">−{formatINR(transfersOut)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Direct Purchases</span>
                <span className="font-bold text-rose-500 tabular">−{formatINR(directExpenses)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Completed EMI Payments</span>
                <span className="font-bold text-rose-600 dark:text-rose-400 tabular">−{formatINR(emiExpenses)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-purple-500/20 text-[11px] text-[var(--text-secondary)]">
              <Info size={13} className="text-purple-500 shrink-0" />
              <span>Handles larger lifestyle purchases and recurring EMI commitments.</span>
            </div>
          </div>
        )}

        {/* ── Specialized Subsection: Physical Cash Breakdown ────── */}
        {isCash && (
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote size={16} className="text-amber-500" />
                <span className="text-xs font-bold text-[var(--text-primary)] block">
                  Physical Cash Wallet Flow
                </span>
              </div>
              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                Liquid Cash
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Bank/ATM Withdrawals In</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular">+{formatINR(transfersIn)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">External Cash Received</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular">+{formatINR(externalMoneyReceived)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Cash Expenses</span>
                <span className="font-bold text-rose-500 tabular">−{formatINR(actualExpenses)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Cash Deposited Out</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 tabular">−{formatINR(transfersOut)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t border-amber-500/20 text-[11px] text-[var(--text-secondary)]">
              <Info size={13} className="text-amber-500 shrink-0" />
              <span>Physical liquid cash wallet reconciled against bank ATM withdrawals and offline cash spending.</span>
            </div>
          </div>
        )}

        {/* ── Destination-Wise Money Flow Breakdown ───────────── */}
        {allocationBreakdown.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--text-primary)]">
                Where Money Moved From {account.name}:
              </span>
              <span className="text-[var(--text-muted)]">
                {allocationBreakdown.length} destination{allocationBreakdown.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {allocationBreakdown.map((item) => (
                <div
                  key={item.destinationId}
                  className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between text-xs"
                >
                  <div className="truncate mr-2">
                    <span className="font-bold text-[var(--text-primary)] block truncate">
                      {item.destinationName}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {item.txCount} tx{item.txCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-[var(--text-primary)] tabular block">
                      {formatINR(item.amount)}
                    </span>
                    {item.percentageOfSalary !== null && (
                      <span className="text-[10px] text-brand-600 dark:text-brand-400 font-semibold block">
                        {item.percentageOfSalary}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 3. Collapsible Detailed Transaction Table ───────── */}
        <div className="pt-2 border-t border-[var(--border)]">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsTableExpanded(!isTableExpanded)}
              className="flex items-center gap-2 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
            >
              {isTableExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {isTableExpanded ? 'Hide' : 'Show'} Detailed Transactions ({transactions.length})
            </button>
            <span className="text-[11px] text-[var(--text-muted)]">
              {transactions.length === 0 ? 'No transactions in period' : 'Click row to edit details'}
            </span>
          </div>

          {isTableExpanded && (
            <div className="mt-4 space-y-3">
              {/* Table search & filter controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search description, payee, or amount..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-2.5 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)]"
                  >
                    <option value="all">All Types</option>
                    <option value="inflow">Inflows Only</option>
                    <option value="outflow">Outflows Only</option>
                    <option value="transfer">Transfers Only</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => {
                      if (sortField === 'date') {
                        setSortAsc(!sortAsc)
                      } else {
                        setSortField('date')
                        setSortAsc(false)
                      }
                    }}
                    className={`px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border)] transition-colors ${
                      sortField === 'date' ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Date {sortField === 'date' ? (sortAsc ? '↑' : '↓') : ''}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (sortField === 'amount') {
                        setSortAsc(!sortAsc)
                      } else {
                        setSortField('amount')
                        setSortAsc(false)
                      }
                    }}
                    className={`px-2.5 py-1.5 text-xs rounded-xl border border-[var(--border)] transition-colors ${
                      sortField === 'amount' ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold' : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    Amount {sortField === 'amount' ? (sortAsc ? '↑' : '↓') : ''}
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--bg-subtle)] text-[var(--text-muted)] border-b border-[var(--border)] font-bold">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5">Classification</th>
                      <th className="p-2.5">Destination / Source</th>
                      <th className="p-2.5 text-right">Amount</th>
                      <th className="p-2.5 text-right">Running Balance</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-[var(--text-muted)]">
                          No matching transactions recorded in this period.
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <tr
                          key={tx.transaction.id}
                          onClick={() => onEditTransaction?.(tx.transaction)}
                          className="hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer group"
                        >
                          <td className="p-2.5 text-[var(--text-secondary)] whitespace-nowrap font-mono text-[11px]">
                            {tx.date}
                          </td>
                          <td className="p-2.5 font-bold text-[var(--text-primary)] max-w-[200px] truncate">
                            {tx.description}
                          </td>
                          <td className="p-2.5 text-[var(--text-secondary)]">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--bg-subtle)] border border-[var(--border)]">
                              {tx.classification}
                            </span>
                          </td>
                          <td className="p-2.5 text-[var(--text-secondary)] max-w-[160px] truncate">
                            {tx.destinationOrSource}
                          </td>
                          <td
                            className={`p-2.5 text-right font-extrabold tabular whitespace-nowrap ${
                              tx.isOutflow
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {tx.isOutflow ? '−' : '+'}
                            {formatINR(tx.amount)}
                          </td>
                          <td className="p-2.5 text-right text-[var(--text-primary)] font-bold tabular whitespace-nowrap">
                            {formatINR(tx.runningBalance)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                onEditTransaction?.(tx.transaction)
                              }}
                              className="p-1 rounded-md text-[var(--text-muted)] hover:text-brand-500 opacity-60 group-hover:opacity-100 transition-opacity"
                              title="Edit transaction"
                            >
                              <Edit3 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
