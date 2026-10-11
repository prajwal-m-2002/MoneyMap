import React from 'react'
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Building2,
  PieChart,
} from 'lucide-react'
import type { ConsolidatedFlowSummary } from '@/lib/consolidatedFlowMath'
import { formatINR } from '@/lib/utils'

interface CombinedSummaryCardProps {
  summary: ConsolidatedFlowSummary
}

export const CombinedSummaryCard: React.FC<CombinedSummaryCardProps> = ({ summary }) => {
  const {
    period,
    openingBankAndCashBalance,
    isPeriodPartiallyCovered = false,
    partialCoverageNotice,
    externalIncome,
    salaryIncome,
    otherIncome,
    actualExpenses,
    internalTransferEventsCount,
    internalTransfersTotal,
    closingBankAndCashBalance,
    investmentValue,
    investmentValuationDate,
    liabilities,
    netWorth,
    isReconciled,
    hasHistoricalDataWarning = false,
    historicalWarningMessage,
    reconciliationDiscrepancy,
    isLedgerBalanced = true,
    isBalanceMatchedToLive = true,
    isStatementReconciled = false,
  } = summary

  return (
    <div className="card p-5 sm:p-6 border border-[var(--border)] bg-[var(--bg-surface)] space-y-6 shadow-sm">
      {/* ── Section Title & Status ──────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-500/10 text-brand-500">
              <PieChart size={18} />
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Combined Summary — All Accounts
            </h2>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Consolidated balances and genuine financial activity across all active bank accounts and physical cash (reporting period: <span className="font-semibold text-[var(--text-primary)]">{period.label}</span>
            {summary.isPeriodEndingInFuture && (
              <> • Reconciled as of <span className="font-semibold text-[var(--text-primary)]">{summary.asOfDate}</span></>
            )})
          </p>
        </div>

        {/* Solvency & Reconciliation Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {hasHistoricalDataWarning ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertTriangle size={14} />
              Historical Records Incomplete
            </span>
          ) : isStatementReconciled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={14} />
              Bank statement reconciled
            </span>
          ) : isPeriodPartiallyCovered ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              <ShieldCheck size={14} />
              Internal ledger balanced (Partially Covered Period)
            </span>
          ) : isReconciled ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck size={14} />
              Internal ledger balanced
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <AlertTriangle size={14} />
              Discrepancy: {formatINR(Math.abs(reconciliationDiscrepancy))}
            </span>
          )}
        </div>
      </div>

      {/* Historical Data Warning Banner if applicable */}
      {hasHistoricalDataWarning && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
          <AlertTriangle size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Historical Data Warning:</strong> {historicalWarningMessage || 'One or more accounts were initialized after this reporting period. Historical records prior to initialization cannot be reconstructed.'}
          </span>
        </div>
      )}

      {/* Partial Coverage Notice Banner if applicable */}
      {isPeriodPartiallyCovered && !hasHistoricalDataWarning && (
        <div className="p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-800 dark:text-brand-300 text-xs flex items-center gap-2.5">
          <Building2 size={16} className="shrink-0 text-brand-600 dark:text-brand-400" />
          <span>
            <strong>Ledger Coverage Notice:</strong> {partialCoverageNotice || 'Ledger tracking began mid-period. Pre-existing balances are classified as opening balances as of their effective dates. Transactions prior to coverage are unrecorded.'}
          </span>
        </div>
      )}

      {/* ── 8 Metrics Grid (A to H) ─────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* A. Opening Bank & Cash Balance */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              A. Opening Bank & Cash
            </span>
            <Building2 size={16} className="text-[var(--text-muted)]" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] mt-1 tabular">
            {formatINR(openingBankAndCashBalance)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">
            {summary.openingBalanceSemantics || (isPeriodPartiallyCovered ? 'Pre-existing opening balances (Start of Day)' : `As of start date (${period.startDate})`)}
          </p>
        </div>

        {/* B. External Income */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {isPeriodPartiallyCovered ? 'B. Recorded Income This Month' : 'B. External Income'}
            </span>
            <ArrowDownLeft size={16} className="text-emerald-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 tabular">
            +{formatINR(externalIncome)}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mt-0.5">
            <span>Salary: {formatINR(salaryIncome)}</span>
            {otherIncome > 0 && <span>• Other: {formatINR(otherIncome)}</span>}
          </div>
        </div>

        {/* C. Actual Expenses */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/5 border border-rose-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              {isPeriodPartiallyCovered ? 'C. Recorded Expenses This Month' : 'C. Actual Expenses'}
            </span>
            <ArrowUpRight size={16} className="text-rose-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 tabular">
            −{formatINR(actualExpenses)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            Excludes internal transfers & future unpaid EMIs
          </p>
        </div>

        {/* D. Internal Transfers */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              D. Internal Transfers
            </span>
            <ArrowLeftRight size={16} className="text-indigo-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 tabular">
            {formatINR(internalTransfersTotal)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {internalTransferEventsCount} transfer event{internalTransferEventsCount !== 1 ? 's' : ''} (net impact ₹0)
          </p>
        </div>

        {/* E. Closing Bank & Cash Balance */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              {summary.isPeriodEndingInFuture ? 'E. Reconciled Balance' : 'E. Closing Bank & Cash'}
            </span>
            <Wallet size={16} className="text-brand-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] mt-1 tabular">
            {formatINR(closingBankAndCashBalance)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-snug">
            {summary.isPeriodEndingInFuture
              ? `Reconciled as of ${summary.asOfDate} (Period end ${period.endDate} pending)`
              : `As of period end (${period.endDate})`}
          </p>
        </div>

        {/* F. Investment Value */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              F. Investment Value
            </span>
            <TrendingUp size={16} className="text-blue-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] mt-1 tabular">
            {formatINR(investmentValue)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            Valuation date: {investmentValuationDate}
          </p>
        </div>

        {/* G. Liabilities */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              G. Liabilities
            </span>
            <span className="text-xs text-[var(--text-muted)] font-semibold">Debt</span>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-[var(--text-primary)] mt-1 tabular">
            {formatINR(liabilities)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            Tracked outstanding loan principal
          </p>
        </div>

        {/* H. Net Worth */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-brand-500/10 border border-brand-500/25">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              H. Net Worth
            </span>
            <TrendingUp size={16} className="text-brand-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-brand-600 dark:text-brand-400 mt-1 tabular">
            {formatINR(netWorth)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            Liquid + Investments − Liabilities
          </p>
        </div>
      </div>

      {/* ── Reconciliation Bar & Waterfall Formula ─────────── */}
      <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="font-bold text-[var(--text-primary)]">
            Consolidated Solvency Formula:
          </span>
          <span className="text-[var(--text-secondary)] font-mono text-[11px]">
            Closing ({formatINR(closingBankAndCashBalance)}) = Opening ({formatINR(openingBankAndCashBalance)}) + Income ({formatINR(externalIncome)}) − Expenses ({formatINR(actualExpenses)})
          </span>
        </div>

        {/* 3-tier Verification Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[var(--border)] text-[11px]">
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <ShieldCheck size={14} className={isLedgerBalanced ? 'text-emerald-500' : 'text-amber-500'} />
            <span>
              <strong>1. Ledger:</strong> {isLedgerBalanced ? 'Internal ledger balanced' : `Discrepancy: ${formatINR(Math.abs(reconciliationDiscrepancy))}`}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <ShieldCheck size={14} className={isBalanceMatchedToLive ? 'text-emerald-500' : 'text-brand-500'} />
            <span>
              <strong>2. App Balances:</strong> {isBalanceMatchedToLive ? 'App balances match ledger' : 'Calculated Separately'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <ShieldCheck size={14} className={isStatementReconciled ? 'text-emerald-500' : 'text-slate-400'} />
            <span>
              <strong>3. Bank Statement:</strong> {isStatementReconciled ? 'Bank statement reconciled' : 'Bank statement reconciliation pending'}
            </span>
          </div>
        </div>

        {!isReconciled && !hasHistoricalDataWarning && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle size={15} className="shrink-0" />
            <span>
              <strong>Discrepancy Warning:</strong> A ledger discrepancy of {formatINR(Math.abs(reconciliationDiscrepancy))} was detected between transactions and opening balances. Check for untracked transaction reversals or unassigned opening balances.
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
