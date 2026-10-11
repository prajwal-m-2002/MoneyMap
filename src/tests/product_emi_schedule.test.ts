import { describe, it, expect } from 'vitest'
import { generateProductEMISchedule, calculateLoanProgress } from '@/lib/emiMath'
import type { EMI, EMIPayment } from '@/types/finance'

describe('Product EMI Schedule Generation & Payments', () => {
  it('correctly calculates MacBook M3 schedule with uneven 1st payment and regular EMIs', () => {
    // MacBook M3 scenario:
    // First EMI: ₹2,000 on 2026-11-05
    // Regular EMI: ₹5,000
    // Total instalments: 12 (1st payment + 11 regular payments)
    // Total scheduled commitments = 2000 + (5000 * 11) = ₹57,000
    const macbookEMI: EMI = {
      id: 'emi-macbook',
      name: 'MacBook M3',
      lender: 'Apple Store',
      purchasedFrom: 'Apple Store',
      purchaseDate: '2026-11-01',
      emiType: 'Product EMI',
      principal: 57000,
      interestRate: 0,
      tenureMonths: 12,
      totalInstalments: 12,
      firstPaymentAmount: 2000,
      firstPaymentDate: '2026-11-05',
      regularEmiAmount: 5000,
      emiAmount: 5000,
      startDate: '2026-11-05',
      dueDay: 5,
      status: 'active',
      accountId: 'acc-1',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    }

    const schedule = generateProductEMISchedule({
      emi: macbookEMI,
      todayDate: '2026-11-01',
    })

    // 1. Verify exactly 12 instalments
    expect(schedule).toHaveLength(12)

    // 2. Verify 1st instalment amount is ₹2,000 on 2026-11-05
    expect(schedule[0].instalmentNumber).toBe(1)
    expect(schedule[0].dueDate).toBe('2026-11-05')
    expect(schedule[0].scheduledAmount).toBe(2000)

    // 3. Verify instalments 2 to 12 are ₹5,000 each on day 5 of subsequent months
    for (let i = 1; i < 12; i++) {
      expect(schedule[i].instalmentNumber).toBe(i + 1)
      expect(schedule[i].scheduledAmount).toBe(5000)
    }

    expect(schedule[1].dueDate).toBe('2026-12-05')
    expect(schedule[2].dueDate).toBe('2027-01-05')
    expect(schedule[11].dueDate).toBe('2027-10-05')

    // 4. Verify total scheduled sum is ₹57,000
    const totalScheduled = schedule.reduce((sum, item) => sum + item.scheduledAmount, 0)
    expect(totalScheduled).toBe(57000)
  })

  it('handles month-end capping without date drift for day 31 purchases', () => {
    const phoneEMI: EMI = {
      id: 'emi-phone',
      name: 'Pixel 9 Pro',
      lender: 'Flipkart',
      purchasedFrom: 'Flipkart',
      purchaseDate: '2026-01-31',
      emiType: 'Product EMI',
      principal: 30000,
      interestRate: 0,
      tenureMonths: 4,
      totalInstalments: 4,
      firstPaymentAmount: 6000,
      firstPaymentDate: '2026-01-31',
      regularEmiAmount: 8000,
      emiAmount: 8000,
      startDate: '2026-01-31',
      dueDay: 31,
      status: 'active',
      accountId: 'acc-1',
      createdAt: '2026-01-31T00:00:00Z',
      updatedAt: '2026-01-31T00:00:00Z',
    }

    const schedule = generateProductEMISchedule({
      emi: phoneEMI,
      todayDate: '2026-01-15',
    })

    expect(schedule).toHaveLength(4)
    expect(schedule[0].dueDate).toBe('2026-01-31')
    // February has 28 days in non-leap year 2026 -> 2026-02-28
    expect(schedule[1].dueDate).toBe('2026-02-28')
    // March has 31 days -> returns back to 31st without drifting to 28th!
    expect(schedule[2].dueDate).toBe('2026-03-31')
    // April has 30 days -> 2026-04-30
    expect(schedule[3].dueDate).toBe('2026-04-30')
  })

  it('updates schedule and progress accurately when 1st payment of ₹2,000 is recorded', () => {
    const macbookEMI: EMI = {
      id: 'emi-macbook',
      name: 'MacBook M3',
      lender: 'Apple Store',
      purchasedFrom: 'Apple Store',
      purchaseDate: '2026-11-01',
      emiType: 'Product EMI',
      principal: 57000,
      interestRate: 0,
      tenureMonths: 12,
      totalInstalments: 12,
      firstPaymentAmount: 2000,
      firstPaymentDate: '2026-11-05',
      regularEmiAmount: 5000,
      emiAmount: 5000,
      startDate: '2026-11-05',
      dueDay: 5,
      status: 'active',
      accountId: 'acc-1',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    }

    // Record the first payment of ₹2,000
    const payment1: EMIPayment = {
      id: 'pay-1',
      emiId: 'emi-macbook',
      instalmentNumber: 1,
      paymentDate: '2026-11-05',
      amount: 2000,
      principalComponent: 2000,
      interestComponent: 0,
      transactionId: 'tx-1',
      status: 'paid',
      createdAt: '2026-11-05T00:00:00Z',
    }

    const scheduleWithPayment = generateProductEMISchedule({
      emi: macbookEMI,
      payments: [payment1],
      todayDate: '2026-11-06',
    })

    // Instalment 1 should be marked 'paid'
    expect(scheduleWithPayment[0].status).toBe('paid')
    expect(scheduleWithPayment[0].actualPaidAmount).toBe(2000)

    // Instalment 2 should be 'upcoming' with scheduled amount ₹5,000
    expect(scheduleWithPayment[1].status).toBe('upcoming')
    expect(scheduleWithPayment[1].scheduledAmount).toBe(5000)

    // Progress calculations
    const progress = calculateLoanProgress(macbookEMI, [payment1])
    expect(progress.paidInstalmentsCount).toBe(1)
    expect(progress.remainingInstalments).toBe(11)
    expect(progress.actualPrincipalPaid).toBe(2000)
    // Remaining scheduled commitments: 57,000 - 2,000 = 55,000
    expect(progress.remainingPrincipal).toBe(55000)
  })

  it('correctly advances to regular EMI amount for instalment 2 and completes after last instalment', () => {
    const macbookEMI: EMI = {
      id: 'emi-macbook',
      name: 'MacBook M3',
      lender: 'Apple Store',
      purchasedFrom: 'Apple Store',
      purchaseDate: '2026-11-01',
      emiType: 'Product EMI',
      principal: 57000,
      interestRate: 0,
      tenureMonths: 12,
      totalInstalments: 12,
      firstPaymentAmount: 2000,
      firstPaymentDate: '2026-11-05',
      regularEmiAmount: 5000,
      emiAmount: 5000,
      startDate: '2026-11-05',
      dueDay: 5,
      status: 'active',
      accountId: 'acc-1',
      createdAt: '2026-11-01T00:00:00Z',
      updatedAt: '2026-11-01T00:00:00Z',
    }

    // After 1st payment of ₹2,000
    const payments: EMIPayment[] = [
      {
        id: 'pay-1',
        emiId: 'emi-macbook',
        instalmentNumber: 1,
        paymentDate: '2026-11-05',
        amount: 2000,
        principalComponent: 2000,
        interestComponent: 0,
        transactionId: 'tx-1',
        status: 'paid',
      },
    ]

    // Determine what next instalment amount should be
    const nextInstalmentNumber = payments.length + 1
    let nextAmount = macbookEMI.emiAmount
    if (nextInstalmentNumber === 1 && macbookEMI.firstPaymentAmount) {
      nextAmount = macbookEMI.firstPaymentAmount
    } else if (nextInstalmentNumber > 1 && macbookEMI.regularEmiAmount) {
      nextAmount = macbookEMI.regularEmiAmount
    }

    expect(nextInstalmentNumber).toBe(2)
    expect(nextAmount).toBe(5000)

    // Record 2nd payment of ₹5,000
    payments.push({
      id: 'pay-2',
      emiId: 'emi-macbook',
      instalmentNumber: 2,
      paymentDate: '2026-12-05',
      amount: nextAmount,
      principalComponent: nextAmount,
      interestComponent: 0,
      transactionId: 'tx-2',
      status: 'paid',
    })

    const progress2 = calculateLoanProgress(macbookEMI, payments)
    expect(progress2.paidInstalmentsCount).toBe(2)
    expect(progress2.remainingInstalments).toBe(10)
    // 57,000 - 2,000 - 5,000 = 50,000
    expect(progress2.remainingPrincipal).toBe(50000)
  })
})
