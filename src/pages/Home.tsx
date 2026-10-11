import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Calendar,
  CreditCard,
  ChevronRight,
  Edit3,
  CalendarSync,
  Sparkles,
  Banknote,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { useToast } from '@/context/ToastContext'
import { formatINR, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types/finance'
import { AddExpenseModal } from '@/components/modals/AddExpenseModal'
import { AddIncomeModal } from '@/components/modals/AddIncomeModal'
import { TransferModal } from '@/components/modals/TransferModal'
import { EditTransactionModal } from '@/components/modals/EditTransactionModal'
import { DeleteConfirmDialog } from '@/components/modals/DeleteConfirmDialog'
import { MonthlyBudgetAllocationCard } from '@/components/dashboard/MonthlyBudgetAllocationCard'
import { RecordSalaryModal } from '@/components/modals/RecordSalaryModal'

export default function Home() {
  const { summary, transactions, accounts, deleteTransaction, cashFlowForecast } = useFinance()
  const { success, error } = useToast()

  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [incomeModalOpen, setIncomeModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [salaryModalOpen, setSalaryModalOpen] = useState(false)
  const [fabOpen, setFabOpen] = useState(false)

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const currentMonthName = new Intl.DateTimeFormat('en-IN', {
    month: 'long',
    year: 'numeric',
  }).format(new Date())

  // Get account name helper
  const getAccountName = (id: string) => {
    const acc = accounts.find((a) => a.id === id)
    return acc ? acc.name : 'Unknown Account'
  }

  // Handle transaction delete confirm
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

  // Display top 6 recent transactions sorted latest first then previous
  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => {
        // Compare date descending (latest first)
        const dateA = a.date || ''
        const dateB = b.date || ''
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA)
        }
        // Tie breaker 1: time if present
        if (a.time && b.time && a.time !== b.time) {
          return b.time.localeCompare(a.time)
        }
        // Tie breaker 2: createdAt descending (most recently created first)
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        }
        return 0
      })
      .slice(0, 6)
  }, [transactions])

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-slide-up">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5">
            <Calendar size={14} className="text-brand-500" />
            <span>{currentMonthName} financial overview</span>
          </p>
        </div>
      </div>

      {/* ── 1. The Three Financial Summary Cards ───────────── */}
      <section aria-label="Financial Summary Cards">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          {/* Card 1: Total Available */}
          <div className="card relative overflow-hidden flex flex-col justify-between p-5 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Total Available
                </span>
                <p className="text-2xl lg:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight mt-1 tabular">
                  {formatINR(summary.totalAvailable)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                <Wallet size={20} strokeWidth={2.2} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Bank accounts + cash</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Liquid Funds
              </span>
            </div>
          </div>

          {/* Card 2: Income This Month */}
          <div className="card relative overflow-hidden flex flex-col justify-between p-5 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Income This Month
                </span>
                <p className="text-2xl lg:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight mt-1 tabular">
                  {formatINR(summary.incomeThisMonth)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <TrendingUp size={20} strokeWidth={2.2} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Received in {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date())}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                Earned
              </span>
            </div>
          </div>

          {/* Card 3: Expenses This Month */}
          <div className="card relative overflow-hidden flex flex-col justify-between p-5 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Expenses This Month
                </span>
                <p className="text-2xl lg:text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight mt-1 tabular">
                  {formatINR(summary.expensesThisMonth)}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
                <TrendingDown size={20} strokeWidth={2.2} />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <span>Actual spending</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100/70 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
                Outflow
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 1.5. Predictive Forecast & Upcoming Dues Strip ───── */}
      <section aria-label="Predictive Forecast Strip">
        <Link
          to="/recurring"
          className="card p-4 border border-[var(--border)] bg-gradient-to-r from-[var(--bg-surface)] via-brand-500/5 to-[var(--bg-surface)] hover:border-[var(--accent-primary)]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <CalendarSync size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-500" />
                  30-Day Liquidity Forecast
                </span>
                {cashFlowForecast.trajectoryStatus === 'provisional' ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Provisional
                  </span>
                ) : cashFlowForecast.hasLowBalanceWarning ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                    Cash Dip Warning
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Healthy
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                Current Available: <strong className="text-[var(--text-primary)]">{formatINR(summary.totalAvailable)}</strong> • Projected Month-End:{' '}
                <strong className="text-[var(--text-primary)]">
                  {formatINR(cashFlowForecast.projectedMonthEndBalance)}
                </strong>{' '}
                • Safe Discretionary:{' '}
                <strong className={cashFlowForecast.hasSufficientSpendingHistory ? 'text-emerald-500' : 'text-amber-500'}>
                  {cashFlowForecast.hasSufficientSpendingHistory
                    ? `${formatINR(cashFlowForecast.safeDailySpend)}/day`
                    : 'Not enough history (Provisional)'}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] self-end sm:self-center">
            <span>Forecast & Rules</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </div>
        </Link>
      </section>

      {/* ── 1.8. Monthly Budget Allocation & Planning ─────────── */}
      <section aria-label="Monthly Budget Allocation">
        <MonthlyBudgetAllocationCard />
      </section>

      {/* ── 2. Quick Actions ─────────────────────────────────── */}
      <section aria-label="Quick Actions">
        <div className="card p-4 sm:p-5 border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Quick Actions
            </h2>
            <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
              Instant balance update & sync
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Add Expense Button */}
            <button
              id="action-add-expense"
              type="button"
              onClick={() => setExpenseModalOpen(true)}
              className="flex items-center justify-between p-3.5 rounded-xl border border-rose-200/70 dark:border-rose-900/60 bg-rose-50/50 hover:bg-rose-100/70 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 text-[var(--text-primary)] transition-all group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-rose-500 text-white shadow-xs group-hover:scale-105 transition-transform">
                  <TrendingDown size={18} strokeWidth={2.5} />
                </span>
                <div>
                  <span className="block text-sm font-bold text-rose-950 dark:text-rose-200">
                    Add Expense
                  </span>
                  <span className="text-[11px] text-rose-700/80 dark:text-rose-400">
                    Record purchases & bills
                  </span>
                </div>
              </div>
              <Plus size={16} className="text-rose-600 dark:text-rose-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Add Income Button */}
            <button
              id="action-add-income"
              type="button"
              onClick={() => setIncomeModalOpen(true)}
              className="flex items-center justify-between p-3.5 rounded-xl border border-emerald-200/70 dark:border-emerald-900/60 bg-emerald-50/50 hover:bg-emerald-100/70 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 text-[var(--text-primary)] transition-all group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-xs group-hover:scale-105 transition-transform">
                  <TrendingUp size={18} strokeWidth={2.5} />
                </span>
                <div>
                  <span className="block text-sm font-bold text-emerald-950 dark:text-emerald-200">
                    Add Income
                  </span>
                  <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400">
                    Record salary & returns
                  </span>
                </div>
              </div>
              <Plus size={16} className="text-emerald-600 dark:text-emerald-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Transfer Money Button */}
            <button
              id="action-transfer-money"
              type="button"
              onClick={() => setTransferModalOpen(true)}
              className="flex items-center justify-between p-3.5 rounded-xl border border-purple-200/70 dark:border-purple-900/60 bg-purple-50/50 hover:bg-purple-100/70 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 text-[var(--text-primary)] transition-all group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                  <ArrowRightLeft size={18} strokeWidth={2.5} />
                </span>
                <div>
                  <span className="block text-sm font-bold text-purple-950 dark:text-purple-200">
                    Transfer Money
                  </span>
                  <span className="text-[11px] text-purple-700/80 dark:text-purple-400">
                    Move between accounts
                  </span>
                </div>
              </div>
              <Plus size={16} className="text-purple-600 dark:text-purple-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>

            {/* Record Salary Button */}
            <button
              id="action-record-salary"
              type="button"
              onClick={() => setSalaryModalOpen(true)}
              className="flex items-center justify-between p-3.5 rounded-xl border border-cyan-200/70 dark:border-cyan-900/60 bg-cyan-50/50 hover:bg-cyan-100/70 dark:bg-cyan-950/20 dark:hover:bg-cyan-950/40 text-[var(--text-primary)] transition-all group active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-xl bg-cyan-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                  <Banknote size={18} strokeWidth={2.5} />
                </span>
                <div>
                  <span className="block text-sm font-bold text-cyan-950 dark:text-cyan-200">
                    Record Salary
                  </span>
                  <span className="text-[11px] text-cyan-700/80 dark:text-cyan-400">
                    Credit monthly salary
                  </span>
                </div>
              </div>
              <Plus size={16} className="text-cyan-600 dark:text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>
      </section>

      {/* ── 3. Recent Transactions ──────────────────────────── */}
      <section aria-label="Recent Transactions">
        <div className="card p-4 sm:p-5 border border-[var(--border)] bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                Recent Transactions
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)]">
                {transactions.length} total
              </span>
            </div>

            <Link
              to="/transactions"
              id="view-all-transactions-link"
              className="inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline group"
            >
              <span>View All</span>
              <ChevronRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Transactions List */}
          {recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center mb-3 text-[var(--text-muted)]">
                <ArrowRightLeft size={22} />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                No transactions yet
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                Use the quick action buttons above to record your first expense, income, or transfer.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recentTransactions.map((tx) => {
                const isExpense = tx.type === 'expense'
                const isIncome = tx.type === 'income'
                const isTransfer = tx.type === 'transfer'

                const accountName = isTransfer
                  ? `${getAccountName(tx.accountId)} → ${getAccountName(tx.toAccountId || '')}`
                  : getAccountName(tx.accountId)

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 sm:py-3.5 hover:bg-[var(--bg-subtle)]/60 px-2 rounded-lg transition-colors group"
                  >
                    {/* Left: Icon & Title */}
                    <div className="flex items-center gap-3 min-w-0 pr-3">
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
                            className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
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
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p
                          className={`text-sm sm:text-base font-extrabold tabular ${
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

                      {/* Edit Action button */}
                      <button
                        onClick={() => setEditingTransaction(tx)}
                        aria-label={`Edit ${tx.title}`}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-brand-600 hover:bg-[var(--bg-subtle)] transition-colors opacity-70 group-hover:opacity-100"
                        title="Edit transaction"
                      >
                        <Edit3 size={15} />
                      </button>

                      {/* Delete Action button */}
                      <button
                        onClick={() => promptDelete(tx)}
                        aria-label={`Delete ${tx.title}`}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors opacity-70 group-hover:opacity-100"
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
      </section>

      {/* ── Modals ─────────────────────────────────────────── */}
      <AddExpenseModal open={expenseModalOpen} onOpenChange={setExpenseModalOpen} />
      <AddIncomeModal open={incomeModalOpen} onOpenChange={setIncomeModalOpen} />
      <TransferModal open={transferModalOpen} onOpenChange={setTransferModalOpen} />
      <RecordSalaryModal
        isOpen={salaryModalOpen}
        onClose={() => setSalaryModalOpen(false)}
        axisAccount={accounts.find((a) => a.name.toLowerCase().includes('axis') || a.type === 'salary')}
      />
      
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

      {/* ── Floating Action Button (Quick Add Anywhere) ────── */}
      <div className="fixed bottom-20 md:bottom-8 right-5 md:right-8 z-40">
        {/* Backdrop when FAB menu is open */}
        {fabOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-xs z-30 transition-opacity"
            onClick={() => setFabOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Speed Dial Menu Options */}
        {fabOpen && (
          <div
            id="home-fab-menu"
            className="relative z-40 mb-3 flex flex-col items-end gap-2.5 animate-in fade-in slide-in-from-bottom-3 duration-200"
          >
            {/* Record Salary */}
            <button
              type="button"
              id="fab-action-record-salary"
              onClick={() => {
                setFabOpen(false)
                setSalaryModalOpen(true)
              }}
              className="w-48 flex items-center justify-between px-3.5 py-2.5 rounded-2xl shadow-lg bg-[var(--bg-surface)] border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] transition-all transform hover:scale-102 active:scale-98 group"
            >
              <span className="text-xs font-semibold text-[var(--text-primary)]">Record Salary</span>
              <span className="p-2 rounded-xl bg-cyan-600 text-white shadow-xs group-hover:scale-110 transition-transform shrink-0">
                <Banknote size={16} />
              </span>
            </button>

            {/* Transfer Money */}
            <button
              type="button"
              id="fab-action-transfer-money"
              onClick={() => {
                setFabOpen(false)
                setTransferModalOpen(true)
              }}
              className="w-48 flex items-center justify-between px-3.5 py-2.5 rounded-2xl shadow-lg bg-[var(--bg-surface)] border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] transition-all transform hover:scale-102 active:scale-98 group"
            >
              <span className="text-xs font-semibold text-[var(--text-primary)]">Transfer Money</span>
              <span className="p-2 rounded-xl bg-purple-600 text-white shadow-xs group-hover:scale-110 transition-transform shrink-0">
                <ArrowRightLeft size={16} />
              </span>
            </button>

            {/* Add Income */}
            <button
              type="button"
              id="fab-action-add-income"
              onClick={() => {
                setFabOpen(false)
                setIncomeModalOpen(true)
              }}
              className="w-48 flex items-center justify-between px-3.5 py-2.5 rounded-2xl shadow-lg bg-[var(--bg-surface)] border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] transition-all transform hover:scale-102 active:scale-98 group"
            >
              <span className="text-xs font-semibold text-[var(--text-primary)]">Add Income</span>
              <span className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs group-hover:scale-110 transition-transform shrink-0">
                <TrendingUp size={16} />
              </span>
            </button>

            {/* Add Expense */}
            <button
              type="button"
              id="fab-action-add-expense"
              onClick={() => {
                setFabOpen(false)
                setExpenseModalOpen(true)
              }}
              className="w-48 flex items-center justify-between px-3.5 py-2.5 rounded-2xl shadow-lg bg-[var(--bg-surface)] border border-[var(--border)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] transition-all transform hover:scale-102 active:scale-98 group"
            >
              <span className="text-xs font-semibold text-[var(--text-primary)]">Add Expense</span>
              <span className="p-2 rounded-xl bg-rose-600 text-white shadow-xs group-hover:scale-110 transition-transform shrink-0">
                <TrendingDown size={16} />
              </span>
            </button>
          </div>
        )}

        {/* Floating Trigger Button with + symbol */}
        <button
          type="button"
          id="home-fab-toggle"
          aria-label={fabOpen ? 'Close quick actions menu' : 'Open quick actions menu'}
          aria-expanded={fabOpen}
          onClick={() => setFabOpen((prev) => !prev)}
          className={`relative z-40 flex items-center justify-center w-14 h-14 rounded-full shadow-xl transition-all transform hover:scale-105 active:scale-95 text-white ${
            fabOpen
              ? 'bg-neutral-800 dark:bg-neutral-700 rotate-45'
              : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/25 rotate-0'
          }`}
          title="Quick Add Anywhere"
        >
          <Plus size={24} strokeWidth={2.5} className="transition-transform duration-200" />
        </button>
      </div>
    </div>
  )
}
