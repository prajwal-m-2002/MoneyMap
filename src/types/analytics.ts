export interface HealthPillar {
  name: string
  score: number // earned points
  maxScore: number // max possible points
  percentage: number // (score / maxScore) * 100
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'neutral'
  description: string
  calculationDetails?: string
  recommendation?: string
}

export interface FinancialHealthScore {
  totalScore: number // 0 to 100
  tier: 'excellent' | 'good' | 'moderate' | 'critical' | 'insufficient_data'
  tierLabel: string
  color: string
  isInsufficientData?: boolean
  isProvisional?: boolean
  pillars: {
    savingsRate: HealthPillar
    emergencyBuffer: HealthPillar
    emiBurden: HealthPillar
    solvency: HealthPillar
  }
  primaryRecommendation: string
  dataQualityNotes?: string
  evaluationPeriod?: string
  methodologySummary?: string
}

export interface MonthlyCashflow {
  month: string // e.g. "2026-10"
  monthName: string // e.g. "Oct 2026"
  income: number
  expenses: number
  netSavings: number
  savingsRate: number
}

export interface CategoryDonutSlice {
  category: string
  amount: number
  percentage: number
  color: string
}
