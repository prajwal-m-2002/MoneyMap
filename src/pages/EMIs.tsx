import { useState, useMemo } from 'react'
import {
  CreditCard,
  Plus,
  CheckCircle2,
  Clock,
  X,
  Sparkles,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import type { EMI, EMIStatus } from '@/types/finance'
import { EMICard } from '@/components/emis/EMICard'
import { AddEMIModal } from '@/components/modals/AddEMIModal'
import { EditEMIModal } from '@/components/modals/EditEMIModal'
import { PayEMIModal } from '@/components/modals/PayEMIModal'
import { AmortizationModal } from '@/components/emis/AmortizationModal'
import { CommitmentChoiceModal } from '@/components/modals/CommitmentChoiceModal'
import { AddProductEMIModal } from '@/components/modals/AddProductEMIModal'
import { AddSubscriptionModal } from '@/components/modals/AddSubscriptionModal'
import { SubscriptionCard } from '@/components/subscriptions/SubscriptionCard'

export default function EMIs() {
  const {
    emis,
    emiPayments,
    accounts,
    summary,
    createEMI,
    updateEMI,
    deleteEMI,
    payEMIInstalment,
    recurringTransactions,
    createRecurringTransaction,
    deleteRecurringTransaction,
    updateRecurringTransaction,
  } = useFinance()

  // Modal states
  const [isChoiceOpen, setIsChoiceOpen] = useState(false)
  const [isProductAddOpen, setIsProductAddOpen] = useState(false)
  const [isSubscriptionAddOpen, setIsSubscriptionAddOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingEmi, setEditingEmi] = useState<EMI | null>(null)
  const [payingEmi, setPayingEmi] = useState<EMI | null>(null)
  const [scheduleEmi, setScheduleEmi] = useState<EMI | null>(null)
  const [commitmentTab, setCommitmentTab] = useState<'all' | 'emis' | 'subscriptions' | 'trials'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | EMIStatus>('all')
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null)

  // Subscriptions (expense recurring items)
  const subscriptions = useMemo(() => {
    return recurringTransactions.filter((r) => r.type === 'expense')
  }, [recurringTransactions])

  const activeSubscriptions = useMemo(() => {
    return subscriptions.filter((s) => s.status === 'active')
  }, [subscriptions])

  const freeTrials = useMemo(() => {
    return subscriptions.filter((s) => s.isFreeTrial || s.amount === 0)
  }, [subscriptions])

  // Filtered loans list
  const filteredEmis = useMemo(() => {
    if (statusFilter === 'all') return emis
    return emis.filter((e) => e.status === statusFilter)
  }, [emis, statusFilter])

  // Filtered subscriptions list
  const filteredSubscriptions = useMemo(() => {
    if (commitmentTab === 'trials') return freeTrials
    if (statusFilter === 'all') return subscriptions
    return subscriptions.filter((s) => s.status === statusFilter)
  }, [subscriptions, freeTrials, commitmentTab, statusFilter])

  // Aggregate unified metrics
  const metrics = useMemo(() => {
    const activeEmis = emis.filter((e) => e.status === 'active')
    const emiMonthly = activeEmis.reduce((s, e) => s + (Number(e.emiAmount) || 0), 0)
    const subscriptionMonthly = activeSubscriptions.reduce((s, sub) => {
      if (sub.frequency === 'yearly') return s + Math.round(sub.amount / 12)
      if (sub.frequency === 'quarterly') return s + Math.round(sub.amount / 3)
      return s + sub.amount
    }, 0)

    let totalRemaining = 0
    for (const e of emis) {
      if (e.status === 'active' || e.status === 'paused') {
        const principalPaid = emiPayments
          .filter((p) => p.emiId === e.id && p.status === 'paid')
          .reduce((sum, p) => sum + (p.principalComponent || 0), 0)
        totalRemaining += Math.max(0, e.principal - principalPaid)
      }
    }

    return {
      activeCount: activeEmis.length + activeSubscriptions.length,
      monthlyTotal: emiMonthly + subscriptionMonthly,
      totalRemaining,
      dueThisMonth: summary.emiDueThisMonth,
      trialsCount: freeTrials.length,
    }
  }, [emis, emiPayments, activeSubscriptions, summary.emiDueThisMonth, freeTrials.length])

  const handleDeleteEmi = async (emi: EMI) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${emi.name}"? This will also remove its associated payment history.`
      )
    ) {
      await deleteEMI(emi.id)
    }
  }

  const handleDeleteSubscription = async (id: string) => {
    const target = subscriptions.find((s) => s.id === id)
    if (window.confirm(`Are you sure you want to delete subscription "${target?.title || 'this item'}"?`)) {
      await deleteRecurringTransaction(id)
    }
  }

  const handleToggleSubscription = async (id: string) => {
    const target = subscriptions.find((s) => s.id === id)
    if (!target) return
    const nextStatus = target.status === 'active' ? 'paused' : 'active'
    await updateRecurringTransaction(id, { status: nextStatus })
  }

  const totalCommitmentsCount = emis.length + subscriptions.length

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-slide-up">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Financial Commitments
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Manage product purchase EMIs, subscriptions, free trial cancellation deadlines, and recurring dues.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsChoiceOpen(true)}
          className="btn-primary shrink-0 flex items-center gap-2 self-start sm:self-auto text-xs px-4 py-2.5"
        >
          <Plus size={16} /> + Add Commitment
        </button>
      </div>

      {/* Payment Confirmation Banner */}
      {paymentSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between gap-3 text-xs font-semibold animate-fade-in shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
            <span>{paymentSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setPaymentSuccessMsg(null)}
            className="p-1 hover:bg-emerald-500/20 rounded-lg transition-colors text-[var(--text-secondary)]"
            title="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* 4 Summary Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="card p-4">
          <p className="text-xs text-[var(--text-muted)] font-medium">Active Commitments</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              {metrics.activeCount}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              of {totalCommitmentsCount} total
            </span>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-xs text-[var(--text-muted)] font-medium">Monthly Outflow</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              ₹{metrics.monthlyTotal.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">/mo</span>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-xs text-[var(--text-muted)] font-medium">Total Remaining (EMIs)</p>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-[var(--text-primary)]">
              ₹{metrics.totalRemaining.toLocaleString('en-IN')}
            </span>
            <span className="text-xs text-emerald-500 font-medium">Principal</span>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-xs text-[var(--text-muted)] font-medium">Due / Expiring Soon</p>
          <div className="flex items-baseline justify-between mt-1">
            <span
              className={`text-2xl font-bold ${
                metrics.dueThisMonth === 0 && metrics.trialsCount === 0
                  ? 'text-emerald-500'
                  : 'text-amber-500'
              }`}
            >
              {metrics.dueThisMonth > 0
                ? `₹${metrics.dueThisMonth.toLocaleString('en-IN')}`
                : metrics.trialsCount > 0
                ? `${metrics.trialsCount} Trials`
                : 'All Clear'}
            </span>
            {metrics.dueThisMonth === 0 && metrics.trialsCount === 0 ? (
              <span className="text-xs text-emerald-500 flex items-center gap-1 font-semibold">
                <CheckCircle2 size={13} /> Clear
              </span>
            ) : (
              <span className="text-xs text-amber-500 flex items-center gap-1 font-semibold">
                <Clock size={13} /> Attention
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Commitment Segment Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          type="button"
          onClick={() => setCommitmentTab('all')}
          className={`px-3.5 py-1.5 rounded-xl border transition-all shrink-0 font-semibold ${
            commitmentTab === 'all'
              ? 'bg-[var(--accent-primary)] text-white border-transparent shadow-sm'
              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          All Commitments ({totalCommitmentsCount})
        </button>
        <button
          type="button"
          onClick={() => setCommitmentTab('emis')}
          className={`px-3.5 py-1.5 rounded-xl border transition-all shrink-0 font-semibold ${
            commitmentTab === 'emis'
              ? 'bg-[var(--accent-primary)] text-white border-transparent shadow-sm'
              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          EMIs & Purchases ({emis.length})
        </button>
        <button
          type="button"
          onClick={() => setCommitmentTab('subscriptions')}
          className={`px-3.5 py-1.5 rounded-xl border transition-all shrink-0 font-semibold ${
            commitmentTab === 'subscriptions'
              ? 'bg-[var(--accent-primary)] text-white border-transparent shadow-sm'
              : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
          }`}
        >
          Subscriptions ({subscriptions.length})
        </button>
        <button
          type="button"
          onClick={() => setCommitmentTab('trials')}
          className={`px-3.5 py-1.5 rounded-xl border transition-all shrink-0 font-semibold flex items-center gap-1 ${
            commitmentTab === 'trials'
              ? 'bg-amber-600 text-white border-transparent shadow-sm'
              : 'border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
          }`}
        >
          <Sparkles size={12} /> Free Trials & Expiring ({freeTrials.length})
        </button>
      </div>

      {/* Status Filter Sub-Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] text-[var(--text-muted)] font-medium mr-1 shrink-0">Status:</span>
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 font-medium ${
            statusFilter === 'all'
              ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-strong)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('active')}
          className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 font-medium ${
            statusFilter === 'active'
              ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-strong)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('completed')}
          className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 font-medium ${
            statusFilter === 'completed'
              ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-strong)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Closed / Cancelled
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('paused')}
          className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 font-medium ${
            statusFilter === 'paused'
              ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)] border-[var(--border-strong)]'
              : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          Paused
        </button>
      </div>

      {/* Main Unified Content Area */}
      <div className="space-y-6">
        {/* EMIs Section (Shown in 'all' or 'emis') */}
        {(commitmentTab === 'all' || commitmentTab === 'emis') && (
          <div className="space-y-3">
            {commitmentTab === 'all' && (
              <div className="flex items-center justify-between pt-1">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <CreditCard size={16} className="text-brand-500" />
                  EMIs & Product Purchases ({filteredEmis.length})
                </h3>
              </div>
            )}

            {filteredEmis.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEmis.map((emi) => (
                  <EMICard
                    key={emi.id}
                    emi={emi}
                    payments={emiPayments.filter((p) => p.emiId === emi.id)}
                    accounts={accounts}
                    onPay={(item) => setPayingEmi(item)}
                    onViewSchedule={(item) => setScheduleEmi(item)}
                    onEdit={(item) => setEditingEmi(item)}
                    onDelete={handleDeleteEmi}
                  />
                ))}
              </div>
            ) : commitmentTab === 'emis' ? (
              <div className="card flex flex-col items-center justify-center py-12 text-center gap-3">
                <CreditCard size={28} className="text-[var(--text-muted)]" />
                <p className="text-sm font-semibold text-[var(--text-secondary)]">No EMIs added yet</p>
                <button
                  type="button"
                  onClick={() => setIsProductAddOpen(true)}
                  className="btn-primary text-xs px-4 py-2"
                >
                  <Plus size={14} /> Add EMI
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Subscriptions Section (Shown in 'all', 'subscriptions', or 'trials') */}
        {(commitmentTab === 'all' || commitmentTab === 'subscriptions' || commitmentTab === 'trials') && (
          <div className="space-y-3">
            {commitmentTab === 'all' && filteredSubscriptions.length > 0 && (
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Sparkles size={16} className="text-indigo-500" />
                  Subscriptions & Autopay Services ({filteredSubscriptions.length})
                </h3>
              </div>
            )}

            {filteredSubscriptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSubscriptions.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    accounts={accounts}
                    onDelete={handleDeleteSubscription}
                    onToggleStatus={handleToggleSubscription}
                  />
                ))}
              </div>
            ) : commitmentTab === 'subscriptions' || commitmentTab === 'trials' ? (
              <div className="card flex flex-col items-center justify-center py-12 text-center gap-3">
                <Sparkles size={28} className="text-[var(--text-muted)]" />
                <p className="text-sm font-semibold text-[var(--text-secondary)]">
                  {commitmentTab === 'trials' ? 'No free trials or promo offers active' : 'No subscriptions added yet'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsSubscriptionAddOpen(true)}
                  className="btn-primary text-xs px-4 py-2"
                >
                  <Plus size={14} /> Add Subscription
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* If All Commitments is Empty */}
        {commitmentTab === 'all' && filteredEmis.length === 0 && filteredSubscriptions.length === 0 && (
          <div className="card flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-subtle)] flex items-center justify-center">
              <CreditCard size={28} className="text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--text-secondary)]">
                No Financial Commitments added
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1 max-w-sm">
                Add product purchases (MacBook, phones, appliances) or subscriptions (Prime, Netflix, Gym) to track schedules and renewal alerts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsChoiceOpen(true)}
              className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              <Plus size={14} /> + Add Commitment
            </button>
          </div>
        )}
      </div>

      {/* Commitment Choice Modal */}
      <CommitmentChoiceModal
        isOpen={isChoiceOpen}
        onClose={() => setIsChoiceOpen(false)}
        onSelectEMI={() => setIsProductAddOpen(true)}
        onSelectSubscription={() => setIsSubscriptionAddOpen(true)}
      />

      {/* Simplified Product / Purchase EMI Modal */}
      <AddProductEMIModal
        isOpen={isProductAddOpen}
        onClose={() => setIsProductAddOpen(false)}
        onAdd={createEMI}
        accounts={accounts}
      />

      {/* Add Subscription Modal */}
      <AddSubscriptionModal
        isOpen={isSubscriptionAddOpen}
        onClose={() => setIsSubscriptionAddOpen(false)}
        onAdd={createRecurringTransaction}
        accounts={accounts}
      />

      {/* Classic Loan EMI Modal */}
      <AddEMIModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={createEMI}
        accounts={accounts}
      />

      {editingEmi && (
        <EditEMIModal
          isOpen={!!editingEmi}
          onClose={() => setEditingEmi(null)}
          onUpdate={updateEMI}
          emi={editingEmi}
          accounts={accounts}
        />
      )}

      {payingEmi && (
        <PayEMIModal
          isOpen={!!payingEmi}
          onClose={() => setPayingEmi(null)}
          onPay={async (emiId, options) => {
            const res = await payEMIInstalment(emiId, options)
            if (res.success) {
              const debitAcc = accounts.find((a) => a.id === (options?.accountId || payingEmi.accountId))
              const amt = options?.customAmount ?? payingEmi.emiAmount
              setPaymentSuccessMsg(
                `Payment of ₹${amt.toLocaleString('en-IN')} for "${payingEmi.name}" confirmed! Successfully deducted from ${debitAcc?.name || 'bank account'} as an expense.`
              )
              setTimeout(() => {
                setPaymentSuccessMsg((prev) => (prev?.includes(payingEmi.name) ? null : prev))
              }, 7000)
            }
            return res
          }}
          emi={payingEmi}
          payments={emiPayments}
          accounts={accounts}
        />
      )}

      {scheduleEmi && (
        <AmortizationModal
          isOpen={!!scheduleEmi}
          onClose={() => setScheduleEmi(null)}
          emi={scheduleEmi}
          payments={emiPayments.filter((p) => p.emiId === scheduleEmi.id)}
        />
      )}
    </div>
  )
}
