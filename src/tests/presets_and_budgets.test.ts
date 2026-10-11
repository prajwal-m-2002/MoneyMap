import { describe, it, expect } from 'vitest'
import type { Budget, Preset, Transaction, CategoryBudgetProgress } from '@/types/finance'

// Helper function mirroring FinanceContext categoryBudgets calculation
export function calculateCategoryBudgets(
  budgets: Budget[],
  transactions: Transaction[],
  currentDate = new Date()
): CategoryBudgetProgress[] {
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const categorySpending: Record<string, number> = {}
  for (const tx of transactions) {
    if (tx.type !== 'expense' || !tx.date) continue
    const d = new Date(tx.date)
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      const cat = tx.category.trim()
      categorySpending[cat] = (categorySpending[cat] || 0) + (Number(tx.amount) || 0)
    }
  }

  return budgets.map((b) => {
    let spent = categorySpending[b.category] || 0
    if (spent === 0) {
      const lowerCat = b.category.toLowerCase()
      for (const [catName, amt] of Object.entries(categorySpending)) {
        if (
          catName.toLowerCase() === lowerCat ||
          catName.toLowerCase().includes(lowerCat) ||
          lowerCat.includes(catName.toLowerCase())
        ) {
          spent += amt
        }
      }
    }

    const limit = Number(b.monthlyLimit) || 1
    const spentPercentage = Math.round((spent / limit) * 100)
    const remaining = Math.max(0, limit - spent)
    let status: 'normal' | 'warning' | 'exceeded' = 'normal'
    if (spentPercentage >= 100) {
      status = 'exceeded'
    } else if (spentPercentage >= 80) {
      status = 'warning'
    }

    return {
      category: b.category,
      monthlyLimit: limit,
      spentThisMonth: spent,
      remaining,
      spentPercentage,
      status,
      budgetId: b.id,
    }
  })
}

describe('Phase 7 — Presets, Categories, and Budgets Engine', () => {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`

  const sampleBudgets: Budget[] = [
    { id: 'b-1', category: 'Food & Dining', monthlyLimit: 10000, month: '2026-10' },
    { id: 'b-2', category: 'Transportation', monthlyLimit: 5000, month: '2026-10' },
    { id: 'b-3', category: 'Shopping', monthlyLimit: 8000, month: '2026-10' },
  ]

  it('correctly reports "normal" status when category spending is < 80%', () => {
    const txs: Transaction[] = [
      {
        id: 't-1',
        type: 'expense',
        amount: 4500, // 4,500 of 10,000 = 45%
        title: 'Dinner',
        category: 'Food & Dining',
        accountId: 'acc-1',
        date: todayStr,
        createdAt: new Date().toISOString(),
      },
    ]

    const result = calculateCategoryBudgets(sampleBudgets, txs, now)
    const food = result.find((r) => r.category === 'Food & Dining')!

    expect(food.spentThisMonth).toBe(4500)
    expect(food.spentPercentage).toBe(45)
    expect(food.remaining).toBe(5500)
    expect(food.status).toBe('normal')
  })

  it('triggers "warning" status when category spending reaches 80% to 99%', () => {
    const txs: Transaction[] = [
      {
        id: 't-2',
        type: 'expense',
        amount: 4200, // 4,200 of 5,000 = 84%
        title: 'Fuel & Cab',
        category: 'Transportation',
        accountId: 'acc-1',
        date: todayStr,
        createdAt: new Date().toISOString(),
      },
    ]

    const result = calculateCategoryBudgets(sampleBudgets, txs, now)
    const transport = result.find((r) => r.category === 'Transportation')!

    expect(transport.spentThisMonth).toBe(4200)
    expect(transport.spentPercentage).toBe(84)
    expect(transport.remaining).toBe(800)
    expect(transport.status).toBe('warning')
  })

  it('triggers "exceeded" status when category spending reaches or surpasses 100%', () => {
    const txs: Transaction[] = [
      {
        id: 't-3',
        type: 'expense',
        amount: 8500, // 8,500 of 8,000 = 106%
        title: 'New Shoes & Watch',
        category: 'Shopping',
        accountId: 'acc-1',
        date: todayStr,
        createdAt: new Date().toISOString(),
      },
    ]

    const result = calculateCategoryBudgets(sampleBudgets, txs, now)
    const shopping = result.find((r) => r.category === 'Shopping')!

    expect(shopping.spentThisMonth).toBe(8500)
    expect(shopping.spentPercentage).toBe(106)
    expect(shopping.remaining).toBe(0)
    expect(shopping.status).toBe('exceeded')
  })

  it('excludes transfers and income from category budget consumption', () => {
    const txs: Transaction[] = [
      {
        id: 't-inc',
        type: 'income',
        amount: 15000,
        title: 'Salary Bonus',
        category: 'Food & Dining', // even if category name matches
        accountId: 'acc-1',
        date: todayStr,
        createdAt: new Date().toISOString(),
      },
      {
        id: 't-xfer',
        type: 'transfer',
        amount: 5000,
        title: 'Savings Move',
        category: 'Food & Dining',
        accountId: 'acc-1',
        toAccountId: 'acc-2',
        date: todayStr,
        createdAt: new Date().toISOString(),
      },
    ]

    const result = calculateCategoryBudgets(sampleBudgets, txs, now)
    const food = result.find((r) => r.category === 'Food & Dining')!

    expect(food.spentThisMonth).toBe(0)
    expect(food.spentPercentage).toBe(0)
    expect(food.status).toBe('normal')
  })

  it('ignores transactions from previous calendar months', () => {
    const lastYear = now.getFullYear() - 1
    const pastDate = `${lastYear}-04-10`
    const txs: Transaction[] = [
      {
        id: 't-old',
        type: 'expense',
        amount: 9999,
        title: 'Old Expense',
        category: 'Food & Dining',
        accountId: 'acc-1',
        date: pastDate,
        createdAt: `${lastYear}-04-10T00:00:00Z`,
      },
    ]

    const result = calculateCategoryBudgets(sampleBudgets, txs, now)
    const food = result.find((r) => r.category === 'Food & Dining')!

    expect(food.spentThisMonth).toBe(0)
    expect(food.remaining).toBe(10000)
  })

  it('supports presets segregation by transaction type (expense vs income)', () => {
    const presets: Preset[] = [
      { id: 'p1', type: 'expense', title: 'Coffee', category: 'Food & Dining', defaultAmount: 150 },
      { id: 'p2', type: 'expense', title: 'Petrol', category: 'Transportation', defaultAmount: 500 },
      { id: 'p3', type: 'income', title: 'Salary', category: 'Salary', defaultAmount: 65000 },
    ]

    const expensePresets = presets.filter((p) => p.type === 'expense')
    const incomePresets = presets.filter((p) => p.type === 'income')

    expect(expensePresets).toHaveLength(2)
    expect(incomePresets).toHaveLength(1)
    expect(incomePresets[0].title).toBe('Salary')
    expect(incomePresets[0].defaultAmount).toBe(65000)
  })
})
