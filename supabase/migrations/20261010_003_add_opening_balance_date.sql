-- ========================================================================
-- MoneyMap — Migration 003: Add Opening Balance Date to Accounts Table
-- ========================================================================

-- Safe addition of opening_balance_date column with default current_date
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS opening_balance_date date NOT NULL DEFAULT current_date;

-- Backfill any existing account records safely with their creation date or current_date
UPDATE public.accounts
  SET opening_balance_date = coalesce(created_at::date, current_date)
  WHERE opening_balance_date IS NULL;

-- Index on opening_balance_date for rapid historical ledger queries
CREATE INDEX IF NOT EXISTS idx_accounts_opening_balance_date 
  ON public.accounts(opening_balance_date);
