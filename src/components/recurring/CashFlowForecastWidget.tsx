import React, { useState } from 'react'
import {
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { CashFlowForecast } from '@/types/finance'
import { formatINR } from '@/lib/utils'

interface CashFlowForecastWidgetProps {
  forecast: CashFlowForecast
}

export const CashFlowForecastWidget: React.FC<CashFlowForecastWidgetProps> = ({
  forecast,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(0)
  const [showInspection, setShowInspection] = useState(false)
  const selectedDay = forecast.days[selectedDayIndex] || forecast.days[0]

  return (
    <div className="card p-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Sparkles size={18} className="text-[var(--accent-primary)]" />
            30-Day Predictive Cash Flow Forecast
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Trajectory based on reconciled balances, scheduled income assumptions, unpaid EMIs, and historical discretionary spend.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setShowInspection(!showInspection)}
            className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
          >
            <Info size={13} />
            <span>{showInspection ? 'Hide Assumptions' : 'Inspect Calculation'}</span>
            {showInspection ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {forecast.trajectoryStatus === 'insufficient_data' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <AlertTriangle size={13} />
              Insufficient Data
            </span>
          ) : forecast.trajectoryStatus === 'low_balance' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <AlertTriangle size={13} />
              Cash Dip Alert: {formatINR(forecast.lowestProjectedBalance.amount)} on{' '}
              {forecast.lowestProjectedBalance.date}
            </span>
          ) : forecast.trajectoryStatus === 'provisional' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Info size={13} />
              Provisional Trajectory
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <ShieldCheck size={13} />
              Healthy Cash Trajectory
            </span>
          )}
        </div>
      </div>

      {/* Coverage Status Sub-bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-subtle)] text-[11px] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
        <div>
          <span className="font-semibold text-[var(--text-muted)]">Forecast Horizon: </span>
          <span>{forecast.forecastStartDate} to {forecast.forecastEndDate}</span>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <span className="font-semibold text-[var(--text-muted)]">Spending History: </span>
            <span className={forecast.hasSufficientSpendingHistory ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
              {forecast.hasSufficientSpendingHistory
                ? 'Verified (30d+ continuous)'
                : `${forecast.distinctExpenseDaysCount} day${forecast.distinctExpenseDaysCount === 1 ? '' : 's'} recorded (Provisional)`}
            </span>
          </div>
        </div>
      </div>

      {/* Insufficient Data Notice if applicable */}
      {forecast.isInsufficientData && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2.5">
          <AlertTriangle size={16} className="shrink-0 text-amber-500" />
          <span>
            <strong>Insufficient data for a reliable forecast:</strong> {forecast.insufficientDataReason || 'Starting liquid balances or historical transaction records are insufficient to calculate a supported forecast.'}
          </span>
        </div>
      )}

      {/* Assumptions & Calculation Inspection Drawer */}
      {showInspection && (
        <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs space-y-4 animate-fade-in">
          <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
            <Info size={14} className="text-brand-500" />
            <span>Documented Forecast Architecture & Mathematical Formulas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Box 1: Verified Facts */}
            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
              <span className="font-bold text-[11px] text-[var(--text-primary)] uppercase tracking-wider block">
                1. Verified Facts
              </span>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Starting Pool: <strong>{formatINR(forecast.verifiedFacts.startingLiquidBalance)}</strong>
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                As of: <strong>{forecast.verifiedFacts.reconciledAsOfDate}</strong>
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Actual 30d Burn: <strong>{formatINR(forecast.verifiedFacts.historicalExpensesTotal)}</strong> ({forecast.verifiedFacts.recordedDaysCount} days)
              </p>
            </div>

            {/* Box 2: Scheduled Commitments */}
            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
              <span className="font-bold text-[11px] text-[var(--text-primary)] uppercase tracking-wider block">
                2. Scheduled Commitments
              </span>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Total Commitments: <strong>{formatINR(forecast.scheduledCommitments.totalCommitments)}</strong>
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Inflows: +{formatINR(forecast.scheduledCommitments.upcomingInflows)} • Outflows: −{formatINR(forecast.scheduledCommitments.upcomingOutflows)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] italic">
                Commitments are scheduled on future due dates; never subtracted from live balances prematurely.
              </p>
            </div>

            {/* Box 3: Estimated Assumptions */}
            <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] space-y-1">
              <span className="font-bold text-[11px] text-[var(--text-primary)] uppercase tracking-wider block">
                3. Discretionary Assumptions
              </span>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Status: <strong className={forecast.hasSufficientSpendingHistory ? 'text-emerald-500' : 'text-amber-500'}>
                  {forecast.hasSufficientSpendingHistory ? 'Verified Baseline' : 'Provisional Scenario'}
                </strong>
              </p>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Safety Reserve: <strong>{formatINR(forecast.minimumReserve || 0)}</strong>
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                Formula: Max(0, Month-End − Reserve) ÷ {forecast.daysLeftInMonth}d
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-secondary)]">
            <strong>Formula:</strong> Safe Daily Spend = Max(0, Projected Month-End (₹{forecast.projectedMonthEndBalance.toLocaleString('en-IN')}) − Safety Reserve (₹{(forecast.minimumReserve || 0).toLocaleString('en-IN')})) ÷ Remaining Days ({forecast.daysLeftInMonth}) = <strong>₹{forecast.provisionalDailySpend.toLocaleString('en-IN')}/day</strong>
          </div>

          <ul className="space-y-1 text-[11px] text-[var(--text-secondary)] list-disc list-inside">
            {(forecast.assumptionsSummary || []).map((asmp, idx) => (
              <li key={idx}>{asmp}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 4 Key Predictive Metric Pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Current Available */}
        <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
          <span className="text-[11px] text-[var(--text-muted)] font-medium">Starting Liquid Pool</span>
          <p className="text-xl font-extrabold text-[var(--text-primary)] mt-1">
            {formatINR(forecast.currentLiquidBalance)}
          </p>
          <span className="text-[10px] text-[var(--text-secondary)]">Reconciled live balance</span>
        </div>

        {/* Projected Month End */}
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <span className="text-[11px] text-blue-500 font-medium">Projected Month-End</span>
          <p className="text-xl font-extrabold text-blue-500 mt-1">
            {forecast.isInsufficientData ? '—' : formatINR(forecast.projectedMonthEndBalance)}
          </p>
          <span className="text-[10px] text-[var(--text-secondary)]">
            {forecast.isInsufficientData ? 'Data unavailable' : 'After scheduled commitments'}
          </span>
        </div>

        {/* Safe Daily Spend */}
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[11px] text-emerald-500 font-medium">Safe Discretionary Daily</span>
          {forecast.safeDailySpendStatus === 'insufficient_history' ? (
            <div>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1 leading-snug">
                Not enough spending history to estimate safely
              </p>
              <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                Provisional scenario: {formatINR(forecast.provisionalDailySpend)}/day
              </span>
            </div>
          ) : forecast.isInsufficientData ? (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)] mt-1">Insufficient data</p>
              <span className="text-[10px] text-[var(--text-secondary)]">Awaiting transaction activity</span>
            </div>
          ) : (
            <div>
              <p className="text-xl font-extrabold text-emerald-500 mt-1">
                {formatINR(forecast.safeDailySpend)} <span className="text-xs font-normal">/ day</span>
              </p>
              <span className="text-[10px] text-[var(--text-secondary)]">
                For next {forecast.daysLeftInMonth} days this month
              </span>
            </div>
          )}
        </div>

        {/* Lowest Projected Balance */}
        <div
          className={`p-3.5 rounded-xl border ${
            forecast.lowestProjectedBalance.amount < 5000
              ? 'bg-rose-500/10 border-rose-500/20'
              : 'bg-[var(--bg-subtle)] border-[var(--border-subtle)]'
          }`}
        >
          <span
            className={`text-[11px] font-medium ${
              forecast.lowestProjectedBalance.amount < 5000 ? 'text-rose-500' : 'text-[var(--text-muted)]'
            }`}
          >
            Projected Cash Floor
          </span>
          <p
            className={`text-xl font-extrabold mt-1 ${
              forecast.lowestProjectedBalance.amount < 5000 ? 'text-rose-500' : 'text-[var(--text-primary)]'
            }`}
          >
            {forecast.isInsufficientData ? '—' : formatINR(forecast.lowestProjectedBalance.amount)}
          </p>
          <span className="text-[10px] text-[var(--text-secondary)]">
            {forecast.isInsufficientData
              ? 'Data unavailable'
              : `Expected low on ${forecast.lowestProjectedBalance.date}`}
          </span>
        </div>
      </div>

      {/* 30-Day Interactive Timeline Strip */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1 font-medium">
            <Calendar size={13} /> 30-Day Timeline (Click any day to inspect details):
          </span>
          <span className="font-semibold text-[var(--text-primary)]">
            Day: {selectedDay.dayLabel} ({formatINR(selectedDay.projectedBalance)})
          </span>
        </div>

        {/* Visual timeline bar chart */}
        <div className="overflow-x-auto pb-1">
          <div
            className="grid gap-1 h-14 min-w-[540px] bg-[var(--bg-subtle)] p-1.5 rounded-xl border border-[var(--border)] items-end"
            style={{ gridTemplateColumns: `repeat(${forecast.days.length || 30}, minmax(0, 1fr))` }}
          >
            {forecast.days.map((day, idx) => {
              const hasEvents = day.events.length > 0
              const isSelected = selectedDayIndex === idx
              return (
                <button
                  type="button"
                  key={day.date}
                  onClick={() => setSelectedDayIndex(idx)}
                  title={`${day.dayLabel}: Projected ${formatINR(day.projectedBalance)} (${day.events.length} events)`}
                  className={`h-full rounded-md transition-all flex flex-col justify-end items-center p-0.5 cursor-pointer relative ${
                    isSelected
                      ? 'ring-2 ring-brand-500 bg-brand-500/20'
                      : hasEvents
                      ? 'bg-amber-500/25 hover:bg-amber-500/40'
                      : 'bg-[var(--border)] hover:bg-[var(--text-muted)]/30'
                  }`}
                >
                  {hasEvents && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mx-auto mb-1 shrink-0 animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Selected Day Event Drawer */}
      <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[var(--text-primary)]">
            Timeline Inspection: {selectedDay.dayLabel}
          </span>
          <span className="font-extrabold text-[var(--text-primary)]">
            Projected End-of-Day Balance: {formatINR(selectedDay.projectedBalance)}
          </span>
        </div>

        {selectedDay.events.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            {selectedDay.events.map((evt, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
              >
                <div className="flex items-center gap-2">
                  {evt.type === 'income' ? (
                    <ArrowDownRight size={14} className="text-emerald-500" />
                  ) : (
                    <ArrowUpRight size={14} className="text-rose-500" />
                  )}
                  <span className="font-semibold text-[var(--text-primary)]">{evt.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                    {evt.category}
                  </span>
                </div>
                <span
                  className={`font-bold ${
                    evt.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {evt.type === 'income' ? '+' : '-'}
                  {formatINR(evt.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-[var(--text-muted)] italic">
            No fixed recurring transactions or EMI dues on this date. Baseline discretionary burn accounted for.
          </p>
        )}
      </div>
    </div>
  )
}
