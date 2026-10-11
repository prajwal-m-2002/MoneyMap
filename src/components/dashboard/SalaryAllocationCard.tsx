import React, { useState } from 'react'
import {
  Banknote,
  CheckCircle2,
  Clock,
  Sparkles,
  Settings2,
  X,
  Percent,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { formatINR } from '@/lib/utils'

const SALARY_CONFIG_KEY = 'moneymap_salary_config_v1'

interface SalaryConfig {
  expectedAmount: number
  expectedDay: number
}

export function SalaryAllocationCard() {
  const { summary, transactions } = useFinance()

  const [config, setConfig] = useState<SalaryConfig>(() => {
    try {
      const stored = localStorage.getItem(SALARY_CONFIG_KEY)
      if (stored) return JSON.parse(stored)
    } catch {
      // ignore
    }
    return { expectedAmount: 65000, expectedDay: 1 }
  })

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false)
  const [tempAmount, setTempAmount] = useState(String(config.expectedAmount))
  const [tempDay, setTempDay] = useState(String(config.expectedDay))

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()
  const currentDay = now.getDate()

  // Days in month & days remaining
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1)

  // Check if salary was received in current calendar month
  const currentMonthSalaryTx = transactions.find((tx) => {
    if (tx.type !== 'income' || !tx.date) return false
    const d = new Date(tx.date)
    const isThisMonth = d.getFullYear() === currentYear && d.getMonth() === currentMonth
    const isSalaryMatch = tx.category.toLowerCase().includes('salary') || tx.title.toLowerCase().includes('salary')
    return isThisMonth && isSalaryMatch
  })

  const isSalaryReceived = Boolean(currentMonthSalaryTx)
  const receivedSalaryAmount = currentMonthSalaryTx ? currentMonthSalaryTx.amount : 0

  // Allocation breakdown
  const totalSpent = summary.expensesThisMonth
  const fixedEmiDue = summary.emiDueThisMonth // Phase 9 EMI module
  const totalIncome = summary.incomeThisMonth > 0 ? summary.incomeThisMonth : config.expectedAmount

  // Percentages for visual allocation bar
  const spentPercent = Math.min(100, Math.round((totalSpent / totalIncome) * 100))
  const emiPercent = Math.min(100 - spentPercent, Math.round((fixedEmiDue / totalIncome) * 100))
  const savingsPercent = Math.max(0, 100 - spentPercent - emiPercent)

  // Safe to spend daily allowance
  const availableToSpend = Math.max(0, totalIncome - totalSpent - fixedEmiDue)
  const dailySafeToSpend = Math.round(availableToSpend / daysRemaining)

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = Number(tempAmount)
    const day = Number(tempDay)
    if (!isNaN(amt) && amt > 0 && !isNaN(day) && day >= 1 && day <= 31) {
      const newCfg = { expectedAmount: amt, expectedDay: day }
      setConfig(newCfg)
      localStorage.setItem(SALARY_CONFIG_KEY, JSON.stringify(newCfg))
      setIsConfigModalOpen(false)
    }
  }

  return (
    <div className="card p-5 border border-[var(--border)] bg-[var(--bg-surface)] space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
            <Banknote size={20} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Monthly Salary & Budget Allocation
              </h2>
              {isSalaryReceived ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 size={11} />
                  Salary Received
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <Clock size={11} />
                  Due on {config.expectedDay}th
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isSalaryReceived
                ? `Credited ${formatINR(receivedSalaryAmount)} for this month`
                : `Expected ${formatINR(config.expectedAmount)} on ${config.expectedDay}${config.expectedDay === 1 ? 'st' : config.expectedDay === 2 ? 'nd' : 'th'} of each month`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setTempAmount(String(config.expectedAmount))
            setTempDay(String(config.expectedDay))
            setIsConfigModalOpen(true)
          }}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Settings2 size={14} />
          <span>Configure Salary</span>
        </button>
      </div>

      {/* Tri-color Allocation Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-[var(--text-secondary)]">Planned Outflow vs Surplus</span>
          <span className="text-[var(--text-primary)] tabular">{spentPercent}% Spent</span>
        </div>

        <div className="w-full h-3 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] overflow-hidden flex">
          {/* Spent (Rose) */}
          <div
            style={{ width: `${spentPercent}%` }}
            className="h-full bg-rose-500 transition-all duration-300"
            title={`Spent: ${formatINR(totalSpent)} (${spentPercent}%)`}
          />
          {/* Fixed EMIs (Amber) */}
          <div
            style={{ width: `${emiPercent}%` }}
            className="h-full bg-amber-500 transition-all duration-300"
            title={`EMIs: ${formatINR(fixedEmiDue)} (${emiPercent}%)`}
          />
          {/* Savings / Remaining (Emerald) */}
          <div
            style={{ width: `${savingsPercent}%` }}
            className="h-full bg-emerald-500 transition-all duration-300"
            title={`Surplus / Savings: ${formatINR(availableToSpend)} (${savingsPercent}%)`}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-[var(--text-secondary)] pt-1 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
            <span>Spent ({formatINR(totalSpent)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
            <span>EMIs Due ({formatINR(fixedEmiDue)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
            <span>Available Surplus ({formatINR(availableToSpend)})</span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border)] text-xs">
        {/* Daily Safe to Spend */}
        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
              <Sparkles size={14} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                Safe to Spend Daily
              </p>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400">
                {daysRemaining} day{daysRemaining === 1 ? '' : 's'} remaining in month
              </p>
            </div>
          </div>
          <p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300 tabular">
            {formatINR(dailySafeToSpend)}
            <span className="text-[10px] font-normal text-emerald-600/70">/day</span>
          </p>
        </div>

        {/* Savings Rate */}
        <div className="p-3 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200/80 dark:border-cyan-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500 text-white flex items-center justify-center">
              <Percent size={14} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-cyan-900 dark:text-cyan-200">
                Projected Savings Rate
              </p>
              <p className="text-[10px] text-cyan-700/80 dark:text-cyan-400">
                Unspent monthly income
              </p>
            </div>
          </div>
          <p className="text-sm font-extrabold text-cyan-700 dark:text-cyan-300 tabular">
            {savingsPercent}%
          </p>
        </div>
      </div>

      {/* Configure Salary Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div
            className="w-full max-w-sm card p-5 bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xl rounded-2xl space-y-4 animate-scale-in"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Salary Settings
              </h3>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Expected Monthly Salary (₹)
                </label>
                <input
                  type="number"
                  required
                  value={tempAmount}
                  onChange={(e) => setTempAmount(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Expected Salary Day (1–31)
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={tempDay}
                  onChange={(e) => setTempDay(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-1.5 text-xs font-semibold rounded-xl"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
