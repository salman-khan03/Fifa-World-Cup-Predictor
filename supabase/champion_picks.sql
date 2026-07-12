-- ============================================================================
--  Champion picks table  —  run in Supabase SQL editor (Dashboard → SQL → New query)
--
--  Free, no-money "who will win the World Cup" community prediction — one pick
--  per browser session (the same anonymous `session_key` used by Reviews).
--  Picking again overwrites your previous pick (upsert on session_key).
--
--  This powers the "Predict the Champion" card in the Predictor tab, shown
--  alongside real Kalshi market odds. Without it, supabase.from('champion_picks')
--  calls return a "relation does not exist" error and the UI falls back to
--  showing only the live Kalshi odds.
-- ============================================================================

create table if not exists public.champion_picks (
  id           uuid primary key default gen_random_uuid(),
  session_key  text not null unique,
  team_name    text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists champion_picks_team_idx
  on public.champion_picks (team_name);

-- RLS policies alone don't grant access — Postgres also requires the base
-- table privilege before a policy is even evaluated. Without this, every
-- query fails with "permission denied for table champion_picks" (42501)
-- even though the policies below look correct.
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.champion_picks to anon, authenticated;

-- Enable Row Level Security
alter table public.champion_picks enable row level security;

-- Anyone (including anon) can READ all picks — needed for the community
-- consensus bars
drop policy if exists "champion_picks_public_read" on public.champion_picks;
create policy "champion_picks_public_read"
  on public.champion_picks for select
  using (true);

-- Anyone (including anon) can INSERT their own pick
drop policy if exists "champion_picks_public_insert" on public.champion_picks;
create policy "champion_picks_public_insert"
  on public.champion_picks for insert
  with check (true);

-- Anyone can UPDATE (re-pick) — scoped to session_key by the app's upsert call
drop policy if exists "champion_picks_public_update" on public.champion_picks;
create policy "champion_picks_public_update"
  on public.champion_picks for update
  using (true)
  with check (true);

-- Enable realtime so the consensus bars update live as people pick
alter publication supabase_realtime add table public.champion_picks;
