-- Run this script in Supabase SQL Editor.
-- It creates a per-user "best score" record used by the app header.

create table if not exists public.records (
  user_id uuid primary key references auth.users(id) on delete cascade,
  best_score double precision not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.records enable row level security;

drop policy if exists "records_select_own" on public.records;
create policy "records_select_own"
  on public.records
  for select
  using (auth.uid() = user_id);

drop policy if exists "records_insert_own" on public.records;
create policy "records_insert_own"
  on public.records
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "records_update_own" on public.records;
create policy "records_update_own"
  on public.records
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

