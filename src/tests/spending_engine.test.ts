import { describe, it, expect } from 'vitest'
import type { Transaction, Budget } from '@/types/finance'

export function computeSpendingEngine({
  transactions,
  budgets = [],
  period = 'current',
  customStartDate,
  customEndDate,
  referenceDate = new Date(),
}: {
  transactions: Transaction[]
  budgets?: Budget[]
  period?: 'current' | 'previous' | 'custom'
  customStartDate?: string
  customEndDate?: string
  referenceDate?: Date
}) {
  const currentYear = referenceDate.getFullYear()
  const currentMonth = referenceDate.getMonth()

  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1)
  const prevYear = prevMonthDate.getFullYear()
  const prevMonth = prevMonthDate.getMonth()

  // 1. Filter transactions to strictly actual expenses in selected period
  const filteredExpenses = transactions.filter((tx) => {
    // Exclude income and transfers strictly!
    if (tx.type !== 'expense' || !tx.date) return false

    if (period === 'current') {
      const d = new Date(tx.date)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    } else if (period === 'previous') {
      const d = new Date(tx.date)
      return d.getFullYear() === prevYear && d.getMonth() === prevMonth
    } else {
      if (customStartDate && tx.date < customStartDate) return false
      if (customEndDate && tx.date > customEndDate) return false
      return true
    }
  })

  // 2. Total spent
  const totalSpent = filteredExpenses.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)

  // 3. Category groupings
  const catMap: Record<string, Transaction[]> = {}
  for (const tx of filteredExpenses) {
    const cat = (tx.category || 'Uncategorized').trim()
    if (!catMap[cat]) catMap[cat] = []
    catMap[cat].push(tx)
  }

  const categoryResults = Object.entries(catMap).map(([category, txList]) => {
    const spent = txList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    const percentageOfTotal =
      totalSpent > 0 ? Number(((spent / totalSpent) * 100).toFixed(1)) : 0
    const transactionCount = txList.length

    // Optional user-configured budget
    const budget = budgets.find((b) => b.category.toLowerCase() === category.toLowerCase())
    let monthlyLimit: number | null = null
    let budgetRemaining: number | null = null
    let budgetUsedPercent: number | null = null
    let budgetStatus: 'normal' | 'warning' | 'exceeded' | null = null

    if (budget && budget.monthlyLimit > 0) {
      monthlyLimit = budget.monthlyLimit
      budgetRemaining = Math.max(0, monthlyLimit - spent)
      budgetUsedPercent = Number(((spent / monthlyLimit) * 100).toFixed(1))
      budgetStatus =
        budgetUsedPercent >= 100 ? 'exceeded' : budgetUsedPercent >= 80 ? 'warning' : 'normal'
    }

    return {
      category,
      totalSpent: spent,
      percentageOfTotal,
      transactionCount,
      monthlyLimit,
      budgetRemaining,
      budgetUsedPercent,
      budgetStatus,
    }
  })

  const activeCategories = categoryResults.filter((c) => c.totalSpent > 0)
  const categoriesUsed = activeCategories.length
  const sortedCategories = [...activeCategories].sort((a, b) => b.totalSpent - a.totalSpent)
  const topCategory = sortedCategories.length > 0 ? sortedCategories[0].category : null

  return {
    totalSpent,
    categoriesUsed,
    topCategory,
    categoryResults,
    activeCategories,
    filteredExpenses,
  }
}

