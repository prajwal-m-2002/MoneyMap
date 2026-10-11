import { describe, it, expect } from 'vitest'
import {
  parseBankStatement,
  parseDateString,
  parseAmountString,
  cleanBankNarration,
  detectBankProfile,
  SAMPLE_HDFC_CSV,
  SAMPLE_SBI_CSV,
  SAMPLE_GENERIC_CSV,
} from '@/lib/statementParser'
import {
  filterTransactionsForExport,
  calculateStatementSummary,
  generateCSVString,
} from '@/lib/statementExporter'
import type { Transaction, Account } from '@/types/finance'

describe('Phase 11 — Statement Parsing & Bank PDF/CSV Import Engine', () => {
  describe('1. Smart Narration Cleaning & Categorization', () => {
    it('accurately identifies Swiggy food orders and assigns UPI and Food & Dining', () => {
      const { cleanedTitle, suggestedCategory, suggestedMethod } =
        cleanBankNarration('UPI/428198273612/SWIGGY/PAYTM')
      expect(cleanedTitle).toBe('Swiggy Order')
      expect(suggestedCategory).toBe('Food & Dining')
      expect(suggestedMethod).toBe('UPI')
    })

    it('identifies salary credits and suggests Income type and Net Banking', () => {
      const { cleanedTitle, suggestedCategory, suggestedMethod, isIncomeSuggested } =
        cleanBankNarration('NEFT-00129384-SALARY CREDITED PVT LTD')
      expect(cleanedTitle).toBe('Monthly Salary')
      expect(suggestedCategory).toBe('Salary')
      expect(suggestedMethod).toBe('Net Banking')
      expect(isIncomeSuggested).toBe(true)
    })

    it('identifies Uber rides and assigns Transportation category', () => {
      const { cleanedTitle, suggestedCategory, suggestedMethod } =
        cleanBankNarration('UPI/128731928312/UBER/HDFC')
      expect(cleanedTitle).toBe('Uber Ride')
      expect(suggestedCategory).toBe('Transportation')
      expect(suggestedMethod).toBe('UPI')
    })

    it('identifies BESCOM electricity bill and assigns Bills & Utilities', () => {
      const { cleanedTitle, suggestedCategory } =
        cleanBankNarration('BESCOM ELECTRICITY BILL/BANGALORE')
      expect(cleanedTitle).toBe('Electricity Bill')
      expect(suggestedCategory).toBe('Bills & Utilities')
    })

    it('identifies Zerodha broking transfers and assigns Investments category', () => {
      const { cleanedTitle, suggestedCategory } =
        cleanBankNarration('ZERODHA BROKING LTD FUNDS TRF')
      expect(cleanedTitle).toBe('Zerodha Funds Transfer')
      expect(suggestedCategory).toBe('Investments')
    })

    it('identifies bank quarterly interest credits as income', () => {
      const { cleanedTitle, isIncomeSuggested } =
        cleanBankNarration('INT.PD: 01-07-2026 to 30-09-2026')
      expect(cleanedTitle).toBe('Bank Savings Interest')
      expect(isIncomeSuggested).toBe(true)
    })
  })

  describe('2. Date & Amount Normalization', () => {
    it('parses various Indian bank date formats to standard ISO YYYY-MM-DD', () => {
      expect(parseDateString('01/10/2026')).toBe('2026-10-01')
      expect(parseDateString('15-10-2026')).toBe('2026-10-15')
      expect(parseDateString('2026-10-05')).toBe('2026-10-05')
      expect(parseDateString('05-Oct-2026')).toBe('2026-10-05')
      expect(parseDateString('05/10/26')).toBe('2026-10-05')
      expect(parseDateString('invalid-date')).toBeNull()
    })

    it('strips commas, currency symbols, and whitespace from amounts', () => {
      expect(parseAmountString('₹65,000.00')).toBe(65000)
      expect(parseAmountString(' 1,450.50 ')).toBe(1450.5)
      expect(parseAmountString('(500.00)')).toBe(500)
      expect(parseAmountString('450 Dr')).toBe(450)
      expect(parseAmountString('72000.00 Cr')).toBe(72000)
    })
  })

  describe('3. Bank Statement Parsing (HDFC & SBI Formats)', () => {
    it('detects HDFC Bank CSV profile and parses transactions with withdrawal/deposit split', () => {
      const result = parseBankStatement(SAMPLE_HDFC_CSV, 'auto')

      expect(result.detectedBank).toBe('hdfc')
      expect(result.totalCount).toBe(8)
      expect(result.errors).toHaveLength(0)

      // Total Inflow: 65,000 (Salary) + 425 (Interest) = 65,425
      expect(result.totalInflow).toBe(65425)

      // Total Outflow: 450 + 280 + 1899 + 1420 + 640 + 10000 = 14,689
      expect(result.totalOutflow).toBe(14689)

      // First transaction must be Salary Credit
      const salaryTx = result.transactions[0]
      expect(salaryTx.date).toBe('2026-10-01')
      expect(salaryTx.type).toBe('income')
      expect(salaryTx.amount).toBe(65000)
      expect(salaryTx.cleanedTitle).toBe('Monthly Salary')

      // Second transaction must be Swiggy Expense
      const swiggyTx = result.transactions[1]
      expect(swiggyTx.date).toBe('2026-10-02')
      expect(swiggyTx.type).toBe('expense')
      expect(swiggyTx.amount).toBe(450)
      expect(swiggyTx.category).toBe('Food & Dining')
    })

    it('parses SBI Bank CSV statement correctly with debit/credit columns', () => {
      const result = parseBankStatement(SAMPLE_SBI_CSV, 'auto')

      expect(result.detectedBank).toBe('sbi')
      expect(result.totalCount).toBe(5)
      expect(result.totalInflow).toBe(72310) // 72,000 salary + 310 interest
      expect(result.totalOutflow).toBe(3379) // 380 + 2000 + 999
    })

    it('parses Generic CSV statement with single Amount and Type columns', () => {
      const result = parseBankStatement(SAMPLE_GENERIC_CSV, 'generic')

      expect(result.totalCount).toBe(5)
      expect(result.totalInflow).toBe(15000)
      expect(result.totalOutflow).toBe(2919) // 320 + 1500 + 649 + 450
    })

    it('identifies bank preset profiles by inspecting header rows', () => {
      expect(detectBankProfile(['Date', 'Narration', 'Chq/Ref No', 'Withdrawal Amt', 'Deposit Amt'])).toBe('hdfc')
      expect(detectBankProfile(['Txn Date', 'Value Date', 'Description', 'Ref No./Cheque No.', 'Debit', 'Credit'])).toBe('sbi')
      expect(detectBankProfile(['Date', 'Transaction Remarks', 'Withdrawal Amount (INR)', 'Deposit Amount (INR)'])).toBe('icici')
      expect(detectBankProfile(['Tran Date', 'CHQNO', 'PARTICULARS', 'DR', 'CR'])).toBe('axis')
      expect(detectBankProfile(['Transaction Date', 'Description', 'Chq / Ref No.', 'Amount', 'Dr / Cr'])).toBe('kotak')
      expect(detectBankProfile(['Date', 'Item', 'Price'])).toBe('generic')
    })
  })

  describe('4. Deduplication Engine', () => {
    it('flags identical transactions as duplicates and deselects them by default', () => {
      const existingTxs: Transaction[] = [
        {
          id: 'existing-1',
          type: 'income',
          amount: 65000,
          title: 'Monthly Salary',
          category: 'Salary',
          accountId: 'acc-hdfc',
          date: '2026-10-01',
          createdAt: '2026-10-01T00:00:00Z',
        },
      ]

      const result = parseBankStatement(
        SAMPLE_HDFC_CSV,
        'hdfc',
        existingTxs,
        'acc-hdfc'
      )

      expect(result.duplicateCount).toBe(1)
      const duplicateTx = result.transactions.find((t) => t.date === '2026-10-01' && t.amount === 65000)
      expect(duplicateTx?.isDuplicate).toBe(true)
      expect(duplicateTx?.selected).toBe(false) // auto-deselected
    })
  })

  describe('5. Statement Export Engine & CSV Formatting', () => {
    const sampleLedgerTxs: Transaction[] = [
      {
        id: 'tx-1',
        type: 'income',
        amount: 50000,
        title: 'Salary Credit',
        category: 'Salary',
        accountId: 'acc-1',
        date: '2026-10-01',
        time: '09:00',
        paymentMethod: 'Net Banking',
        createdAt: '2026-10-01T00:00:00Z',
      },
      {
        id: 'tx-2',
        type: 'expense',
        amount: 2500,
        title: 'Grocery Mart',
        category: 'Groceries',
        accountId: 'acc-1',
        date: '2026-10-05',
        paymentMethod: 'UPI',
        createdAt: '2026-10-05T00:00:00Z',
      },
    ]

    const sampleAccounts: Account[] = [
      {
        id: 'acc-1',
        name: 'HDFC Savings',
        type: 'savings',
        balance: 47500,
        openingBalance: 0,
      },
    ]

    it('calculates statement summary metrics correctly', () => {
      const summary = calculateStatementSummary(sampleLedgerTxs, sampleAccounts[0], 'October 2026')
      expect(summary.totalRecords).toBe(2)
      expect(summary.totalInflow).toBe(50000)
      expect(summary.totalOutflow).toBe(2500)
      expect(summary.netChange).toBe(47500)
      expect(summary.categoryBreakdown[0].category).toBe('Groceries')
      expect(summary.categoryBreakdown[0].amount).toBe(2500)
    })

    it('generates valid RFC-4180 CSV with UTF-8 BOM and escaped quotes', () => {
      const csv = generateCSVString(sampleLedgerTxs, sampleAccounts)
      expect(csv.startsWith('\uFEFF')).toBe(true) // UTF-8 BOM
      expect(csv).toContain('"Salary Credit"')
      expect(csv).toContain('"HDFC Savings"')
      expect(csv).toContain('"50000.00"')
      expect(csv).toContain('"2500.00"')
    })

    it('filters transactions accurately based on date range and account', () => {
      const filtered = filterTransactionsForExport(sampleLedgerTxs, {
        dateRange: 'all',
        accountId: 'acc-1',
        type: 'expense',
      })
      expect(filtered).toHaveLength(1)
      expect(filtered[0].title).toBe('Grocery Mart')
    })
  })
})
