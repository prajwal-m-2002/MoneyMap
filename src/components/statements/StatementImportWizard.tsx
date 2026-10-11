import React, { useState } from 'react'
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react'
import type { Account, BankPresetId, ParsedRawTransaction } from '@/types/finance'
import {
  parseBankStatement,
  SAMPLE_HDFC_CSV,
  SAMPLE_SBI_CSV,
  SAMPLE_GENERIC_CSV,
} from '@/lib/statementParser'
import { formatINR } from '@/lib/utils'
import { useFinance } from '@/context/FinanceContext'

const BANK_OPTIONS: { id: BankPresetId; label: string; note: string }[] = [
  { id: 'auto', label: 'Auto-Detect Bank', note: 'Inspects statement headers automatically' },
  { id: 'hdfc', label: 'HDFC Bank', note: 'Supports HDFC NetBanking CSV format' },
  { id: 'sbi', label: 'State Bank of India (SBI)', note: 'Supports SBI Online banking statements' },
  { id: 'icici', label: 'ICICI Bank', note: 'Supports ICICI iMobile & NetBanking CSV' },
  { id: 'axis', label: 'Axis Bank', note: 'Supports Axis Internet Banking export' },
  { id: 'kotak', label: 'Kotak Mahindra', note: 'Supports Kotak NetBanking CSV' },
  { id: 'generic', label: 'Generic / Custom CSV', note: 'Standard Date, Description, Amount columns' },
]

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transportation',
  'Shopping',
  'Bills & Utilities',
  'Rent & Housing',
  'Entertainment',
  'Health & Medical',
  'Investments',
  'EMI & Loans',
  'Salary',
  'Income',
  'Other',
]

interface StatementImportWizardProps {
  accounts: Account[]
  onImportComplete?: (count: number) => void
}

