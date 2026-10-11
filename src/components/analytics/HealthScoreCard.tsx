import { useState } from 'react'
import type { FinancialHealthScore, HealthPillar } from '@/types/analytics'
import {
  ShieldCheck,
  PiggyBank,
  Lightbulb,
  TrendingUp,
  CreditCard,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface HealthScoreCardProps {
  healthScore: FinancialHealthScore
}

export function HealthScoreCard({ healthScore }: HealthScoreCardProps) {
  const {
    totalScore,
    tierLabel,
    color,
    isInsufficientData,
    pillars,
    primaryRecommendation,
    dataQualityNotes,
    evaluationPeriod,
    methodologySummary,
  } = healthScore
  const [showMethodology, setShowMethodology] = useState(false)

  // SVG Circular Meter calculation
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = isInsufficientData
    ? circumference
    : circumference - (totalScore / 100) * circumference

  const renderStatusBadge = (status: HealthPillar['status']) => {
    switch (status) {
      case 'excellent':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Excellent
          </span>
        )
      case 'good':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            Good
          </span>
        )
      case 'fair':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            Fair
          </span>
        )
      case 'poor':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            Needs Attention
          </span>
        )
      case 'neutral':
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            Neutral / Pending
          </span>
        )
    }
  }

  const renderSummaryNote = () => {
    if (isInsufficientData) {
      return 'Awaiting financial activity to evaluate'
    }
    if (healthScore.isProvisional) {
      return 'Provisional score: regular income or expenses unrecorded'
    }
    if (totalScore >= 80) return 'Excellent stability & asset protection'
    if (totalScore >= 65) return 'Solid financial standing with growth room'
    if (totalScore >= 50) return 'Moderate standing: review cash reserve'
    return 'Attention needed: high debt or low reserve'
  }

  return (
    <div className="card p-5 sm:p-6 border border-[var(--border)] bg-[var(--bg-surface)] space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Financial Health Score
            </h2>
            <span
              style={{
                backgroundColor: `${color}15`,
                color: color,
                borderColor: `${color}40`,
              }}
              className="px-2.5 py-0.5 rounded-full text-xs font-bold border capitalize"
            >
              {tierLabel}
            </span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Holistic 0–100 evaluation across savings, liquidity runway, debt burden, and solvency
            {evaluationPeriod && (
              <> • Period: <span className="font-semibold text-[var(--text-primary)]">{evaluationPeriod}</span></>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowMethodology(!showMethodology)}
          className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1 self-start sm:self-auto"
        >
          <Info size={13} />
          <span>{showMethodology ? 'Hide Methodology' : 'Scoring Breakdown'}</span>
          {showMethodology ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Explanatory Methodology Banner */}
      {showMethodology && (
        <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs space-y-2 animate-fade-in">
          <p className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
            <Info size={14} className="text-brand-500" />
            Documented Scoring Weights & Methodology
          </p>
          {methodologySummary && (
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              {methodologySummary}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
            <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] block">Savings Discipline</span>
              <span className="font-bold text-[var(--text-primary)]">Max 30 pts</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] block">Emergency Cushion</span>
              <span className="font-bold text-[var(--text-primary)]">Max 30 pts</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] block">Debt & EMI Burden</span>
              <span className="font-bold text-[var(--text-primary)]">Max 20 pts</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
              <span className="text-[var(--text-muted)] block">Solvency & Liquidity</span>
              <span className="font-bold text-[var(--text-primary)]">Max 20 pts</span>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] pt-1">
            * Note: Missing historical data is treated neutrally. Zero recorded debt is distinguished from verified absence of liabilities. Emergency-fund runway is only calculated with a defensible expense history.
          </p>
        </div>
      )}

      {/* Main Meter + Pillars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Circular Score Gauge (4 cols) */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-3">
          <div className="relative w-36 h-36 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 120 120">
              {/* Background circle track */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                className="text-[var(--bg-subtle)] stroke-current"
                strokeWidth="10"
                fill="transparent"
              />
              {/* Animated Progress Circle */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke={color}
                strokeWidth="10"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-1000 ease-out"
              />
            </svg>

            {/* Inner Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tabular tracking-tight">
                {isInsufficientData ? '—' : totalScore}
              </span>
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {isInsufficientData ? 'No Data' : 'out of 100'}
              </span>
            </div>
          </div>
          <p className="text-xs font-semibold text-center text-[var(--text-secondary)] mt-2">
            {renderSummaryNote()}
          </p>
        </div>

        {/* Right: The 4 Pillars (8 cols) */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Pillar 1: Savings Discipline */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <PiggyBank size={14} className="text-cyan-500" />
                  {pillars.savingsRate.name}
                </span>
                <div className="flex items-center gap-1.5">
                  {renderStatusBadge(pillars.savingsRate.status)}
                  <span className="font-extrabold tabular text-[var(--text-primary)]">
                    {pillars.savingsRate.score} / {pillars.savingsRate.maxScore}
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-primary)]">
                {pillars.savingsRate.description}
              </p>
              {pillars.savingsRate.calculationDetails && (
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  {pillars.savingsRate.calculationDetails}
                </p>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                style={{ width: `${pillars.savingsRate.percentage}%` }}
                className="h-full bg-cyan-500 rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {/* Pillar 2: Emergency Cushion */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  {pillars.emergencyBuffer.name}
                </span>
                <div className="flex items-center gap-1.5">
                  {renderStatusBadge(pillars.emergencyBuffer.status)}
                  <span className="font-extrabold tabular text-[var(--text-primary)]">
                    {pillars.emergencyBuffer.score} / {pillars.emergencyBuffer.maxScore}
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-primary)]">
                {pillars.emergencyBuffer.description}
              </p>
              {pillars.emergencyBuffer.calculationDetails && (
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  {pillars.emergencyBuffer.calculationDetails}
                </p>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                style={{ width: `${pillars.emergencyBuffer.percentage}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {/* Pillar 3: Debt & EMI Burden */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <CreditCard size={14} className="text-purple-500" />
                  {pillars.emiBurden.name}
                </span>
                <div className="flex items-center gap-1.5">
                  {renderStatusBadge(pillars.emiBurden.status)}
                  <span className="font-extrabold tabular text-[var(--text-primary)]">
                    {pillars.emiBurden.score} / {pillars.emiBurden.maxScore}
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-primary)]">
                {pillars.emiBurden.description}
              </p>
              {pillars.emiBurden.calculationDetails && (
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  {pillars.emiBurden.calculationDetails}
                </p>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                style={{ width: `${pillars.emiBurden.percentage}%` }}
                className="h-full bg-purple-500 rounded-full transition-all duration-500"
              />
            </div>
          </div>

          {/* Pillar 4: Solvency & Liquidity */}
          <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col justify-between space-y-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-brand-500" />
                  {pillars.solvency.name}
                </span>
                <div className="flex items-center gap-1.5">
                  {renderStatusBadge(pillars.solvency.status)}
                  <span className="font-extrabold tabular text-[var(--text-primary)]">
                    {pillars.solvency.score} / {pillars.solvency.maxScore}
                  </span>
                </div>
              </div>
              <p className="text-[11px] font-medium text-[var(--text-primary)]">
                {pillars.solvency.description}
              </p>
              {pillars.solvency.calculationDetails && (
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-tight">
                  {pillars.solvency.calculationDetails}
                </p>
              )}
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                style={{ width: `${pillars.solvency.percentage}%` }}
                className="h-full bg-brand-500 rounded-full transition-all duration-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Primary Recommendation Banner */}
      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 dark:bg-amber-950/20 dark:border-amber-900/40 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0 mt-0.5">
          <Lightbulb size={16} />
        </div>
        <div>
          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
            Smart Financial Recommendation
          </p>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
            {primaryRecommendation}
          </p>
          {dataQualityNotes && (
            <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80 mt-1">
              Data note: {dataQualityNotes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