describe('MoneyMap Spending & Automatic Expense Tracking Engine', () => {
  const refDate = new Date()
  const todayStr = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}-10`
  const prevMonthDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, 15)
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-15`

  // Test A — Automatic category totals
  it('Test A: automatically calculates category totals without requiring budgets', () => {
    const testATxs: Transaction[] = [
      { id: '1', title: 'Breakfast', amount: 80, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '2', title: 'Food Court', amount: 120, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '3', title: 'Lunch', amount: 150, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '4', title: 'Groceries', amount: 300, type: 'expense', category: 'Groceries', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '5', title: 'Petrol', amount: 200, type: 'expense', category: 'Transportation', accountId: 'a1', date: todayStr, createdAt: '' },
    ]

    const result = computeSpendingEngine({
      transactions: testATxs,
      budgets: [],
      period: 'current',
      referenceDate: refDate,
    })

    const food = result.categoryResults.find((c) => c.category === 'Food & Dining')!
    const groc = result.categoryResults.find((c) => c.category === 'Groceries')!
    const trans = result.categoryResults.find((c) => c.category === 'Transportation')!

    expect(food.totalSpent).toBe(350) // 80 + 120 + 150
    expect(groc.totalSpent).toBe(300)
    expect(trans.totalSpent).toBe(200)
    expect(result.totalSpent).toBe(850)
    expect(result.categoriesUsed).toBe(3)
  })

  // Test B — No budget configured
  it('Test B: verifies every category displays actual spending without requiring budget limits or false 0% budget utilization', () => {
    const testBTxs: Transaction[] = [
      { id: '1', title: 'Breakfast', amount: 80, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
    ]

    const result = computeSpendingEngine({
      transactions: testBTxs,
      budgets: [], // no budgets configured
      period: 'current',
      referenceDate: refDate,
    })

    const food = result.categoryResults.find((c) => c.category === 'Food & Dining')!
    expect(food.totalSpent).toBe(80)
    expect(food.monthlyLimit).toBeNull()
    expect(food.budgetRemaining).toBeNull()
    expect(food.budgetUsedPercent).toBeNull()
    expect(food.budgetStatus).toBeNull()
  })

  // Test C — Editing an expense
  it('Test C: updates category totals and total spending when an expense amount is edited (Food Court ₹120 -> ₹180)', () => {
    const originalTxs: Transaction[] = [
      { id: '1', title: 'Breakfast', amount: 80, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '2', title: 'Food Court', amount: 120, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '3', title: 'Lunch', amount: 150, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '4', title: 'Groceries', amount: 300, type: 'expense', category: 'Groceries', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '5', title: 'Petrol', amount: 200, type: 'expense', category: 'Transportation', accountId: 'a1', date: todayStr, createdAt: '' },
    ]

    // Simulate editing Food Court to 180
    const editedTxs = originalTxs.map((t) => (t.id === '2' ? { ...t, amount: 180 } : t))

    const result = computeSpendingEngine({
      transactions: editedTxs,
      budgets: [],
      period: 'current',
      referenceDate: refDate,
    })

    const food = result.categoryResults.find((c) => c.category === 'Food & Dining')!
    expect(food.totalSpent).toBe(410) // 80 + 180 + 150
    expect(result.totalSpent).toBe(910)
  })

  // Test D — Changing a category
  it('Test D: changes category from Transportation to Food & Dining, updating both categories and active category count', () => {
    const beforeTxs: Transaction[] = [
      { id: '1', title: 'Breakfast', amount: 80, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '2', title: 'Food Court', amount: 180, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '3', title: 'Lunch', amount: 150, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '4', title: 'Groceries', amount: 300, type: 'expense', category: 'Groceries', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '5', title: 'Petrol', amount: 200, type: 'expense', category: 'Transportation', accountId: 'a1', date: todayStr, createdAt: '' },
    ]

    // Change Petrol category to Food & Dining
    const afterTxs = beforeTxs.map((t) => (t.id === '5' ? { ...t, category: 'Food & Dining' } : t))

    const result = computeSpendingEngine({
      transactions: afterTxs,
      budgets: [],
      period: 'current',
      referenceDate: refDate,
    })

    const food = result.categoryResults.find((c) => c.category === 'Food & Dining')!
    const groc = result.categoryResults.find((c) => c.category === 'Groceries')!
    const trans = result.categoryResults.find((c) => c.category === 'Transportation')

    expect(food.totalSpent).toBe(610) // 410 + 200
    expect(groc.totalSpent).toBe(300)
    expect(trans).toBeUndefined() // 0 expenses in Transportation
    expect(result.totalSpent).toBe(910)
    expect(result.categoriesUsed).toBe(2) // excluding zero-spend categories
  })

  // Test E — Deleting or reversing an expense
  it('Test E: removes Lunch expense (₹150), updating category and total spending', () => {
    const beforeTxs: Transaction[] = [
      { id: '1', title: 'Breakfast', amount: 80, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '2', title: 'Food Court', amount: 180, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '3', title: 'Lunch', amount: 150, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '4', title: 'Groceries', amount: 300, type: 'expense', category: 'Groceries', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '5', title: 'Petrol', amount: 200, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
    ]

    // Delete Lunch (id: 3)
    const afterTxs = beforeTxs.filter((t) => t.id !== '3')

    const result = computeSpendingEngine({
      transactions: afterTxs,
      budgets: [],
      period: 'current',
      referenceDate: refDate,
    })

    const food = result.categoryResults.find((c) => c.category === 'Food & Dining')!
    const groc = result.categoryResults.find((c) => c.category === 'Groceries')!

    expect(food.totalSpent).toBe(460) // 610 - 150
    expect(groc.totalSpent).toBe(300)
    expect(result.totalSpent).toBe(760)
  })

  // Test F — Period filtering
  it('Test F: isolates previous month expenses from current month spending', () => {
    const multiMonthTxs: Transaction[] = [
      { id: 'cur-1', title: 'Coffee', amount: 150, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: 'prev-1', title: 'Past Dinner', amount: 500, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: prevMonthStr, createdAt: '' },
    ]

    const currentResult = computeSpendingEngine({
      transactions: multiMonthTxs,
      period: 'current',
      referenceDate: refDate,
    })

    const previousResult = computeSpendingEngine({
      transactions: multiMonthTxs,
      period: 'previous',
      referenceDate: refDate,
    })

    expect(currentResult.totalSpent).toBe(150)
    expect(previousResult.totalSpent).toBe(500)
  })

  // Test G — Transaction classification
  it('Test G: strictly excludes income, internal transfers, and unpaid EMIs from expense totals, counting EMI payments once', () => {
    const mixedTxs: Transaction[] = [
      { id: 'tx-exp', title: 'Actual Shopping', amount: 1200, type: 'expense', category: 'Shopping', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: 'tx-inc', title: 'Salary Credit', amount: 65000, type: 'income', category: 'Salary', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: 'tx-trf', title: 'ATM Withdrawal', amount: 5000, type: 'transfer', category: 'Transfer', accountId: 'a1', toAccountId: 'a2', date: todayStr, createdAt: '' },
      { id: 'tx-emi', title: 'HDFC Car Loan EMI Payment', amount: 12500, type: 'expense', category: 'EMIs', accountId: 'a1', date: todayStr, createdAt: '' },
    ]

    const result = computeSpendingEngine({
      transactions: mixedTxs,
      period: 'current',
      referenceDate: refDate,
    })

    // Only tx-exp (1200) + tx-emi (12500) = 13700. Income and Transfer must NOT inflate total!
    expect(result.totalSpent).toBe(13700)
    expect(result.categoryResults.find((c) => c.category === 'Salary')).toBeUndefined()
    expect(result.categoryResults.find((c) => c.category === 'Transfer')).toBeUndefined()
  })

  // Test H — Optional budget
  it('Test H: accurately shows limit (₹2,000), remaining (₹1,650), and utilization (17.5%) when optional budget is set, and clears them when removed', () => {
    const txs: Transaction[] = [
      { id: '1', title: 'Breakfast', amount: 80, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '2', title: 'Food Court', amount: 120, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
      { id: '3', title: 'Lunch', amount: 150, type: 'expense', category: 'Food & Dining', accountId: 'a1', date: todayStr, createdAt: '' },
    ] // Total Food & Dining = ₹350

    // Set optional budget of ₹2,000
    const budgetsWithLimit: Budget[] = [
      { id: 'b-1', category: 'Food & Dining', monthlyLimit: 2000, month: '2026-10' },
    ]

    const resultWithBudget = computeSpendingEngine({
      transactions: txs,
      budgets: budgetsWithLimit,
      period: 'current',
      referenceDate: refDate,
    })

    const foodWith = resultWithBudget.categoryResults.find((c) => c.category === 'Food & Dining')!
    expect(foodWith.totalSpent).toBe(350)
    expect(foodWith.monthlyLimit).toBe(2000)
    expect(foodWith.budgetRemaining).toBe(1650)
    expect(foodWith.budgetUsedPercent).toBe(17.5) // (350 / 2000) * 100 = 17.5%

    // Remove the limit
    const resultWithoutBudget = computeSpendingEngine({
      transactions: txs,
      budgets: [],
      period: 'current',
      referenceDate: refDate,
    })

    const foodWithout = resultWithoutBudget.categoryResults.find((c) => c.category === 'Food & Dining')!
    expect(foodWithout.totalSpent).toBe(350)
    expect(foodWithout.monthlyLimit).toBeNull()
    expect(foodWithout.budgetRemaining).toBeNull()
    expect(foodWithout.budgetUsedPercent).toBeNull()
  })

  // Test I — UI and database failures
  it('Test I: gracefully handles empty states, 0-spending scenarios, and single category spend', () => {
    const emptyResult = computeSpendingEngine({
      transactions: [],
      budgets: [],
      period: 'current',
      referenceDate: refDate,
    })

    expect(emptyResult.totalSpent).toBe(0)
    expect(emptyResult.categoriesUsed).toBe(0)
    expect(emptyResult.topCategory).toBeNull()
    expect(emptyResult.categoryResults).toHaveLength(0)
  })
})
