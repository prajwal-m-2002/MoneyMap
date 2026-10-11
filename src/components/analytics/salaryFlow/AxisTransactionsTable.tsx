import React, { useState, useMemo } from 'react'
import { Search, Edit3 } from 'lucide-react'
import type { ClassifiedAxisTransaction } from '@/lib/salaryFlowMath'
import { formatINR } from '@/lib/utils'

interface AxisTransactionsTableProps {
  transactions: ClassifiedAxisTransaction[]
  onEditTransaction: (tx: any) => void
}

type FilterCategory =
  | 'all'
  | 'salary_only'
  | 'transfers_only'
  | 'direct_expenses'
  | 'savings_only'
  | 'sbi_only'
  | 'federal_only'

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

export const AxisTransactionsTable: React.FC<AxisTransactionsTableProps> = ({
  transactions,
  onEditTransaction,
}) => {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterCategory>('all')
  const [sortBy, setSortBy] = useState<SortOption>('date_desc')

  // Filter logic
  const filtered = useMemo(() => {
    return transactions.filter((item) => {
      // 1. Classification filter
      if (filter === 'salary_only' && item.classification !== 'salary_received') return false
      if (filter === 'direct_expenses' && item.classification !== 'direct_axis_expense') return false
      if (
        filter === 'transfers_only' &&
        item.classification !== 'kotak_savings' &&
        item.classification !== 'sbi_allocation' &&
        item.classification !== 'federal_allocation' &&
        item.classification !== 'cash_withdrawal' &&
        item.classification !== 'other_transfer'
      )
        return false
      if (filter === 'savings_only' && item.classification !== 'kotak_savings') return false
      if (filter === 'sbi_only' && item.classification !== 'sbi_allocation') return false
      if (filter === 'federal_only' && item.classification !== 'federal_allocation') return false

      // 2. Search query
      if (search.trim()) {
        const q = search.toLowerCase()
        const matchTitle = (item.transaction.title || '').toLowerCase().includes(q)
        const matchCat = (item.transaction.category || '').toLowerCase().includes(q)
        const matchDest = item.destinationOrSource.toLowerCase().includes(q)
        const matchClass = item.classificationLabel.toLowerCase().includes(q)
        const matchNotes = (item.transaction.notes || '').toLowerCase().includes(q)
        if (!matchTitle && !matchCat && !matchDest && !matchClass && !matchNotes) return false
      }

      return true
    })
  }, [transactions, filter, search])

  // Sorting
  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      if (sortBy === 'date_desc') return b.transaction.date.localeCompare(a.transaction.date)
      if (sortBy === 'date_asc') return a.transaction.date.localeCompare(b.transaction.date)
      if (sortBy === 'amount_desc') return b.amount - a.amount
      if (sortBy === 'amount_asc') return a.amount - b.amount
      return 0
    })
    return list
  }, [filtered, sortBy])

  const getBadgeStyle = (classification: string) => {
    switch (classification) {
      case 'salary_received':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      case 'kotak_savings':
        return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
      case 'sbi_allocation':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
      case 'federal_allocation':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
      case 'direct_axis_expense':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      case 'cash_withdrawal':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
      default:
        return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20'
    }
  }

  return (
    <div className="card p-5 border border-[var(--border)] bg-[var(--bg-surface)] space-y-4">
      {/* Table Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)]">
            Where Did My Axis Money Go?
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Granular ledger breakdown of all salary credits, destination transfers, and direct expenditures
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[180px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Axis records..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Classification Filter Dropdown */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterCategory)}
            className="px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Classifications</option>
            <option value="salary_only">Salary Credits Only</option>
            <option value="transfers_only">All Transfers Only</option>
            <option value="savings_only">Kotak Savings Only</option>
            <option value="sbi_only">SBI Transfers Only</option>
            <option value="federal_only">Federal Transfers Only</option>
            <option value="direct_expenses">Direct Expenses Only</option>
          </select>

          {/* Sort Option */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Amount (High to Low)</option>
            <option value="amount_asc">Amount (Low to High)</option>
          </select>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
              <th className="py-2.5 font-bold">Date</th>
              <th className="py-2.5 font-bold">Transaction Description</th>
              <th className="py-2.5 font-bold">Type</th>
              <th className="py-2.5 font-bold">Destination / Payee</th>
              <th className="py-2.5 font-bold">Classification</th>
              <th className="py-2.5 font-bold text-right">% of Salary</th>
              <th className="py-2.5 font-bold text-right">Amount</th>
              <th className="py-2.5 font-bold text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sorted.length > 0 ? (
              sorted.map((item) => {
                const { transaction: tx, classification, classificationLabel, isOutflow } = item

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-[var(--bg-subtle)] transition-colors group cursor-pointer"
                    onClick={() => onEditTransaction(tx)}
                  >
                    {/* Date */}
                    <td className="py-3 font-mono text-[var(--text-muted)] whitespace-nowrap">
                      {tx.date}
                    </td>

                    {/* Title */}
                    <td className="py-3 font-semibold text-[var(--text-primary)] max-w-[200px] truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{tx.title}</span>
                      </div>
                      {tx.notes && (
                        <p className="text-[10px] text-[var(--text-muted)] truncate font-normal mt-0.5">
                          {tx.notes}
                        </p>
                      )}
                    </td>

                    {/* Type */}
                    <td className="py-3 whitespace-nowrap">
                      <span className="capitalize text-[var(--text-secondary)]">
                        {tx.type}
                      </span>
                    </td>

                    {/* Destination / Source */}
                    <td className="py-3 font-medium text-[var(--text-secondary)] whitespace-nowrap">
                      {item.destinationOrSource}
                    </td>

                    {/* Classification Badge */}
                    <td className="py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${getBadgeStyle(
                          classification
                        )}`}
                      >
                        {classificationLabel}
                      </span>
                    </td>

                    {/* % of Salary */}
                    <td className="py-3 text-right font-mono text-[var(--text-secondary)] whitespace-nowrap">
                      {item.percentageOfSalary !== null ? `${item.percentageOfSalary}%` : '—'}
                    </td>

                    {/* Amount */}
                    <td
                      className={`py-3 text-right font-bold text-sm whitespace-nowrap tabular ${
                        !isOutflow
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {!isOutflow ? `+${formatINR(item.amount)}` : `−${formatINR(item.amount)}`}
                    </td>

                    {/* Action */}
                    <td className="py-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditTransaction(tx)
                        }}
                        className="p-1 rounded-lg text-[var(--text-muted)] hover:text-brand-500 hover:bg-[var(--bg-subtle)] transition-colors opacity-70 group-hover:opacity-100"
                        title="Edit transaction"
                      >
                        <Edit3 size={13} />
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-xs text-[var(--text-muted)]">
                  No Axis Bank transactions match the selected filters for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)] border-t border-[var(--border)]">
        <span>Showing {sorted.length} transaction{sorted.length !== 1 ? 's' : ''}</span>
        <span>Click any row to view or edit transaction details</span>
      </div>
    </div>
  )
}
