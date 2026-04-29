-- Run this script in Supabase SQL Editor.
-- It creates the collections table and RLS policies
-- so each user can manage only their own collections.

create extension if not exists "pgcrypto";

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  opening_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists collections_user_id_created_at_idx
  on public.collections (user_id, created_at desc);

alter table public.collections enable row level security;

drop policy if exists "collections_select_own" on public.collections;
create policy "collections_select_own"
  on public.collections
  for select
  using (auth.uid() = user_id);

drop policy if exists "collections_insert_own" on public.collections;
create policy "collections_insert_own"
  on public.collections
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "collections_update_own" on public.collections;
create policy "collections_update_own"
  on public.collections
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "collections_delete_own" on public.collections;
create policy "collections_delete_own"
  on public.collections
  for delete
  using (auth.uid() = user_id);

-- Also create deletion_logs table if not exists for collection deletion tracking
create table if not exists public.deletion_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opening_id uuid not null,
  opening_name text not null,
  opening_pgn text not null,
  opening_description text not null default '',
  deleted_at timestamptz not null default now()
);

create index if not exists deletion_logs_user_id_deleted_at_idx
  on public.deletion_logs (user_id, deleted_at desc);

alter table public.deletion_logs enable row level security;

drop policy if exists "deletion_logs_select_own" on public.deletion_logs;
create policy "deletion_logs_select_own"
  on public.deletion_logs
  for select
  using (auth.uid() = user_id);

drop policy if exists "deletion_logs_insert_own" on public.deletion_logs;
create policy "deletion_logs_insert_own"
  on public.deletion_logs
  for insert
  with check (auth.uid() = user_id);
