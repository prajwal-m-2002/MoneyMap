import type {
  Account,
  Transaction,
  MonthlyBudgetItem,
  MonthlyBudgetPlan,
  MonthlyBudgetAllocationProgress,
  MonthlyBudgetAllocationSummary,
} from '@/types/finance'

export const MONTHLY_BUDGET_STORAGE_KEY = 'moneymap_monthly_budget_allocation_v1'

/**
 * Standard default allocation plan matching the MoneyMap 5-account financial architecture.
 *
 * Rules:
 * 1. A budget allocation is a financial PLAN, never a transaction.
 * 2. Editing or saving a budget does not mutate account balances.
 * 3. Only completed, recorded transfers in the ledger change account balances.
 * 4. Transfers into Kotak savings are not counted as expenses or new income.
 */
export function getDefaultMonthlyBudgetPlan(
  accounts: Account[],
  expectedSalary = 27000,
  month = new Date().toISOString().slice(0, 7)
): MonthlyBudgetPlan {
  const findAcc = (matcher: RegExp, typeFallback?: string) =>
    accounts.find(
      (a) =>
        matcher.test(a.name.toLowerCase()) ||
        (typeFallback && a.type === typeFallback)
    )

  const kotak = findAcc(/kotak/, 'savings')
  const sbi = findAcc(/sbi|state bank/)
  const federal = findAcc(/federal/)
  const cash = findAcc(/cash/, 'cash')
  const axis = findAcc(/axis/, 'salary')

  const allocations: MonthlyBudgetItem[] = [
    {
      id: 'plan-kotak-savings',
      name: 'Kotak Savings',
      categoryKey: 'kotak_savings',
      targetAccountId: kotak?.id,
      plannedAmount: 8000,
      color: '#10b981', // Emerald
      notes: 'Monthly savings transfer from Axis to Kotak (not an expense)',
    },
    {
      id: 'plan-sbi-emi',
      name: 'SBI EMI & Small Purchases',
      categoryKey: 'sbi_emi_spending',
      targetAccountId: sbi?.id,
      plannedAmount: 5000,
      color: '#3b82f6', // Blue
      notes: 'Funded for loan EMIs, transportation, and small daily utility spend',
    },
    {
      id: 'plan-federal-purchases',
      name: 'Federal Bank Larger Purchases',
      categoryKey: 'federal_purchases',
      targetAccountId: federal?.id,
      plannedAmount: 4000,
      color: '#8b5cf6', // Violet
      notes: 'Dedicated fund for household shopping, gadgets, and larger expenses',
    },
    {
      id: 'plan-cash-spending',
      name: 'Cash Spending',
      categoryKey: 'cash_spending',
      targetAccountId: cash?.id,
      plannedAmount: 1000,
      color: '#f59e0b', // Amber
      notes: 'ATM withdrawals and physical petty cash spending',
    },
    {
      id: 'plan-axis-retained',
      name: 'Axis Retained Balance',
      categoryKey: 'axis_retained',
      targetAccountId: axis?.id,
      plannedAmount: 9000,
      color: '#06b6d4', // Cyan
      notes: 'Unallocated operational buffer kept in primary salary account',
    },
  ]

  return {
    month,
    expectedSalary,
    allocations,
    lastUpdated: new Date().toISOString(),
  }
}

export interface CalculateMonthlyBudgetAllocationParams {
  accounts: Account[]
  transactions: Transaction[]
  plan?: MonthlyBudgetPlan
  month?: string // YYYY-MM
}

/**
 * Calculates budget allocation progress against actual recorded ledger transactions.
 *
 * Strict Accounting Integrity:
 * - Budget is purely a planning framework; no account balances are altered.
 * - Shows Planned vs Transferred vs Spent vs Remaining.
 * - Transfers to savings accounts are never consolidated expenses.
 */
