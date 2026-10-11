import type {
  Account,
  Transaction,
  Investment,
  EMI,
  EMIPayment,
  RecurringTransaction,
  Budget,
  Preset,
  MonthlyBudgetPlan,
} from '@/types/finance'
import { downloadJSONFile } from './statementExporter'
import { supabase, isSupabaseConfigured } from './supabase'

export interface BackupSummary {
  accountsCount: number
  transactionsCount: number
  investmentsCount: number
  emisCount: number
  recurringCount: number
  budgetsCount: number
  totalBalance: number
}

export interface BackupPayload {
  appName: 'MoneyMap'
  version: string
  exportedAt: string
  backupType: 'manual' | 'automatic' | 'safety_pre_reset'
  summary: BackupSummary
  user?: {
    id?: string
    email?: string
  }
  data: {
    accounts: Account[]
    transactions: Transaction[]
    investments: Investment[]
    emis: EMI[]
    emiPayments?: EMIPayment[]
    recurringTransactions: RecurringTransaction[]
    budgets: Budget[]
    presets?: Preset[]
    monthlyBudgetPlans?: Record<string, MonthlyBudgetPlan>
    monthlyBudgetTemplate?: MonthlyBudgetPlan
  }
}

export interface AutoBackupItem {
  id: string
  timestamp: string
  label: string
  backupType: 'automatic' | 'safety_pre_reset' | 'manual'
  summary: BackupSummary
  payload: BackupPayload
}

export interface AutoBackupConfig {
  enabled: boolean
  maxSnapshots: number
}

export const AUTO_BACKUPS_STORAGE_KEY = 'moneymap_auto_backups_v1'
export const AUTO_BACKUP_CONFIG_KEY = 'moneymap_auto_backup_config_v1'
export const DEFAULT_MAX_AUTO_BACKUPS = 8

/**
 * Reads user auto-backup configuration from localStorage.
 */
export function getAutoBackupConfig(): AutoBackupConfig {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        enabled: parsed.enabled ?? true,
        maxSnapshots: Number(parsed.maxSnapshots) || DEFAULT_MAX_AUTO_BACKUPS,
      }
    }
  } catch {
    // fallback
  }
  return { enabled: true, maxSnapshots: DEFAULT_MAX_AUTO_BACKUPS }
}

/**
 * Saves auto-backup configuration to localStorage.
 */
export function saveAutoBackupConfig(config: AutoBackupConfig): void {
  try {
    localStorage.setItem(AUTO_BACKUP_CONFIG_KEY, JSON.stringify(config))
  } catch (err) {
    console.error('Failed to save auto backup configuration:', err)
  }
}

/**
 * Computes a standardized financial summary for a dataset.
 */
export function computeBackupSummary(data: {
  accounts: Account[]
  transactions: Transaction[]
  investments?: Investment[]
  emis?: EMI[]
  recurringTransactions?: RecurringTransaction[]
  budgets?: Budget[]
}): BackupSummary {
  const totalBalance = (data.accounts || []).reduce(
    (sum, a) => sum + (Number(a.balance) || 0),
    0
  )
  return {
    accountsCount: (data.accounts || []).length,
    transactionsCount: (data.transactions || []).length,
    investmentsCount: (data.investments || []).length,
    emisCount: (data.emis || []).length,
    recurringCount: (data.recurringTransactions || []).length,
    budgetsCount: (data.budgets || []).length,
    totalBalance: Math.round(totalBalance * 100) / 100,
  }
}

/**
 * Assembles a fully structured BackupPayload.
 */
export function buildBackupPayload(params: {
  data: BackupPayload['data']
  user?: { id?: string; email?: string }
  backupType?: 'manual' | 'automatic' | 'safety_pre_reset'
}): BackupPayload {
  const summary = computeBackupSummary(params.data)
  return {
    appName: 'MoneyMap',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    backupType: params.backupType || 'manual',
    summary,
    user: params.user,
    data: params.data,
  }
}

/**
 * Downloads a backup payload as a timestamped JSON file.
 */
export function downloadBackupFile(
  payload: BackupPayload,
  customPrefix = 'MoneyMap_Backup'
): void {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const filename = `${customPrefix}_${dateStr}_${timeStr}.json`
  downloadJSONFile(payload, filename)
}

/**
 * Reads list of existing auto-backups from localStorage.
 */
export function listAutoBackups(): AutoBackupItem[] {
  try {
    const raw = localStorage.getItem(AUTO_BACKUPS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    }
  } catch (err) {
    console.error('Failed to parse auto-backups from storage:', err)
  }
  return []
}

/**
 * Creates and stores an automatic backup snapshot in localStorage.
 * Maintains a rolling limit to avoid storage bloat.
 */
