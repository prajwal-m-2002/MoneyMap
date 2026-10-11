import React, { useState, useEffect, useRef } from 'react'
import { X, Plus, Trash2, RotateCcw, ShieldCheck, Check, Sparkles, Building2 } from 'lucide-react'
import type { Account, MonthlyBudgetPlan, MonthlyBudgetItem } from '@/types/finance'
import { getDefaultMonthlyBudgetPlan } from '@/lib/monthlyBudgetMath'
import { formatINR } from '@/lib/utils'

interface EditBudgetAllocationModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan: MonthlyBudgetPlan
  accounts: Account[]
  onSave: (newPlan: MonthlyBudgetPlan, saveAsDefaultTemplate?: boolean) => void
  initialEditingCategoryId?: string | null
}

const PRESET_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#f43f5e', // Rose
  '#6366f1', // Indigo
]

export const EditBudgetAllocationModal: React.FC<EditBudgetAllocationModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  accounts,
  onSave,
  initialEditingCategoryId,
}) => {
  const [expectedSalary, setExpectedSalary] = useState<number>(currentPlan.expectedSalary || 27000)
  const [expectedSalaryStr, setExpectedSalaryStr] = useState<string>(
    String(currentPlan.expectedSalary || 27000)
  )
  const [items, setItems] = useState<MonthlyBudgetItem[]>(() =>
    currentPlan.allocations.map((a) => ({ ...a }))
  )
  const [amountStrings, setAmountStrings] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    currentPlan.allocations.forEach((a) => {
      map[a.id] = String(a.plannedAmount)
    })
    return map
  })
  const [saveAsDefaultTemplate, setSaveAsDefaultTemplate] = useState<boolean>(true)

  // New Category State
  const [newItemName, setNewItemName] = useState('')
  const [newItemAmount, setNewItemAmount] = useState('')
  const [newItemAccountId, setNewItemAccountId] = useState('')
  const [newItemColor, setNewItemColor] = useState(PRESET_COLORS[5]) // Pink

  // Active focus target
  const focusedInputRef = useRef<HTMLInputElement | null>(null)

  // Reset local state when modal opens or currentPlan changes
  useEffect(() => {
    if (isOpen) {
      setExpectedSalary(currentPlan.expectedSalary || 27000)
      setExpectedSalaryStr(String(currentPlan.expectedSalary || 27000))
      setItems(currentPlan.allocations.map((a) => ({ ...a })))
      const map: Record<string, string> = {}
      currentPlan.allocations.forEach((a) => {
        map[a.id] = String(a.plannedAmount)
      })
      setAmountStrings(map)
      setNewItemName('')
      setNewItemAmount('')
      setNewItemAccountId('')
      setNewItemColor(PRESET_COLORS[5])
    }
  }, [isOpen, currentPlan])

  // Focus specific item input if requested
  useEffect(() => {
    if (isOpen && initialEditingCategoryId) {
      setTimeout(() => {
        const el = document.getElementById(`budget-input-${initialEditingCategoryId}`)
        if (el) {
          el.focus()
          ;(el as HTMLInputElement).select?.()
        }
      }, 80)
    }
  }, [isOpen, initialEditingCategoryId])

  if (!isOpen) return null

  // Compute total planned allocations from current inputs
  const totalAllocated = items.reduce((sum, item) => {
    const raw = amountStrings[item.id] !== undefined ? amountStrings[item.id] : String(item.plannedAmount)
    const val = Number(raw) || 0
    return sum + Math.max(0, val)
  }, 0)

  const unallocated = expectedSalary - totalAllocated

  const handleUpdateAmountStr = (id: string, val: string) => {
    setAmountStrings((prev) => ({ ...prev, [id]: val }))
  }

  const handleUpdateName = (id: string, newName: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item))
    )
  }

  const handleUpdateTargetAccount = (id: string, accountId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              targetAccountId: accountId || undefined,
            }
          : item
      )
    )
  }

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemName.trim() || !newItemAmount) return
    const amt = Math.max(0, Number(newItemAmount) || 0)
    const newId = `plan-custom-${Date.now()}`
    const targetAcc = accounts.find((a) => a.id === newItemAccountId)

    const newItem: MonthlyBudgetItem = {
      id: newId,
      name: newItemName.trim(),
      categoryKey: 'custom',
      targetAccountId: targetAcc?.id,
      plannedAmount: amt,
      color: newItemColor,
      notes: targetAcc ? `Targeted for ${targetAcc.name}` : 'Custom budget category',
    }

    setItems((prev) => [...prev, newItem])
    setAmountStrings((prev) => ({ ...prev, [newId]: String(amt) }))
    setNewItemName('')
    setNewItemAmount('')
    setNewItemAccountId('')
  }

  const handleRemove = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
    setAmountStrings((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const handleReset = () => {
    if (window.confirm('Reset all planned budget allocations to recommended system defaults?')) {
      const defaultPlan = getDefaultMonthlyBudgetPlan(accounts, expectedSalary, currentPlan.month)
      setItems(defaultPlan.allocations)
      const map: Record<string, string> = {}
      defaultPlan.allocations.forEach((a) => {
        map[a.id] = String(a.plannedAmount)
      })
      setAmountStrings(map)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const finalizedAllocations: MonthlyBudgetItem[] = items.map((item) => {
      const raw = amountStrings[item.id] !== undefined ? amountStrings[item.id] : String(item.plannedAmount)
      const parsed = Math.max(0, Number(raw) || 0)
      return {
        ...item,
        plannedAmount: parsed,
      }
    })

    const finalPlan: MonthlyBudgetPlan = {
      ...currentPlan,
      expectedSalary,
      allocations: finalizedAllocations,
      lastUpdated: new Date().toISOString(),
    }

    onSave(finalPlan, saveAsDefaultTemplate)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-2xl card p-5 sm:p-6 bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl rounded-2xl space-y-5 animate-scale-in max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Customize Planned Budget Allocations
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Adjust monthly budget targets for {currentPlan.month}. Changes take effect immediately.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Accounting Rule Notice */}
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2.5">
          <ShieldCheck size={16} className="shrink-0 text-blue-500" />
          <span>
            <strong>Accounting Integrity:</strong> These targets are a planning framework. Editing your planned budget <strong>will never alter your bank account balances or rewrite completed ledger transactions</strong>.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Expected Salary Input */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)]">
                Monthly Expected Net Income / Salary
              </label>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                Total monthly income pool to allocate across accounts
              </p>
            </div>
            <div className="relative shrink-0 sm:w-44">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                ₹
              </span>
              <input
                type="number"
                min="0"
                required
                value={expectedSalaryStr}
                onChange={(e) => {
                  setExpectedSalaryStr(e.target.value)
                  setExpectedSalary(Math.max(0, Number(e.target.value) || 0))
                }}
                className="w-full pl-7 pr-3 py-2 text-sm font-bold text-right rounded-xl bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
          </div>

          {/* Allocation Categories List */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                Planned Allocation Targets ({items.length} Categories)
              </label>
              <span className="text-[11px] text-[var(--text-secondary)]">
                Total Allocated: <strong className="text-[var(--text-primary)] tabular">{formatINR(totalAllocated)}</strong>
              </span>
            </div>

            <div className="space-y-2.5">
              {items.map((item) => {
                const amountVal = amountStrings[item.id] !== undefined ? amountStrings[item.id] : String(item.plannedAmount)

                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] hover:border-brand-500/30 transition-all space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      {/* Name & Target Account */}
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: item.color || '#3b82f6' }}
                        />
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleUpdateName(item.id, e.target.value)}
                            className="w-full text-xs font-bold text-[var(--text-primary)] bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-brand-500 focus:outline-none px-0.5 py-0.5 rounded transition-colors"
                            placeholder="Category Name"
                          />
                        </div>
                      </div>

                      {/* Account Selector & Amount Input */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                        {/* Target Account Select */}
                        <div className="flex items-center gap-1">
                          <Building2 size={13} className="text-[var(--text-muted)] shrink-0" />
                          <select
                            value={item.targetAccountId || ''}
                            onChange={(e) => handleUpdateTargetAccount(item.id, e.target.value)}
                            className="text-[11px] py-1.5 px-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[140px] truncate"
                            title="Target Bank Account for this allocation"
                          >
                            <option value="">No specific account</option>
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Planned Amount Input */}
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)]">
                            ₹
                          </span>
                          <input
                            id={`budget-input-${item.id}`}
                            ref={item.id === initialEditingCategoryId ? focusedInputRef : undefined}
                            type="number"
                            min="0"
                            value={amountVal}
                            onChange={(e) => handleUpdateAmountStr(item.id, e.target.value)}
                            className="w-28 pl-6 pr-2.5 py-1.5 text-xs font-bold text-right rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                          />
                        </div>

                        {/* Delete Custom Category */}
                        {item.categoryKey === 'custom' && (
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0"
                            title="Remove category"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Add Custom Category Form */}
          <div className="p-3.5 rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] space-y-2.5">
            <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Plus size={14} className="text-brand-500" />
              <span>Add Custom Planned Allocation Category</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Name (e.g. Mutual Funds / SIP)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="sm:col-span-2 px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
              />

              <select
                value={newItemAccountId}
                onChange={(e) => setNewItemAccountId(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Any / General Account</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    placeholder="Amount"
                    value={newItemAmount}
                    onChange={(e) => setNewItemAmount(e.target.value)}
                    className="w-full pl-6 pr-2 py-1.5 text-xs text-right rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddCustom}
                  disabled={!newItemName.trim() || !newItemAmount}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-40 transition-colors shrink-0 flex items-center gap-1"
                >
                  <Plus size={13} />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Preset Color Picker */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-[var(--text-muted)]">Badge Color:</span>
              <div className="flex items-center gap-1.5">
                {PRESET_COLORS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setNewItemColor(col)}
                    className={`w-4 h-4 rounded-full transition-transform ${
                      newItemColor === col ? 'scale-125 ring-2 ring-brand-500 ring-offset-1' : 'hover:scale-110'
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Allocation Math Summary Pill */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[var(--text-secondary)]">Total Planned: </span>
              <strong className="text-[var(--text-primary)] tabular">{formatINR(totalAllocated)}</strong>
              <span className="text-[var(--text-muted)] ml-1">of {formatINR(expectedSalary)}</span>
            </div>
            <div>
              <span className="text-[var(--text-secondary)]">
                {unallocated >= 0 ? 'Unallocated / Retained Buffer: ' : 'Over-Allocated Target: '}
              </span>
              <strong
                className={`tabular font-bold ${
                  unallocated >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {formatINR(Math.abs(unallocated))}
              </strong>
            </div>
          </div>

          {/* Default Template Checkbox */}
          <div className="px-1 flex items-center gap-2.5 text-xs">
            <input
              type="checkbox"
              id="save-as-default-template"
              checked={saveAsDefaultTemplate}
              onChange={(e) => setSaveAsDefaultTemplate(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] text-brand-600 focus:ring-brand-500 cursor-pointer"
            />
            <label
              htmlFor="save-as-default-template"
              className="text-[var(--text-secondary)] cursor-pointer select-none"
            >
              Apply as default budget template for all upcoming months
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex items-center justify-between border-t border-[var(--border)] gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Reset Defaults</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-4 py-1.5 text-xs font-semibold rounded-xl shadow-xs flex items-center gap-1.5"
              >
                <Check size={13} strokeWidth={2.5} />
                <span>Save Budget Plan</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
