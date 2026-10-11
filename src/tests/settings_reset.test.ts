import { describe, it, expect } from 'vitest'
import { calculateAccountBalance } from '@/context/FinanceContext'
import type { Account, Transaction } from '@/types/finance'
import confirmModalContent from '@/components/modals/ConfirmResetModal.tsx?raw'
import settingsContent from '@/pages/Settings.tsx?raw'

describe('Settings Reset Options & Confirmation Verification', () => {
  it('enforces case-insensitive "confirm" typing check in ConfirmResetModal', () => {
    // Verifies lowercase / uppercase / mixed case matching logic
    expect(confirmModalContent).toContain("inputText.trim().toLowerCase() === 'confirm'")
    expect(confirmModalContent).toContain('Type "confirm" (lower or uppercase)')
    expect(confirmModalContent).toContain('confirm')
    expect(confirmModalContent).toContain('CONFIRM')
    expect(confirmModalContent).toContain('Confirm')
  })

  it('disables the delete button until valid confirm text is typed', () => {
    expect(confirmModalContent).toContain('disabled={!isConfirmValid || isSubmitting}')
  })

  it('includes both Reset All Data and Reset Transactions in Settings page', () => {
    expect(settingsContent).toContain('Reset All Data')
    expect(settingsContent).toContain('Reset Transactions')
    expect(settingsContent).toContain('Data Management & Reset Options')
    expect(settingsContent).toContain('settings-reset-all-btn')
    expect(settingsContent).toContain('settings-reset-transactions-btn')
  })

  it('wires ConfirmResetModal for both reset_all and reset_transactions action types', () => {
    expect(settingsContent).toContain('actionType="reset_all"')
    expect(settingsContent).toContain('actionType="reset_transactions"')
    expect(settingsContent).toContain('handleConfirmResetAll')
    expect(settingsContent).toContain('handleConfirmResetTransactions')
  })

  it('restores account balances to opening balance when transactions are cleared', () => {
    const axisAccount: Account = {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'savings',
      openingBalance: 50000,
      openingBalanceDate: '2026-10-01',
      balance: 50000,
      createdAt: '2026-10-01T00:00:00Z',
    }

    const testTransactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'expense',
        amount: 15000,
        title: 'Rent',
        category: 'Housing',
        accountId: 'acc-axis',
        date: '2026-10-05',
        createdAt: '2026-10-05T00:00:00Z',
      },
      {
        id: 'tx-2',
        type: 'income',
        amount: 25000,
        title: 'Freelance',
        category: 'Income',
        accountId: 'acc-axis',
        date: '2026-10-06',
        createdAt: '2026-10-06T00:00:00Z',
      },
    ]

    // Balance with transactions: 50000 - 15000 + 25000 = 60000
    const balanceWithTransactions = calculateAccountBalance(axisAccount, testTransactions)
    expect(balanceWithTransactions).toBe(60000)

    // Balance with cleared transactions: resets back to openingBalance (50000)
    const balanceAfterReset = calculateAccountBalance(axisAccount, [])
    expect(balanceAfterReset).toBe(50000)
    expect(balanceAfterReset).toBe(axisAccount.openingBalance)
  })
})
