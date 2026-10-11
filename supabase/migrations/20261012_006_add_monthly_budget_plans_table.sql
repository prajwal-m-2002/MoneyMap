-- ========================================================================
-- MoneyMap — Monthly Budget Plans Table Migration
-- Phase 11: Cross-Device Planned Budget Synchronization (Phone & PC)
-- ========================================================================

create table if not exists public.monthly_budget_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  month text not null, -- Format 'YYYY-MM' or 'template'
  expected_salary numeric(14, 2) not null default 27000,
  allocations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

create index if not exists idx_monthly_budget_plans_user on public.monthly_budget_plans(user_id);
create index if not exists idx_monthly_budget_plans_month on public.monthly_budget_plans(user_id, month);

alter table public.monthly_budget_plans enable row level security;

create policy "Users can view own monthly budget plans"
  on public.monthly_budget_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert own monthly budget plans"
  on public.monthly_budget_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update own monthly budget plans"
  on public.monthly_budget_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own monthly budget plans"
  on public.monthly_budget_plans for delete
  using (auth.uid() = user_id);
