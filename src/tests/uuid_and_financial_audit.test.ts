import { describe, it, expect } from 'vitest'
import { generateUUID, isUUID, calculateAccountBalance } from '@/context/FinanceContext'
import { calculateEMIAmount, generateAmortizationSchedule } from '@/lib/emiMath'
import type { Account, Transaction } from '@/types/finance'

describe('UUID and Database Integrity Tests', () => {
  it('generates valid RFC 4122 v4 UUID strings', () => {
    for (let i = 0; i < 20; i++) {
      const id = generateUUID()
      expect(typeof id).toBe('string')
      expect(id).toHaveLength(36)
      // Must match RFC 4122 v4 pattern
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
      expect(isUUID(id)).toBe(true)
    }
  })

  it('correctly discriminates between UUIDs and legacy non-UUID strings', () => {
    // Valid UUIDs
    expect(isUUID('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')).toBe(true)
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(isUUID(generateUUID())).toBe(true)

    // Legacy client strings that previously crashed Supabase
    expect(isUUID('tx-1760090888062-8438')).toBe(false)
    expect(isUUID('tx-seed-1')).toBe(false)
    expect(isUUID('acc-axis')).toBe(false)
    expect(isUUID('emi-123')).toBe(false)
    expect(isUUID('inv-parag-parikh')).toBe(false)
    expect(isUUID('')).toBe(false)
  })
})

describe('Financial Ledger & Reconciliation Audit', () => {
  it('accurately calculates account balance across income, expense, and transfer transactions', () => {
    const accPrimary: Account = {
      id: generateUUID(),
      name: 'Salary Account',
      type: 'savings',
      openingBalance: 10000,
      balance: 10000,
      color: 'emerald',
      isActive: true,
    }

    const accKotak: Account = {
      id: generateUUID(),
      name: 'Savings (Kotak)',
      type: 'savings',
      openingBalance: 5000,
      balance: 5000,
      color: 'blue',
      isActive: true,
    }

    const accSpending: Account = {
      id: generateUUID(),
      name: 'Daily Spending (Federal)',
      type: 'savings',
      openingBalance: 2000,
      balance: 2000,
      color: 'amber',
      isActive: true,
    }

    const transactions: Transaction[] = [
      // 1. Salary Credit: ₹27,000
      {
        id: generateUUID(),
        type: 'income',
        amount: 27000,
        title: 'Monthly Salary Credit',
        category: 'Salary',
        accountId: accPrimary.id,
        date: '2026-10-01',
        paymentMethod: 'Net Banking',
        createdAt: new Date().toISOString(),
      },
      // 2. Transfer: ₹8,000 to Kotak Bank
      {
        id: generateUUID(),
        type: 'transfer',
        amount: 8000,
        title: 'Transfer to Kotak Savings',
        category: 'Transfer',
        accountId: accPrimary.id,
        toAccountId: accKotak.id,
        date: '2026-10-02',
        paymentMethod: 'UPI',
        createdAt: new Date().toISOString(),
      },
      // 3. Transfer: ₹9,000 to Daily Spending
      {
        id: generateUUID(),
        type: 'transfer',
        amount: 9000,
        title: 'Transfer to Spending Account',
        category: 'Transfer',
        accountId: accPrimary.id,
        toAccountId: accSpending.id,
        date: '2026-10-02',
        paymentMethod: 'UPI',
        createdAt: new Date().toISOString(),
      },
      // 4. Expenses: ₹830 spent from Daily Spending
      {
        id: generateUUID(),
        type: 'expense',
        amount: 830,
        title: 'Groceries & Provisions',
        category: 'Food',
        accountId: accSpending.id,
        date: '2026-10-03',
        paymentMethod: 'UPI',
        createdAt: new Date().toISOString(),
      },
    ]

    // Balance verification:
    // Salary Account: Opening 10000 + 27000 (salary) - 8000 (trf) - 9000 (trf) = 20,000
    const balPrimary = calculateAccountBalance(accPrimary, transactions)
    expect(balPrimary).toBe(20000)

    // Kotak Savings: Opening 5000 + 8000 (received trf) = 13,000
    const balKotak = calculateAccountBalance(accKotak, transactions)
    expect(balKotak).toBe(13000)

    // Daily Spending: Opening 2000 + 9000 (received trf) - 830 (expense) = 10,170
    const balSpending = calculateAccountBalance(accSpending, transactions)
    expect(balSpending).toBe(10170)

    // Total Liquid Net Wealth across all accounts:
    // 20,000 + 13,000 + 10,170 = 43,170
    const totalLiquid = balPrimary + balKotak + balSpending
    expect(totalLiquid).toBe(43170)
  })

  it('guarantees 0% APR loans calculate exactly ₹0 total interest with zero rounding artifacts', () => {
    // MacBook Pro M3 test scenario: ₹1,99,900 principal, 0% APR, 12 months tenure
    const principal = 199900
    const interestRate = 0
    const tenureMonths = 12

    const emi = calculateEMIAmount(principal, interestRate, tenureMonths)
    // 199900 / 12 = 16658.333... -> rounded to nearest rupee = 16658
    expect(emi).toBe(Math.round(principal / tenureMonths))

    const schedule = generateAmortizationSchedule({
      principal,
      interestRate,
      tenureMonths,
      startDate: '2026-10-01',
      dueDay: 5,
      emiAmount: emi,
    })

    expect(schedule).toHaveLength(12)

    // Total interest across all instalments in a 0% loan must be strictly 0
    const totalInterest = schedule.reduce((sum, item) => sum + item.interestPaid, 0)
    expect(totalInterest).toBe(0)

    // Total principal paid across all instalments must equal the loan principal
    const totalPrincipal = schedule.reduce((sum, item) => sum + item.principalPaid, 0)
    expect(totalPrincipal).toBe(principal)

    // Final balance after 12 months must be 0
    expect(schedule[11].closingBalance).toBe(0)
  })
})

