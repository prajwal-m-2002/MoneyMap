import type {
  EMI,
  EMIPayment,
  AmortizationScheduleItem,
  PrepaymentSimulationResult,
} from '@/types/finance'

/**
 * Calculate Monthly EMI using standard Reducing Balance formula:
 * E = P * r * (1 + r)^n / ((1 + r)^n - 1)
 *
 * @param principal Loan principal amount in INR
 * @param annualRatePercent Annual interest rate in percent (e.g., 8.5 for 8.5%)
 * @param tenureMonths Total tenure in months
 */
export function calculateEMIAmount(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0
  if (annualRatePercent <= 0) {
    // 0% Interest (e.g. No-Cost EMI)
    return Math.round(principal / tenureMonths)
  }

  const monthlyRate = annualRatePercent / (12 * 100)
  const compound = Math.pow(1 + monthlyRate, tenureMonths)
  const emi = (principal * monthlyRate * compound) / (compound - 1)

  return Math.round(emi)
}

/**
 * Calculate total interest payable over the loan tenure
 */
export function calculateTotalInterest(
  principal: number,
  emiAmount: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0
  const totalRepayment = emiAmount * tenureMonths
  return Math.max(0, Math.round(totalRepayment - principal))
}

/**
 * Helper to compute an instalment due date
 */
