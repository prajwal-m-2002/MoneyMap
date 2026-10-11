import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import type {
  Account,
  AccountType,
  Transaction,
  FinancialSummary,
  ExpenseInput,
  IncomeInput,
  TransferInput,
  CreateAccountInput,
  UpdateAccountInput,
  Budget,
  CategoryBudgetProgress,
  CategorySpendingItem,
  Preset,
  CreatePresetInput,
  UpdatePresetInput,
  EMI,
  EMIPayment,
  CreateEMIInput,
  UpdateEMIInput,
  Investment,
  CreateInvestmentInput,
  UpdateInvestmentInput,
  PaymentMethod,
  RecurringTransaction,
  CreateRecurringInput,
  UpdateRecurringInput,
  CashFlowForecast,
  RecurringSuggestion,
} from '@/types/finance'
import { calculateEMIAmount, generateAmortizationSchedule } from '@/lib/emiMath'
import {
  calculateNextDueDate,
  generateCashFlowForecast,
  discoverRecurringPatterns,
} from '@/lib/predictionEngine'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import {
  recordAutoBackup,
  backupToCloudDatabase,
  getCloudAutoBackupConfig,
  type BackupPayload,
} from '@/lib/backupManager'

interface FinanceContextType {
  accounts: Account[]
  transactions: Transaction[]
  summary: FinancialSummary
  budgets: Budget[]
  categoryBudgets: CategoryBudgetProgress[]
  categorySpending: CategorySpendingItem[]
  presets: Preset[]
  emis: EMI[]
  emiPayments: EMIPayment[]
  investments: Investment[]
  recurringTransactions: RecurringTransaction[]
  cashFlowForecast: CashFlowForecast
  recurringSuggestions: RecurringSuggestion[]
  isSupabaseConnected: boolean
  loadingAccounts: boolean
  addExpense: (input: ExpenseInput) => Promise<{ success: boolean; error?: string }>
  addIncome: (input: IncomeInput) => Promise<{ success: boolean; error?: string }>
  transferMoney: (input: TransferInput) => Promise<{ success: boolean; error?: string }>
  deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>
  editTransaction: (id: string, updated: Partial<Transaction>) => Promise<{ success: boolean; error?: string }>
  createAccount: (input: CreateAccountInput) => Promise<{ success: boolean; error?: string; account?: Account }>
  updateAccount: (id: string, input: UpdateAccountInput) => Promise<{ success: boolean; error?: string }>
  deleteAccount: (id: string) => Promise<{ success: boolean; error?: string }>
  saveBudget: (category: string, monthlyLimit: number, month?: string) => Promise<{ success: boolean; error?: string }>
  deleteBudget: (id: string) => Promise<{ success: boolean; error?: string }>
  createPreset: (input: CreatePresetInput) => Promise<{ success: boolean; error?: string; preset?: Preset }>
  updatePreset: (id: string, input: UpdatePresetInput) => Promise<{ success: boolean; error?: string }>
  deletePreset: (id: string) => Promise<{ success: boolean; error?: string }>
  createEMI: (input: CreateEMIInput) => Promise<{ success: boolean; error?: string; emi?: EMI }>
  updateEMI: (id: string, input: UpdateEMIInput) => Promise<{ success: boolean; error?: string }>
  deleteEMI: (id: string) => Promise<{ success: boolean; error?: string }>
  payEMIInstalment: (emiId: string, options?: { accountId?: string; paymentDate?: string; customAmount?: number }) => Promise<{ success: boolean; error?: string; payment?: EMIPayment }>
  createInvestment: (input: CreateInvestmentInput) => Promise<{ success: boolean; error?: string; investment?: Investment }>
  updateInvestment: (id: string, input: UpdateInvestmentInput) => Promise<{ success: boolean; error?: string }>
  deleteInvestment: (id: string) => Promise<{ success: boolean; error?: string }>
  updateInvestmentValue: (id: string, newCurrentValue: number) => Promise<{ success: boolean; error?: string }>
  batchImportTransactions: (
    items: Array<{
      type: 'expense' | 'income'
      amount: number
      title: string
      category: string
      accountId: string
      date: string
      time?: string
      paymentMethod?: PaymentMethod
      notes?: string
    }>
  ) => Promise<{ success: boolean; count: number; error?: string }>
  createRecurringTransaction: (input: CreateRecurringInput) => Promise<{ success: boolean; error?: string; item?: RecurringTransaction }>
  updateRecurringTransaction: (id: string, input: UpdateRecurringInput) => Promise<{ success: boolean; error?: string }>
  deleteRecurringTransaction: (id: string) => Promise<{ success: boolean; error?: string }>
  toggleRecurringStatus: (id: string) => Promise<{ success: boolean; error?: string }>
  processRecurringTransaction: (id: string, postAsTransaction?: boolean) => Promise<{ success: boolean; error?: string }>
  reconcileAccountBalances: () => void
  clearAllData: () => Promise<void> | void
  clearTransactions: () => Promise<{ success: boolean; error?: string }>
  resetToDefaultData: () => Promise<void> | void
  restoreAllData: (payload: BackupPayload) => Promise<{ success: boolean; error?: string }>
  backupToCloud: () => Promise<{ success: boolean; error?: string; count?: number }>
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined)

const ACCOUNTS_STORAGE_KEY = 'moneymap_accounts_v2'
const TRANSACTIONS_STORAGE_KEY = 'moneymap_transactions_v2'
const BUDGETS_STORAGE_KEY = 'moneymap_budgets_v3'
const PRESETS_STORAGE_KEY = 'moneymap_presets_v2'
const EMIS_STORAGE_KEY = 'moneymap_emis_v2'
const EMI_PAYMENTS_STORAGE_KEY = 'moneymap_emi_payments_v2'
const INVESTMENTS_STORAGE_KEY = 'moneymap_investments_v1'
const RECURRING_STORAGE_KEY = 'moneymap_recurring_v1'

export const DEFAULT_INVESTMENTS: Investment[] = []

export const DEFAULT_EMIS: EMI[] = []

export function getInitialEMIPayments(): EMIPayment[] {
  return []
}

export const DEFAULT_PRESETS: Preset[] = [
  { id: 'pre-1', type: 'expense', title: 'Food Court Lunch', category: 'Food & Dining', defaultAmount: 250, paymentMethod: 'UPI' },
  { id: 'pre-2', type: 'expense', title: 'Weekly Groceries', category: 'Groceries', defaultAmount: 1200, paymentMethod: 'UPI' },
  { id: 'pre-3', type: 'expense', title: 'Petrol / Fuel', category: 'Transportation', defaultAmount: 500, paymentMethod: 'UPI' },
  { id: 'pre-4', type: 'expense', title: 'Uber / Auto Ride', category: 'Transportation', defaultAmount: 180, paymentMethod: 'UPI' },
  { id: 'pre-5', type: 'expense', title: 'House Rent', category: 'Rent & Housing', defaultAmount: 18000, paymentMethod: 'Net Banking' },
  { id: 'pre-6', type: 'expense', title: 'Electricity Bill', category: 'Bills & Utilities', defaultAmount: 1500, paymentMethod: 'UPI' },
  { id: 'pre-7', type: 'expense', title: 'Broadband Internet', category: 'Bills & Utilities', defaultAmount: 999, paymentMethod: 'UPI' },
  { id: 'pre-8', type: 'expense', title: 'Gym Membership', category: 'Health & Medical', defaultAmount: 1500, paymentMethod: 'UPI' },
  { id: 'pre-9', type: 'expense', title: 'Coffee / Snacks', category: 'Food & Dining', defaultAmount: 150, paymentMethod: 'UPI' },
  { id: 'pre-10', type: 'income', title: 'Monthly Salary', category: 'Salary', defaultAmount: 65000, paymentMethod: 'Net Banking' },
  { id: 'pre-11', type: 'income', title: 'Freelance Payout', category: 'Freelance', defaultAmount: 12000, paymentMethod: 'Net Banking' },
  { id: 'pre-12', type: 'income', title: 'UPI Cashback / Refund', category: 'Refund & Cashback', defaultAmount: 50, paymentMethod: 'UPI' },
]

// Category limits are strictly optional — never invent mandatory default limits!
export const DEFAULT_BUDGETS: Budget[] = []

export const DEFAULT_ACCOUNTS: Account[] = []

export function calculateAccountBalance(
  account: Account,
  transactions: Transaction[],
  asOfDate?: string
): number {
  const opening = Number(account.openingBalance ?? account.balance) || 0
  const effectiveOpeningDate =
    account.openingBalanceDate ||
    (account.createdAt ? account.createdAt.slice(0, 10) : undefined)

  // If calculating asOfDate and that date is strictly before opening balance date, do not include opening balance
  const isOpeningEffective =
    !asOfDate || !effectiveOpeningDate || asOfDate >= effectiveOpeningDate
  const effectiveOpening = isOpeningEffective ? opening : 0

  let credits = 0
  let debits = 0

  for (const tx of transactions) {
    // If asOfDate is provided, skip transactions dated strictly after asOfDate
    if (asOfDate && tx.date > asOfDate) {
      continue
    }
    const amt = Number(tx.amount) || 0
    if (tx.type === 'income' && tx.accountId === account.id) {
      credits += amt
    } else if (tx.type === 'expense' && tx.accountId === account.id) {
      debits += amt
    } else if (tx.type === 'transfer') {
      if (tx.accountId === account.id) {
        debits += amt // outgoing
      }
      if (tx.toAccountId === account.id) {
        credits += amt // incoming
      }
    }
  }

  return effectiveOpening + credits - debits
}