export function calculateMonthlyBudgetAllocation({
  accounts,
  transactions,
  plan,
  month = new Date().toISOString().slice(0, 7),
}: CalculateMonthlyBudgetAllocationParams): MonthlyBudgetAllocationSummary {
  const accountMap = new Map<string, Account>(accounts.map((a) => [a.id, a]))

  // Active plan fallback
  const activePlan = plan || getDefaultMonthlyBudgetPlan(accounts, 27000, month)

  // Filter transactions for target month
  const monthTransactions = transactions.filter((tx) => {
    if (!tx.date) return false
    return tx.date.startsWith(month)
  })

  // Detect salary received in target month
  let actualSalaryReceived = 0
  for (const tx of monthTransactions) {
    if (tx.type === 'income') {
      const isSalary =
        (tx.category || '').toLowerCase().includes('salary') ||
        (tx.title || '').toLowerCase().includes('salary')
      if (isSalary) {
        actualSalaryReceived += Number(tx.amount) || 0
      }
    }
  }

  // Fallback to expected if salary is yet to arrive
  const effectiveIncome =
    actualSalaryReceived > 0 ? actualSalaryReceived : activePlan.expectedSalary

  let totalPlanned = 0
  let totalTransferred = 0
  let totalSpent = 0

  const items: MonthlyBudgetAllocationProgress[] = activePlan.allocations.map((alloc) => {
    const plannedAmount = Math.round(alloc.plannedAmount || 0)
    totalPlanned += plannedAmount

    const targetAcc = alloc.targetAccountId ? accountMap.get(alloc.targetAccountId) : undefined
    const accName = targetAcc?.name || alloc.name

    let transferredAmount = 0
    let spentAmount = 0

    // Match transfers and expenses
    for (const tx of monthTransactions) {
      const amt = Number(tx.amount) || 0

      // Transfers into target account
      if (tx.type === 'transfer' && alloc.targetAccountId && tx.toAccountId === alloc.targetAccountId) {
        transferredAmount += amt
      }

      // Direct expenses from target account
      if (tx.type === 'expense' && alloc.targetAccountId && tx.accountId === alloc.targetAccountId) {
        spentAmount += amt
      }

      // For custom categories without target account, match category name
      if (!alloc.targetAccountId && alloc.categoryKey === 'custom') {
        const cat = (tx.category || '').toLowerCase()
        const allocName = alloc.name.toLowerCase()
        if (cat.includes(allocName) || allocName.includes(cat)) {
          if (tx.type === 'expense') spentAmount += amt
          if (tx.type === 'transfer') transferredAmount += amt
        }
      }
    }

    // Determine actual outflow metric depending on category semantics:
    // - Savings & funding categories measure transfer funding into the account
    // - Retained account measures spending from the account
    let actualOutflow = 0
    if (alloc.categoryKey === 'axis_retained') {
      actualOutflow = spentAmount
    } else {
      actualOutflow = transferredAmount > 0 ? transferredAmount : spentAmount
    }

    const remainingAmount = plannedAmount - actualOutflow
    const percentUsed =
      plannedAmount > 0 ? Math.round((actualOutflow / plannedAmount) * 100) : 0

    let status: MonthlyBudgetAllocationProgress['status'] = 'on_track'
    if (actualOutflow === 0) {
      status = 'unfunded'
    } else if (actualOutflow > plannedAmount) {
      status = 'exceeded'
    } else if (percentUsed >= 85 && percentUsed < 100) {
      status = 'approaching'
    } else {
      status = 'on_track'
    }

    totalTransferred += transferredAmount
    totalSpent += spentAmount

    return {
      id: alloc.id,
      name: alloc.name,
      categoryKey: alloc.categoryKey,
      targetAccountId: alloc.targetAccountId,
      targetAccountName: accName,
      plannedAmount,
      transferredAmount: Math.round(transferredAmount),
      spentAmount: Math.round(spentAmount),
      actualOutflow: Math.round(actualOutflow),
      remainingAmount: Math.round(remainingAmount),
      percentUsed,
      status,
      color: alloc.color || '#64748b',
    }
  })

  const unallocatedPlanned = Math.max(0, effectiveIncome - totalPlanned)

  return {
    month,
    expectedSalary: activePlan.expectedSalary,
    actualSalaryReceived: Math.round(actualSalaryReceived),
    totalPlanned: Math.round(totalPlanned),
    totalTransferred: Math.round(totalTransferred),
    totalSpent: Math.round(totalSpent),
    unallocatedPlanned: Math.round(unallocatedPlanned),
    items,
  }
}
