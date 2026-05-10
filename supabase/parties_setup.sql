-- Run this script in Supabase SQL Editor.
-- It creates/normalizes the parties table and RLS policies
-- so each user can manage only their own parties.

create extension if not exists "pgcrypto";

create table if not exists public.parties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  opening_id uuid not null references public.openings(id) on delete cascade,
  name text not null,
  description text not null default '',
  pgn text not null,
  study_metadata jsonb default null,
  created_at timestamptz not null default now()
);

create index if not exists parties_user_id_created_at_idx
  on public.parties (user_id, created_at desc);

create index if not exists parties_opening_id_idx
  on public.parties (opening_id);

alter table public.parties enable row level security;

drop policy if exists "parties_select_own" on public.parties;
create policy "parties_select_own"
  on public.parties
  for select
  using (auth.uid() = user_id);

drop policy if exists "parties_insert_own" on public.parties;
create policy "parties_insert_own"
  on public.parties
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "parties_update_own" on public.parties;
create policy "parties_update_own"
  on public.parties
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "parties_delete_own" on public.parties;
create policy "parties_delete_own"
  on public.parties
  for delete
  using (auth.uid() = user_id);