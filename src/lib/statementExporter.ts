import type {
  Transaction,
  Account,
  ExportFilterOptions,
} from '@/types/finance'

export interface StatementSummaryData {
  periodLabel: string
  totalRecords: number
  totalInflow: number
  totalOutflow: number
  netChange: number
  openingBalance?: number
  closingBalance?: number
  categoryBreakdown: { category: string; amount: number; percentage: number }[]
}

// ── 1. Date Range Scoping & Filtering ────────────────────────

export function getDateRangeBounds(
  preset: ExportFilterOptions['dateRange'],
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() // 0-indexed

  const pad = (n: number) => String(n).padStart(2, '0')

  switch (preset) {
    case 'this_month': {
      const start = `${year}-${pad(month + 1)}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const end = `${year}-${pad(month + 1)}-${pad(lastDay)}`
      const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })
      return { startDate: start, endDate: end, label: monthName }
    }

    case 'last_month': {
      const prevDate = new Date(year, month - 1, 1)
      const pYear = prevDate.getFullYear()
      const pMonth = prevDate.getMonth()
      const start = `${pYear}-${pad(pMonth + 1)}-01`
      const lastDay = new Date(pYear, pMonth + 1, 0).getDate()
      const end = `${pYear}-${pad(pMonth + 1)}-${pad(lastDay)}`
      const monthName = prevDate.toLocaleString('default', { month: 'long', year: 'numeric' })
      return { startDate: start, endDate: end, label: monthName }
    }

    case 'last_3_months': {
      const threeMonthsAgo = new Date(year, month - 2, 1)
      const start = `${threeMonthsAgo.getFullYear()}-${pad(threeMonthsAgo.getMonth() + 1)}-01`
      const lastDay = new Date(year, month + 1, 0).getDate()
      const end = `${year}-${pad(month + 1)}-${pad(lastDay)}`
      return { startDate: start, endDate: end, label: 'Last 3 Months' }
    }

    case 'fy_current': {
      // Indian Financial Year: April 1 to March 31
      const fyStartYear = month >= 3 ? year : year - 1
      const fyEndYear = fyStartYear + 1
      const start = `${fyStartYear}-04-01`
      const end = `${fyEndYear}-03-31`
      return { startDate: start, endDate: end, label: `FY ${fyStartYear}-${String(fyEndYear).slice(2)}` }
    }

    case 'custom': {
      const start = customStart || `${year}-01-01`
      const end = customEnd || `${year}-${pad(month + 1)}-${pad(now.getDate())}`
      return { startDate: start, endDate: end, label: `${start} to ${end}` }
    }

    case 'all':
    default:
      return { startDate: '1970-01-01', endDate: '2099-12-31', label: 'All Time' }
  }
}

export function filterTransactionsForExport(
  transactions: Transaction[],
  options: ExportFilterOptions
): Transaction[] {
  const { startDate, endDate } = getDateRangeBounds(
    options.dateRange,
    options.startDate,
    options.endDate
  )

  return transactions
    .filter((tx) => {
      // Date filter
      if (tx.date < startDate || tx.date > endDate) return false

      // Account filter
      if (options.accountId && options.accountId !== 'all') {
        const matchesSource = tx.accountId === options.accountId
        const matchesDest = tx.type === 'transfer' && tx.toAccountId === options.accountId
        if (!matchesSource && !matchesDest) return false
      }

      // Type filter
      if (options.type && options.type !== 'all') {
        if (tx.type !== options.type) return false
      }

      return true
    })
    .sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date)
      return (b.time || '').localeCompare(a.time || '')
    })
}

// ── 2. Summary Statistics ────────────────────────────────────

export function calculateStatementSummary(
  filteredTxs: Transaction[],
  account?: Account,
  periodLabel = '',
  rangeStartDate?: string,
  allTransactions?: Transaction[]
): StatementSummaryData {
  let totalInflow = 0
  let totalOutflow = 0
  const categoryMap = new Map<string, number>()

  filteredTxs.forEach((tx) => {
    if (tx.type === 'income') {
      totalInflow += tx.amount
    } else if (tx.type === 'expense') {
      totalOutflow += tx.amount
      const cur = categoryMap.get(tx.category) || 0
      categoryMap.set(tx.category, cur + tx.amount)
    } else if (tx.type === 'transfer' && account) {
      if (tx.toAccountId === account.id) {
        totalInflow += tx.amount
      } else if (tx.accountId === account.id) {
        totalOutflow += tx.amount
      }
    }
  })

  const netChange = totalInflow - totalOutflow

  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: totalOutflow > 0 ? Math.round((amount / totalOutflow) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)

  let openingBalance: number | undefined = undefined
  let closingBalance: number | undefined = undefined

  if (account) {
    const effectiveOpeningDate = account.openingBalanceDate || account.createdAt?.slice(0, 10) || '1970-01-01'
    if (rangeStartDate) {
      // Calculate prior balance as of right before rangeStartDate
      const txSource = allTransactions || filteredTxs
      const priorTxs = txSource.filter((tx) => tx.date < rangeStartDate)
      const priorNet = priorTxs.reduce((sum, tx) => {
        if (tx.accountId === account.id) {
          if (tx.type === 'income') return sum + tx.amount
          if (tx.type === 'expense') return sum - tx.amount
          if (tx.type === 'transfer') return sum - tx.amount
        } else if (tx.toAccountId === account.id && tx.type === 'transfer') {
          return sum + tx.amount
        }
        return sum
      }, 0)

      const includesOpening = rangeStartDate >= effectiveOpeningDate
      openingBalance = Math.round(((includesOpening ? (account.openingBalance ?? 0) : 0) + priorNet) * 100) / 100
      closingBalance = Math.round((openingBalance + netChange) * 100) / 100
    } else {
      openingBalance = account.openingBalance
      closingBalance = account.balance
    }
  }

  return {
    periodLabel,
    totalRecords: filteredTxs.length,
    totalInflow: Math.round(totalInflow * 100) / 100,
    totalOutflow: Math.round(totalOutflow * 100) / 100,
    netChange: Math.round(netChange * 100) / 100,
    openingBalance,
    closingBalance,
    categoryBreakdown,
  }
}

// ── 3. CSV File Generator ────────────────────────────────────

export function generateCSVString(
  transactions: Transaction[],
  accounts: Account[]
): string {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]))

  const escapeCell = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const headers = [
    'Date',
    'Time',
    'Type',
    'Title / Description',
    'Category',
    'Amount (INR)',
    'Account',
    'Transfer Destination',
    'Payment Method',
    'Notes',
  ]

  const rows = transactions.map((tx) => [
    escapeCell(tx.date),
    escapeCell(tx.time || ''),
    escapeCell(tx.type.toUpperCase()),
    escapeCell(tx.title),
    escapeCell(tx.category),
    escapeCell(tx.amount.toFixed(2)),
    escapeCell(accountMap.get(tx.accountId) || tx.accountId),
    escapeCell(tx.toAccountId ? accountMap.get(tx.toAccountId) || tx.toAccountId : ''),
    escapeCell(tx.paymentMethod || ''),
    escapeCell(tx.notes || ''),
  ])

  // Include UTF-8 Byte Order Mark (BOM) so Excel respects UTF-8 encoding
  return '\uFEFF' + [headers.map(escapeCell).join(','), ...rows.map((r) => r.join(','))].join('\r\n')
}

// ── 4. Browser Download Triggers ─────────────────────────────

export function downloadCSVFile(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function downloadJSONFile(data: unknown, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.json') ? filename : `${filename}.json`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