describe('Test Data Purge & Zero-State Verification', () => {
  it('ensures application default collections are completely free of hardcoded test data', async () => {
    const {
      DEFAULT_ACCOUNTS,
      DEFAULT_EMIS,
      DEFAULT_INVESTMENTS,
      DEFAULT_BUDGETS,
      getInitialTransactions,
      getInitialEMIPayments,
    } = await import('@/context/FinanceContext')

    expect(DEFAULT_ACCOUNTS).toEqual([])
    expect(DEFAULT_EMIS).toEqual([])
    expect(DEFAULT_INVESTMENTS).toEqual([])
    expect(DEFAULT_BUDGETS).toEqual([])
    expect(getInitialTransactions()).toEqual([])
    expect(getInitialEMIPayments()).toEqual([])
  })

  it('accurately identifies and tags test seed records for automatic purge', async () => {
    const { isTestSeed } = await import('@/context/FinanceContext')

    // Test seed records must be identified
    expect(isTestSeed('acc-axis')).toBe(true)
    expect(isTestSeed('acc-kotak')).toBe(true)
    expect(isTestSeed('acc-sbi')).toBe(true)
    expect(isTestSeed('acc-federal')).toBe(true)
    expect(isTestSeed('acc-cash')).toBe(true)
    expect(isTestSeed('tx-seed-1')).toBe(true)
    expect(isTestSeed('tx-seed-99')).toBe(true)
    expect(isTestSeed('emi-1')).toBe(true)
    expect(isTestSeed('pay-emi-1-1')).toBe(true)
    expect(isTestSeed('inv-1')).toBe(true)
    expect(isTestSeed('rec-seed-1')).toBe(true)

    // Legitimate user records must never be flagged
    expect(isTestSeed('acc-hdfc-salary')).toBe(false)
    expect(isTestSeed('550e8400-e29b-41d4-a716-446655440000')).toBe(false)
    expect(isTestSeed(generateUUID())).toBe(false)
    expect(isTestSeed('')).toBe(false)
    expect(isTestSeed(null)).toBe(false)
  })
})

describe('Opening Balance Date Financial Calculation Rules', () => {
  it('correctly isolates opening balance prior to effective date (Axis Bank Oct 1, 2026 prompt rule)', () => {
    const axisBank: Account = {
      id: generateUUID(),
      name: 'Axis Bank',
      type: 'savings',
      openingBalance: 10000,
      openingBalanceDate: '2026-10-01',
      balance: 10000,
      isActive: true,
    }

    const txOct2: Transaction = {
      id: generateUUID(),
      type: 'expense',
      amount: 2500,
      title: 'Groceries',
      category: 'Groceries',
      accountId: axisBank.id,
      date: '2026-10-02',
      createdAt: '2026-10-02T10:00:00Z',
    }

    const transactions = [txOct2]

    // 1. Balance on September 30, 2026 must NOT include the opening balance
    const balanceSep30 = calculateAccountBalance(axisBank, transactions, '2026-09-30')
    expect(balanceSep30).toBe(0)

    // 2. Balance on October 1, 2026 must include ₹10,000, before subsequent transactions
    const balanceOct1 = calculateAccountBalance(axisBank, transactions, '2026-10-01')
    expect(balanceOct1).toBe(10000)

    // 3. Balance on October 2, 2026 includes opening balance minus subsequent expense (₹7,500)
    const balanceOct2 = calculateAccountBalance(axisBank, transactions, '2026-10-02')
    expect(balanceOct2).toBe(7500)

    // 4. Current balance without asOfDate includes opening balance minus subsequent expense (₹7,500)
    const liveBalance = calculateAccountBalance(axisBank, transactions)
    expect(liveBalance).toBe(7500)
  })

  it('safely handles legacy accounts defaulting opening balance date to created_at date', () => {
    const legacyAccount: Account = {
      id: generateUUID(),
      name: 'Legacy Account',
      type: 'savings',
      openingBalance: 5000,
      balance: 5000,
      createdAt: '2026-08-15T09:30:00Z',
      isActive: true,
    }

    // Before creation date
    expect(calculateAccountBalance(legacyAccount, [], '2026-08-14')).toBe(0)
    // On creation date
    expect(calculateAccountBalance(legacyAccount, [], '2026-08-15')).toBe(5000)
    // After creation date
    expect(calculateAccountBalance(legacyAccount, [], '2026-08-16')).toBe(5000)
  })
})