export function recordAutoBackup(params: {
  data: BackupPayload['data']
  user?: { id?: string; email?: string }
  type?: 'automatic' | 'safety_pre_reset' | 'manual'
  customLabel?: string
}): AutoBackupItem | null {
  const config = getAutoBackupConfig()
  // Safety snapshots and manual snapshots are always recorded
  if (!config.enabled && params.type !== 'safety_pre_reset' && params.type !== 'manual') {
    return null
  }

  try {
    const payload = buildBackupPayload({
      data: params.data,
      user: params.user,
      backupType: params.type || 'automatic',
    })

    const existing = listAutoBackups()

    // Avoid recording duplicate identical snapshots within 30 seconds unless safety snapshot
    if (existing.length > 0 && params.type !== 'safety_pre_reset') {
      const latest = existing[0]
      const diffMs = Date.now() - new Date(latest.timestamp).getTime()
      if (
        diffMs < 30000 &&
        latest.summary.transactionsCount === payload.summary.transactionsCount &&
        latest.summary.totalBalance === payload.summary.totalBalance
      ) {
        return latest
      }
    }

    const id = `backup_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    const now = new Date()
    const label =
      params.customLabel ||
      (params.type === 'safety_pre_reset'
        ? `Pre-Reset Safety Snapshot (${payload.summary.transactionsCount} txs)`
        : `Auto-Backup (${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`)

    const newItem: AutoBackupItem = {
      id,
      timestamp: payload.exportedAt,
      label,
      backupType: params.type || 'automatic',
      summary: payload.summary,
      payload,
    }

    // Keep rolling maximum
    const updated = [newItem, ...existing].slice(0, Math.max(3, config.maxSnapshots))
    localStorage.setItem(AUTO_BACKUPS_STORAGE_KEY, JSON.stringify(updated))
    return newItem
  } catch (err) {
    console.error('Failed to create auto backup:', err)
    return null
  }
}

/**
 * Deletes a specific auto backup by ID.
 */
export function deleteAutoBackup(id: string): void {
  try {
    const existing = listAutoBackups()
    const filtered = existing.filter((b) => b.id !== id)
    localStorage.setItem(AUTO_BACKUPS_STORAGE_KEY, JSON.stringify(filtered))
  } catch (err) {
    console.error('Failed to delete auto backup:', err)
  }
}

/**
 * Clears all auto-backups from localStorage.
 */
export function clearAllAutoBackups(): void {
  try {
    localStorage.removeItem(AUTO_BACKUPS_STORAGE_KEY)
  } catch (err) {
    console.error('Failed to clear auto backups:', err)
  }
}

/**
 * Validates whether an uploaded/parsed JSON object is a valid MoneyMap backup.
 */
export function validateBackupPayload(raw: unknown): {
  valid: boolean
  error?: string
  payload?: BackupPayload
} {
  if (!raw || typeof raw !== 'object') {
    return { valid: false, error: 'Uploaded file is not a valid JSON object.' }
  }

  const obj = raw as Record<string, unknown>

  if (obj.appName !== 'MoneyMap') {
    return {
      valid: false,
      error: 'Invalid file: Missing MoneyMap signature. Please provide a MoneyMap backup file.',
    }
  }

  const data = obj.data as Record<string, unknown> | undefined
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Backup does not contain financial data.' }
  }

  if (!Array.isArray(data.accounts) || !Array.isArray(data.transactions)) {
    return {
      valid: false,
      error: 'Corrupted backup file: "accounts" and "transactions" must be arrays.',
    }
  }

  // Sanitize and return valid payload
  const accounts = data.accounts as Account[]
  const transactions = data.transactions as Transaction[]
  const investments = Array.isArray(data.investments) ? (data.investments as Investment[]) : []
  const emis = Array.isArray(data.emis) ? (data.emis as EMI[]) : []
  const emiPayments = Array.isArray(data.emiPayments) ? (data.emiPayments as EMIPayment[]) : []
  const recurringTransactions = Array.isArray(data.recurringTransactions)
    ? (data.recurringTransactions as RecurringTransaction[])
    : []
  const budgets = Array.isArray(data.budgets) ? (data.budgets as Budget[]) : []
  const presets = Array.isArray(data.presets) ? (data.presets as Preset[]) : []

  const payload: BackupPayload = {
    appName: 'MoneyMap',
    version: typeof obj.version === 'string' ? obj.version : '1.0.0',
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    backupType: (obj.backupType as BackupPayload['backupType']) || 'manual',
    summary: computeBackupSummary({
      accounts,
      transactions,
      investments,
      emis,
      recurringTransactions,
      budgets,
    }),
    user: obj.user as BackupPayload['user'],
    data: {
      accounts,
      transactions,
      investments,
      emis,
      emiPayments,
      recurringTransactions,
      budgets,
      presets,
    },
  }

  return { valid: true, payload }
}

export const CLOUD_AUTO_BACKUP_CONFIG_KEY = 'moneymap_cloud_auto_backup_config_v1'
export const LAST_CLOUD_BACKUP_KEY = 'moneymap_last_cloud_backup_time_v1'

export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str)
}

export function toValidUUID(id: string): string {
  if (isUUID(id)) return id
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0')
  return `00000000-0000-4000-8000-${hex.padEnd(12, '0')}`
}

export function getCloudAutoBackupConfig(): { enabled: boolean } {
  try {
    const raw = localStorage.getItem(CLOUD_AUTO_BACKUP_CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { enabled: parsed.enabled ?? true }
    }
  } catch {
    // fallback
  }
  return { enabled: true }
}

export function saveCloudAutoBackupConfig(config: { enabled: boolean }): void {
  try {
    localStorage.setItem(CLOUD_AUTO_BACKUP_CONFIG_KEY, JSON.stringify(config))
  } catch (err) {
    console.error('Failed to save cloud auto backup configuration:', err)
  }
}

export function getLastCloudBackupTime(): string | null {
  try {
    return localStorage.getItem(LAST_CLOUD_BACKUP_KEY)
  } catch {
    return null
  }
}

export function setLastCloudBackupTime(timestamp: string): void {
  try {
    localStorage.setItem(LAST_CLOUD_BACKUP_KEY, timestamp)
  } catch {
    // ignore
  }
}

/**
 * Backs up entire financial dataset directly to Supabase Cloud Database.
 */
export async function backupToCloudDatabase(params: {
  data: BackupPayload['data']
  user?: { id?: string; email?: string }
  type?: 'manual' | 'automatic'
}): Promise<{
  success: boolean
  error?: string
  accountsSynced?: number
  transactionsSynced?: number
  timestamp?: string
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      error: 'Supabase Cloud Database is not configured. Please verify VITE_SUPABASE_URL and key in .env.local.',
    }
  }

  const user = params.user
  if (!user?.id) {
    return {
      success: false,
      error: 'User authentication is required to backup to Cloud DB. Please sign in to sync with Supabase.',
    }
  }

  try {
    const payload = buildBackupPayload({
      data: params.data,
      user: params.user,
      backupType: params.type || 'manual',
    })

    const accounts = params.data.accounts || []
    const transactions = params.data.transactions || []

    // Map non-UUID IDs to valid UUIDs for PostgreSQL schema compatibility
    const accountUuidMap = new Map<string, string>()
    for (const acc of accounts) {
      accountUuidMap.set(acc.id, toValidUUID(acc.id))
    }

    // 1. Upsert accounts into Cloud DB
    if (accounts.length > 0) {
      const dbAccounts = accounts.map((a) => ({
        id: accountUuidMap.get(a.id) || toValidUUID(a.id),
        user_id: user.id,
        name: a.name,
        type: a.type,
        balance: a.balance,
        opening_balance: a.openingBalance,
        opening_balance_date: a.openingBalanceDate || null,
        account_number: a.accountNumber || null,
        color: a.color || 'emerald',
        is_active: true,
      }))
      const { error: accErr } = await (supabase.from('accounts') as any).upsert(dbAccounts, { onConflict: 'id' })
      if (accErr) {
        console.warn('Cloud DB accounts upsert note:', accErr.message)
      }
    }

    // 2. Upsert transactions into Cloud DB
    if (transactions.length > 0) {
      const dbTransactions = transactions.map((t) => ({
        id: toValidUUID(t.id),
        user_id: user.id,
        type: t.type,
        amount: t.amount,
        title: t.title,
        category: t.category,
        account_id: accountUuidMap.get(t.accountId) || toValidUUID(t.accountId),
        to_account_id: t.toAccountId ? (accountUuidMap.get(t.toAccountId) || toValidUUID(t.toAccountId)) : null,
        date: t.date,
        time: t.time || null,
        payment_method: t.paymentMethod || 'UPI',
        notes: t.notes || null,
        is_recurring: false,
      }))
      const { error: txErr } = await (supabase.from('transactions') as any).upsert(dbTransactions, { onConflict: 'id' })
      if (txErr) {
        console.warn('Cloud DB transactions upsert note:', txErr.message)
      }
    }

    // 3. Save snapshot in cloud_backups table
    try {
      await (supabase.from('cloud_backups') as any).insert({
        user_id: user.id,
        backup_type: params.type || 'manual',
        label: `${params.type === 'automatic' ? 'Auto-Backup' : 'Manual Backup'} (${transactions.length} txs, ${accounts.length} accounts)`,
        summary: payload.summary,
        payload,
      })
    } catch {
      // Graceful fallback if cloud_backups table not yet run in remote migration
    }

    const nowIso = new Date().toISOString()
    setLastCloudBackupTime(nowIso)

    return {
      success: true,
      accountsSynced: accounts.length,
      transactionsSynced: transactions.length,
      timestamp: nowIso,
    }
  } catch (err: any) {
    console.error('Cloud DB backup error:', err)
    return {
      success: false,
      error: err?.message || 'Failed to backup to Supabase Cloud DB.',
    }
  }
}

