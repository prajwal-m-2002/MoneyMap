import { useState } from 'react'
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
} from 'lucide-react'
import { useFinance } from '@/context/FinanceContext'
import { StatementImportWizard } from '@/components/statements/StatementImportWizard'
import { StatementExportCard } from '@/components/statements/StatementExportCard'
import { PrintableStatementModal } from '@/components/statements/PrintableStatementModal'
import type { Transaction } from '@/types/finance'

export default function Statements() {
  const { accounts, transactions } = useFinance()

  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import')

  // Print modal state
  const [printModalOpen, setPrintModalOpen] = useState(false)
  const [printTxs, setPrintTxs] = useState<Transaction[]>([])
  const [printPeriod, setPrintPeriod] = useState('')
  const [printAccountName, setPrintAccountName] = useState('')

  const handleOpenPrintModal = (
    txs: Transaction[],
    period: string,
    accName: string
  ) => {
    setPrintTxs(txs)
    setPrintPeriod(period)
    setPrintAccountName(accName)
    setPrintModalOpen(true)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-slide-up pb-12">
      {/* ── Page Header ───────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-2.5">
            <FileSpreadsheet className="text-[var(--accent-primary)]" size={26} />
            Statements & Bank Import
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Import statements from any Indian bank with automated smart categorization, or export PDF & CSV reports.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[var(--bg-subtle)] p-1 rounded-2xl border border-[var(--border-subtle)] text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'import'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <UploadCloud size={15} />
            <span>Import Statement</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeTab === 'export'
                ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Download size={15} />
            <span>Export & PDF</span>
          </button>
        </div>
      </div>

      {/* ── Main Tab Content ─────────────────────────────────── */}
      {activeTab === 'import' ? (
        <StatementImportWizard accounts={accounts} />
      ) : (
        <StatementExportCard
          transactions={transactions}
          accounts={accounts}
          onPrintStatement={handleOpenPrintModal}
        />
      )}

      {/* ── Printable Statement Modal ────────────────────────── */}
      <PrintableStatementModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        transactions={printTxs}
        accounts={accounts}
        periodLabel={printPeriod}
        accountName={printAccountName}
      />
    </div>
  )
}