export const StatementImportWizard: React.FC<StatementImportWizardProps> = ({
  accounts,
  onImportComplete,
}) => {
  const { transactions: existingTxs, batchImportTransactions } = useFinance()

  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload')
  const [selectedBank, setSelectedBank] = useState<BankPresetId>('auto')
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || ''
  )
  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState('')

  // Parsing state
  const [parsedItems, setParsedItems] = useState<ParsedRawTransaction[]>([])
  const [detectedBankName, setDetectedBankName] = useState('')
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [hasParsed, setHasParsed] = useState(false)

  // Execution state
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ count: number } | null>(null)

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      setRawText(text || '')
      triggerParse(text || '', selectedBank, selectedAccountId)
    }
    reader.readAsText(file)
  }

  // Parse trigger
  const triggerParse = (
    textToParse: string,
    bankPreset: BankPresetId,
    targetAccId: string
  ) => {
    if (!textToParse.trim()) {
      setParseErrors(['Statement content is empty.'])
      return
    }

    const result = parseBankStatement(
      textToParse,
      bankPreset,
      existingTxs,
      targetAccId
    )

    setParsedItems(result.transactions)
    setDetectedBankName(result.detectedBank)
    setParseErrors(result.errors)
    setHasParsed(true)
    setImportResult(null)
  }

  // Toggle item selection
  const toggleItemSelect = (id: string) => {
    setParsedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    )
  }

  // Select all / Deselect all
  const selectAll = (select: boolean) => {
    setParsedItems((prev) =>
      prev.map((item) => ({ ...item, selected: select }))
    )
  }

  // Update category of a parsed item
  const updateItemCategory = (id: string, newCat: string) => {
    setParsedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, category: newCat } : item
      )
    )
  }

  // Toggle duplicates
  const toggleSkipDuplicates = (skip: boolean) => {
    setParsedItems((prev) =>
      prev.map((item) =>
        item.isDuplicate ? { ...item, selected: !skip } : item
      )
    )
  }

  // Load sample data
  const loadSample = (sampleText: string, sampleBank: BankPresetId, sampleName: string) => {
    setRawText(sampleText)
    setFileName(sampleName)
    setSelectedBank(sampleBank)
    triggerParse(sampleText, sampleBank, selectedAccountId)
  }

  // Execute batch import
  const handleExecuteImport = async () => {
    const toImport = parsedItems.filter((i) => i.selected)
    if (toImport.length === 0) return

    setIsImporting(true)
    try {
      const res = await batchImportTransactions(
        toImport.map((i) => ({
          type: i.type,
          amount: i.amount,
          title: i.cleanedTitle,
          category: i.category,
          accountId: selectedAccountId,
          date: i.date,
          time: i.time,
          paymentMethod: i.paymentMethod,
          notes: i.referenceNo
            ? `Ref: ${i.referenceNo} | Raw: ${i.rawNarration}`
            : `Raw: ${i.rawNarration}`,
        }))
      )

      if (res.success) {
        setImportResult({ count: res.count })
        if (onImportComplete) {
          onImportComplete(res.count)
        }
      }
    } catch (err) {
      console.error('Import failed:', err)
    } finally {
      setIsImporting(false)
    }
  }

  // Summary statistics for selected items
  const selectedItems = parsedItems.filter((i) => i.selected)
  const totalInflow = selectedItems
    .filter((i) => i.type === 'income')
    .reduce((sum, i) => sum + i.amount, 0)
  const totalOutflow = selectedItems
    .filter((i) => i.type === 'expense')
    .reduce((sum, i) => sum + i.amount, 0)
  const netFlow = totalInflow - totalOutflow
  const duplicateCount = parsedItems.filter((i) => i.isDuplicate).length

  return (
    <div className="space-y-6">
      {/* ── 1. Configuration & Input Card ───────────────────── */}
      <div className="card p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-[var(--accent-primary)]" />
              Bank Statement Parser
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Upload bank CSV exports or paste statement text to auto-extract, categorize, and deduplicate transactions.
            </p>
          </div>

          {/* Input Method Switcher */}
          <div className="flex bg-[var(--bg-subtle)] p-1 rounded-xl text-xs shrink-0">
            <button
              type="button"
              onClick={() => setInputMode('upload')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                inputMode === 'upload'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Upload File (.csv, .tsv)
            </button>
            <button
              type="button"
              onClick={() => setInputMode('paste')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                inputMode === 'paste'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Paste Statement Text
            </button>
          </div>
        </div>

        {/* Bank & Target Account Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Destination Bank Account
            </label>
            <select
              value={selectedAccountId}
              onChange={(e) => {
                setSelectedAccountId(e.target.value)
                if (hasParsed && rawText) {
                  triggerParse(rawText, selectedBank, e.target.value)
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({formatINR(acc.balance)})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Imported transactions will credit or debit this account balance.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5">
              Bank Statement Format
            </label>
            <select
              value={selectedBank}
              onChange={(e) => {
                const newPreset = e.target.value as BankPresetId
                setSelectedBank(newPreset)
                if (hasParsed && rawText) {
                  triggerParse(rawText, newPreset, selectedAccountId)
                }
              }}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
            >
              {BANK_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              Supports HDFC, SBI, ICICI, Axis, Kotak, or universal auto-detection.
            </p>
          </div>
        </div>

        {/* File Dropzone or Paste Text Area */}
        {inputMode === 'upload' ? (
          <div className="relative border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-primary)] rounded-2xl p-6 text-center transition-colors bg-[var(--bg-subtle)]/50">
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] flex items-center justify-center">
                <Upload size={24} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {fileName ? fileName : 'Choose CSV statement file or drag here'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Supports exported CSV statements from any Indian bank (.csv, .tsv, .txt)
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw bank statement rows or copied PDF table lines here..."
              className="w-full p-3 font-mono text-xs rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => triggerParse(rawText, selectedBank, selectedAccountId)}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                disabled={!rawText.trim()}
              >
                <Sparkles size={14} /> Parse Pasted Text
              </button>
            </div>
          </div>
        )}

        {/* Sample Loaders for Quick 1-Click Testing */}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[var(--text-muted)] flex items-center gap-1">
            <Info size={12} /> Test with sample bank data:
          </span>
          <button
            type="button"
            onClick={() => loadSample(SAMPLE_HDFC_CSV, 'hdfc', 'sample_hdfc_statement.csv')}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--accent-primary)]/10 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all font-medium"
          >
            HDFC Bank Sample
          </button>
          <button
            type="button"
            onClick={() => loadSample(SAMPLE_SBI_CSV, 'sbi', 'sample_sbi_statement.csv')}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--accent-primary)]/10 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all font-medium"
          >
            SBI Sample
          </button>
          <button
            type="button"
            onClick={() => loadSample(SAMPLE_GENERIC_CSV, 'generic', 'sample_generic.csv')}
            className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--accent-primary)]/10 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-all font-medium"
          >
            Generic CSV Sample
          </button>
        </div>
      </div>

      {/* ── 2. Parse Errors Display ─────────────────────────── */}
      {parseErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <AlertTriangle size={15} /> Parsing Warning
          </div>
          {parseErrors.map((err, i) => (
            <p key={i}>{err}</p>
          ))}
        </div>
      )}

      {/* ── 3. Success Notification After Import ────────────── */}
      {importResult && (
        <div className="card p-5 bg-emerald-500/10 border-emerald-500/30 flex items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-500">
                Successfully Imported {importResult.count} Transactions!
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                The account balance and monthly financial summaries have been updated atomically.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setHasParsed(false)
              setParsedItems([])
              setImportResult(null)
              setRawText('')
              setFileName('')
            }}
            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
          >
            <RotateCcw size={13} /> Import Another File
          </button>
        </div>
      )}

      {/* ── 4. Interactive Review & Deduplication Table ─────── */}
      {hasParsed && parsedItems.length > 0 && !importResult && (
        <div className="card p-5 space-y-4 animate-slide-up">
          {/* Header & Stats Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">
                  Statement Review & Approval
                </h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] uppercase">
                  {detectedBankName} Detected
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Review parsed merchants, modify categories, and select transactions to commit.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => selectAll(true)}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] font-medium"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => selectAll(false)}
                className="px-2.5 py-1 rounded-lg bg-[var(--bg-subtle)] hover:bg-[var(--border-subtle)] text-[var(--text-secondary)] font-medium"
              >
                Deselect All
              </button>
              {duplicateCount > 0 && (
                <button
                  type="button"
                  onClick={() => toggleSkipDuplicates(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium flex items-center gap-1"
                >
                  <AlertTriangle size={12} /> Skip Duplicates ({duplicateCount})
                </button>
              )}
            </div>
          </div>

          {/* Metrics Pill Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)]">
              <span className="text-[11px] text-[var(--text-muted)]">Selected for Import</span>
              <p className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                {selectedItems.length} <span className="text-xs text-[var(--text-muted)] font-normal">/ {parsedItems.length}</span>
              </p>
            </div>
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[11px] text-emerald-500 font-medium">Total Inflow (Income)</span>
              <p className="text-base font-bold text-emerald-500 mt-0.5">
                +{formatINR(totalInflow)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-[11px] text-rose-500 font-medium">Total Outflow (Expense)</span>
              <p className="text-base font-bold text-rose-500 mt-0.5">
                -{formatINR(totalOutflow)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)]">
              <span className="text-[11px] text-[var(--text-muted)]">Net Impact</span>
              <p
                className={`text-base font-bold mt-0.5 ${
                  netFlow >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {formatINR(netFlow)}
              </p>
            </div>
          </div>

          {/* Transaction Table */}
          <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === parsedItems.length && parsedItems.length > 0}
                      onChange={(e) => selectAll(e.target.checked)}
                      className="rounded accent-[var(--accent-primary)] cursor-pointer"
                    />
                  </th>
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold">Merchant / Title</th>
                  <th className="p-3 font-semibold">Category</th>
                  <th className="p-3 font-semibold">Method</th>
                  <th className="p-3 font-semibold text-right">Amount</th>
                  <th className="p-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-[var(--text-primary)]">
                {parsedItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      item.selected ? 'bg-transparent' : 'opacity-50 bg-[var(--bg-subtle)]/40'
                    } hover:bg-[var(--bg-subtle)]/60`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItemSelect(item.id)}
                        className="rounded accent-[var(--accent-primary)] cursor-pointer"
                      />
                    </td>

                    <td className="p-3 font-mono text-[11px] whitespace-nowrap text-[var(--text-secondary)]">
                      {item.date}
                    </td>

                    <td className="p-3 max-w-xs">
                      <div className="font-semibold text-xs text-[var(--text-primary)] truncate">
                        {item.cleanedTitle}
                      </div>
                      <div
                        className="text-[10px] text-[var(--text-muted)] font-mono truncate"
                        title={item.rawNarration}
                      >
                        {item.rawNarration}
                      </div>
                    </td>

                    <td className="p-3">
                      <select
                        value={item.category}
                        onChange={(e) => updateItemCategory(item.id, e.target.value)}
                        className="px-2 py-1 text-xs rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none"
                      >
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                        {item.paymentMethod}
                      </span>
                    </td>

                    <td className="p-3 text-right whitespace-nowrap font-bold">
                      <span
                        className={
                          item.type === 'income' ? 'text-emerald-500' : 'text-rose-500'
                        }
                      >
                        {item.type === 'income' ? '+' : '-'}
                        {formatINR(item.amount)}
                      </span>
                    </td>

                    <td className="p-3 text-center whitespace-nowrap">
                      {item.isDuplicate ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 flex items-center justify-center gap-1">
                          <AlertTriangle size={10} /> Duplicate
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center gap-1">
                          <CheckCircle2 size={10} /> Valid
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[var(--border-subtle)]">
            <span className="text-xs text-[var(--text-muted)]">
              Ready to import {selectedItems.length} transaction{selectedItems.length === 1 ? '' : 's'} into{' '}
              <strong className="text-[var(--text-primary)]">
                {accounts.find((a) => a.id === selectedAccountId)?.name || 'Account'}
              </strong>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setHasParsed(false)
                  setParsedItems([])
                }}
                className="btn-secondary text-xs px-3 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteImport}
                disabled={selectedItems.length === 0 || isImporting}
                className="btn-primary text-xs px-5 py-2 flex items-center gap-2"
              >
                {isImporting ? (
                  <span>Importing...</span>
                ) : (
                  <>
                    <span>Confirm & Import ({selectedItems.length})</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