export function calculateAccountBalanceAsOf(
  account: Account,
  transactions: Transaction[],
  asOfDate: string
): number {
  return calculateAccountBalance(account, transactions, asOfDate)
}

export function getInitialTransactions(): Transaction[] {
  return []
}

export const TEST_SEED_IDS = new Set([
  'acc-axis',
  'acc-kotak',
  'acc-sbi',
  'acc-federal',
  'acc-cash',
  'tx-seed-1',
  'tx-seed-2',
  'tx-seed-3',
  'tx-seed-4',
  'emi-1',
  'emi-2',
  'inv-1',
  'inv-2',
  'inv-3',
  'inv-4',
  'rec-seed-1',
  'rec-seed-2',
  'rec-seed-3',
  'rec-seed-4',
  'rec-seed-5',
])

export function isTestSeed(id?: string | null): boolean {
  if (!id) return false
  if (TEST_SEED_IDS.has(id)) return true
  if (
    id.startsWith('tx-seed-') ||
    id.startsWith('pay-emi-') ||
    id.startsWith('rec-seed-') ||
    id.startsWith('inv-') ||
    id.startsWith('emi-') ||
    id.startsWith('acc-axis') ||
    id.startsWith('acc-kotak') ||
    id.startsWith('acc-sbi') ||
    id.startsWith('acc-federal') ||
    id.startsWith('acc-cash')
  ) {
    return true
  }
  return false
}

function cleanStoredList<T extends { id: string }>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const filtered = parsed.filter((item) => {
      if (!item || !item.id) return false
      if (isTestSeed(item.id)) return false
      // For transactions: filter if attached to test seed accounts
      if ('accountId' in item && isTestSeed((item as any).accountId)) return false
      if ('toAccountId' in item && isTestSeed((item as any).toAccountId)) return false
      // For EMI payments: filter if attached to test seed EMIs
      if ('emiId' in item && isTestSeed((item as any).emiId)) return false
      return true
    })
    if (filtered.length !== parsed.length) {
      localStorage.setItem(key, JSON.stringify(filtered))
    }
    return filtered
  } catch {
    return []
  }
}

