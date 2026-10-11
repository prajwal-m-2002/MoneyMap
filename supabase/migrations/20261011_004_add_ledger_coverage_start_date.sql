-- ========================================================================
-- MoneyMap — Migration 004: Separate Ledger Coverage Start Date
-- ========================================================================

-- Safe addition of ledger_coverage_start_date column
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS ledger_coverage_start_date date;

-- Backfill: ledger coverage starts on opening_balance_date or created_at
UPDATE public.accounts
  SET ledger_coverage_start_date = coalesce(opening_balance_date, created_at::date, current_date)
  WHERE ledger_coverage_start_date IS NULL;

-- Index for historical coverage queries
CREATE INDEX IF NOT EXISTS idx_accounts_ledger_coverage_start_date 
  ON public.accounts(ledger_coverage_start_date);
