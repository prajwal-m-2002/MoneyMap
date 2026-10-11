-- ========================================================================
-- MoneyMap — Master Database Schema & Row-Level Security (RLS) Migration
-- Phase 3: Production Financial Schema with Strict Multi-Tenant Isolation
-- ========================================================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------
-- 1. PROFILES TABLE (User Preferences & Identity)
-- ------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  currency text not null default 'INR',
  currency_symbol text not null default '₹',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------------
-- 2. ACCOUNTS TABLE (Bank Accounts & Physical Cash)
-- ------------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  type text not null check (type in ('savings', 'current', 'salary', 'cash', 'credit_card', 'investment')),
  account_number text,
  balance numeric(14, 2) not null default 0.00,
  opening_balance numeric(14, 2) not null default 0.00,
  color text not null default 'emerald',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for fast user account queries
create index if not exists idx_accounts_user_id on public.accounts(user_id);

-- ------------------------------------------------------------------------
-- 3. TRANSACTIONS TABLE (Income, Expenses & Transfers)
-- ------------------------------------------------------------------------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(14, 2) not null check (amount > 0),
  title text not null,
  category text not null,
  account_id uuid not null references public.accounts(id) on delete cascade,
  to_account_id uuid references public.accounts(id) on delete cascade,
  date date not null default current_date,
  time text,
  payment_method text not null default 'UPI',
  notes text,
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  -- Constraint: transfers must have destination account, and source != destination
  constraint chk_transfer_destination check (
    type <> 'transfer' or (to_account_id is not null and account_id <> to_account_id)
  )
);

-- Indexes for rapid date filtering and user transaction queries
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_date on public.transactions(date desc);
create index if not exists idx_transactions_account on public.transactions(account_id);

-- ------------------------------------------------------------------------
-- 4. EMIS TABLE (Loans, Mortgages & Instalments)
-- ------------------------------------------------------------------------
create table if not exists public.emis (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null,
  lender text not null,
  principal numeric(14, 2) not null check (principal > 0),
  interest_rate numeric(6, 2) not null check (interest_rate >= 0),
  tenure_months integer not null check (tenure_months > 0),
  emi_amount numeric(14, 2) not null check (emi_amount > 0),
  start_date date not null default current_date,
  due_day integer not null check (due_day between 1 and 31),
  account_id uuid references public.accounts(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'completed', 'foreclosed', 'paused')),
  category text not null default 'Personal',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_emis_user_id on public.emis(user_id);

-- ------------------------------------------------------------------------
-- 5. EMI PAYMENTS TABLE (Linked Instalment Payments)
-- ------------------------------------------------------------------------
create table if not exists public.emi_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  emi_id uuid not null references public.emis(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  instalment_number integer not null check (instalment_number > 0),
  amount numeric(14, 2) not null check (amount > 0),
  principal_component numeric(14, 2) default 0.00,
  interest_component numeric(14, 2) default 0.00,
  payment_date date not null default current_date,
  status text not null default 'paid' check (status in ('paid', 'pending', 'overdue', 'skipped')),
  created_at timestamptz not null default now()
);

create index if not exists idx_emi_payments_user on public.emi_payments(user_id);
create index if not exists idx_emi_payments_emi on public.emi_payments(emi_id);

-- ------------------------------------------------------------------------
-- 6. BUDGETS TABLE (Monthly Spending Limits)
-- ------------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  category text not null,
  monthly_limit numeric(14, 2) not null check (monthly_limit > 0),
  month text not null, -- Format 'YYYY-MM'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, month)
);

create index if not exists idx_budgets_user on public.budgets(user_id);

-- ------------------------------------------------------------------------
-- 7. PRESETS TABLE (Quick Transaction Templates)
-- ------------------------------------------------------------------------
create table if not exists public.presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  type text not null check (type in ('expense', 'income', 'transfer')),
  title text not null,
  category text not null,
  default_amount numeric(14, 2) check (default_amount is null or default_amount > 0),
  account_id uuid references public.accounts(id) on delete set null,
  payment_method text default 'UPI',
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_presets_user on public.presets(user_id);

-- ------------------------------------------------------------------------
-- 8. AUTOMATION: User Creation Trigger
-- ------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger on auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------------------
-- 9. ROW-LEVEL SECURITY (RLS) POLICIES
-- Strict multi-tenant isolation: Users can ONLY access their own records
-- ------------------------------------------------------------------------

-- Profiles
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Accounts
alter table public.accounts enable row level security;

create policy "Users can view own accounts"
  on public.accounts for select
  using (auth.uid() = user_id);

create policy "Users can insert own accounts"
  on public.accounts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own accounts"
  on public.accounts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own accounts"
  on public.accounts for delete
  using (auth.uid() = user_id);

-- Transactions
alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- EMIs
alter table public.emis enable row level security;

create policy "Users can view own EMIs"
  on public.emis for select
  using (auth.uid() = user_id);

create policy "Users can insert own EMIs"
  on public.emis for insert
  with check (auth.uid() = user_id);

create policy "Users can update own EMIs"
  on public.emis for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own EMIs"
  on public.emis for delete
  using (auth.uid() = user_id);

-- EMI Payments
alter table public.emi_payments enable row level security;

create policy "Users can view own EMI payments"
  on public.emi_payments for select
  using (auth.uid() = user_id);

create policy "Users can insert own EMI payments"
  on public.emi_payments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own EMI payments"
  on public.emi_payments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own EMI payments"
  on public.emi_payments for delete
  using (auth.uid() = user_id);

-- Budgets
alter table public.budgets enable row level security;

create policy "Users can view own budgets"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert own budgets"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own budgets"
  on public.budgets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own budgets"
  on public.budgets for delete
  using (auth.uid() = user_id);

-- Presets
alter table public.presets enable row level security;

create policy "Users can view own presets"
  on public.presets for select
  using (auth.uid() = user_id);

create policy "Users can insert own presets"
  on public.presets for insert
  with check (auth.uid() = user_id);

create policy "Users can update own presets"
  on public.presets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own presets"
  on public.presets for delete
  using (auth.uid() = user_id);
