import * as Dialog from '@radix-ui/react-dialog'
import { AlertTriangle, X } from 'lucide-react'
import type { Transaction } from '@/types/finance'
import { formatINR } from '@/lib/utils'

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: Transaction | null
  onConfirm: () => void
  isDeleting: boolean
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  transaction,
  onConfirm,
  isDeleting,
}: DeleteConfirmDialogProps) {
  if (!transaction) return null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 animate-fade-in" />
        <Dialog.Content
          aria-describedby="delete-transaction-description"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl animate-scale-up"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                <AlertTriangle size={20} />
              </span>
              <div>
                <Dialog.Title className="text-base font-bold text-[var(--text-primary)]">
                  Delete Transaction?
                </Dialog.Title>
                <p id="delete-transaction-description" className="text-xs text-[var(--text-secondary)] mt-0.5">
                  This will reverse the financial balance update
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </Dialog.Close>
          </div>

          <div className="my-4 p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Transaction:</span>
              <span className="font-semibold text-[var(--text-primary)]">{transaction.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Amount:</span>
              <span className="font-bold text-[var(--text-primary)]">{formatINR(transaction.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Type:</span>
              <span className="capitalize font-medium text-[var(--text-secondary)]">{transaction.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-secondary)]">Date:</span>
              <span className="text-[var(--text-secondary)]">{transaction.date}</span>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)] mb-5">
            Deleting this record will restore the funds back to your account accordingly. This action cannot be undone.
          </p>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="btn-ghost text-xs px-4"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              type="button"
              id="confirm-delete-btn"
              onClick={onConfirm}
              disabled={isDeleting}
              className="btn-primary text-xs px-4 bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Transaction'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