export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function toDbTransaction(tx: Transaction, userId?: string) {
  const payload: any = {
    type: tx.type,
    amount: tx.amount,
    title: tx.title,
    category: tx.category,
    account_id: tx.accountId,
    to_account_id: tx.toAccountId || null,
    date: tx.date,
    time: tx.time || null,
    payment_method: tx.paymentMethod || 'UPI',
    notes: tx.notes || null,
    is_recurring: false,
  }
  if (isUUID(tx.id)) {
    payload.id = tx.id
  }
  if (userId) {
    payload.user_id = userId
  }
  return payload
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user, isDemoMode } = useAuth()
  const [loadingAccounts, setLoadingAccounts] = useState(false)

  const [accounts, setAccounts] = useState<Account[]>(() => {
    return cleanStoredList<Account>(ACCOUNTS_STORAGE_KEY)
  })

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    return cleanStoredList<Transaction>(TRANSACTIONS_STORAGE_KEY)
  })

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    return cleanStoredList<Budget>(BUDGETS_STORAGE_KEY)
  })

  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY)
      if (stored) return JSON.parse(stored)
    } catch {
      // ignore
    }
    return DEFAULT_PRESETS
  })

  const [emis, setEmis] = useState<EMI[]>(() => {
    return cleanStoredList<EMI>(EMIS_STORAGE_KEY)
  })

  const [emiPayments, setEmiPayments] = useState<EMIPayment[]>(() => {
    return cleanStoredList<EMIPayment>(EMI_PAYMENTS_STORAGE_KEY)
  })

  const [investments, setInvestments] = useState<Investment[]>(() => {
    return cleanStoredList<Investment>(INVESTMENTS_STORAGE_KEY)
  })

  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>(() => {
    return cleanStoredList<RecurringTransaction>(RECURRING_STORAGE_KEY)
  })

  // Sync with Supabase on user authentication
  useEffect(() => {
    let active = true

    async function syncSupabaseData() {
      if (!isSupabaseConfigured || !supabase || !user || isDemoMode) {
        return
      }

      setLoadingAccounts(true)
      try {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .order('created_at', { ascending: true })

        if (error) {
          console.warn('Failed to load accounts from Supabase:', error.message)
        } else if (active && data) {
          if (data.length > 0) {
            const mapped: Account[] = data.map((row: any) => ({
              id: row.id,
              name: row.name,
              type: row.type as AccountType,
              balance: Number(row.balance),
              openingBalance: Number(row.opening_balance),
              openingBalanceDate:
                row.opening_balance_date ||
                (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
              ledgerCoverageStartDate:
                row.ledger_coverage_start_date ||
                row.opening_balance_date ||
                (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10)),
              lastStatementReconciledDate: row.last_statement_reconciled_date || undefined,
              accountNumber: row.account_number || undefined,
              color: row.color,
              isActive: row.is_active !== false,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            }))
            setAccounts(mapped)
          } else {
            setAccounts([])
          }
        }

        // Fetch Transactions from Supabase
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .order('date', { ascending: false })

        if (txError) {
          console.warn('Failed to load transactions from Supabase:', txError.message)
        } else if (active && txData) {
          if (txData.length > 0) {
            const mappedTxs: Transaction[] = txData.map((row: any) => ({
              id: row.id,
              type: row.type,
              amount: Number(row.amount),
              title: row.title,
              category: row.category,
              accountId: row.account_id,
              toAccountId: row.to_account_id || undefined,
              date: row.date,
              time: row.time || undefined,
              paymentMethod: row.payment_method || 'UPI',
              notes: row.notes || undefined,
              createdAt: row.created_at,
            }))
            setTransactions(mappedTxs)
            setAccounts((prevAccs) =>
              prevAccs.map((acc) => ({
                ...acc,
                balance: calculateAccountBalance(acc, mappedTxs),
              }))
            )
          } else {
            setTransactions([])
          }
        }

        // Fetch Budgets from Supabase
        const { data: bData } = await (supabase.from('budgets') as any).select('*')
        if (active && bData) {
          if (bData.length > 0) {
            const mappedBudgets: Budget[] = bData.map((b: any) => ({
              id: b.id,
              category: b.category,
              monthlyLimit: Number(b.monthly_limit),
              month: b.month,
              createdAt: b.created_at,
              updatedAt: b.updated_at,
            }))
            setBudgets(mappedBudgets)
          } else {
            setBudgets([])
          }
        }

        // Fetch Presets from Supabase
        const { data: pData } = await (supabase.from('presets') as any).select('*')
        if (active && pData && pData.length > 0) {
          const mappedPresets: Preset[] = pData.map((p: any) => ({
            id: p.id,
            type: p.type,
            title: p.title,
            category: p.category,
            defaultAmount: p.default_amount != null ? Number(p.default_amount) : null,
            accountId: p.account_id || null,
            paymentMethod: p.payment_method || null,
            notes: p.notes || null,
            createdAt: p.created_at,
          }))
          setPresets(mappedPresets)
        }

        // Fetch EMIs from Supabase
        const { data: eData } = await (supabase.from('emis') as any).select('*')
        if (active && eData) {
          if (eData.length > 0) {
            const mappedEmis: EMI[] = eData.map((row: any) => ({
              id: row.id,
              name: row.name,
              lender: row.lender,
              principal: Number(row.principal),
              interestRate: Number(row.interest_rate),
              tenureMonths: Number(row.tenure_months),
              emiAmount: Number(row.emi_amount),
              startDate: row.start_date,
              dueDay: Number(row.due_day),
              accountId: row.account_id || null,
              category: row.category || 'Other',
              status: row.status,
              notes: row.notes || null,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
            }))
            setEmis(mappedEmis)
          } else {
            setEmis([])
          }
        }

        // Fetch EMI Payments from Supabase
        const { data: epData } = await (supabase.from('emi_payments') as any).select('*')
        if (active && epData) {
          if (epData.length > 0) {
            const mappedPayments: EMIPayment[] = epData.map((row: any) => ({
              id: row.id,
              emiId: row.emi_id,
              transactionId: row.transaction_id || null,
              instalmentNumber: Number(row.instalment_number),
              amount: Number(row.amount),
              principalComponent: Number(row.principal_component),
              interestComponent: Number(row.interest_component),
              paymentDate: row.payment_date,
              status: row.status,
              createdAt: row.created_at,
            }))
            setEmiPayments(mappedPayments)
          } else {
            setEmiPayments([])
          }
        }

        // Fetch Investments from Supabase
        // Fetch Investments from Supabase
        try {
          const { data: invData } = await (supabase.from('investments') as any).select('*')
          if (active && invData) {
            if (invData.length > 0) {
              const mappedInv: Investment[] = invData.map((row: any) => ({
                id: row.id,
                name: row.name,
                assetType: row.asset_type,
                investedAmount: Number(row.invested_amount),
                currentValue: Number(row.current_value),
                units: row.units != null ? Number(row.units) : null,
                buyPrice: row.buy_price != null ? Number(row.buy_price) : null,
                currentPrice: row.current_price != null ? Number(row.current_price) : null,
                portfolio: row.portfolio || null,
                institution: row.institution || null,
                notes: row.notes || null,
                lastUpdated: row.last_updated || new Date().toISOString().slice(0, 10),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
              }))
              setInvestments(mappedInv)
            } else {
              setInvestments([])
            }
          }
        } catch {
          // graceful fallback if table not yet migrated
        }
      } catch (err) {
        console.error('Data synchronization error:', err)
      } finally {
        if (active) setLoadingAccounts(false)
      }
    }

    syncSupabaseData()

    return () => {
      active = false
    }
  }, [user, isDemoMode])

  // Persist to localStorage for offline cache
  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
    } catch (e) {
      console.error('Failed to save accounts to localStorage', e)
    }
  }, [accounts])

  useEffect(() => {
    try {
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions))
    } catch (e) {
      console.error('Failed to save transactions to localStorage', e)
    }
  }, [transactions])

  useEffect(() => {
    try {
      localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(budgets))
    } catch (e) {
      console.error('Failed to save budgets to localStorage', e)
    }
  }, [budgets])

  useEffect(() => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets))
    } catch (e) {
      console.error('Failed to save presets to localStorage', e)
    }
  }, [presets])

  useEffect(() => {
    try {
      localStorage.setItem(EMIS_STORAGE_KEY, JSON.stringify(emis))
    } catch (e) {
      console.error('Failed to save emis to localStorage', e)
    }
  }, [emis])

  useEffect(() => {
    try {
      localStorage.setItem(EMI_PAYMENTS_STORAGE_KEY, JSON.stringify(emiPayments))
    } catch (e) {
      console.error('Failed to save emiPayments to localStorage', e)
    }
  }, [emiPayments])

  useEffect(() => {
    try {
      localStorage.setItem(INVESTMENTS_STORAGE_KEY, JSON.stringify(investments))
    } catch (e) {
      console.error('Failed to save investments to localStorage', e)
    }
  }, [investments])

  useEffect(() => {
    try {
      localStorage.setItem(RECURRING_STORAGE_KEY, JSON.stringify(recurringTransactions))
    } catch (e) {
      console.error('Failed to save recurringTransactions to localStorage', e)
    }
  }, [recurringTransactions])

  // Financial summary computation
  const summary: FinancialSummary = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // Liquid accounts (active bank + cash)
    const totalAvailable = accounts
      .filter((a) => a.isActive !== false && (a.type === 'savings' || a.type === 'salary' || a.type === 'current' || a.type === 'cash'))
      .reduce((sum, a) => sum + (Number(a.balance) || 0), 0)

    const currentMonthPrefix = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
    let incomeThisMonth = 0
    let expensesThisMonth = 0

    for (const tx of transactions) {
      if (!tx.date) continue
      if (tx.date.startsWith(currentMonthPrefix)) {
        if (tx.type === 'income') {
          incomeThisMonth += Number(tx.amount) || 0
        } else if (tx.type === 'expense') {
          expensesThisMonth += Number(tx.amount) || 0
        }
        // Transfers between owned accounts do NOT count as income or expenses!
      }
    }

    const netSavings = incomeThisMonth - expensesThisMonth
    
    // Phase 9: Dynamic EMI calculation

    // An active EMI is due this month if it has NOT been paid this current month yet
    const unpaidActiveEmisThisMonth = emis.filter((e) => {
      if (e.status !== 'active') return false
      const alreadyPaidThisMonth = emiPayments.some(
        (p) => p.emiId === e.id && p.status === 'paid' && p.paymentDate.startsWith(currentMonthPrefix)
      )
      return !alreadyPaidThisMonth
    })

    const emiDueThisMonth = unpaidActiveEmisThisMonth.reduce((sum, e) => sum + (Number(e.emiAmount) || 0), 0)

    // Calculate total remaining principal across active loans
    let totalOutstandingPrincipal = 0
    for (const e of emis) {
      if (e.status === 'active' || e.status === 'paused') {
        const principalPaid = emiPayments
          .filter((p) => p.emiId === e.id && p.status === 'paid')
          .reduce((sum, p) => sum + (p.principalComponent || 0), 0)
        totalOutstandingPrincipal += Math.max(0, e.principal - principalPaid)
      }
    }

    // Phase 10: Dynamic Investment Value & Net Worth calculation
    const investmentValue = investments.reduce(
      (sum, inv) => sum + (Number(inv.currentValue) || 0),
      0
    )
    const netWorth = totalAvailable + investmentValue - totalOutstandingPrincipal

    return {
      totalAvailable,
      incomeThisMonth,
      expensesThisMonth,
      netSavings,
      investmentValue,
      emiDueThisMonth,
      netWorth,
    }
  }, [accounts, transactions, emis, emiPayments, investments])

  // Automatic Category Spending Calculation (Always calculated for all expenses, no budget required)
  const categorySpending: CategorySpendingItem[] = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // 1. Filter expense transactions for current calendar month
    const monthExpenses = transactions.filter((tx) => {
      if (tx.type !== 'expense' || !tx.date) return false
      const d = new Date(tx.date)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth
    })

    const totalPeriodSpent = monthExpenses.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)

    // 2. Group by category
    const catMap: Record<string, Transaction[]> = {}
    for (const tx of monthExpenses) {
      const cat = (tx.category || 'Uncategorized').trim()
      if (!catMap[cat]) catMap[cat] = []
      catMap[cat].push(tx)
    }

    // Also include any categories that have an explicit budget configured even if spent is 0
    for (const b of budgets) {
      const bCat = b.category.trim()
      if (!catMap[bCat]) catMap[bCat] = []
    }

    const items: CategorySpendingItem[] = Object.entries(catMap).map(([cat, txList]) => {
      const totalSpent = txList.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0)
      const percentageOfTotal =
        totalPeriodSpent > 0 ? Number(((totalSpent / totalPeriodSpent) * 100).toFixed(1)) : 0
      const transactionCount = txList.length

      // Check for user-configured budget
      const matchingBudget = budgets.find(
        (b) => b.category.toLowerCase() === cat.toLowerCase()
      )

      let monthlyLimit: number | null = null
      let budgetRemaining: number | null = null
      let budgetUsedPercent: number | null = null
      let budgetStatus: 'normal' | 'warning' | 'exceeded' | null = null
      let budgetId: string | null = null

      if (matchingBudget && matchingBudget.monthlyLimit > 0) {
        monthlyLimit = matchingBudget.monthlyLimit
        budgetRemaining = Math.max(0, monthlyLimit - totalSpent)
        budgetUsedPercent = Number(((totalSpent / monthlyLimit) * 100).toFixed(1))
        budgetStatus =
          budgetUsedPercent >= 100 ? 'exceeded' : budgetUsedPercent >= 80 ? 'warning' : 'normal'
        budgetId = matchingBudget.id
      }

      return {
        category: cat,
        totalSpent,
        percentageOfTotal,
        transactionCount,
        transactions: txList,
        monthlyLimit,
        budgetRemaining,
        budgetUsedPercent,
        budgetStatus,
        budgetId,
      }
    })

    // Sort by totalSpent descending by default
    return items.sort((a, b) => b.totalSpent - a.totalSpent)
  }, [transactions, budgets])

  // Category Budgets (strictly for categories with explicitly configured limits)
  const categoryBudgets: CategoryBudgetProgress[] = useMemo(() => {
    return categorySpending
      .filter((c) => c.monthlyLimit !== null && c.monthlyLimit !== undefined && c.monthlyLimit > 0)
      .map((c) => ({
        category: c.category,
        monthlyLimit: c.monthlyLimit!,
        spentThisMonth: c.totalSpent,
        remaining: c.budgetRemaining ?? 0,
        spentPercentage: Math.round(c.budgetUsedPercent ?? 0),
        status: (c.budgetStatus as any) || 'normal',
        budgetId: c.budgetId || undefined,
      }))
  }, [categorySpending])

  // Phase 12: Predictive Cash Flow Forecast
  const cashFlowForecast: CashFlowForecast = useMemo(() => {
    return generateCashFlowForecast(
      summary.totalAvailable,
      recurringTransactions,
      emis,
      transactions,
      30,
      undefined,
      emiPayments
    )
  }, [summary.totalAvailable, recurringTransactions, emis, transactions, emiPayments])

  // Phase 12: Hidden Repeating Pattern Discovery
  const recurringSuggestions: RecurringSuggestion[] = useMemo(() => {
    return discoverRecurringPatterns(transactions)
  }, [transactions])

  // Reconcile all account balances against the ledger
  const reconcileAccountBalances = useCallback(() => {
    setAccounts((prev) =>
      prev.map((acc) => ({
        ...acc,
        balance: calculateAccountBalance(acc, transactions),
      }))
    )
  }, [transactions])

  // Create Account
  const createAccount = async (input: CreateAccountInput): Promise<{ success: boolean; error?: string; account?: Account }> => {
    const opening = Number(input.openingBalance) || 0
    const todayStr = new Date().toISOString().split('T')[0]
    const openingDate = input.openingBalanceDate?.trim() || todayStr
    const coverageStartDate = input.ledgerCoverageStartDate?.trim() || openingDate

    const newAccount: Account = {
      id: generateUUID(),
      name: input.name.trim(),
      type: input.type,
      openingBalance: opening,
      openingBalanceDate: openingDate,
      ledgerCoverageStartDate: coverageStartDate,
      balance: opening,
      accountNumber: input.accountNumber,
      color: input.color || 'emerald',
      isActive: true,
      createdAt: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        let { data, error } = await supabase
          .from('accounts')
          .insert({
            user_id: user.id,
            name: newAccount.name,
            type: newAccount.type,
            balance: newAccount.balance,
            opening_balance: newAccount.openingBalance,
            opening_balance_date: newAccount.openingBalanceDate,
            ledger_coverage_start_date: newAccount.ledgerCoverageStartDate,
            account_number: newAccount.accountNumber || null,
            color: newAccount.color || 'emerald',
            is_active: true,
          } as any)
          .select()
          .single()

        // Graceful fallback if opening_balance_date column not yet added to remote Supabase schema
        if (error && (error.message?.includes('opening_balance_date') || (error as any).code === 'PGRST204')) {
          console.warn('Supabase accounts table missing opening_balance_date column in schema cache. Saving with fallback.')
          const fallback = await supabase
            .from('accounts')
            .insert({
              user_id: user.id,
              name: newAccount.name,
              type: newAccount.type,
              balance: newAccount.balance,
              opening_balance: newAccount.openingBalance,
              account_number: newAccount.accountNumber || null,
              color: newAccount.color || 'emerald',
              is_active: true,
            } as any)
            .select()
            .single()
          data = fallback.data
          error = fallback.error
        }

        if (error) {
          return { success: false, error: `Database error: ${error.message}` }
        }
        if (data) {
          newAccount.id = (data as any).id
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to save account to database.' }
      }
    }

    setAccounts((prev) => [...prev, newAccount])
    return { success: true, account: newAccount }
  }

  // Update Account
  const updateAccount = async (id: string, input: UpdateAccountInput): Promise<{ success: boolean; error?: string }> => {
    const existing = accounts.find((a) => a.id === id)
    if (!existing) return { success: false, error: 'Account not found.' }

    const updatedOpening = input.openingBalance !== undefined ? Number(input.openingBalance) : existing.openingBalance
    const updatedOpeningDate = input.openingBalanceDate !== undefined
      ? input.openingBalanceDate.trim()
      : (existing.openingBalanceDate || (existing.createdAt ? existing.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)))

    const updatedAccount: Account = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      type: input.type !== undefined ? input.type : existing.type,
      openingBalance: updatedOpening,
      openingBalanceDate: updatedOpeningDate,
      ledgerCoverageStartDate:
        input.ledgerCoverageStartDate !== undefined
          ? input.ledgerCoverageStartDate
          : (updatedOpeningDate || existing.ledgerCoverageStartDate),
      accountNumber: input.accountNumber !== undefined ? input.accountNumber : existing.accountNumber,
      color: input.color !== undefined ? input.color : existing.color,
      isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
      updatedAt: new Date().toISOString(),
    }

    // Accurately recalculate ledger balance with updated opening baseline and effective date
    updatedAccount.balance = calculateAccountBalance(updatedAccount, transactions)

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        let { error } = await (supabase.from('accounts') as any)
          .update({
            name: updatedAccount.name,
            type: updatedAccount.type,
            opening_balance: updatedAccount.openingBalance,
            opening_balance_date: updatedAccount.openingBalanceDate,
            ledger_coverage_start_date: updatedAccount.ledgerCoverageStartDate,
            balance: updatedAccount.balance,
            account_number: updatedAccount.accountNumber || null,
            color: updatedAccount.color || 'emerald',
            is_active: updatedAccount.isActive !== false,
          })
          .eq('id', id)

        // Graceful fallback if opening_balance_date column not yet added to remote Supabase schema
        if (error && (error.message?.includes('opening_balance_date') || (error as any).code === 'PGRST204')) {
          console.warn('Supabase accounts table missing opening_balance_date column in schema cache. Updating with fallback.')
          const fallback = await (supabase.from('accounts') as any)
            .update({
              name: updatedAccount.name,
              type: updatedAccount.type,
              opening_balance: updatedAccount.openingBalance,
              balance: updatedAccount.balance,
              account_number: updatedAccount.accountNumber || null,
              color: updatedAccount.color || 'emerald',
              is_active: updatedAccount.isActive !== false,
            })
            .eq('id', id)
          error = fallback.error
        }

        if (error) {
          return { success: false, error: `Database error: ${error.message}` }
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to update account in database.' }
      }
    }

    setAccounts((prev) => prev.map((a) => (a.id === id ? updatedAccount : a)))
    return { success: true }
  }

  // Delete Account
  const deleteAccount = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        const { error } = await supabase.from('accounts').delete().eq('id', id)
        if (error) {
          return { success: false, error: `Database error: ${error.message}` }
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to delete account from database.' }
      }
    }

    setAccounts((prev) => prev.filter((a) => a.id !== id))
    return { success: true }
  }

  // Add Expense
  const addExpense = async (input: ExpenseInput): Promise<{ success: boolean; error?: string }> => {
    const amount = Number(input.amount)
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Please enter a valid expense amount greater than ₹0.' }
    }
    if (!input.title?.trim()) {
      return { success: false, error: 'Expense description or name is required.' }
    }
    if (!input.accountId) {
      return { success: false, error: 'Please select an account to pay from.' }
    }

    const selectedAccount = accounts.find((a) => a.id === input.accountId)
    if (!selectedAccount) {
      return { success: false, error: 'Selected account does not exist.' }
    }

    const newTx: Transaction = {
      id: generateUUID(),
      type: 'expense',
      amount,
      title: input.title.trim(),
      category: input.category || 'General',
      accountId: input.accountId,
      date: input.date || new Date().toISOString().split('T')[0],
      time: input.time || undefined,
      paymentMethod: input.paymentMethod || 'UPI',
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        const { data: inserted, error: txErr } = await supabase
          .from('transactions')
          .insert([toDbTransaction(newTx, user.id)] as any)
          .select()
        if (txErr) {
          return { success: false, error: `Database error: ${txErr.message}` }
        }
        if (inserted && (inserted as any)[0]?.id) {
          newTx.id = (inserted as any)[0].id
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown database failure'
        return { success: false, error: `Database operation failed: ${message}` }
      }
    }

    // Atomically update balance: deduct expense from selected account
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === input.accountId ? { ...acc, balance: acc.balance - amount } : acc))
    )
    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      const targetAcc = accounts.find((a) => a.id === input.accountId)
      if (targetAcc) {
        ;(supabase.from('accounts') as any).update({ balance: targetAcc.balance - amount }).eq('id', input.accountId).then()
      }
    }
    setTransactions((prev) => [newTx, ...prev])

    return { success: true }
  }

  // Add Income
  const addIncome = async (input: IncomeInput): Promise<{ success: boolean; error?: string }> => {
    const amount = Number(input.amount)
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Please enter a valid income amount greater than ₹0.' }
    }
    if (!input.title?.trim()) {
      return { success: false, error: 'Income source name is required.' }
    }
    if (!input.accountId) {
      return { success: false, error: 'Please select a destination account.' }
    }

    const selectedAccount = accounts.find((a) => a.id === input.accountId)
    if (!selectedAccount) {
      return { success: false, error: 'Selected destination account does not exist.' }
    }

    const newTx: Transaction = {
      id: generateUUID(),
      type: 'income',
      amount,
      title: input.title.trim(),
      category: input.category || 'Salary',
      accountId: input.accountId,
      date: input.date || new Date().toISOString().split('T')[0],
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        const { data: inserted, error: txErr } = await supabase
          .from('transactions')
          .insert([toDbTransaction(newTx, user.id)] as any)
          .select()
        if (txErr) {
          return { success: false, error: `Database error: ${txErr.message}` }
        }
        if (inserted && (inserted as any)[0]?.id) {
          newTx.id = (inserted as any)[0].id
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown database failure'
        return { success: false, error: `Database operation failed: ${message}` }
      }
    }

    // Atomically credit income to destination account
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === input.accountId ? { ...acc, balance: acc.balance + amount } : acc))
    )
    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      const targetAcc = accounts.find((a) => a.id === input.accountId)
      if (targetAcc) {
        ;(supabase.from('accounts') as any).update({ balance: targetAcc.balance + amount }).eq('id', input.accountId).then()
      }
    }
    setTransactions((prev) => [newTx, ...prev])

    return { success: true }
  }

  // Transfer Money
  const transferMoney = async (input: TransferInput): Promise<{ success: boolean; error?: string }> => {
    const amount = Number(input.amount)
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Please enter a valid transfer amount greater than ₹0.' }
    }
    if (!input.fromAccountId || !input.toAccountId) {
      return { success: false, error: 'Please select both source and destination accounts.' }
    }
    if (input.fromAccountId === input.toAccountId) {
      return { success: false, error: 'Source and destination accounts must be different.' }
    }

    const fromAcc = accounts.find((a) => a.id === input.fromAccountId)
    const toAcc = accounts.find((a) => a.id === input.toAccountId)
    if (!fromAcc || !toAcc) {
      return { success: false, error: 'Selected account(s) not found.' }
    }

    const newTx: Transaction = {
      id: generateUUID(),
      type: 'transfer',
      amount,
      title: input.purpose?.trim() || `Transfer to ${toAcc.name}`,
      category: 'Transfer',
      accountId: input.fromAccountId,
      toAccountId: input.toAccountId,
      date: input.date || new Date().toISOString().split('T')[0],
      notes: input.purpose?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        const { data: inserted, error: txErr } = await supabase
          .from('transactions')
          .insert([toDbTransaction(newTx, user.id)] as any)
          .select()
        if (txErr) {
          return { success: false, error: `Database error: ${txErr.message}` }
        }
        if (inserted && (inserted as any)[0]?.id) {
          newTx.id = (inserted as any)[0].id
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown database failure'
        return { success: false, error: `Database operation failed: ${message}` }
      }
    }

    // Atomically move money between accounts
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id === input.fromAccountId) {
          return { ...acc, balance: acc.balance - amount }
        }
        if (acc.id === input.toAccountId) {
          return { ...acc, balance: acc.balance + amount }
        }
        return acc
      })
    )
    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      if (fromAcc) {
        ;(supabase.from('accounts') as any).update({ balance: fromAcc.balance - amount }).eq('id', input.fromAccountId).then()
      }
      if (toAcc) {
        ;(supabase.from('accounts') as any).update({ balance: toAcc.balance + amount }).eq('id', input.toAccountId).then()
      }
    }
    setTransactions((prev) => [newTx, ...prev])

    return { success: true }
  }

  // Delete Transaction with balance reversal
  const deleteTransaction = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const tx = transactions.find((t) => t.id === id)
    if (!tx) {
      return { success: false, error: 'Transaction not found.' }
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode && isUUID(id)) {
      try {
        const { error } = await supabase.from('transactions').delete().eq('id', id)
        if (error) {
          return { success: false, error: `Database error: ${error.message}` }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown database failure'
        return { success: false, error: `Database operation failed: ${message}` }
      }
    }

    const nextTransactions = transactions.filter((t) => t.id !== id)
    setAccounts((prev) => {
      const nextAccounts = prev.map((acc) => ({
        ...acc,
        balance: calculateAccountBalance(acc, nextTransactions),
      }))
      if (isSupabaseConfigured && supabase && user && !isDemoMode) {
        for (const na of nextAccounts) {
          const old = prev.find((a) => a.id === na.id)
          if (old && old.balance !== na.balance) {
            ;(supabase.from('accounts') as any).update({ balance: na.balance }).eq('id', na.id).then()
          }
        }
      }
      return nextAccounts
    })

    setTransactions(nextTransactions)
    return { success: true }
  }

  // Edit Transaction with atomic dual-side balance adjustment
  const editTransaction = async (
    id: string,
    updatedFields: Partial<Transaction>
  ): Promise<{ success: boolean; error?: string }> => {
    const oldTx = transactions.find((t) => t.id === id)
    if (!oldTx) {
      return { success: false, error: 'Transaction not found.' }
    }

    const updatedTx: Transaction = {
      ...oldTx,
      ...updatedFields,
    }

    if (isNaN(updatedTx.amount) || updatedTx.amount <= 0) {
      return { success: false, error: 'Amount must be greater than ₹0.' }
    }

    // Validate account existence
    const targetAccount = accounts.find((a) => a.id === updatedTx.accountId)
    if (!targetAccount) {
      return { success: false, error: 'Selected account does not exist.' }
    }

    if (updatedTx.type === 'transfer') {
      if (!updatedTx.toAccountId) {
        return { success: false, error: 'Transfer destination account is required.' }
      }
      const destAccount = accounts.find((a) => a.id === updatedTx.toAccountId)
      if (!destAccount) {
        return { success: false, error: 'Transfer destination account does not exist.' }
      }
      if (updatedTx.accountId === updatedTx.toAccountId) {
        return { success: false, error: 'Source and destination accounts must be different.' }
      }
      updatedTx.fromAccountId = updatedTx.accountId
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode && isUUID(id)) {
      try {
        const { error } = await (supabase.from('transactions') as any)
          .update(toDbTransaction(updatedTx, user.id))
          .eq('id', id)

        if (error) {
          return { success: false, error: `Database error: ${error.message}` }
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown database failure'
        return { success: false, error: `Database operation failed: ${message}` }
      }
    }

    // Atomic Balance Recalculation: derive directly from authoritative ledger
    const nextTransactions = transactions.map((t) => (t.id === id ? updatedTx : t))
    setAccounts((prev) => {
      const nextAccounts = prev.map((acc) => ({
        ...acc,
        balance: calculateAccountBalance(acc, nextTransactions),
      }))

      if (isSupabaseConfigured && supabase && user && !isDemoMode) {
        for (const na of nextAccounts) {
          const old = prev.find((a) => a.id === na.id)
          if (old && old.balance !== na.balance) {
            ;(supabase.from('accounts') as any).update({ balance: na.balance }).eq('id', na.id).then()
          }
        }
      }

      return nextAccounts
    })

    setTransactions(nextTransactions)
    return { success: true }
  }

  // Budget Management
  const saveBudget = async (
    category: string,
    monthlyLimit: number,
    month?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const currentMonthStr =
      month || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
    const existingIndex = budgets.findIndex(
      (b) => b.category.toLowerCase() === category.toLowerCase()
    )

    if (existingIndex >= 0) {
      const existing = budgets[existingIndex]
      const updatedBudget: Budget = {
        ...existing,
        monthlyLimit,
        month: currentMonthStr,
        updatedAt: new Date().toISOString(),
      }

      if (isSupabaseConfigured && supabase && user && !isDemoMode) {
        try {
          await (supabase.from('budgets') as any)
            .update({ monthly_limit: monthlyLimit, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
        } catch (e: any) {
          console.warn('Supabase budget update warning:', e)
        }
      }

      setBudgets((prev) => prev.map((b, idx) => (idx === existingIndex ? updatedBudget : b)))
      return { success: true }
    } else {
      const newBudget: Budget = {
        id: generateUUID(),
        category: category.trim(),
        monthlyLimit,
        month: currentMonthStr,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (isSupabaseConfigured && supabase && user && !isDemoMode) {
        try {
          const { data } = await (supabase.from('budgets') as any)
            .insert({
              user_id: user.id,
              category: newBudget.category,
              monthly_limit: newBudget.monthlyLimit,
              month: newBudget.month,
            })
            .select()
          if (data && data[0]) {
            newBudget.id = data[0].id
          }
        } catch (e: any) {
          console.warn('Supabase budget insert warning:', e)
        }
      }

      setBudgets((prev) => [...prev, newBudget])
      return { success: true }
    }
  }

  const deleteBudget = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        await (supabase.from('budgets') as any).delete().eq('id', id)
      } catch (e: any) {
        console.warn('Supabase delete budget warning:', e)
      }
    }
    setBudgets((prev) => prev.filter((b) => b.id !== id))
    return { success: true }
  }

  // Preset Management
  const createPreset = async (
    input: CreatePresetInput
  ): Promise<{ success: boolean; error?: string; preset?: Preset }> => {
    const newPreset: Preset = {
      id: generateUUID(),
      type: input.type,
      title: input.title.trim(),
      category: input.category.trim(),
      defaultAmount: input.defaultAmount != null ? Number(input.defaultAmount) : null,
      accountId: input.accountId || null,
      paymentMethod: input.paymentMethod || null,
      notes: input.notes || null,
      createdAt: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        const { data, error } = await (supabase.from('presets') as any)
          .insert({
            user_id: user.id,
            type: newPreset.type,
            title: newPreset.title,
            category: newPreset.category,
            default_amount: newPreset.defaultAmount,
            account_id: newPreset.accountId,
            payment_method: newPreset.paymentMethod,
            notes: newPreset.notes,
          })
          .select()

        if (error) {
          console.warn('Supabase create preset error:', error)
        } else if (data && data[0]) {
          newPreset.id = data[0].id
        }
      } catch (e: any) {
        console.warn('Supabase create preset warning:', e)
      }
    }

    setPresets((prev) => [newPreset, ...prev])
    return { success: true, preset: newPreset }
  }

  const updatePreset = async (
    id: string,
    input: UpdatePresetInput
  ): Promise<{ success: boolean; error?: string }> => {
    const existing = presets.find((p) => p.id === id)
    if (!existing) return { success: false, error: 'Preset not found' }

    const updatedPreset: Preset = {
      ...existing,
      ...input,
      title: input.title !== undefined ? input.title.trim() : existing.title,
      category: input.category !== undefined ? input.category.trim() : existing.category,
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        await (supabase.from('presets') as any)
          .update({
            type: updatedPreset.type,
            title: updatedPreset.title,
            category: updatedPreset.category,
            default_amount: updatedPreset.defaultAmount,
            account_id: updatedPreset.accountId,
            payment_method: updatedPreset.paymentMethod,
            notes: updatedPreset.notes,
          })
          .eq('id', id)
      } catch (e: any) {
        console.warn('Supabase update preset warning:', e)
      }
    }

    setPresets((prev) => prev.map((p) => (p.id === id ? updatedPreset : p)))
    return { success: true }
  }

  const deletePreset = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        await (supabase.from('presets') as any).delete().eq('id', id)
      } catch (e: any) {
        console.warn('Supabase delete preset warning:', e)
      }
    }
    setPresets((prev) => prev.filter((p) => p.id !== id))
    return { success: true }
  }

  // EMI Management
  const createEMI = async (
    input: CreateEMIInput
  ): Promise<{ success: boolean; error?: string; emi?: EMI }> => {
    const emiAmount =
      input.emiAmount && input.emiAmount > 0
        ? input.emiAmount
        : calculateEMIAmount(input.principal, input.interestRate, input.tenureMonths)

    const newEMI: EMI = {
      id: generateUUID(),
      name: input.name.trim(),
      lender: input.lender.trim(),
      principal: input.principal,
      interestRate: input.interestRate ?? 0,
      tenureMonths: input.tenureMonths,
      emiAmount,
      startDate: input.startDate,
      dueDay: input.dueDay,
      accountId: input.accountId || null,
      category: input.category || 'Other',
      status: 'active',
      notes: input.notes || null,

      // Product purchase EMI extensions
      purchasedFrom: input.purchasedFrom || input.lender.trim(),
      purchaseDate: input.purchaseDate || null,
      emiType: input.emiType || 'Product EMI',
      firstPaymentAmount: input.firstPaymentAmount ?? (input.emiAmount || emiAmount),
      firstPaymentDate: input.firstPaymentDate || input.startDate,
      regularEmiAmount: input.regularEmiAmount ?? emiAmount,
      totalInstalments: input.totalInstalments ?? input.tenureMonths,
      downPayment: input.downPayment || 0,
      orderReference: input.orderReference || null,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        const { data, error } = await (supabase.from('emis') as any)
          .insert({
            user_id: user.id,
            name: newEMI.name,
            lender: newEMI.lender,
            principal: newEMI.principal,
            interest_rate: newEMI.interestRate,
            tenure_months: newEMI.tenureMonths,
            emi_amount: newEMI.emiAmount,
            start_date: newEMI.startDate,
            due_day: newEMI.dueDay,
            account_id: newEMI.accountId,
            category: newEMI.category,
            status: newEMI.status,
            notes: newEMI.notes,
          })
          .select()

        if (error) {
          console.warn('Supabase create EMI error:', error.message)
        } else if (data && data[0]) {
          newEMI.id = data[0].id
        }
      } catch (err: any) {
        console.warn('Supabase insert EMI warning:', err)
      }
    }

    setEmis((prev) => [newEMI, ...prev])
    return { success: true, emi: newEMI }
  }

  const updateEMI = async (
    id: string,
    input: UpdateEMIInput
  ): Promise<{ success: boolean; error?: string }> => {
    const existing = emis.find((e) => e.id === id)
    if (!existing) return { success: false, error: 'EMI not found' }

    const updatedEMI: EMI = {
      ...existing,
      ...input,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      lender: input.lender !== undefined ? input.lender.trim() : existing.lender,
      emiAmount:
        input.emiAmount !== undefined
          ? input.emiAmount
          : input.principal !== undefined || input.interestRate !== undefined || input.tenureMonths !== undefined
          ? calculateEMIAmount(
              input.principal ?? existing.principal,
              input.interestRate ?? existing.interestRate,
              input.tenureMonths ?? existing.tenureMonths
            )
          : existing.emiAmount,
      updatedAt: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        await (supabase.from('emis') as any)
          .update({
            name: updatedEMI.name,
            lender: updatedEMI.lender,
            principal: updatedEMI.principal,
            interest_rate: updatedEMI.interestRate,
            tenure_months: updatedEMI.tenureMonths,
            emi_amount: updatedEMI.emiAmount,
            start_date: updatedEMI.startDate,
            due_day: updatedEMI.dueDay,
            account_id: updatedEMI.accountId,
            category: updatedEMI.category,
            status: updatedEMI.status,
            notes: updatedEMI.notes,
          })
          .eq('id', id)
      } catch (e: any) {
        console.warn('Supabase update EMI warning:', e)
      }
    }

    setEmis((prev) => prev.map((e) => (e.id === id ? updatedEMI : e)))
    return { success: true }
  }

  const deleteEMI = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        await (supabase.from('emis') as any).delete().eq('id', id)
      } catch (e: any) {
        console.warn('Supabase delete EMI warning:', e)
      }
    }
    setEmis((prev) => prev.filter((e) => e.id !== id))
    setEmiPayments((prev) => prev.filter((p) => p.emiId !== id))
    return { success: true }
  }

  const payEMIInstalment = async (
    emiId: string,
    options?: { accountId?: string; paymentDate?: string; customAmount?: number }
  ): Promise<{ success: boolean; error?: string; payment?: EMIPayment }> => {
    const emi = emis.find((e) => e.id === emiId)
    if (!emi) return { success: false, error: 'EMI not found' }

    const linkedPayments = emiPayments.filter((p) => p.emiId === emiId)
    const nextInstalmentNumber = linkedPayments.filter((p) => p.status === 'paid').length + 1

    if (nextInstalmentNumber > emi.tenureMonths) {
      return { success: false, error: 'All instalments for this loan have already been paid' }
    }

    // Determine target debit account
    const debitAccountId = options?.accountId || emi.accountId || accounts[0]?.id
    if (!debitAccountId) {
      return { success: false, error: 'No valid debit account specified' }
    }

    // Generate schedule to obtain precise principal and interest components
    const schedule = generateAmortizationSchedule({
      principal: emi.principal,
      interestRate: emi.interestRate,
      tenureMonths: emi.tenureMonths,
      startDate: emi.startDate,
      dueDay: emi.dueDay,
      emiAmount: emi.emiAmount,
      payments: linkedPayments,
    })

    const scheduleItem = schedule.find((s) => s.instalmentNumber === nextInstalmentNumber)
    let amount = options?.customAmount
    if (!amount) {
      if (nextInstalmentNumber === 1 && emi.firstPaymentAmount) {
        amount = emi.firstPaymentAmount
      } else if (nextInstalmentNumber > 1 && emi.regularEmiAmount) {
        amount = emi.regularEmiAmount
      } else {
        amount = scheduleItem?.emiAmount ?? emi.emiAmount
      }
    }
    const principalComponent = scheduleItem?.principalPaid ?? amount
    const interestComponent = scheduleItem?.interestPaid ?? 0
    const paymentDate = options?.paymentDate || new Date().toISOString().slice(0, 10)

    const paymentId = generateUUID()
    const transactionId = generateUUID()

    const newPayment: EMIPayment = {
      id: paymentId,
      emiId,
      transactionId,
      instalmentNumber: nextInstalmentNumber,
      amount,
      principalComponent,
      interestComponent,
      paymentDate,
      status: 'paid',
      createdAt: new Date().toISOString(),
    }

    // Atomic expense transaction
    const newTransaction: Transaction = {
      id: transactionId,
      type: 'expense',
      amount,
      title: `${emi.name} (EMI #${nextInstalmentNumber})`,
      category: 'EMI & Loans',
      accountId: debitAccountId,
      paymentMethod: 'Net Banking',
      date: paymentDate,
      time: new Date().toTimeString().slice(0, 5),
      notes: `Principal: ₹${principalComponent.toLocaleString('en-IN')}, Interest: ₹${interestComponent.toLocaleString('en-IN')} | Lender: ${emi.lender}`,
      createdAt: new Date().toISOString(),
    }

    // Supabase sync if connected
    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        await (supabase.from('transactions') as any).insert({
          id: newTransaction.id,
          user_id: user.id,
          type: newTransaction.type,
          amount: newTransaction.amount,
          title: newTransaction.title,
          category: newTransaction.category,
          account_id: newTransaction.accountId,
          date: newTransaction.date,
          time: newTransaction.time,
          payment_method: newTransaction.paymentMethod,
          notes: newTransaction.notes,
        })

        await (supabase.from('emi_payments') as any).insert({
          id: newPayment.id,
          user_id: user.id,
          emi_id: newPayment.emiId,
          transaction_id: newPayment.transactionId,
          instalment_number: newPayment.instalmentNumber,
          amount: newPayment.amount,
          principal_component: newPayment.principalComponent,
          interest_component: newPayment.interestComponent,
          payment_date: newPayment.paymentDate,
          status: 'paid',
        })
      } catch (err: any) {
        console.warn('Supabase sync warning for EMI payment:', err)
      }
    }

    // Update transactions & accounts
    const nextTransactions = [newTransaction, ...transactions]
    const nextAccounts = accounts.map((acc) =>
      acc.id === debitAccountId
        ? { ...acc, balance: calculateAccountBalance(acc, nextTransactions) }
        : acc
    )

    setTransactions(nextTransactions)
    setAccounts(nextAccounts)
    setEmiPayments((prev) => [...prev, newPayment])

    // If this was the last instalment, update EMI status to completed!
    if (nextInstalmentNumber >= emi.tenureMonths) {
      setEmis((prev) => prev.map((e) => (e.id === emiId ? { ...e, status: 'completed' } : e)))
      if (isSupabaseConfigured && supabase && user && !isDemoMode) {
        try {
          await (supabase.from('emis') as any).update({ status: 'completed' }).eq('id', emiId)
        } catch {
          // ignore
        }
      }
    }

    return { success: true, payment: newPayment }
  }

  // Investment Management
  const createInvestment = async (
    input: CreateInvestmentInput
  ): Promise<{ success: boolean; error?: string; investment?: Investment }> => {
    const today = new Date().toISOString().slice(0, 10)
    const newInv: Investment = {
      id: generateUUID(),
      name: input.name.trim(),
      assetType: input.assetType,
      investedAmount: input.investedAmount,
      currentValue: input.currentValue,
      units: input.units ?? null,
      buyPrice: input.buyPrice ?? null,
      currentPrice: input.currentPrice ?? null,
      portfolio: input.portfolio?.trim() || null,
      institution: input.institution?.trim() || null,
      notes: input.notes?.trim() || null,
      lastUpdated: today,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        const { data } = await (supabase.from('investments') as any)
          .insert({
            user_id: user.id,
            name: newInv.name,
            asset_type: newInv.assetType,
            invested_amount: newInv.investedAmount,
            current_value: newInv.currentValue,
            units: newInv.units,
            buy_price: newInv.buyPrice,
            current_price: newInv.currentPrice,
            portfolio: newInv.portfolio,
            institution: newInv.institution,
            notes: newInv.notes,
            last_updated: newInv.lastUpdated,
          })
          .select()
        if (data && data[0]) {
          newInv.id = data[0].id
        }
      } catch (err) {
        console.warn('Supabase investment insert warning:', err)
      }
    }

    setInvestments((prev) => [newInv, ...prev])
    return { success: true, investment: newInv }
  }

  const updateInvestment = async (
    id: string,
    input: UpdateInvestmentInput
  ): Promise<{ success: boolean; error?: string }> => {
    const existing = investments.find((i) => i.id === id)
    if (!existing) return { success: false, error: 'Investment not found' }

    const today = new Date().toISOString().slice(0, 10)
    const updatedInv: Investment = {
      ...existing,
      ...input,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      portfolio: input.portfolio !== undefined ? input.portfolio?.trim() || null : existing.portfolio,
      institution: input.institution !== undefined ? input.institution?.trim() || null : existing.institution,
      notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
      lastUpdated: today,
      updatedAt: new Date().toISOString(),
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        await (supabase.from('investments') as any)
          .update({
            name: updatedInv.name,
            asset_type: updatedInv.assetType,
            invested_amount: updatedInv.investedAmount,
            current_value: updatedInv.currentValue,
            units: updatedInv.units,
            buy_price: updatedInv.buyPrice,
            current_price: updatedInv.currentPrice,
            portfolio: updatedInv.portfolio,
            institution: updatedInv.institution,
            notes: updatedInv.notes,
            last_updated: updatedInv.lastUpdated,
          })
          .eq('id', id)
      } catch (e) {
        console.warn('Supabase update investment warning:', e)
      }
    }

    setInvestments((prev) => prev.map((i) => (i.id === id ? updatedInv : i)))
    return { success: true }
  }

  const deleteInvestment = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        await (supabase.from('investments') as any).delete().eq('id', id)
      } catch (e) {
        console.warn('Supabase delete investment warning:', e)
      }
    }
    setInvestments((prev) => prev.filter((i) => i.id !== id))
    return { success: true }
  }

  const updateInvestmentValue = async (
    id: string,
    newCurrentValue: number
  ): Promise<{ success: boolean; error?: string }> => {
    return updateInvestment(id, { currentValue: newCurrentValue })
  }

  const batchImportTransactions = async (
    items: Array<{
      type: 'expense' | 'income'
      amount: number
      title: string
      category: string
      accountId: string
      date: string
      time?: string
      paymentMethod?: PaymentMethod
      notes?: string
    }>
  ): Promise<{ success: boolean; count: number; error?: string }> => {
    if (!items || items.length === 0) {
      return { success: false, count: 0, error: 'No transactions to import.' }
    }

    const createdTxs: Transaction[] = items.map((item) => ({
      id: generateUUID(),
      type: item.type,
      amount: Math.round(item.amount * 100) / 100,
      title: item.title.trim(),
      category: item.category || (item.type === 'income' ? 'Income' : 'Other'),
      accountId: item.accountId,
      date: item.date,
      time: item.time,
      paymentMethod: item.paymentMethod || 'UPI',
      notes: item.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }))

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        const dbTxs = createdTxs.map((t) => toDbTransaction(t, user.id))
        await supabase.from('transactions').insert(dbTxs as any)
      } catch (err) {
        console.warn('Supabase batch insert warning:', err)
      }
    }

    // Atomically recalculate affected account balances
    setAccounts((prevAccounts) => {
      return prevAccounts.map((acc) => {
        const accountTxs = createdTxs.filter((tx) => tx.accountId === acc.id)
        if (accountTxs.length === 0) return acc

        let netDelta = 0
        accountTxs.forEach((tx) => {
          if (tx.type === 'income') netDelta += tx.amount
          else if (tx.type === 'expense') netDelta -= tx.amount
        })

        return {
          ...acc,
          balance: acc.balance + netDelta,
        }
      })
    })

    setTransactions((prev) => [...createdTxs, ...prev])

    return { success: true, count: createdTxs.length }
  }

  // ── Phase 12: Recurring Transactions Handlers ──────────────

  const createRecurringTransaction = async (
    input: CreateRecurringInput
  ): Promise<{ success: boolean; error?: string; item?: RecurringTransaction }> => {
    if (!input.title?.trim()) {
      return { success: false, error: 'Rule title or description is required.' }
    }
    const amount = Number(input.amount)
    if (isNaN(amount) || amount < 0) {
      return { success: false, error: 'Amount must be ₹0 or greater.' }
    }
    if (!input.accountId) {
      return { success: false, error: 'Please select an account.' }
    }

    const newItem: RecurringTransaction = {
      id: generateUUID(),
      title: input.title.trim(),
      amount,
      type: input.type,
      category: input.category || (input.type === 'income' ? 'Income' : 'Bills & Utilities'),
      accountId: input.accountId,
      toAccountId: input.toAccountId,
      frequency: input.frequency,
      interval: input.interval || 1,
      startDate: input.startDate || new Date().toISOString().split('T')[0],
      endDate: input.endDate || null,
      nextDueDate: input.startDate || new Date().toISOString().split('T')[0],
      paymentMethod: input.paymentMethod || 'UPI',
      autoProcess: input.autoProcess ?? false,
      status: 'active',
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString(),
      provider: input.provider || undefined,
      isFreeTrial: input.isFreeTrial ?? (amount === 0),
      remindOneDayBefore: input.remindOneDayBefore ?? true,
      billingCycle: input.billingCycle || undefined,
    }

    setRecurringTransactions((prev) => [newItem, ...prev])
    return { success: true, item: newItem }
  }

  const updateRecurringTransaction = async (
    id: string,
    input: UpdateRecurringInput
  ): Promise<{ success: boolean; error?: string }> => {
    const existing = recurringTransactions.find((r) => r.id === id)
    if (!existing) return { success: false, error: 'Recurring transaction not found.' }

    const updated: RecurringTransaction = {
      ...existing,
      ...input,
      amount: input.amount !== undefined ? Number(input.amount) : existing.amount,
    }

    setRecurringTransactions((prev) => prev.map((r) => (r.id === id ? updated : r)))
    return { success: true }
  }

  const deleteRecurringTransaction = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    setRecurringTransactions((prev) => prev.filter((r) => r.id !== id))
    return { success: true }
  }

  const toggleRecurringStatus = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    const existing = recurringTransactions.find((r) => r.id === id)
    if (!existing) return { success: false, error: 'Recurring transaction not found.' }

    const nextStatus = existing.status === 'active' ? 'paused' : 'active'
    return updateRecurringTransaction(id, { status: nextStatus })
  }

  const processRecurringTransaction = async (
    id: string,
    postAsTransaction = true
  ): Promise<{ success: boolean; error?: string }> => {
    const existing = recurringTransactions.find((r) => r.id === id)
    if (!existing) return { success: false, error: 'Recurring transaction not found.' }

    // 1. Post transaction record if requested
    if (postAsTransaction) {
      if (existing.type === 'expense') {
        await addExpense({
          title: existing.title,
          amount: existing.amount,
          category: existing.category,
          accountId: existing.accountId,
          date: existing.nextDueDate,
          paymentMethod: existing.paymentMethod,
          notes: existing.notes ? `[Recurring Rule] ${existing.notes}` : '[Recurring Rule Auto-Debit]',
        })
      } else if (existing.type === 'income') {
        await addIncome({
          title: existing.title,
          amount: existing.amount,
          category: existing.category,
          accountId: existing.accountId,
          date: existing.nextDueDate,
          notes: existing.notes ? `[Recurring Rule] ${existing.notes}` : '[Recurring Rule Auto-Credit]',
        })
      } else if (existing.type === 'transfer' && existing.toAccountId) {
        await transferMoney({
          amount: existing.amount,
          fromAccountId: existing.accountId,
          toAccountId: existing.toAccountId,
          date: existing.nextDueDate,
          purpose: existing.title,
        })
      }
    }

    // 2. Advance next due date and mark last processed date
    const nextDate = calculateNextDueDate(existing.nextDueDate, existing.frequency, existing.interval)
    const isCompleted = existing.endDate && nextDate > existing.endDate

    const updated: RecurringTransaction = {
      ...existing,
      nextDueDate: nextDate,
      lastProcessedDate: new Date().toISOString().split('T')[0],
      status: isCompleted ? 'completed' : existing.status,
    }

    setRecurringTransactions((prev) => prev.map((r) => (r.id === id ? updated : r)))
    return { success: true }
  }

  const clearAllData = useCallback(async () => {
    // Pre-wipe safety snapshot so data can never be lost
    if (accounts.length > 0 || transactions.length > 0) {
      recordAutoBackup({
        data: {
          accounts,
          transactions,
          budgets,
          presets,
          emis,
          emiPayments,
          investments,
          recurringTransactions,
        },
        user: user ? { id: user.id, email: user.email } : undefined,
        type: 'safety_pre_reset',
        customLabel: `Safety Backup before Reset (${transactions.length} txs)`,
      })
    }

    setAccounts([])
    setTransactions([])
    setBudgets([])
    setPresets([])
    setEmis([])
    setEmiPayments([])
    setInvestments([])
    setRecurringTransactions([])
    try {
      localStorage.removeItem(ACCOUNTS_STORAGE_KEY)
      localStorage.removeItem(TRANSACTIONS_STORAGE_KEY)
      localStorage.removeItem(BUDGETS_STORAGE_KEY)
      localStorage.removeItem(PRESETS_STORAGE_KEY)
      localStorage.removeItem(EMIS_STORAGE_KEY)
      localStorage.removeItem(EMI_PAYMENTS_STORAGE_KEY)
      localStorage.removeItem(INVESTMENTS_STORAGE_KEY)
      localStorage.removeItem(RECURRING_STORAGE_KEY)
    } catch {
      // ignore
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        await Promise.allSettled([
          supabase.from('emi_payments').delete().eq('user_id', user.id),
          supabase.from('emis').delete().eq('user_id', user.id),
          supabase.from('transactions').delete().eq('user_id', user.id),
          supabase.from('budgets').delete().eq('user_id', user.id),
          supabase.from('presets').delete().eq('user_id', user.id),
          supabase.from('investments').delete().eq('user_id', user.id),
          supabase.from('recurring_transactions').delete().eq('user_id', user.id),
          supabase.from('accounts').delete().eq('user_id', user.id),
        ])
      } catch (err) {
        console.warn('Error clearing Supabase records:', err)
      }
    }
  }, [accounts, transactions, budgets, presets, emis, emiPayments, investments, recurringTransactions, user, isDemoMode])

  const clearTransactions = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (transactions.length > 0) {
      recordAutoBackup({
        data: {
          accounts,
          transactions,
          budgets,
          presets,
          emis,
          emiPayments,
          investments,
          recurringTransactions,
        },
        user: user ? { id: user.id, email: user.email } : undefined,
        type: 'safety_pre_reset',
        customLabel: `Safety Backup before Clearing Transactions (${transactions.length} txs)`,
      })
    }

    setTransactions([])

    // Reconcile accounts back to their opening balance
    setAccounts((prev) => {
      const reset = prev.map((acc) => ({
        ...acc,
        balance: acc.openingBalance,
      }))
      try {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(reset))
      } catch {
        // ignore
      }
      return reset
    })

    try {
      localStorage.removeItem(TRANSACTIONS_STORAGE_KEY)
    } catch {
      // ignore
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      try {
        await supabase.from('transactions').delete().eq('user_id', user.id)
        const { data: userAccounts } = await (supabase.from('accounts') as any)
          .select('id, opening_balance')
          .eq('user_id', user.id)
        if (userAccounts && Array.isArray(userAccounts)) {
          for (const acc of userAccounts) {
            await (supabase.from('accounts') as any)
              .update({ balance: acc.opening_balance })
              .eq('id', acc.id)
          }
        }
      } catch (err: any) {
        console.warn('Error clearing transactions in Supabase:', err)
        return { success: false, error: err?.message || 'Failed to clear transactions' }
      }
    }

    return { success: true }
  }, [accounts, transactions, budgets, presets, emis, emiPayments, investments, recurringTransactions, user, isDemoMode])

  const restoreAllData = useCallback(async (payload: BackupPayload): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = payload.data
      const newAccounts = data.accounts || []
      const newTransactions = data.transactions || []
      const newBudgets = data.budgets || []
      const newPresets = data.presets || DEFAULT_PRESETS
      const newEmis = data.emis || []
      const newEmiPayments = data.emiPayments || []
      const newInvestments = data.investments || []
      const newRecurring = data.recurringTransactions || []

      setAccounts(newAccounts)
      setTransactions(newTransactions)
      setBudgets(newBudgets)
      setPresets(newPresets)
      setEmis(newEmis)
      setEmiPayments(newEmiPayments)
      setInvestments(newInvestments)
      setRecurringTransactions(newRecurring)

      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(newAccounts))
      localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(newTransactions))
      localStorage.setItem(BUDGETS_STORAGE_KEY, JSON.stringify(newBudgets))
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(newPresets))
      localStorage.setItem(EMIS_STORAGE_KEY, JSON.stringify(newEmis))
      localStorage.setItem(EMI_PAYMENTS_STORAGE_KEY, JSON.stringify(newEmiPayments))
      localStorage.setItem(INVESTMENTS_STORAGE_KEY, JSON.stringify(newInvestments))
      localStorage.setItem(RECURRING_STORAGE_KEY, JSON.stringify(newRecurring))

      recordAutoBackup({
        data: {
          accounts: newAccounts,
          transactions: newTransactions,
          budgets: newBudgets,
          presets: newPresets,
          emis: newEmis,
          emiPayments: newEmiPayments,
          investments: newInvestments,
          recurringTransactions: newRecurring,
        },
        user: user ? { id: user.id, email: user.email } : undefined,
        type: 'automatic',
        customLabel: `Restored from Backup (${newTransactions.length} txs)`,
      })

      return { success: true }
    } catch (err: any) {
      console.error('Failed to restore backup data:', err)
      return { success: false, error: err?.message || 'Failed to restore backup' }
    }
  }, [user])

  // Automated background backup snapshots on ledger change
  useEffect(() => {
    if (!loadingAccounts && (accounts.length > 0 || transactions.length > 0)) {
      const timer = setTimeout(() => {
        recordAutoBackup({
          data: {
            accounts,
            transactions,
            budgets,
            presets,
            emis,
            emiPayments,
            investments,
            recurringTransactions,
          },
          user: user ? { id: user.id, email: user.email } : undefined,
          type: 'automatic',
        })

        // 2. Cloud DB Auto-Backup if enabled and user has credentials
        const cloudConfig = getCloudAutoBackupConfig()
        if (cloudConfig.enabled && isSupabaseConfigured && user && !isDemoMode) {
          backupToCloudDatabase({
            data: {
              accounts,
              transactions,
              budgets,
              presets,
              emis,
              emiPayments,
              investments,
              recurringTransactions,
            },
            user: { id: user.id, email: user.email },
            type: 'automatic',
          }).catch((err) => console.warn('Cloud DB auto-backup skipped:', err))
        }
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [loadingAccounts, accounts, transactions, budgets, presets, emis, emiPayments, investments, recurringTransactions, user, isDemoMode])

  const backupToCloud = useCallback(async () => {
    if (!user) {
      return { success: false, error: 'User sign-in is required to backup to Supabase Cloud Database.' }
    }
    const res = await backupToCloudDatabase({
      data: {
        accounts,
        transactions,
        budgets,
        presets,
        emis,
        emiPayments,
        investments,
        recurringTransactions,
      },
      user: { id: user.id, email: user.email },
      type: 'manual',
    })
    return {
      success: res.success,
      error: res.error,
      count: (res.accountsSynced || 0) + (res.transactionsSynced || 0),
    }
  }, [accounts, transactions, budgets, presets, emis, emiPayments, investments, recurringTransactions, user])

  const resetToDefaultData = clearAllData

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        transactions,
        summary,
        budgets,
        categoryBudgets,
        categorySpending,
        presets,
        emis,
        emiPayments,
        investments,
        recurringTransactions,
        cashFlowForecast,
        recurringSuggestions,
        isSupabaseConnected: isSupabaseConfigured,
        loadingAccounts,
        addExpense,
        addIncome,
        transferMoney,
        deleteTransaction,
        editTransaction,
        createAccount,
        updateAccount,
        deleteAccount,
        saveBudget,
        deleteBudget,
        createPreset,
        updatePreset,
        deletePreset,
        createEMI,
        updateEMI,
        deleteEMI,
        payEMIInstalment,
        createInvestment,
        updateInvestment,
        deleteInvestment,
        updateInvestmentValue,
        batchImportTransactions,
        createRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        toggleRecurringStatus,
        processRecurringTransaction,
        reconcileAccountBalances,
        clearAllData,
        clearTransactions,
        resetToDefaultData,
        restoreAllData,
        backupToCloud,
      }}
    >
      {children}
    </FinanceContext.Provider>
  )
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider')
  }
  return context
}
