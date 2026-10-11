import { useState, useMemo } from 'react'
import {
  PieChart,
  Calendar,
  Layers,
  ArrowUpDown,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Target,
  Plus,
  Receipt,
  Utensils,
  ShoppingCart,
  Car,
  Home,
  Zap,
  ShoppingBag,
  Heart,
  Film,
  GraduationCap,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Folder,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { formatINR, formatDate } from '@/lib/utils'
import { DatePicker } from '@/components/ui/DatePicker'
import type { Transaction, CategoryBudgetProgress } from '@/types/finance'
import { SetBudgetModal } from '@/components/modals/SetBudgetModal'
import { AddExpenseModal } from '@/components/modals/AddExpenseModal'
import { EditTransactionModal } from '@/components/modals/EditTransactionModal'

// Helper for category icons
function getCategoryIcon(cat: string) {
  const lower = cat.toLowerCase()
  if (lower.includes('food') || lower.includes('dining') || lower.includes('breakfast') || lower.includes('lunch') || lower.includes('dinner') || lower.includes('snack')) {
    return <Utensils size={18} className="text-amber-500" />
  }
  if (lower.includes('grocer')) {
    return <ShoppingCart size={18} className="text-emerald-500" />
  }
  if (lower.includes('transport') || lower.includes('travel') || lower.includes('petrol') || lower.includes('fuel') || lower.includes('uber') || lower.includes('cab')) {
    return <Car size={18} className="text-blue-500" />
  }
  if (lower.includes('rent') || lower.includes('house') || lower.includes('housing')) {
    return <Home size={18} className="text-indigo-500" />
  }
  if (lower.includes('util') || lower.includes('bill') || lower.includes('electric') || lower.includes('recharge') || lower.includes('internet')) {
    return <Zap size={18} className="text-yellow-500" />
  }
  if (lower.includes('shop')) {
    return <ShoppingBag size={18} className="text-rose-500" />
  }
  if (lower.includes('health') || lower.includes('medical') || lower.includes('pharmacy')) {
    return <Heart size={18} className="text-red-500" />
  }
  if (lower.includes('entertain') || lower.includes('movie') || lower.includes('ott')) {
    return <Film size={18} className="text-purple-500" />
  }
  if (lower.includes('edu')) {
    return <GraduationCap size={18} className="text-teal-500" />
  }
  return <Folder size={18} className="text-slate-500" />
}

type PeriodMode = 'current' | 'previous' | 'custom'
type SortMode = 'amount_desc' | 'amount_asc' | 'name_asc' | 'count_desc'
type ViewMode = 'category' | 'name'

export default function Spending() {
  const { transactions, accounts, budgets } = useFinance()

  // Date and filter states
  const now = new Date()
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [periodMode, setPeriodMode] = useState<PeriodMode>('current')
  const [customStartDate, setCustomStartDate] = useState<string>(`${currentMonthStr}-01`)
  const [customEndDate, setCustomEndDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // View & sort states
  const [viewMode, setViewMode] = useState<ViewMode>('category')
  const [sortMode, setSortMode] = useState<SortMode>('amount_desc')
  const [showZeroSpend, setShowZeroSpend] = useState<boolean>(false)

  // Modals state
  const [budgetModalOpen, setBudgetModalOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<CategoryBudgetProgress | null>(null)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [expandedName, setExpandedName] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  // 1. Filter transactions by Period, Account & Type='expense'
  const filteredExpenses = useMemo(() => {
    return transactions.filter((tx) => {
      // Must be actual expense (strictly exclude income & transfers!)
      if (tx.type !== 'expense' || !tx.date) return false

      // Account filter
      if (selectedAccountId !== 'all' && tx.accountId !== selectedAccountId) {
        return false
      }

      // Date filtering
      if (periodMode === 'current') {
        return tx.date.startsWith(currentMonthStr)
      } else if (periodMode === 'previous') {
        const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`
        return tx.date.startsWith(prevMonthStr)
      } else {
        // Custom date range
        if (customStartDate && tx.date < customStartDate) return false
        if (customEndDate && tx.date > customEndDate) return false
        return true
      }
    })
  }, [transactions, periodMode, prevMonthDate, currentMonthStr, customStartDate, customEndDate, selectedAccountId])

  // 2. Ledger Coverage Detection
  const earliestCoverageDate = useMemo(() => {
    let earliest: string | null = null
    for (const acc of accounts) {
      const d = acc.openingBalanceDate || acc.trackingStartDate || acc.ledgerCoverageStartDate
      if (d && (!earliest || d < earliest)) {
        earliest = d
      }
    }
    for (const tx of transactions) {
      if (tx.date && (!earliest || tx.date < earliest)) {
        earliest = tx.date
      }
    }
    return earliest || '2026-09-25'
  }, [accounts, transactions])

  const { isBeforeCoverage, isPartialCoverage, activeLedgerDays } = useMemo(() => {
    if (periodMode === 'current') {
      const startStr = `${currentMonthStr}-01`
      const isBefore = currentMonthStr < earliestCoverageDate.slice(0, 7)
      const isPartial = startStr < earliestCoverageDate
      // For current period: active days start from earliestCoverageDate to today
      const covDate = new Date(earliestCoverageDate)
      const curToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const diffMs = curToday.getTime() - covDate.getTime()
      const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1)
      const activeDays = isPartial ? Math.min(now.getDate(), diffDays) : now.getDate()
      return { isBeforeCoverage: isBefore, isPartialCoverage: isPartial, activeLedgerDays: activeDays }
    } else if (periodMode === 'previous') {
      const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`
      const isBefore = prevMonthStr < earliestCoverageDate.slice(0, 7)
      return { isBeforeCoverage: isBefore, isPartialCoverage: false, activeLedgerDays: 0 }
    } else {
      const isBefore = customEndDate < earliestCoverageDate
      const isPartial = !isBefore && customStartDate < earliestCoverageDate
      let activeDays = 1
      if (!isBefore) {
        const effStart = customStartDate < earliestCoverageDate ? earliestCoverageDate : customStartDate
        const start = new Date(effStart)
        const end = new Date(customEndDate)
        const diffMs = Math.abs(end.getTime() - start.getTime())
        activeDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1)
      }
      return { isBeforeCoverage: isBefore, isPartialCoverage: isPartial, activeLedgerDays: activeDays }
    }
  }, [periodMode, currentMonthStr, earliestCoverageDate, prevMonthDate, customStartDate, customEndDate, now])

  // Summary Metrics Calculation
  const totalSpent = useMemo(() => {
    if (isBeforeCoverage) return 0
    return filteredExpenses.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
  }, [filteredExpenses, isBeforeCoverage])

  const dailyAverageSpent = useMemo(() => {
    if (isBeforeCoverage || activeLedgerDays <= 0) return 0
    return Math.round(totalSpent / activeLedgerDays)
  }, [totalSpent, isBeforeCoverage, activeLedgerDays])

  // 3. Category Spending Aggregation
  const categorySpendingList = useMemo(() => {
    const map: Record<string, Transaction[]> = {}

    // Group actual transactions
    for (const tx of filteredExpenses) {
      const cat = (tx.category || 'Uncategorized').trim()
      if (!map[cat]) map[cat] = []
      map[cat].push(tx)
    }

    // List of all known categories to check for zero-spend
    const standardCategories = [
      'Food & Dining',
      'Snacks',
      'Groceries',
      'Transportation',
      'Rent & Housing',
      'Bills & Utilities',
      'Shopping',
      'Health & Medical',
      'Entertainment',
      'Education',
      'Personal Care',
      'Other',
    ]

    for (const cat of standardCategories) {
      if (!map[cat]) map[cat] = []
    }

    // Also include any user-created budgets
    for (const b of budgets) {
      const bCat = b.category.trim()
      if (!map[bCat]) map[bCat] = []
    }

    // Map into detailed structure
    let list = Object.entries(map).map(([cat, txs]) => {
      const spent = txs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
      const percentageOfTotal =
        totalSpent > 0 ? Number(((spent / totalSpent) * 100).toFixed(1)) : 0
      const transactionCount = txs.length

      // Check for user-configured optional budget
      const matchingBudget = budgets.find(
        (b) => b.category.toLowerCase() === cat.toLowerCase()
      )

      let monthlyLimit: number | null = null
      let budgetRemaining: number | null = null
      let budgetUsedPercent: number | null = null
      let budgetStatus: 'normal' | 'warning' | 'exceeded' | null = null
      let budgetId: string | null = null

      if (matchingBudget && matchingBudget.monthlyLimit > 0) {
        monthlyLimit = matchingBudget.monthlyLimit
        budgetRemaining = Math.max(0, monthlyLimit - spent)
        // Documented rounding rule: 1 decimal place
        budgetUsedPercent = Number(((spent / monthlyLimit) * 100).toFixed(1))
        budgetStatus =
          budgetUsedPercent >= 100 ? 'exceeded' : budgetUsedPercent >= 80 ? 'warning' : 'normal'
        budgetId = matchingBudget.id
      }

      return {
        category: cat,
        totalSpent: spent,
        percentageOfTotal,
        transactionCount,
        transactions: txs,
        monthlyLimit,
        budgetRemaining,
        budgetUsedPercent,
        budgetStatus,
        budgetId,
      }
    })

    // Search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      list = list.filter((item) => item.category.toLowerCase().includes(query))
    }

    // Sorting
    if (sortMode === 'amount_desc') {
      list.sort((a, b) => b.totalSpent - a.totalSpent)
    } else if (sortMode === 'amount_asc') {
      list.sort((a, b) => a.totalSpent - b.totalSpent)
    } else if (sortMode === 'name_asc') {
      list.sort((a, b) => a.category.localeCompare(b.category))
    } else if (sortMode === 'count_desc') {
      list.sort((a, b) => b.transactionCount - a.transactionCount)
    }

    return list
  }, [filteredExpenses, totalSpent, budgets, searchQuery, sortMode])

  // Active spending categories (> 0 spent) and zero spending categories
  const activeCategoryList = categorySpendingList.filter((c) => c.totalSpent > 0)
  const zeroCategoryList = categorySpendingList.filter((c) => c.totalSpent === 0)

  // Top category
  const topCategory = activeCategoryList.length > 0 ? activeCategoryList[0] : null
  const categoriesUsedCount = activeCategoryList.length

  // 4. Spending by Name Aggregation
  const nameSpendingList = useMemo(() => {
    const nameMap: Record<string, { category: string; transactions: Transaction[] }> = {}

    for (const tx of filteredExpenses) {
      const name = (tx.title || 'Untitled Expense').trim()
      if (!nameMap[name]) {
        nameMap[name] = { category: tx.category, transactions: [] }
      }
      nameMap[name].transactions.push(tx)
    }

    let list = Object.entries(nameMap).map(([name, data]) => {
      const spent = data.transactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
      const percentageOfTotal =
        totalSpent > 0 ? Number(((spent / totalSpent) * 100).toFixed(1)) : 0
      return {
        name,
        category: data.category,
        totalSpent: spent,
        percentageOfTotal,
        transactionCount: data.transactions.length,
        transactions: data.transactions,
      }
    })

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      list = list.filter(
        (item) =>
          item.name.toLowerCase().includes(query) || item.category.toLowerCase().includes(query)
      )
    }

    if (sortMode === 'amount_desc') {
      list.sort((a, b) => b.totalSpent - a.totalSpent)
    } else if (sortMode === 'amount_asc') {
      list.sort((a, b) => a.totalSpent - b.totalSpent)
    } else if (sortMode === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sortMode === 'count_desc') {
      list.sort((a, b) => b.transactionCount - a.transactionCount)
    }

    return list
  }, [filteredExpenses, totalSpent, searchQuery, sortMode])

  const currentPeriodLabel =
    periodMode === 'current'
      ? `${new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(now)} (Current)`
      : periodMode === 'previous'
      ? `${new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric' }).format(prevMonthDate)} (Previous)`
      : `${formatDate(customStartDate)} to ${formatDate(customEndDate)}`

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-slide-up">
      {/* ── Page Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Spending
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-0.5">
            See where your money goes, automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            id="spending-add-expense-btn"
            onClick={() => setExpenseModalOpen(true)}
            className="btn-primary py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={15} />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* ── Period Selector & Controls ───────────────────────── */}
      <div className="card p-4 border border-[var(--border)] bg-[var(--bg-surface)] space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Period Pill Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setPeriodMode('current')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                periodMode === 'current'
                  ? 'bg-brand-500 text-white shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Current Month
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('previous')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                periodMode === 'previous'
                  ? 'bg-brand-500 text-white shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Previous Month
            </button>
            <button
              type="button"
              onClick={() => setPeriodMode('custom')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                periodMode === 'custom'
                  ? 'bg-brand-500 text-white shadow-2xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Custom Range
            </button>
          </div>

          {/* Account Filter */}
          <div className="flex items-center gap-2 text-xs">
            <label className="text-[var(--text-secondary)] font-semibold hidden sm:inline">
              Account:
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] font-medium text-xs focus:outline-none"
            >
              <option value="all">All Accounts</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Custom Date Range Picker when Custom selected */}
        {periodMode === 'custom' && (
          <div className="pt-2 border-t border-[var(--border)] flex flex-wrap items-center gap-3 text-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)] font-medium">From:</span>
              <DatePicker
                value={customStartDate}
                onChange={setCustomStartDate}
                placeholder="From date"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)] font-medium">To:</span>
              <DatePicker
                value={customEndDate}
                onChange={setCustomEndDate}
                placeholder="To date"
              />
            </div>
          </div>
        )}
        {/* Ledger Coverage Banners */}
        {isBeforeCoverage && (
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-3 animate-fade-in">
            <AlertTriangle size={18} className="shrink-0 text-amber-500" />
            <div>
              <p className="font-bold">Ledger coverage unavailable for this period</p>
              <p className="mt-0.5 text-amber-600/90 dark:text-amber-400/90">
                Historical ledger tracking begins on October 10, 2026 with opening balances effective at the start of that date. Transactions before this date are not recorded.
              </p>
            </div>
          </div>
        )}
        {isPartialCoverage && !isBeforeCoverage && (
          <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-3 animate-fade-in">
            <AlertCircle size={18} className="shrink-0 text-blue-500" />
            <div>
              <p className="font-bold">Partial ledger coverage for this period</p>
              <p className="mt-0.5 text-blue-600/90 dark:text-blue-400/90">
                Transactions are recorded starting from October 10, 2026. Prior dates in this month are unrecorded, and daily averages are calibrated across active ledger days.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Cards ────────────────────────────────────── */}
      <section aria-label="Spending Summary">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Spent */}
          <div className="card p-5 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Total Spent
              </span>
              <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                <TrendingDown size={18} />
              </span>
            </div>
            {isBeforeCoverage ? (
              <>
                <p className="text-xl font-bold text-zinc-400 dark:text-zinc-500 tracking-tight mt-2">
                  No historical data
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1">
                  Ledger unavailable
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight mt-2 tabular">
                  {formatINR(totalSpent)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                  {currentPeriodLabel} {isPartialCoverage && <span className="text-amber-500 font-semibold">(Partial)</span>}
                </p>
              </>
            )}
          </div>

          {/* 2. Top Spending Category */}
          <div className="card p-5 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Top Category
              </span>
              <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                <Sparkles size={18} />
              </span>
            </div>
            {isBeforeCoverage ? (
              <>
                <p className="text-xl font-bold text-zinc-400 dark:text-zinc-500 tracking-tight mt-2 truncate">
                  None
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  No historical data
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight mt-2 truncate">
                  {topCategory ? topCategory.category : 'None'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 tabular">
                  {topCategory
                    ? `${formatINR(topCategory.totalSpent)} (${topCategory.percentageOfTotal}%)`
                    : 'No expenses yet'}
                </p>
              </>
            )}
          </div>

          {/* 3. Number of Categories Used */}
          <div className="card p-5 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Categories Used
              </span>
              <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                <Layers size={18} />
              </span>
            </div>
            <p className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight mt-2 tabular">
              {isBeforeCoverage ? 0 : categoriesUsedCount}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {isBeforeCoverage ? 'Coverage begins Oct 10' : 'Active spending streams'}
            </p>
          </div>

          {/* 4. Daily Average Spending */}
          <div className="card p-5 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                Daily Average
              </span>
              <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400">
                <Calendar size={18} />
              </span>
            </div>
            {isBeforeCoverage ? (
              <>
                <p className="text-xl font-bold text-zinc-400 dark:text-zinc-500 tracking-tight mt-2">
                  Unavailable
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  No ledger coverage
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-teal-600 dark:text-teal-400 tracking-tight mt-2 tabular">
                  {formatINR(dailyAverageSpent)}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1 tabular">
                  Across {activeLedgerDays} active ledger day{activeLedgerDays === 1 ? '' : 's'}
                </p>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── View Toggle, Search & Sort Bar ────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* View Mode Toggle: By Category vs By Name */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border)] self-start">
          <button
            type="button"
            onClick={() => setViewMode('category')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === 'category'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Layers size={14} />
            <span>Spending by Category</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('name')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all ${
              viewMode === 'name'
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Receipt size={14} />
            <span>Spending by Name</span>
          </button>
        </div>

        {/* Search & Sort controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="text"
              placeholder={viewMode === 'category' ? 'Filter category...' : 'Filter expense name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none w-44"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <ArrowUpDown size={14} />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="px-2 py-1.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] font-medium text-xs focus:outline-none"
            >
              <option value="amount_desc">Amount (High to Low)</option>
              <option value="amount_asc">Amount (Low to High)</option>
              <option value="name_asc">Name (A to Z)</option>
              <option value="count_desc">Transactions Count</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: SPENDING BY CATEGORY ───────────────────────── */}
      {viewMode === 'category' && (
        <div className="space-y-4">
          {isBeforeCoverage ? (
            <div className="card p-12 text-center border border-[var(--border)] bg-[var(--bg-surface)] flex flex-col items-center">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 mb-3">
                <PieChart size={24} />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Ledger coverage unavailable
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                Historical transactions are not recorded before October 10, 2026. Select Current Month or a range starting on or after October 10, 2026 to see spending.
              </p>
            </div>
          ) : activeCategoryList.length === 0 ? (
            <div className="card p-12 text-center border border-[var(--border)] bg-[var(--bg-surface)] flex flex-col items-center">
              <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] text-[var(--text-muted)] mb-3">
                <PieChart size={24} />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                No expenses in this period
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                Add your expenses or adjust the date filter to see your category breakdown.
              </p>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(true)}
                className="mt-4 btn-primary px-4 py-2 text-xs font-bold rounded-xl"
              >
                + Record Expense
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCategoryList.map((item) => {
                const isExpanded = expandedCategory === item.category
                const hasBudget = item.monthlyLimit !== null && item.monthlyLimit > 0

                return (
                  <div
                    key={item.category}
                    className="card p-4 sm:p-5 border border-[var(--border)] bg-[var(--bg-surface)] hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Icon, Category Name, Spent Amount */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] shrink-0">
                            {getCategoryIcon(item.category)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] truncate">
                              {item.category}
                            </h3>
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {item.transactionCount} transaction{item.transactionCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] tabular">
                            {formatINR(item.totalSpent)}
                          </p>
                          <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 tabular">
                            {item.percentageOfTotal}% of total spend
                          </span>
                        </div>
                      </div>

                      {/* Share of Actual Spending Progress Bar */}
                      <div className="mt-3.5 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span>Share of total spending</span>
                          <span className="font-semibold tabular">{item.percentageOfTotal}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, item.percentageOfTotal)}%` }}
                            className="h-full bg-brand-500 rounded-full transition-all duration-300"
                          />
                        </div>
                      </div>

                      {/* Optional Configured Budget Pill / Section */}
                      {hasBudget ? (
                        <div
                          className={`mt-3 p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                            item.budgetStatus === 'exceeded'
                              ? 'bg-rose-50/70 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                              : item.budgetStatus === 'warning'
                              ? 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                              : 'bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-bold flex items-center gap-1 text-[11px]">
                              {item.budgetStatus === 'exceeded' && <AlertCircle size={12} />}
                              {item.budgetStatus === 'warning' && <AlertTriangle size={12} />}
                              {item.budgetStatus === 'normal' && <CheckCircle2 size={12} />}
                              Monthly Limit: {formatINR(item.monthlyLimit!)}
                            </span>
                            <p className="text-[10px] opacity-85 mt-0.5 tabular">
                              {item.budgetStatus === 'exceeded'
                                ? `Exceeded by ${formatINR(item.totalSpent - item.monthlyLimit!)} (${item.budgetUsedPercent}%)`
                                : `${formatINR(item.budgetRemaining!)} remaining (${item.budgetUsedPercent}% used)`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBudget({
                                category: item.category,
                                monthlyLimit: item.monthlyLimit!,
                                spentThisMonth: item.totalSpent,
                                remaining: item.budgetRemaining ?? 0,
                                spentPercentage: Math.round(item.budgetUsedPercent ?? 0),
                                status: (item.budgetStatus as any) || 'normal',
                                budgetId: item.budgetId || undefined,
                              })
                              setBudgetModalOpen(true)
                            }}
                            className="px-2 py-1 text-[10px] font-bold rounded-lg bg-white/80 dark:bg-black/30 border border-current shrink-0 hover:opacity-80"
                          >
                            Edit Limit
                          </button>
                        </div>
                      ) : (
                        <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1">
                          <span>No budget limit set</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBudget({
                                category: item.category,
                                monthlyLimit: 5000,
                                spentThisMonth: item.totalSpent,
                                remaining: 5000,
                                spentPercentage: 0,
                                status: 'normal',
                              })
                              setBudgetModalOpen(true)
                            }}
                            className="text-[10px] font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                          >
                            <Target size={11} /> + Set Limit
                          </button>
                        </div>
                      )}
                    </div>

                    {/* View Contributing Transactions Dropdown / Button */}
                    <div className="mt-4 pt-3 border-t border-[var(--border)]">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedCategory(isExpanded ? null : item.category)
                        }
                        className="w-full flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        <span>
                          {isExpanded ? 'Hide' : 'View'} {item.transactions.length} Transaction
                          {item.transactions.length === 1 ? '' : 's'}
                        </span>
                        {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                      </button>

                      {/* Expandable Transactions Drilldown */}
                      {isExpanded && (
                        <div className="mt-3 divide-y divide-[var(--border)] pt-2 border-t border-[var(--border)] max-h-56 overflow-y-auto animate-fade-in">
                          {item.transactions.map((tx) => (
                            <div
                              key={tx.id}
                              className="py-2 flex items-center justify-between text-xs hover:bg-[var(--bg-subtle)] px-1 rounded-md transition-colors"
                            >
                              <div className="min-w-0 pr-2">
                                <p className="font-bold text-[var(--text-primary)] truncate">
                                  {tx.title}
                                </p>
                                <span className="text-[10px] text-[var(--text-muted)]">
                                  {formatDate(tx.date)} {tx.paymentMethod ? `• ${tx.paymentMethod}` : ''}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-bold text-rose-600 dark:text-rose-400 tabular">
                                  -{formatINR(tx.amount)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setEditingTx(tx)}
                                  className="text-[10px] text-[var(--text-muted)] hover:text-brand-600"
                                >
                                  Edit
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Collapsible Zero-Spend Categories Section */}
          {zeroCategoryList.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowZeroSpend(!showZeroSpend)}
                className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors py-2"
              >
                <span>
                  {showZeroSpend ? 'Hide' : 'Show'} {zeroCategoryList.length} Categories with ₹0
                  Spending
                </span>
                {showZeroSpend ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showZeroSpend && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 pt-2 animate-fade-in">
                  {zeroCategoryList.map((z) => (
                    <div
                      key={z.category}
                      className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)]/60 text-xs flex items-center justify-between"
                    >
                      <span className="text-[var(--text-muted)] truncate">{z.category}</span>
                      <span className="font-semibold text-[var(--text-secondary)] tabular">₹0</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── VIEW 2: SPENDING BY NAME ───────────────────────────── */}
      {viewMode === 'name' && (
        <div className="space-y-3">
          {isBeforeCoverage ? (
            <div className="card p-12 text-center border border-[var(--border)] bg-[var(--bg-surface)] flex flex-col items-center">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 mb-3">
                <Receipt size={24} />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                Ledger coverage unavailable
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                Historical transactions are not recorded before October 10, 2026. Select Current Month or a range starting on or after October 10, 2026 to see expense names.
              </p>
            </div>
          ) : nameSpendingList.length === 0 ? (
            <div className="card p-12 text-center border border-[var(--border)] bg-[var(--bg-surface)] flex flex-col items-center">
              <div className="p-3 rounded-2xl bg-[var(--bg-subtle)] text-[var(--text-muted)] mb-3">
                <Receipt size={24} />
              </div>
              <p className="text-sm font-bold text-[var(--text-primary)]">
                No expense names found
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                Recorded expense titles will automatically group here with totals.
              </p>
            </div>
          ) : (
            <div className="card divide-y divide-[var(--border)] border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden">
              {nameSpendingList.map((item) => {
                const isExpanded = expandedName === item.name

                return (
                  <div key={item.name} className="p-3.5 hover:bg-[var(--bg-subtle)]/40 transition-colors">
                    <div
                      onClick={() => setExpandedName(isExpanded ? null : item.name)}
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-3">
                        <div className="p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] shrink-0">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                            <span className="px-1.5 py-0.2 rounded-md bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border)] text-[10px]">
                              {item.category}
                            </span>
                            <span>•</span>
                            <span>
                              {item.transactionCount} time{item.transactionCount === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-sm sm:text-base font-extrabold text-rose-600 dark:text-rose-400 tabular">
                          {formatINR(item.totalSpent)}
                        </p>
                        <span className="text-[11px] font-semibold text-[var(--text-muted)] tabular">
                          {item.percentageOfTotal}% of total spend
                        </span>
                      </div>
                    </div>

                    {/* Drilldown transactions for this name */}
                    {isExpanded && (
                      <div className="mt-3 pt-2 border-t border-[var(--border)] space-y-1.5 animate-fade-in pl-11">
                        {item.transactions.map((tx) => (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between text-xs py-1 text-[var(--text-secondary)]"
                          >
                            <span>
                              {formatDate(tx.date)} {tx.paymentMethod ? `(${tx.paymentMethod})` : ''}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-rose-600 dark:text-rose-400 tabular">
                                -{formatINR(tx.amount)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingTx(tx)}
                                className="text-[10px] text-brand-600 hover:underline"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────── */}
      <AddExpenseModal open={expenseModalOpen} onOpenChange={setExpenseModalOpen} />

      <SetBudgetModal
        open={budgetModalOpen}
        onOpenChange={setBudgetModalOpen}
        existingBudget={editingBudget}
      />

      <EditTransactionModal
        transaction={editingTx}
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
      />
    </div>
  )
}
