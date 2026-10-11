import React, { useState } from 'react'
import { X, Plus, Trash2, RotateCcw, ShieldCheck } from 'lucide-react'
import type { Account, MonthlyBudgetPlan, MonthlyBudgetItem } from '@/types/finance'
import { getDefaultMonthlyBudgetPlan } from '@/lib/monthlyBudgetMath'
import { formatINR } from '@/lib/utils'

interface EditBudgetAllocationModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan: MonthlyBudgetPlan
  accounts: Account[]
  onSave: (newPlan: MonthlyBudgetPlan) => void
}

export const EditBudgetAllocationModal: React.FC<EditBudgetAllocationModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  accounts,
  onSave,
}) => {
  const [expectedSalary, setExpectedSalary] = useState<number>(currentPlan.expectedSalary || 27000)
  const [items, setItems] = useState<MonthlyBudgetItem[]>(() =>
    currentPlan.allocations.map((a) => ({ ...a }))
  )
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')

  if (!isOpen) return null

  const totalAllocated = items.reduce((sum, i) => sum + (Number(i.plannedAmount) || 0), 0)
  const unallocated = expectedSalary - totalAllocated

  const handleUpdateAmount = (id: string, val: string) => {
    const num = Math.max(0, Number(val) || 0)
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, plannedAmount: num } : item))
    )
  }

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim() || !newItemAmount) return
    const amt = Math.max(0, Number(newItemAmount) || 0)
    const newItem: MonthlyBudgetItem = {
      id: `plan-custom-${Date.now()}`,
      name: newItemName.trim(),
      categoryKey: 'custom',
      plannedAmount: amt,
      color: '#ec4899', // Pink
      notes: 'Custom user-defined budget allocation',
    }
    setItems((prev) => [...prev, newItem])
    setNewItemName('')
    setNewItemAmount('')
  }

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleReset = () => {
    const defaultPlan = getDefaultMonthlyBudgetPlan(accounts, expectedSalary, currentPlan.month)
    setItems(defaultPlan.allocations)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...currentPlan,
      expectedSalary,
      allocations: items,
      lastUpdated: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-xl card p-5 sm:p-6 bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl rounded-2xl space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Customize Monthly Budget Allocation
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Set target amounts for savings, purchase funds, cash, and retained balance
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Accounting Rule Notice */}
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2.5">
          <ShieldCheck size={16} className="shrink-0 text-blue-500" />
          <span>
            <strong>Accounting Integrity:</strong> This allocation is a planning framework. Saving changes will <strong>never modify your account balances or rewrite historical transactions</strong>.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Expected Salary Input */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
              Monthly Expected / Net Income (₹)
            </label>
            <input
              type="number"
              min="0"
              required
              value={expectedSalary}
              onChange={(e) => setExpectedSalary(Math.max(0, Number(e.target.value) || 0))}
              className="w-full px-3 py-2 text-sm font-bold rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Allocation Categories List */}
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">
              Target Allocation Categories
            </label>

            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color || '#3b82f6' }}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                        {item.name}
                      </p>
                      {item.notes && (
                        <p className="text-[10px] text-[var(--text-muted)] truncate">
                          {item.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={item.plannedAmount}
                        onChange={(e) => handleUpdateAmount(item.id, e.target.value)}
                        className="w-28 pl-6 pr-2.5 py-1.5 text-xs font-bold text-right rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>

                    {item.categoryKey === 'custom' && (
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Remove category"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Custom Category Form */}
          <div className="p-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] space-y-2">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] block">
              + Add Custom Category
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Category name (e.g. Mutual Fund SIP)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <input
                type="number"
                min="0"
                placeholder="Amount (₹)"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
                className="w-24 px-2.5 py-1.5 text-xs text-right rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!newItemName.trim() || !newItemAmount}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-500 text-white disabled:opacity-50 flex items-center gap-1"
              >
                <Plus size={13} />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Allocation Balance Math Pill */}
          <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-between text-xs">
            <div>
              <span className="text-[var(--text-secondary)]">Total Allocated: </span>
              <strong className="text-[var(--text-primary)] tabular">{formatINR(totalAllocated)}</strong>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">
                {unallocated >= 0 ? 'Unallocated Buffer: ' : 'Over-Allocated: '}
              </span>
              <strong
                className={`tabular ${
                  unallocated >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {formatINR(Math.abs(unallocated))}
              </strong>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-4 py-1.5 text-xs font-semibold rounded-xl shadow-xs"
              >
                Save Budget Plan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
