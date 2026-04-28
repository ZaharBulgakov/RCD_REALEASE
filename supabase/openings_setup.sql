-- Run this script in Supabase SQL Editor.
-- It creates/normalizes the openings table and RLS policies
-- so each user can manage only their own debuts.

create extension if not exists "pgcrypto";

create table if not exists public.openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text not null default '',
  pgn text not null,
  created_at timestamptz not null default now()
);

create index if not exists openings_user_id_created_at_idx
  on public.openings (user_id, created_at desc);

alter table public.openings enable row level security;

drop policy if exists "openings_select_own" on public.openings;
create policy "openings_select_own"
  on public.openings
  for select
  using (auth.uid() = user_id);

drop policy if exists "openings_insert_own" on public.openings;
create policy "openings_insert_own"
  on public.openings
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "openings_update_own" on public.openings;
create policy "openings_update_own"
  on public.openings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "openings_delete_own" on public.openings;
create policy "openings_delete_own"
  on public.openings
  for delete
  using (auth.uid() = user_id);
