-- ========================================================================
-- MoneyMap — Cloud Database Backups Table Migration
-- Phase 10: Automated & Manual Cloud Snapshots in Supabase PostgreSQL
-- ========================================================================

create table if not exists public.cloud_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  backup_type text not null default 'manual' check (backup_type in ('manual', 'automatic', 'safety_pre_reset')),
  label text not null,
  summary jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for rapid user queries and timestamp ordering
create index if not exists idx_cloud_backups_user_id on public.cloud_backups(user_id);
create index if not exists idx_cloud_backups_created_at on public.cloud_backups(created_at desc);

-- Enable Row Level Security (RLS) for tenant isolation
alter table public.cloud_backups enable row level security;

create policy "Users can view own cloud backups"
  on public.cloud_backups for select
  using (auth.uid() = user_id);

create policy "Users can insert own cloud backups"
  on public.cloud_backups for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own cloud backups"
  on public.cloud_backups for delete
  using (auth.uid() = user_id);
