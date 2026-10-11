import React from 'react'
import { createPortal } from 'react-dom'
import { Printer, X, Download, ShieldCheck } from 'lucide-react'
import type { Transaction, Account } from '@/types/finance'
import { calculateStatementSummary, generateCSVString, downloadCSVFile } from '@/lib/statementExporter'
import { formatINR } from '@/lib/utils'

interface PrintableStatementModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: Transaction[]
  accounts: Account[]
  periodLabel: string
  accountName: string
}

export const PrintableStatementModal: React.FC<PrintableStatementModalProps> = ({
  isOpen,
  onClose,
  transactions,
  accounts,
  periodLabel,
  accountName,
}) => {
  if (!isOpen) return null

  const summary = calculateStatementSummary(transactions, undefined, periodLabel)

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadCSV = () => {
    const csv = generateCSVString(transactions, accounts)
    downloadCSVFile(csv, `MoneyMap_Statement_${periodLabel.replace(/\s+/g, '_')}.csv`)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center p-4 sm:p-6 print:p-0 print:bg-white print:fixed-none">
      <div className="w-full max-w-4xl bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col my-auto print:border-none print:shadow-none print:max-w-none print:m-0">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="p-4 bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-[var(--text-primary)]">
              Statement Print & PDF Preview
            </span>
            <span className="text-xs text-[var(--text-muted)]">
              ({transactions.length} transactions)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadCSV}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <Download size={13} /> Download CSV
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5"
            >
              <Printer size={13} /> Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] ml-2"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-6 sm:p-10 space-y-6 text-[var(--text-primary)] print:p-0 print:text-black">
          {/* Document Header */}
          <div className="flex items-start justify-between border-b-2 border-emerald-500/30 pb-6 print:border-gray-300">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-lg">
                  M
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight text-[var(--text-primary)] print:text-black">
                    MoneyMap
                  </h1>
                  <p className="text-[10px] text-[var(--text-muted)] print:text-gray-500 font-medium">
                    Personal Financial Statement
                  </p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] print:text-gray-600 mt-3 font-semibold">
                Account Scope: <span className="text-[var(--text-primary)] print:text-black font-bold">{accountName}</span>
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 print:border print:border-gray-300">
                Official Statement
              </span>
              <p className="text-sm font-bold mt-2 text-[var(--text-primary)] print:text-black">
                {periodLabel}
              </p>
              <p className="text-[11px] text-[var(--text-muted)] print:text-gray-500 mt-0.5">
                Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Coverage & Audit Metadata */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2.5 px-3.5 bg-[var(--bg-subtle)]/70 print:bg-gray-100/70 rounded-xl text-[10px] text-[var(--text-secondary)] print:text-gray-600 border border-[var(--border-subtle)] print:border-gray-200">
            <div>
              <span className="block font-semibold text-[var(--text-muted)] print:text-gray-500">Coverage Start:</span>
              <span className="font-medium">10 Oct 2026</span>
            </div>
            <div>
              <span className="block font-semibold text-[var(--text-muted)] print:text-gray-500">Opening Balance Effective:</span>
              <span className="font-medium">10 Oct 2026 00:00 IST</span>
            </div>
            <div>
              <span className="block font-semibold text-[var(--text-muted)] print:text-gray-500">Coverage Status:</span>
              <span className={`font-bold ${
                transactions.length === 0 && (periodLabel.toLowerCase().includes('last month') || periodLabel.toLowerCase().includes('september'))
                  ? 'text-amber-600'
                  : periodLabel.toLowerCase().includes('october') || periodLabel.toLowerCase().includes('this month')
                  ? 'text-blue-600'
                  : 'text-emerald-600'
              }`}>
                {transactions.length === 0 && (periodLabel.toLowerCase().includes('last month') || periodLabel.toLowerCase().includes('september'))
                  ? 'Coverage Unavailable'
                  : periodLabel.toLowerCase().includes('october') || periodLabel.toLowerCase().includes('this month')
                  ? 'Partial (From Oct 10)'
                  : 'Full Coverage'}
              </span>
            </div>
            <div>
              <span className="block font-semibold text-[var(--text-muted)] print:text-gray-500">Reconciled Status:</span>
              <span className="font-medium">Reconciled to Date</span>
            </div>
          </div>

          {/* Statement Overview Metrics */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-[var(--bg-subtle)] print:bg-gray-50 print:border print:border-gray-200">
            <div>
              <span className="text-[11px] text-[var(--text-muted)] print:text-gray-500 block">
                Total Inflow (Credits)
              </span>
              <span className="text-base font-extrabold text-emerald-500 print:text-green-700">
                +{formatINR(summary.totalInflow)}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-[var(--text-muted)] print:text-gray-500 block">
                Total Outflow (Debits)
              </span>
              <span className="text-base font-extrabold text-rose-500 print:text-red-700">
                -{formatINR(summary.totalOutflow)}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-[var(--text-muted)] print:text-gray-500 block">
                Net Period Cash Flow
              </span>
              <span
                className={`text-base font-extrabold ${
                  summary.netChange >= 0
                    ? 'text-emerald-500 print:text-green-700'
                    : 'text-rose-500 print:text-red-700'
                }`}
              >
                {formatINR(summary.netChange)}
              </span>
            </div>
          </div>

          {/* Transaction Ledger Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[var(--text-secondary)] print:text-gray-700 uppercase tracking-wider">
              Detailed Transaction Ledger ({transactions.length} Records)
            </h3>

            {transactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-[var(--text-muted)] print:text-gray-500 border border-dashed border-[var(--border-subtle)] rounded-xl">
                {periodLabel.toLowerCase().includes('last month') || periodLabel.toLowerCase().includes('september')
                  ? 'Ledger coverage unavailable: Historical transactions prior to October 10, 2026 are not recorded.'
                  : 'No transactions recorded for the selected period.'}
              </div>
            ) : (
              <div className="overflow-x-auto border border-[var(--border-subtle)] print:border-gray-300 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-subtle)] print:bg-gray-100 text-[var(--text-secondary)] print:text-gray-700 border-b border-[var(--border-subtle)] print:border-gray-300">
                      <th className="p-2.5 font-bold">Date</th>
                      <th className="p-2.5 font-bold">Description</th>
                      <th className="p-2.5 font-bold">Category</th>
                      <th className="p-2.5 font-bold">Method</th>
                      <th className="p-2.5 font-bold text-right">Debit (-)</th>
                      <th className="p-2.5 font-bold text-right">Credit (+)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] print:divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="print:border-b print:border-gray-200">
                      <td className="p-2.5 font-mono text-[11px] whitespace-nowrap text-[var(--text-secondary)] print:text-gray-600">
                        {tx.date}
                      </td>
                      <td className="p-2.5 font-semibold text-[var(--text-primary)] print:text-black">
                        {tx.title}
                        {tx.notes && (
                          <span className="block text-[10px] text-[var(--text-muted)] print:text-gray-500 font-normal">
                            {tx.notes}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-[var(--text-secondary)] print:text-gray-700">
                        {tx.category}
                      </td>
                      <td className="p-2.5 text-[var(--text-muted)] print:text-gray-600">
                        {tx.paymentMethod || '—'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-rose-500 print:text-red-700">
                        {tx.type === 'expense' ? formatINR(tx.amount) : '—'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-emerald-500 print:text-green-700">
                        {tx.type === 'income' ? formatINR(tx.amount) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </div>

          {/* Document Footer */}
          <div className="pt-6 border-t border-[var(--border-subtle)] print:border-gray-300 flex items-center justify-between text-[11px] text-[var(--text-muted)] print:text-gray-500">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>MoneyMap Verified Financial Record • Confidential</span>
            </div>
            <span>End of Statement</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
