import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  Wallet,
  Calendar,
  Bell,
  Palette,
  Shield,
  Database,
  HelpCircle,
  LogOut,
  Sparkles,
  CloudCheck,
  CheckCircle2,
  ChevronRight,
  X,
  HardDrive,
  Download,
  RotateCcw,
  ShieldCheck,
  Code2,
  Trash2,
  Receipt,
  AlertTriangle,
  Upload,
  Clock,
  History,
  FileJson,
  RefreshCw,
  Cloud,
  CloudUpload,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useFinance } from '@/context/FinanceContext'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useToast } from '@/context/ToastContext'
import { ConfirmResetModal } from '@/components/modals/ConfirmResetModal'
import {
  buildBackupPayload,
  downloadBackupFile,
  getAutoBackupConfig,
  saveAutoBackupConfig,
  listAutoBackups,
  recordAutoBackup,
  deleteAutoBackup,
  clearAllAutoBackups,
  validateBackupPayload,
  getCloudAutoBackupConfig,
  saveCloudAutoBackupConfig,
  getLastCloudBackupTime,
  type AutoBackupItem,
  type AutoBackupConfig,
} from '@/lib/backupManager'
import { formatINR } from '@/lib/utils'

const SETTING_SECTIONS = [
  { id: 'accounts',  icon: Wallet,    label: 'Accounts & Ledgers',   desc: 'Inspect bank accounts, cash pools, and opening balances', to: '/analysis' },
  { id: 'salary',    icon: Calendar,  label: 'Salary & Incomes',     desc: 'Configure monthly salary date, automatic credit, and recurring rules', to: '/recurring' },
  { id: 'reminders', icon: Bell,      label: 'Dues & Reminders',     desc: 'Monitor upcoming bills, subscriptions, and EMI due dates', to: '/recurring' },
  { id: 'backup',    icon: Database,  label: 'Backup & Statements',  desc: 'Export statement data in CSV, printable PDF, and JSON backups', to: '/statements' },
  { id: 'display',   icon: Palette,   label: 'Display & Aesthetics', desc: 'Theme, currency, and date format preferences' },
  { id: 'security',  icon: Shield,    label: 'Security & Storage',   desc: 'Session management, offline storage audit, and reset tools' },
  { id: 'about',     icon: HelpCircle,label: 'About MoneyMap',       desc: 'Version v1.0.0 · Production release specifications' },
]

