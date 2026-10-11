-- ========================================================================
-- MoneyMap — Database Clean Slate Script (Make DB Completely Empty)
-- Run this directly in the Supabase SQL Editor to wipe all user tables
-- ========================================================================

-- Disable triggers temporarily to prevent foreign key cascade issues
SET session_replication_role = 'replica';

-- Truncate all financial tables cleanly
TRUNCATE TABLE 
  public.emi_payments,
  public.emis,
  public.transactions,
  public.budgets,
  public.presets,
  public.accounts
CASCADE;

-- Re-enable normal trigger behavior
SET session_replication_role = 'origin';

-- Optional: If you also wish to delete registered profiles (keeps auth.users intact):
-- TRUNCATE TABLE public.profiles CASCADE;

-- Verify all table row counts are zero:
SELECT 'accounts' AS table_name, count(*) AS count FROM public.accounts
UNION ALL
SELECT 'transactions', count(*) FROM public.transactions
UNION ALL
SELECT 'emis', count(*) FROM public.emis
UNION ALL
SELECT 'emi_payments', count(*) FROM public.emi_payments
UNION ALL
SELECT 'budgets', count(*) FROM public.budgets
UNION ALL
SELECT 'presets', count(*) FROM public.presets;
