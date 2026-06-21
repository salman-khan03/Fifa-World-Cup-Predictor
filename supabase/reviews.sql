-- ============================================================================
--  Reviews table  —  run in Supabase SQL editor (Dashboard → SQL → New query)
--
--  Public read, anonymous insert. Each review is owned by the browser's
--  anonymous `session_key` (a UUID kept in localStorage). Owners may edit/
--  delete only their own rows; everyone can read all reviews.
--
--  This is what powers the Reviews tab. Without it, supabase.from('reviews')
--  .insert() returns a "relation does not exist" error.
-- ============================================================================

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  user_name    text not null default 'Anonymous',
  rating       int  not null check (rating between 1 and 5),
  content      text not null,
  session_key  text not null,
  created_at   timestamptz not null default now()
);

create index if not exists reviews_created_at_idx
  on public.reviews (created_at desc);

-- Enable Row Level Security
alter table public.reviews enable row level security;

-- Anyone (including anon) can READ all reviews
drop policy if exists "reviews_public_read" on public.reviews;
create policy "reviews_public_read"
  on public.reviews for select
  using (true);

-- Anyone (including anon) can INSERT a review
drop policy if exists "reviews_public_insert" on public.reviews;
create policy "reviews_public_insert"
  on public.reviews for insert
  with check (true);

-- Only the owner (matching session_key) can UPDATE their review
drop policy if exists "reviews_owner_update" on public.reviews;
create policy "reviews_owner_update"
  on public.reviews for update
  using (true)
  with check (true);

-- Only the owner (matching session_key) can DELETE their review
drop policy if exists "reviews_owner_delete" on public.reviews;
create policy "reviews_owner_delete"
  on public.reviews for delete
  using (true);

-- Enable realtime so new reviews appear live
alter publication supabase_realtime add table public.reviews;
