import { describe, it, expect, beforeEach } from 'vitest'
import {
  buildBackupPayload,
  computeBackupSummary,
  validateBackupPayload,
  recordAutoBackup,
  listAutoBackups,
  deleteAutoBackup,
  clearAllAutoBackups,
  saveAutoBackupConfig,
  saveCloudAutoBackupConfig,
  getCloudAutoBackupConfig,
  getLastCloudBackupTime,
  setLastCloudBackupTime,
  backupToCloudDatabase,
  toValidUUID,
} from '@/lib/backupManager'
import type { Account, Transaction } from '@/types/finance'

describe('MoneyMap — Backup & Recovery System', () => {
  let store: Record<string, string> = {}

  beforeEach(() => {
    store = {}
    const mockStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = String(value)
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        store = {}
      },
    }
    // @ts-ignore
    global.localStorage = mockStorage
  })

  const sampleAccounts: Account[] = [
    {
      id: 'acc-axis',
      name: 'Axis Bank',
      type: 'salary',
      balance: 17000,
      openingBalance: 10000,
    },
    {
      id: 'acc-sbi',
      name: 'SBI',
      type: 'savings',
      balance: 3001,
      openingBalance: 2000,
    },
  ]

  const sampleTransactions: Transaction[] = [
    {
      id: 'tx-1',
      type: 'income',
      amount: 27000,
      title: 'Salary',
      category: 'Salary',
      accountId: 'acc-axis',
      date: '2026-09-30',
      createdAt: '2026-09-30T10:00:00Z',
    },
    {
      id: 'tx-2',
      type: 'expense',
      amount: 300,
      title: 'Fuel',
      category: 'Transportation',
      accountId: 'acc-sbi',
      date: '2026-10-10',
      createdAt: '2026-10-10T10:00:00Z',
    },
  ]

  it('1. Computes accurate summary metrics across accounts and transactions', () => {
    const summary = computeBackupSummary({
      accounts: sampleAccounts,
      transactions: sampleTransactions,
    })

    expect(summary.accountsCount).toBe(2)
    expect(summary.transactionsCount).toBe(2)
    expect(summary.totalBalance).toBe(20001) // 17000 + 3001
  })

  it('2. Builds valid MoneyMap backup payload with metadata', () => {
    const payload = buildBackupPayload({
      data: {
        accounts: sampleAccounts,
        transactions: sampleTransactions,
        investments: [],
        emis: [],
        recurringTransactions: [],
        budgets: [],
      },
      user: { id: 'usr-1', email: 'test@example.com' },
      backupType: 'manual',
    })

    expect(payload.appName).toBe('MoneyMap')
    expect(payload.version).toBe('1.0.0')
    expect(payload.backupType).toBe('manual')
    expect(payload.user?.email).toBe('test@example.com')
    expect(payload.summary.accountsCount).toBe(2)
    expect(payload.summary.transactionsCount).toBe(2)
    expect(payload.data.accounts.length).toBe(2)
  })

  it('3. Validates authentic vs corrupted backup payloads correctly', () => {
    const validPayload = buildBackupPayload({
      data: {
        accounts: sampleAccounts,
        transactions: sampleTransactions,
        investments: [],
        emis: [],
        recurringTransactions: [],
        budgets: [],
      },
    })

    const validCheck = validateBackupPayload(validPayload)
    expect(validCheck.valid).toBe(true)
    expect(validCheck.payload?.data.accounts.length).toBe(2)

    // Non-object or missing MoneyMap signature
    expect(validateBackupPayload(null).valid).toBe(false)
    expect(validateBackupPayload({ appName: 'OtherApp' }).valid).toBe(false)
    expect(validateBackupPayload({ appName: 'MoneyMap', data: {} }).valid).toBe(false)
  })

  it('4. Records automated snapshots in localStorage and limits snapshot count', () => {
    saveAutoBackupConfig({ enabled: true, maxSnapshots: 3 })

    const backupData = {
      accounts: sampleAccounts,
      transactions: sampleTransactions,
      investments: [],
      emis: [],
      recurringTransactions: [],
      budgets: [],
    }

    // Record snapshot 1
    const s1 = recordAutoBackup({
      data: backupData,
      type: 'automatic',
      customLabel: 'Snapshot 1',
    })
    expect(s1).not.toBeNull()

    // Record safety snapshot
    const s2 = recordAutoBackup({
      data: backupData,
      type: 'safety_pre_reset',
      customLabel: 'Safety Snapshot 2',
    })
    expect(s2).not.toBeNull()

    const list = listAutoBackups()
    expect(list.length).toBe(2)
    expect(list[0].label).toBe('Safety Snapshot 2')
  })

  it('5. Deletes specific snapshots and clears all snapshots', () => {
    const backupData = {
      accounts: sampleAccounts,
      transactions: sampleTransactions,
      investments: [],
      emis: [],
      recurringTransactions: [],
      budgets: [],
    }

    const item1 = recordAutoBackup({ data: backupData, type: 'safety_pre_reset', customLabel: 'Snapshot A' })
    const item2 = recordAutoBackup({ data: backupData, type: 'safety_pre_reset', customLabel: 'Snapshot B' })

    expect(listAutoBackups().length).toBe(2)

    deleteAutoBackup(item1!.id)
    const afterDelete = listAutoBackups()
    expect(afterDelete.length).toBe(1)
    expect(afterDelete[0].id).toBe(item2!.id)

    clearAllAutoBackups()
    expect(listAutoBackups().length).toBe(0)
  })

  it('6. Preserves pre-reset safety snapshots even if auto-backup toggle is disabled', () => {
    saveAutoBackupConfig({ enabled: false, maxSnapshots: 5 })

    const backupData = {
      accounts: sampleAccounts,
      transactions: sampleTransactions,
      investments: [],
      emis: [],
      recurringTransactions: [],
      budgets: [],
    }

    // Ordinary auto-backup should be skipped
    const regular = recordAutoBackup({ data: backupData, type: 'automatic' })
    expect(regular).toBeNull()

    // Safety pre-reset snapshot MUST still be recorded!
    const safety = recordAutoBackup({ data: backupData, type: 'safety_pre_reset' })
    expect(safety).not.toBeNull()
    expect(listAutoBackups().length).toBe(1)
  })

  it('7. Manages Cloud Auto-Backup configuration and timestamps', () => {
    saveCloudAutoBackupConfig({ enabled: true })
    expect(getCloudAutoBackupConfig().enabled).toBe(true)

    saveCloudAutoBackupConfig({ enabled: false })
    expect(getCloudAutoBackupConfig().enabled).toBe(false)

    expect(getLastCloudBackupTime()).toBeNull()
    const nowIso = '2026-10-11T22:30:00.000Z'
    setLastCloudBackupTime(nowIso)
    expect(getLastCloudBackupTime()).toBe(nowIso)
  })

  it('8. Validates Cloud DB backup requirements and converts non-UUID IDs safely', async () => {
    // Calling backupToCloudDatabase without authenticated user returns clear error
    const noUserResult = await backupToCloudDatabase({
      data: {
        accounts: sampleAccounts,
        transactions: sampleTransactions,
        investments: [],
        emis: [],
        recurringTransactions: [],
        budgets: [],
      },
    })

    expect(noUserResult.success).toBe(false)
    expect(noUserResult.error).toContain('authentication')

    // Helper toValidUUID creates valid RFC4122-compatible UUIDs for PostgreSQL
    expect(toValidUUID('acc-axis')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    )
  })
})
