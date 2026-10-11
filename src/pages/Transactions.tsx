import { useState, useMemo } from 'react'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  Search,
  Filter,
  Trash2,
  Calendar,
  CreditCard,
  Plus,
  Edit3,
  SlidersHorizontal,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { useToast } from '@/context/ToastContext'
import { formatINR, formatDate } from '@/lib/utils'
import type { Transaction, TransactionType } from '@/types/finance'
import { AddExpenseModal } from '@/components/modals/AddExpenseModal'
import { AddIncomeModal } from '@/components/modals/AddIncomeModal'
import { TransferModal } from '@/components/modals/TransferModal'
import { EditTransactionModal } from '@/components/modals/EditTransactionModal'
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog'

export default function Transactions() {
  const { transactions, accounts, deleteTransaction } = useFinance()
  const { success, error } = useToast()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all')
  const [accountFilter, setAccountFilter] = useState<string>('all')
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | 'this_month' | 'last_month' | 'last_30_days'>('all')
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc')

  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [incomeModalOpen, setIncomeModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const getAccountName = (id: string) => {
    const acc = accounts.find((a) => a.id === id)
    return acc ? acc.name : 'Unknown Account'
  }

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const lastMonthDate = new Date(currentYear, currentMonth - 1, 1)
    const lastMonthYear = lastMonthDate.getFullYear()
    const lastMonth = lastMonthDate.getMonth()

    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const list = transactions.filter((tx) => {
      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false
      }

      // Account filter
      if (accountFilter !== 'all') {
        if (tx.accountId !== accountFilter && tx.toAccountId !== accountFilter) {
          return false
        }
      }

      // Date Range filter
      if (dateRangeFilter !== 'all' && tx.date) {
        const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
        const lastMonthPrefix = `${lastMonthYear}-${String(lastMonth + 1).padStart(2, '0')}`
        if (dateRangeFilter === 'this_month') {
          if (!tx.date.startsWith(currentMonthPrefix)) {
            return false
          }
        } else if (dateRangeFilter === 'last_month') {
          if (!tx.date.startsWith(lastMonthPrefix)) {
            return false
          }
        } else if (dateRangeFilter === 'last_30_days') {
          const txDate = new Date(tx.date)
          if (txDate < thirtyDaysAgo) {
            return false
          }
        }
      }

      // Search query
      if (search.trim()) {
        const query = search.toLowerCase()
        const titleMatch = tx.title.toLowerCase().includes(query)
        const categoryMatch = tx.category.toLowerCase().includes(query)
        const notesMatch = tx.notes ? tx.notes.toLowerCase().includes(query) : false
        const amountMatch = String(tx.amount).includes(query)
        if (!titleMatch && !categoryMatch && !notesMatch && !amountMatch) {
          return false
        }
      }

      return true
    })

    // Sorting
    return list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
        if (dateDiff !== 0) return dateDiff
        if (a.time && b.time && a.time !== b.time) return b.time.localeCompare(a.time)
        if (a.createdAt && b.createdAt) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        return 0
      }
      if (sortBy === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      }
      if (sortBy === 'amount_desc') {
        return Number(b.amount) - Number(a.amount)
      }
      if (sortBy === 'amount_asc') {
        return Number(a.amount) - Number(b.amount)
      }
      return 0
    })
  }, [transactions, typeFilter, accountFilter, dateRangeFilter, search, sortBy])

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return
    setIsDeleting(true)
    const res = await deleteTransaction(transactionToDelete.id)
    setIsDeleting(false)

    if (res.success) {
      success(`Transaction "${transactionToDelete.title}" deleted and balance restored.`)
      setDeleteModalOpen(false)
      setTransactionToDelete(null)
    } else {
      error(res.error || 'Failed to delete transaction.')
    }
  }

  const promptDelete = (tx: Transaction) => {
    setTransactionToDelete(tx)
    setDeleteModalOpen(true)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Transactions
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            Full financial ledger, searchable history, and transaction management
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="btn-primary text-xs px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
          >
            <Plus size={14} /> Add Expense
          </button>
          <button
            onClick={() => setIncomeModalOpen(true)}
            className="btn-primary text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
          >
            <Plus size={14} /> Add Income
          </button>
          <button
            onClick={() => setTransferModalOpen(true)}
            className="btn-primary text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
          >
            <ArrowRightLeft size={14} /> Transfer
          </button>
        </div>
      </div>

      {/* Filters and search card */}
      <div className="card p-4 border border-[var(--border)] bg-[var(--bg-surface)] space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder="Search by title, category, notes, or amount..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:border-brand-500 transition-all outline-hidden"
            />
          </div>

          {/* Account Filter */}
          <div className="flex items-center gap-2 md:w-56">
            <Filter size={15} className="text-[var(--text-muted)] shrink-0 hidden md:block" />
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-brand-500 transition-all outline-hidden cursor-pointer"
            >
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatINR(acc.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2 md:w-44">
            <Calendar size={15} className="text-[var(--text-muted)] shrink-0 hidden md:block" />
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-brand-500 transition-all outline-hidden cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 md:w-44">
            <SlidersHorizontal size={15} className="text-[var(--text-muted)] shrink-0 hidden md:block" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-[var(--bg-subtle)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:border-brand-500 transition-all outline-hidden cursor-pointer"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1">
          {(['all', 'expense', 'income', 'transfer'] as const).map((type) => {
            const isActive = typeFilter === type
            const label =
              type === 'all'
                ? 'All Transactions'
                : type === 'expense'
                ? 'Expenses'
                : type === 'income'
                ? 'Income'
                : 'Transfers'

            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all capitalize ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-xs'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]'
                }`}
              >
                {label}
              </button>
            )
          })}
          <span className="text-xs text-[var(--text-muted)] ml-auto pr-1">
            {filteredTransactions.length} result{filteredTransactions.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card p-4 sm:p-5 border border-[var(--border)] bg-[var(--bg-surface)]">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center mb-3 text-[var(--text-muted)]">
              <Calendar size={22} />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No matching transactions
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
              Try adjusting your search keywords or filter criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filteredTransactions.map((tx) => {
              const isExpense = tx.type === 'expense'
              const isIncome = tx.type === 'income'
              const isTransfer = tx.type === 'transfer'

              const accountName = isTransfer
                ? `${getAccountName(tx.accountId)} → ${getAccountName(tx.toAccountId || '')}`
                : getAccountName(tx.accountId)

              return (
                <div
                  key={tx.id}
                  className="py-3.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-subtle)] -mx-2 px-2 rounded-xl transition-colors group"
                >
                  {/* Left: Icon & Details */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                          : isExpense
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                          : 'bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400'
                      }`}
                    >
                      {isIncome && <ArrowDownLeft size={18} strokeWidth={2.2} />}
                      {isExpense && <ArrowUpRight size={18} strokeWidth={2.2} />}
                      {isTransfer && <ArrowRightLeft size={18} strokeWidth={2.2} />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {tx.title}
                        </p>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : isExpense
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                              : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800'
                          }`}
                        >
                          {isTransfer ? 'Transfer' : tx.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                        <span className="truncate">{accountName}</span>
                        <span>•</span>
                        <span className="shrink-0">{formatDate(tx.date)}</span>
                        {tx.paymentMethod && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:inline shrink-0 flex items-center gap-1">
                              <CreditCard size={11} /> {tx.paymentMethod}
                            </span>
                          </>
                        )}
                        {tx.notes && (
                          <>
                            <span className="hidden md:inline">•</span>
                            <span className="hidden md:inline text-[var(--text-muted)] italic truncate">
                              "{tx.notes}"
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <div className="text-right">
                      <p
                        className={`text-base font-extrabold tabular ${
                          isIncome
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isExpense
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-purple-600 dark:text-purple-400'
                        }`}
                      >
                        {isIncome ? `+${formatINR(tx.amount)}` : isExpense ? `-${formatINR(tx.amount)}` : formatINR(tx.amount)}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] capitalize">
                        {tx.type}
                      </p>
                    </div>

                    {/* Edit button */}
                    <button
                      onClick={() => setEditingTransaction(tx)}
                      aria-label={`Edit ${tx.title}`}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-brand-600 hover:bg-[var(--bg-subtle)] transition-colors opacity-80 group-hover:opacity-100"
                      title="Edit transaction"
                    >
                      <Edit3 size={15} />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => promptDelete(tx)}
                      aria-label={`Delete ${tx.title}`}
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors opacity-80 group-hover:opacity-100"
                      title="Delete transaction and reverse balance"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddExpenseModal open={expenseModalOpen} onOpenChange={setExpenseModalOpen} />
      <AddIncomeModal open={incomeModalOpen} onOpenChange={setIncomeModalOpen} />
      <TransferModal open={transferModalOpen} onOpenChange={setTransferModalOpen} />
      
      <EditTransactionModal
        transaction={editingTransaction}
        isOpen={Boolean(editingTransaction)}
        onClose={() => setEditingTransaction(null)}
      />

      <DeleteConfirmDialog
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        transaction={transactionToDelete}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  )
}
