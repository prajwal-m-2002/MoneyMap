import React, { useState, useMemo } from 'react'
import {
  Printer,
  FileSpreadsheet,
  FileJson,
  Filter,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  AlertTriangle,
  AlertCircle,
} from 'lucide-react'
import type { Account, Transaction, ExportFilterOptions } from '@/types/finance'
import {
  filterTransactionsForExport,
  calculateStatementSummary,
  generateCSVString,
  downloadCSVFile,
  downloadJSONFile,
  getDateRangeBounds,
} from '@/lib/statementExporter'
import { formatINR } from '@/lib/utils'
import { DatePicker } from '@/components/ui/DatePicker'

interface StatementExportCardProps {
  transactions: Transaction[]
  accounts: Account[]
  onPrintStatement?: (filteredTxs: Transaction[], periodLabel: string, accountName: string) => void
}

export const StatementExportCard: React.FC<StatementExportCardProps> = ({
  transactions,
  accounts,
  onPrintStatement,
}) => {
  const [filterOptions, setFilterOptions] = useState<ExportFilterOptions>({
    dateRange: 'this_month',
    accountId: 'all',
    type: 'all',
  })

  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  // Compute filtered transactions
  const filteredTxs = useMemo(() => {
    return filterTransactionsForExport(transactions, {
      ...filterOptions,
      startDate: customStart,
      endDate: customEnd,
    })
  }, [transactions, filterOptions, customStart, customEnd])

  // Get active account
  const selectedAccount = useMemo(() => {
    if (filterOptions.accountId === 'all') return undefined
    return accounts.find((a) => a.id === filterOptions.accountId)
  }, [accounts, filterOptions.accountId])

  // Get date range bounds & label
  const { startDate: rangeStart, endDate: rangeEnd, label: periodLabel } = useMemo(() => {
    return getDateRangeBounds(filterOptions.dateRange, customStart, customEnd)
  }, [filterOptions.dateRange, customStart, customEnd])

  const { isBeforeCoverage, isPartialCoverage } = useMemo(() => {
    const earliest = '2026-10-10'
    const isBefore = rangeEnd < earliest
    const isPartial = !isBefore && rangeStart < earliest
    return { isBeforeCoverage: isBefore, isPartialCoverage: isPartial }
  }, [rangeStart, rangeEnd])

  // Compute statement summary
  const summary = useMemo(() => {
    return calculateStatementSummary(filteredTxs, selectedAccount, periodLabel, rangeStart, transactions)
  }, [filteredTxs, selectedAccount, periodLabel, rangeStart, transactions])

  // Trigger CSV Download
  const handleDownloadCSV = () => {
    const csv = generateCSVString(filteredTxs, accounts)
    const accSlug = selectedAccount ? selectedAccount.name.replace(/\s+/g, '_').toLowerCase() : 'all_accounts'
    const periodSlug = periodLabel.replace(/\s+/g, '_').toLowerCase()
    downloadCSVFile(csv, `MoneyMap_Statement_${accSlug}_${periodSlug}.csv`)
  }

  // Trigger JSON Backup
  const handleDownloadJSON = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      appName: 'MoneyMap',
      period: periodLabel,
      account: selectedAccount ? selectedAccount.name : 'All Accounts',
      summary,
      transactions: filteredTxs,
    }
    const accSlug = selectedAccount ? selectedAccount.name.replace(/\s+/g, '_').toLowerCase() : 'all_accounts'
    downloadJSONFile(exportData, `MoneyMap_Backup_${accSlug}_${Date.now()}.json`)
  }

  // Trigger Print / PDF
  const handlePrint = () => {
    if (onPrintStatement) {
      onPrintStatement(
        filteredTxs,
        periodLabel,
        selectedAccount ? selectedAccount.name : 'All Accounts'
      )
    } else {
      window.print()
    }
  }

  return (
    <div className="space-y-6">
      {/* ── 1. Filters & Configuration ──────────────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Filter size={18} className="text-[var(--accent-primary)]" />
              Statement Range & Scope
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Customize statement timeframe, account source, and transaction types.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]">
            {periodLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Timeframe */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} /> Time Period
            </label>
            <select
              value={filterOptions.dateRange}
              onChange={(e) =>
                setFilterOptions((prev) => ({
                  ...prev,
                  dateRange: e.target.value as ExportFilterOptions['dateRange'],
                }))
              }
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="fy_current">Current Financial Year (FY)</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 flex items-center gap-1.5">
              <Layers size={13} /> Account
            </label>
            <select
              value={filterOptions.accountId}
              onChange={(e) =>
                setFilterOptions((prev) => ({
                  ...prev,
                  accountId: e.target.value,
                }))
              }
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="all">All Accounts Consolidated</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatINR(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Transaction Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Transaction Types
            </label>
            <select
              value={filterOptions.type}
              onChange={(e) =>
                setFilterOptions((prev) => ({
                  ...prev,
                  type: e.target.value as ExportFilterOptions['type'],
                }))
              }
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              <option value="all">All Types (Income, Expense, Transfer)</option>
              <option value="expense">Expenses Only</option>
              <option value="income">Income Only</option>
              <option value="transfer">Transfers Only</option>
            </select>
          </div>
        </div>

        {/* Custom Date Pickers */}
        {filterOptions.dateRange === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)]">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Start Date
              </label>
              <DatePicker
                value={customStart}
                onChange={setCustomStart}
                placeholder="Start date"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                End Date
              </label>
              <DatePicker
                value={customEnd}
                onChange={setCustomEnd}
                placeholder="End date"
              />
            </div>
          </div>
        )}

        {/* Ledger Coverage Indicators */}
        {isBeforeCoverage && (
          <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2.5 animate-fade-in">
            <AlertTriangle size={16} className="shrink-0 text-amber-500" />
            <div>
              <span className="font-bold">Ledger coverage unavailable: </span>
              Historical ledger tracking begins on October 10, 2026. The selected statement period precedes recorded transactions.
            </div>
          </div>
        )}
        {isPartialCoverage && !isBeforeCoverage && (
          <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2.5 animate-fade-in">
            <AlertCircle size={16} className="shrink-0 text-blue-500" />
            <div>
              <span className="font-bold">Partial ledger coverage: </span>
              Transactions are recorded starting from October 10, 2026. Prior dates in this period have no recorded ledger entries.
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Summary Ledger Metrics ──────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Records */}
        <div className="card p-4">
          <span className="text-xs text-[var(--text-muted)] font-medium">Total Entries</span>
          <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
            {summary.totalRecords}
          </p>
          <span className="text-[11px] text-[var(--text-secondary)]">Transactions in scope</span>
        </div>

        {/* Total Inflow */}
        <div className="card p-4">
          <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
            <ArrowDownRight size={14} /> Total Inflow
          </span>
          <p className="text-2xl font-bold text-emerald-500 mt-1">
            +{formatINR(summary.totalInflow)}
          </p>
          <span className="text-[11px] text-[var(--text-secondary)]">Credits & Salary</span>
        </div>

        {/* Total Outflow */}
        <div className="card p-4">
          <span className="text-xs text-rose-500 font-medium flex items-center gap-1">
            <ArrowUpRight size={14} /> Total Outflow
          </span>
          <p className="text-2xl font-bold text-rose-500 mt-1">
            -{formatINR(summary.totalOutflow)}
          </p>
          <span className="text-[11px] text-[var(--text-secondary)]">Debits & Expenses</span>
        </div>

        {/* Net Flow */}
        <div className="card p-4">
          <span className="text-xs text-[var(--text-muted)] font-medium">Net Cash Flow</span>
          <p
            className={`text-2xl font-bold mt-1 ${
              summary.netChange >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {formatINR(summary.netChange)}
          </p>
          <span className="text-[11px] text-[var(--text-secondary)]">Period Net Surplus</span>
        </div>
      </div>

      {/* ── 3. Export Buttons Toolbar ───────────────────────── */}
      <div className="card p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-[var(--text-primary)]">
            Export & Download Options
          </h4>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Generate offline spreadsheets, professional printable reports, or encrypted JSON backups.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Download CSV */}
          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={filteredTxs.length === 0}
            className="btn-primary text-xs px-4 py-2 flex items-center gap-2 grow sm:grow-0 justify-center"
          >
            <FileSpreadsheet size={15} />
            <span>Download CSV</span>
          </button>

          {/* Print / Save PDF */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={filteredTxs.length === 0}
            className="btn-secondary text-xs px-4 py-2 flex items-center gap-2 grow sm:grow-0 justify-center"
          >
            <Printer size={15} />
            <span>Print / PDF Statement</span>
          </button>

          {/* Export JSON */}
          <button
            type="button"
            onClick={handleDownloadJSON}
            disabled={filteredTxs.length === 0}
            className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Download full JSON dataset"
          >
            <FileJson size={15} />
            <span className="hidden sm:inline">JSON</span>
          </button>
        </div>
      </div>

      {/* ── 4. Live Transaction Preview Table ───────────────── */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            Statement Ledger Preview ({filteredTxs.length})
          </h4>
          <span className="text-xs text-[var(--text-muted)]">
            Showing transactions for {periodLabel}
          </span>
        </div>

        {filteredTxs.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold">Description</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Account</th>
                  <th className="p-3 font-semibold">Method</th>
                  <th className="p-3 font-semibold text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                {filteredTxs.slice(0, 50).map((tx) => (
                  <tr key={tx.id} className="hover:bg-[var(--bg-subtle)]/50 transition-colors">
                    <td className="p-3 font-mono text-[11px] whitespace-nowrap text-[var(--text-secondary)]">
                      {tx.date}
                    </td>
                    <td className="p-3 font-medium text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        {tx.type === 'income' && (
                          <ArrowDownRight size={13} className="text-emerald-500 shrink-0" />
                        )}
                        {tx.type === 'expense' && (
                          <ArrowUpRight size={13} className="text-rose-500 shrink-0" />
                        )}
                        {tx.type === 'transfer' && (
                          <ArrowLeftRight size={13} className="text-purple-500 shrink-0" />
                        )}
                        <span className="truncate max-w-xs">{tx.title}</span>
                      </div>
                    </td>
                    <td className="p-3 text-[var(--text-secondary)]">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[10px] font-semibold">
                        {tx.category}
                      </span>
                    </td>
                    <td className="p-3 text-[var(--text-muted)] whitespace-nowrap">
                      {accounts.find((a) => a.id === tx.accountId)?.name || tx.accountId}
                    </td>
                    <td className="p-3 text-[var(--text-muted)] whitespace-nowrap">
                      {tx.paymentMethod || '—'}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap font-bold">
                      <span
                        className={
                          tx.type === 'income'
                            ? 'text-emerald-500'
                            : tx.type === 'expense'
                            ? 'text-rose-500'
                            : 'text-purple-500'
                        }
                      >
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatINR(tx.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-[var(--text-muted)]">
            No transactions found for the selected filter range.
          </div>
        )}

        {filteredTxs.length > 50 && (
          <p className="text-center text-xs text-[var(--text-muted)] pt-2">
            Showing first 50 entries in preview. Full {filteredTxs.length} records will be exported in CSV/PDF.
          </p>
        )}
      </div>
    </div>
  )
}