export function getInstalmentDate(startDateStr: string, instalmentIndex: number, dueDay?: number): string {
  const [yearStr, monthStr, dayStr] = startDateStr.split('-')
  const startYear = parseInt(yearStr, 10)
  const startMonth = parseInt(monthStr, 10) - 1 // 0-indexed
  const preferredDay = dueDay ?? (dayStr ? parseInt(dayStr, 10) : 1)

  // Target month
  const targetDate = new Date(startYear, startMonth + instalmentIndex, 1)
  const targetYear = targetDate.getFullYear()
  const targetMonth = targetDate.getMonth()

  // Find max days in target month
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate()
  const safeDay = Math.min(preferredDay, daysInMonth)

  const d = new Date(targetYear, targetMonth, safeDay)
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Generate full month-by-month loan amortization schedule
 */
export function generateAmortizationSchedule(params: {
  principal: number
  interestRate: number
  tenureMonths: number
  startDate: string
  dueDay?: number
  emiAmount?: number
  payments?: EMIPayment[]
}): AmortizationScheduleItem[] {
  const {
    principal,
    interestRate,
    tenureMonths,
    startDate,
    dueDay,
    payments = [],
  } = params

  if (principal <= 0 || tenureMonths <= 0) return []

  const monthlyRate = interestRate > 0 ? interestRate / (12 * 100) : 0
  const baseEmi =
    params.emiAmount && params.emiAmount > 0
      ? params.emiAmount
      : calculateEMIAmount(principal, interestRate, tenureMonths)

  const schedule: AmortizationScheduleItem[] = []
  let openingBalance = principal
  const today = new Date().toISOString().slice(0, 10)

  // Map payments by instalmentNumber
  const paymentMap = new Map<number, EMIPayment>()
  for (const p of payments) {
    paymentMap.set(p.instalmentNumber, p)
  }

  for (let i = 1; i <= tenureMonths; i++) {
    if (openingBalance <= 0) break

    const paymentDate = getInstalmentDate(startDate, i - 1, dueDay)
    const existingPayment = paymentMap.get(i)

    let interestPaid = 0
    let principalPaid = 0
    let instalmentEmi = baseEmi

    if (existingPayment && existingPayment.status === 'paid') {
      // Use recorded payment figures if available
      interestPaid = existingPayment.interestComponent
      principalPaid = existingPayment.principalComponent
      instalmentEmi = existingPayment.amount
    } else {
      // Theoretical calculation
      if (monthlyRate === 0) {
        interestPaid = 0
        principalPaid = Math.min(openingBalance, Math.round(principal / tenureMonths))
      } else {
        interestPaid = Math.round(openingBalance * monthlyRate)
        principalPaid = baseEmi - interestPaid
      }

      // Final month adjustment to ensure zero residual balance
      if (i === tenureMonths || principalPaid >= openingBalance) {
        principalPaid = openingBalance
        instalmentEmi = principalPaid + interestPaid
      }
    }

    const closingBalance = Math.max(0, Math.round(openingBalance - principalPaid))

    let status = existingPayment?.status ?? 'pending'
    if (!existingPayment) {
      if (paymentDate < today) {
        status = 'overdue'
      } else {
        status = 'pending'
      }
    }

    schedule.push({
      instalmentNumber: i,
      paymentDate,
      openingBalance: Math.round(openingBalance),
      emiAmount: instalmentEmi,
      principalPaid: Math.round(principalPaid),
      interestPaid: Math.round(interestPaid),
      closingBalance,
      status,
      paymentId: existingPayment?.id,
      transactionId: existingPayment?.transactionId ?? undefined,
      actualPaidDate: existingPayment?.status === 'paid' ? existingPayment.paymentDate : undefined,
    })

    openingBalance = closingBalance
  }

  return schedule
}

/**
 * Compute high-level loan progress and metrics
 */
export function calculateLoanProgress(emi: EMI, payments: EMIPayment[] = []) {
  const paidPayments = payments.filter((p) => p.status === 'paid')
  const paidInstalmentsCount = paidPayments.length
  const totalInstalments = emi.totalInstalments ?? emi.tenureMonths
  const remainingInstalments = Math.max(0, totalInstalments - paidInstalmentsCount)

  // Principal paid directly recorded or estimated
  const actualPrincipalPaid = paidPayments.reduce((sum, p) => sum + (p.principalComponent || 0), 0)
  const actualInterestPaid = paidPayments.reduce((sum, p) => sum + (p.interestComponent || 0), 0)

  // Remaining principal balance
  const remainingPrincipal = Math.max(0, Math.round(emi.principal - actualPrincipalPaid))
  const progressPercent = Math.min(100, Math.round((actualPrincipalPaid / emi.principal) * 100))

  // Find next upcoming instalment
  const schedule = generateAmortizationSchedule({
    principal: emi.principal,
    interestRate: emi.interestRate,
    tenureMonths: emi.tenureMonths,
    startDate: emi.startDate,
    dueDay: emi.dueDay,
    emiAmount: emi.emiAmount,
    payments,
  })

  const nextUnpaid = schedule.find((s) => s.status !== 'paid')

  // Check if current month instalment is already paid
  const now = new Date()
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const paidThisMonth = paidPayments.some((p) => p.paymentDate.startsWith(currentMonthPrefix))

  // Total loan cost
  const totalExpectedInterest =
    emi.interestRate === 0
      ? 0
      : schedule.reduce((sum, item) => sum + item.interestPaid, 0)
  const totalLoanRepayment = emi.principal + totalExpectedInterest

  return {
    paidInstalmentsCount,
    totalInstalments,
    remainingInstalments,
    actualPrincipalPaid,
    actualInterestPaid,
    remainingPrincipal,
    progressPercent,
    nextInstalment: nextUnpaid,
    paidThisMonth,
    totalLoanRepayment,
    totalExpectedInterest,
  }
}

/**
 * Prepayment & Foreclosure Simulator
 * Simulates the effect of paying an extra lump sum on interest and tenure.
 */
export function simulatePrepayment(params: {
  principalRemaining: number
  annualRatePercent: number
  currentEmi: number
  currentTenureRemaining: number
  prepaymentAmount: number
  strategy: 'reduce_tenure' | 'reduce_emi'
}): PrepaymentSimulationResult {
  const {
    principalRemaining,
    annualRatePercent,
    currentEmi,
    currentTenureRemaining,
    prepaymentAmount,
    strategy,
  } = params

  const safePrepayment = Math.min(prepaymentAmount, principalRemaining)
  const newPrincipal = Math.max(0, principalRemaining - safePrepayment)

  // Current original remaining interest under status quo
  const originalRemainingRepayment = currentEmi * currentTenureRemaining
  const originalRemainingInterest = Math.max(0, Math.round(originalRemainingRepayment - principalRemaining))

  if (newPrincipal <= 0) {
    // 100% foreclosed!
    return {
      prepaymentAmount: safePrepayment,
      strategy,
      currentPrincipalRemaining: principalRemaining,
      originalRemainingMonths: currentTenureRemaining,
      originalRemainingInterest,
      newTenureMonths: 0,
      newEmiAmount: 0,
      interestSaved: originalRemainingInterest,
      monthsSaved: currentTenureRemaining,
    }
  }

  const monthlyRate = annualRatePercent / (12 * 100)

  if (strategy === 'reduce_tenure') {
    // Maintain current monthly EMI, find new tenure months n'
    let newTenureMonths = currentTenureRemaining
    if (monthlyRate === 0) {
      newTenureMonths = Math.ceil(newPrincipal / currentEmi)
    } else {
      // n = -ln(1 - (r * P) / E) / ln(1 + r)
      const ratio = (monthlyRate * newPrincipal) / currentEmi
      if (ratio < 1) {
        newTenureMonths = Math.ceil(-Math.log(1 - ratio) / Math.log(1 + monthlyRate))
      } else {
        newTenureMonths = currentTenureRemaining
      }
    }

    newTenureMonths = Math.min(newTenureMonths, currentTenureRemaining)
    const newTotalRepayment = currentEmi * newTenureMonths
    const newTotalInterest = Math.max(0, Math.round(newTotalRepayment - newPrincipal))
    const interestSaved = Math.max(0, originalRemainingInterest - newTotalInterest)
    const monthsSaved = Math.max(0, currentTenureRemaining - newTenureMonths)

    return {
      prepaymentAmount: safePrepayment,
      strategy,
      currentPrincipalRemaining: principalRemaining,
      originalRemainingMonths: currentTenureRemaining,
      originalRemainingInterest,
      newTenureMonths,
      newEmiAmount: currentEmi,
      interestSaved,
      monthsSaved,
    }
  } else {
    // strategy === 'reduce_emi': Keep remaining tenure constant, lower the monthly EMI
    const newEmiAmount = calculateEMIAmount(newPrincipal, annualRatePercent, currentTenureRemaining)
    const newTotalRepayment = newEmiAmount * currentTenureRemaining
    const newTotalInterest = Math.max(0, Math.round(newTotalRepayment - newPrincipal))
    const interestSaved = Math.max(0, originalRemainingInterest - newTotalInterest)

    return {
      prepaymentAmount: safePrepayment,
      strategy,
      currentPrincipalRemaining: principalRemaining,
      originalRemainingMonths: currentTenureRemaining,
      originalRemainingInterest,
      newTenureMonths: currentTenureRemaining,
      newEmiAmount,
      interestSaved,
      monthsSaved: 0,
    }
  }
}

export interface ProductEMIScheduleItem {
  instalmentNumber: number
  dueDate: string
  scheduledAmount: number
  actualPaidAmount?: number
  paymentDate?: string
  status: 'paid' | 'upcoming' | 'overdue' | 'skipped'
  transactionId?: string | null
}

/**
 * Generates the full schedule for a product purchase EMI plan,
 * cleanly handling an uneven first payment followed by fixed regular payments,
 * as well as month-end calendar wrapping without date drift.
 */
export function generateProductEMISchedule(params: {
  emi: EMI
  payments?: EMIPayment[]
  todayDate?: string
}): ProductEMIScheduleItem[] {
  const { emi, payments = [], todayDate = new Date().toISOString().slice(0, 10) } = params
  const totalCount = emi.totalInstalments ?? emi.tenureMonths
  if (totalCount <= 0) return []

  const firstAmt = emi.firstPaymentAmount ?? emi.emiAmount
  const regularAmt = emi.regularEmiAmount ?? emi.emiAmount
  const firstDate = emi.firstPaymentDate || emi.startDate
  const dueDay = emi.dueDay

  const paidPaymentsMap = new Map<number, EMIPayment>()
  for (const p of payments) {
    if (p.emiId === emi.id && p.status === 'paid') {
      paidPaymentsMap.set(p.instalmentNumber, p)
    }
  }

  const items: ProductEMIScheduleItem[] = []

  for (let i = 1; i <= totalCount; i++) {
    let dueDate: string
    if (i === 1) {
      dueDate = firstDate
    } else {
      // Offset from first date by (i - 1) months using preferred dueDay
      dueDate = getInstalmentDate(firstDate, i - 1, dueDay)
    }

    const scheduledAmount = i === 1 ? firstAmt : regularAmt
    const paidRecord = paidPaymentsMap.get(i)

    if (paidRecord) {
      items.push({
        instalmentNumber: i,
        dueDate,
        scheduledAmount,
        actualPaidAmount: paidRecord.amount,
        paymentDate: paidRecord.paymentDate,
        status: 'paid',
        transactionId: paidRecord.transactionId,
      })
    } else {
      const isOverdue = dueDate < todayDate
      items.push({
        instalmentNumber: i,
        dueDate,
        scheduledAmount,
        status: isOverdue ? 'overdue' : 'upcoming',
      })
    }
  }

  return items
}