export default function Settings() {
  const { user, signOut, isConfigured, isDemoMode } = useAuth()
  const {
    accounts,
    transactions,
    investments,
    emis,
    emiPayments,
    recurringTransactions,
    budgets,
    presets,
    clearAllData,
    clearTransactions,
    restoreAllData,
    backupToCloud,
  } = useFinance()
  const { success, error } = useToast()

  const [displayModalOpen, setDisplayModalOpen] = useState(false)
  const [securityModalOpen, setSecurityModalOpen] = useState(false)
  const [aboutModalOpen, setAboutModalOpen] = useState(false)
  const [resetAllModalOpen, setResetAllModalOpen] = useState(false)
  const [resetTransactionsModalOpen, setResetTransactionsModalOpen] = useState(false)

  // Cloud DB backup states
  const [isBackingUpToCloud, setIsBackingUpToCloud] = useState(false)
  const [cloudAutoBackupConfig, setCloudAutoBackupConfig] = useState(() => getCloudAutoBackupConfig())
  const [lastCloudBackupTime, setLastCloudBackupTime] = useState<string | null>(() => getLastCloudBackupTime())

  // Local auto-backup configuration and snapshots state
  const [autoBackupConfig, setAutoBackupConfig] = useState<AutoBackupConfig>(() => getAutoBackupConfig())
  const [autoBackups, setAutoBackups] = useState<AutoBackupItem[]>(() => listAutoBackups())
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    const list = listAutoBackups()
    return list.length > 0 ? list[0].timestamp : null
  })

  // Calculate local storage size
  const calculateStorageSizeKB = () => {
    try {
      let totalBytes = 0
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalBytes += (localStorage[key].length + key.length) * 2
        }
      }
      return (totalBytes / 1024).toFixed(1)
    } catch {
      return '0.0'
    }
  }

  // Handle Manual Full JSON Backup Download
  const handleFullBackup = () => {
    const payload = buildBackupPayload({
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
      user: user ? { id: user.id, email: user.email } : undefined,
      backupType: 'manual',
    })
    downloadBackupFile(payload)
    const snap = recordAutoBackup({
      data: payload.data,
      user: user ? { id: user.id, email: user.email } : undefined,
      type: 'manual',
      customLabel: `Manual Backup (${transactions.length} txs, ${formatINR(accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0))})`,
    })
    if (snap) {
      setAutoBackups(listAutoBackups())
      setLastBackupTime(snap.timestamp)
    }
    success('Financial dataset backup downloaded successfully.')
  }

  // Handle Backup Directly to Supabase Cloud Database
  const handleBackupToCloud = async () => {
    setIsBackingUpToCloud(true)
    try {
      const res = await backupToCloud()
      if (res.success) {
        const now = new Date().toISOString()
        setLastCloudBackupTime(now)
        success(`Cloud DB backup successful! Synced ${res.count || 0} financial records to Supabase PostgreSQL.`)
      } else {
        error(res.error || 'Failed to backup to Supabase Cloud DB.')
      }
    } catch (err: any) {
      error('Cloud backup error: ' + (err?.message || 'Unknown error'))
    } finally {
      setIsBackingUpToCloud(false)
    }
  }

  // Handle Cloud Auto-Backup Toggle
  const handleToggleCloudAutoBackup = async () => {
    const next = !cloudAutoBackupConfig.enabled
    const newConfig = { enabled: next }
    setCloudAutoBackupConfig(newConfig)
    saveCloudAutoBackupConfig(newConfig)
    if (next) {
      if (user && !isDemoMode) {
        setIsBackingUpToCloud(true)
        const res = await backupToCloud()
        setIsBackingUpToCloud(false)
        if (res.success) {
          const now = new Date().toISOString()
          setLastCloudBackupTime(now)
          success('Cloud Auto-Backup enabled! First snapshot backed up to Supabase Cloud DB.')
        } else {
          success('Cloud Auto-Backup enabled. Changes will sync to cloud.')
        }
      } else {
        success('Cloud Auto-Backup enabled. Sign in to sync live with Supabase.')
      }
    } else {
      success('Cloud Auto-Backup disabled.')
    }
  }

  // Handle Automatic Backup Toggle
  const handleToggleAutoBackup = () => {
    const next = !autoBackupConfig.enabled
    const newConfig = { ...autoBackupConfig, enabled: next }
    setAutoBackupConfig(newConfig)
    saveAutoBackupConfig(newConfig)
    if (next) {
      const snap = recordAutoBackup({
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
        user: user ? { id: user.id, email: user.email } : undefined,
        type: 'automatic',
        customLabel: `Auto-Backup Enabled (${transactions.length} txs)`,
      })
      if (snap) {
        setAutoBackups(listAutoBackups())
        setLastBackupTime(snap.timestamp)
      }
      success('Automatic backups enabled.')
    } else {
      success('Automatic backups disabled.')
    }
  }

  // Handle Restoring an Automatic Snapshot
  const handleRestoreSnapshot = async (snap: AutoBackupItem) => {
    if (
      window.confirm(
        `Restore financial records from ${new Date(snap.timestamp).toLocaleString()}? This will restore ${snap.summary.transactionsCount} transactions across ${snap.summary.accountsCount} accounts.`
      )
    ) {
      const res = await restoreAllData(snap.payload)
      if (res.success) {
        setAutoBackups(listAutoBackups())
        success(`Successfully restored backup from ${new Date(snap.timestamp).toLocaleDateString()}.`)
      } else {
        error(res.error || 'Failed to restore backup.')
      }
    }
  }

  // Handle File Upload to Restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const raw = JSON.parse(event.target?.result as string)
        const check = validateBackupPayload(raw)
        if (!check.valid || !check.payload) {
          error(check.error || 'Invalid backup file format.')
          return
        }
        if (
          window.confirm(
            `Restore ${check.payload.summary.transactionsCount} transactions and ${check.payload.summary.accountsCount} accounts from ${file.name}?`
          )
        ) {
          const res = await restoreAllData(check.payload)
          if (res.success) {
            setAutoBackups(listAutoBackups())
            success('Backup file restored successfully.')
          } else {
            error(res.error || 'Failed to restore file.')
          }
        }
      } catch (err: any) {
        error('Failed to parse backup JSON file: ' + err?.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Handle Confirmed Reset of All Data
  const handleConfirmResetAll = async () => {
    await clearAllData()
    success('All application and financial data has been successfully deleted.')
    setSecurityModalOpen(false)
  }

  // Handle Confirmed Reset of Transactions Only
  const handleConfirmResetTransactions = async () => {
    await clearTransactions()
    success('All transactions have been deleted and account balances recalculated.')
    setSecurityModalOpen(false)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-slide-up pb-12">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-0.5">
          Manage your account, authentication, security, and application preferences.
        </p>
      </div>

      {/* Active User Profile Card */}
      {user && (
        <div className="card p-5 bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 flex items-center justify-center font-bold text-base border border-brand-300/40">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  user.fullName?.[0] || user.email[0].toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[var(--text-primary)]">
                    {user.fullName || user.email.split('@')[0]}
                  </h2>
                  {isDemoMode ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      <Sparkles size={10} />
                      Demo Mode
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 size={10} />
                      {user.provider === 'google' ? 'Google OAuth' : 'Supabase Auth'}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{user.email}</p>
              </div>
            </div>

            <button
              id="settings-signout-btn"
              onClick={() => signOut()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/50 transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[var(--border)] text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <span className="text-[var(--text-secondary)]">Database Backend</span>
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isConfigured ? 'Supabase PostgreSQL' : 'Local Storage Engine'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <span className="text-[var(--text-secondary)]">Data Protection</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CloudCheck size={14} />
                Row-Level Security (RLS)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Settings Navigation List */}
      <div className="card divide-y divide-[var(--border)] p-0 overflow-hidden">
        {SETTING_SECTIONS.map(({ id, icon: Icon, label, desc, to }) => {
          const handleClick = () => {
            if (id === 'display') setDisplayModalOpen(true)
            else if (id === 'security') setSecurityModalOpen(true)
            else if (id === 'about') setAboutModalOpen(true)
          }

          const inner = (
            <div className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[var(--bg-subtle)] transition-colors duration-150 group cursor-pointer">
              <div className="w-9 h-9 rounded-xl bg-[var(--bg-subtle)] flex items-center justify-center shrink-0 group-hover:bg-brand-50 group-hover:text-brand-600 dark:group-hover:bg-brand-950 dark:group-hover:text-brand-400 transition-colors duration-150">
                <Icon size={16} className="text-[var(--text-secondary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{desc}</p>
              </div>
              <ChevronRight size={15} className="text-[var(--text-muted)] group-hover:translate-x-0.5 transition-transform" />
            </div>
          )

          return to ? (
            <Link key={id} to={to} id={`settings-${id}`} className="block">
              {inner}
            </Link>
          ) : (
            <div key={id} id={`settings-${id}`} onClick={handleClick}>
              {inner}
            </div>
          )
        })}
      </div>

      {/* ── Data Backup & Automatic Backup Section ── */}
      <div className="card p-5 bg-[var(--bg-surface)] border border-emerald-500/20 rounded-2xl space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
              <Database size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-[var(--text-primary)]">
                  Data Backup & Auto-Backup
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck size={11} />
                  Safe & Verified
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Protect your financial records with Supabase Cloud Database backup and automated background snapshots.
              </p>
            </div>
          </div>

          {/* Backup Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="settings-cloud-backup-now-btn"
              onClick={handleBackupToCloud}
              disabled={isBackingUpToCloud}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all shrink-0 cursor-pointer disabled:opacity-60"
            >
              <CloudUpload size={14} className={isBackingUpToCloud ? 'animate-bounce' : ''} />
              <span>{isBackingUpToCloud ? 'Syncing to Cloud...' : 'Backup to Cloud DB'}</span>
            </button>

            <button
              type="button"
              id="settings-backup-now-btn"
              onClick={handleFullBackup}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-semibold rounded-xl text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)] border border-[var(--border)] shadow-2xs transition-all shrink-0 cursor-pointer"
            >
              <Download size={13} />
              <span>Download JSON</span>
            </button>
          </div>
        </div>

        {/* 3-Column Summary: Cloud Auto-Backup, Local Auto-Backup & Restore */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1. Cloud Auto-Backup Switch Card */}
          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-blue-500/20 flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Cloud size={14} className={cloudAutoBackupConfig.enabled ? 'text-blue-500' : 'text-[var(--text-muted)]'} />
                  Cloud Auto-Backup
                </span>
                <button
                  type="button"
                  onClick={handleToggleCloudAutoBackup}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    cloudAutoBackupConfig.enabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={cloudAutoBackupConfig.enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      cloudAutoBackupConfig.enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {cloudAutoBackupConfig.enabled
                  ? 'Active — Automatically syncs ledger updates and snapshots to your Supabase PostgreSQL cloud database.'
                  : 'Paused — Automatic background cloud database backup is paused.'}
              </p>
            </div>

            <div className="text-[11px] text-[var(--text-secondary)] flex items-center justify-between pt-1 border-t border-[var(--border)]">
              <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold truncate">
                <span className={`w-1.5 h-1.5 rounded-full ${isConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {isConfigured ? 'Supabase Connected' : 'Local Storage Mode'}
              </span>
              <span className="text-[10px] text-[var(--text-muted)] truncate">
                {lastCloudBackupTime
                  ? `Synced ${new Date(lastCloudBackupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Not synced yet'}
              </span>
            </div>
          </div>

          {/* 2. Automatic Local Backup Switch Card */}
          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <RefreshCw size={14} className={autoBackupConfig.enabled ? 'text-emerald-500' : 'text-[var(--text-muted)]'} />
                  Local Auto-Snapshots
                </span>
                <button
                  type="button"
                  onClick={handleToggleAutoBackup}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    autoBackupConfig.enabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                  role="switch"
                  aria-checked={autoBackupConfig.enabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      autoBackupConfig.enabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {autoBackupConfig.enabled
                  ? 'Active — Automatic rolling snapshots are recorded locally whenever your accounts or transactions are modified.'
                  : 'Paused — Automatic local snapshots are currently turned off.'}
              </p>
            </div>

            <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-1.5 pt-1 border-t border-[var(--border)]">
              <Clock size={12} className="text-brand-500" />
              <span className="truncate">
                {lastBackupTime
                  ? `Last snapshot: ${new Date(lastBackupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'No snapshots recorded yet'}
              </span>
            </div>
          </div>

          {/* 3. Restore / Import Card */}
          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Upload size={14} className="text-purple-500" />
                  Restore from File
                </span>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">.json</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Upload a previously saved MoneyMap backup file to restore accounts and records.
              </p>
            </div>

            <div>
              <label
                htmlFor="restore-file-input"
                className="w-full py-2 px-3 text-xs font-semibold rounded-xl text-[var(--text-primary)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] border border-[var(--border)] transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-center"
              >
                <Upload size={13} />
                <span>Upload & Restore Backup</span>
              </label>
              <input
                id="restore-file-input"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </div>

        {/* Rolling Snapshots List (if any exist) */}
        {autoBackups.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-[var(--border)]">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-secondary)] px-1">
              <span className="flex items-center gap-1.5">
                <History size={13} className="text-emerald-500" />
                Recent Snapshots ({autoBackups.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Clear all local backup snapshots?')) {
                    clearAllAutoBackups()
                    setAutoBackups([])
                    success('All local snapshots cleared.')
                  }
                }}
                className="text-[10px] text-rose-500 hover:underline"
              >
                Clear History
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {autoBackups.slice(0, 4).map((snap) => (
                <div
                  key={snap.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-[var(--text-primary)] truncate flex items-center gap-1.5">
                      <FileJson size={12} className="text-emerald-500 shrink-0" />
                      <span>{snap.label}</span>
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">
                      {new Date(snap.timestamp).toLocaleString()} • {snap.summary.transactionsCount} txs • {formatINR(snap.summary.totalBalance)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      title="Download JSON"
                      onClick={() => downloadBackupFile(snap.payload, 'MoneyMap_Snapshot')}
                      className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] hover:text-emerald-500 text-[var(--text-secondary)] transition-colors"
                    >
                      <Download size={12} />
                    </button>
                    <button
                      type="button"
                      title="Restore Snapshot"
                      onClick={() => handleRestoreSnapshot(snap)}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold border border-brand-500/20 bg-brand-500/10 text-brand-600 dark:text-brand-400 hover:bg-brand-500 hover:text-white transition-colors"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      title="Delete Snapshot"
                      onClick={() => {
                        deleteAutoBackup(snap.id)
                        setAutoBackups(listAutoBackups())
                        success('Snapshot deleted.')
                      }}
                      className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] hover:text-rose-500 text-[var(--text-secondary)] transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Data Management & Reset Section (Danger Zone) ── */}
      <div className="card p-5 bg-[var(--bg-surface)] border border-rose-500/20 rounded-2xl space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[var(--border)]">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Data Management & Reset Options
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Delete inserted records or wipe all application data with confirmation
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option 1: Reset Transactions */}
          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Receipt size={14} className="text-amber-500" />
                  Reset Transactions
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {transactions.length} records
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Delete all recorded income, expense, and transfer transactions. Account balances will be recalculated back to their original opening balances.
              </p>
            </div>
            <button
              type="button"
              id="settings-reset-transactions-btn"
              onClick={() => setResetTransactionsModalOpen(true)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw size={13} />
              Reset Transactions
            </button>
          </div>

          {/* Option 2: Reset All Data */}
          <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-rose-500/20 flex flex-col justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                  <Trash2 size={14} />
                  Reset All Data
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  Wipe Everything
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Permanently delete all accounts, transactions, EMIs, investments, budgets, and subscriptions at once. Resets workspace to a fresh empty state.
              </p>
            </div>
            <button
              type="button"
              id="settings-reset-all-btn"
              onClick={() => setResetAllModalOpen(true)}
              className="w-full py-2 px-3 text-xs font-semibold rounded-xl text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              Reset All Data
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-[var(--text-muted)]">
        MoneyMap v1.0.0 · Production Release · Intelligent Personal Wealth Engine
      </p>

      {/* ── 1. Display & Aesthetics Modal ───────────────────── */}
      {displayModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl p-6 space-y-5 animate-slide-up">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <Palette size={18} className="text-[var(--accent-primary)]" />
                  <h3 className="font-bold text-base text-[var(--text-primary)]">
                    Display & Aesthetics Preferences
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDisplayModalOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Interface Theme</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Toggle between Dark and Light mode</p>
                  </div>
                  <ThemeToggle />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Currency Standard</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Indian Rupee (₹ INR)</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] font-bold text-[var(--text-primary)]">
                    ₹ INR
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Number Formatting</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Indian Numbering (Lakhs & Crores)</p>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-[var(--text-primary)]">
                    ₹1,45,000.00
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Date Standard</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Standard Calendar Format</p>
                  </div>
                  <span className="font-mono text-[11px] text-[var(--text-secondary)]">
                    YYYY-MM-DD
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setDisplayModalOpen(false)}
                  className="btn-primary text-xs px-4 py-2"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── 2. Security & Storage Modal ─────────────────────── */}
      {securityModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl p-6 space-y-5 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-emerald-500" />
                <h3 className="font-bold text-base text-[var(--text-primary)]">
                  Security & Storage Management
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSecurityModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between font-semibold text-[var(--text-primary)]">
                  <span className="flex items-center gap-1.5">
                    <HardDrive size={14} className="text-[var(--accent-primary)]" />
                    Offline Local Storage Cache
                  </span>
                  <span className="font-mono text-emerald-500 font-bold">{calculateStorageSizeKB()} KB</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  MoneyMap caches your financial models locally for instant offline performance and zero-latency loading.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleFullBackup}
                  className="w-full p-3 rounded-xl border border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Download size={14} className="text-[var(--accent-primary)]" />
                    Download Full JSON Backup
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">.json</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResetTransactionsModalOpen(true)}
                  className="w-full p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Receipt size={14} />
                    Reset Transactions Only
                  </span>
                  <span className="text-[10px] uppercase font-bold">Reset Ledger</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResetAllModalOpen(true)}
                  className="w-full p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 font-semibold flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Trash2 size={14} />
                    Delete All Inserted Data
                  </span>
                  <span className="text-[10px] uppercase font-bold">Delete All</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSecurityModalOpen(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── 3. About MoneyMap Modal ─────────────────────────── */}
      {aboutModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl p-6 space-y-5 animate-slide-up">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                    M
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[var(--text-primary)]">
                      About MoneyMap
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-500">
                      v1.0.0 Production Release
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAboutModalOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs text-[var(--text-secondary)]">
                <p>
                  <strong>MoneyMap</strong> ("Your Money, Clearly Mapped.") is a personal finance management app in INR (₹) designed to provide full visibility into your cash flow, spending allocations, EMIs, investments, and consolidated net worth.
                </p>

                <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between font-semibold text-[var(--text-primary)]">
                    <span>Architecture & Frameworks</span>
                    <Code2 size={13} className="text-[var(--accent-primary)]" />
                  </div>
                  <p className="text-[var(--text-muted)]">
                    React 19 • TypeScript • Vite • Tailwind CSS • Supabase PostgreSQL • Vitest Automated Suite
                  </p>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-emerald-500 font-semibold">
                  <ShieldCheck size={14} />
                  <span>Zero telemetry trackers • 100% private & client-side verified</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAboutModalOpen(false)}
                  className="btn-primary text-xs px-4 py-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* ── Reset All Data Confirmation Modal ──────────────── */}
      <ConfirmResetModal
        isOpen={resetAllModalOpen}
        onClose={() => setResetAllModalOpen(false)}
        onConfirm={handleConfirmResetAll}
        title="Reset All Financial Data"
        description="Are you sure you want to delete all inserted data? All accounts, transactions, EMIs, investments, recurring subscriptions, and budgets will be permanently deleted."
        itemsSummary={[
          { label: 'Accounts', count: accounts.length },
          { label: 'Transactions', count: transactions.length },
          { label: 'EMIs & Purchases', count: emis.length },
          { label: 'Subscriptions', count: recurringTransactions.length },
          { label: 'Investments', count: investments.length },
          { label: 'Budgets', count: budgets.length },
        ]}
        warningMessage="All local and cloud database records will be wiped immediately. This cannot be undone."
        actionType="reset_all"
      />

      {/* ── Reset Transactions Only Confirmation Modal ─────── */}
      <ConfirmResetModal
        isOpen={resetTransactionsModalOpen}
        onClose={() => setResetTransactionsModalOpen(false)}
        onConfirm={handleConfirmResetTransactions}
        title="Reset All Transactions"
        description="Are you sure you want to delete all transactions? All income, expense, and transfer records will be permanently removed. Your accounts will be preserved and their balances restored to their opening balances."
        itemsSummary={[
          { label: 'Transactions to delete', count: transactions.length },
          { label: 'Accounts to recalculate', count: accounts.length },
        ]}
        warningMessage="Your transaction ledger will be cleared. Account balances will recalculate to opening balance values."
        actionType="reset_transactions"
      />
    </div>
  )
}
