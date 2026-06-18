-- ============================================================================
--  Stripe subscriptions / entitlements table
--  Run this in the Supabase SQL editor (Dashboard → SQL → New query → Run).
--
--  Entitlements are keyed by the app's anonymous `session_key` (the same UUID
--  stored in localStorage that the reviews feature uses). Stripe Checkout also
--  collects the buyer's email, stored here for support / manual recovery.
--
--  RLS is ON with NO public policies: only the service-role key (used by the
--  serverless functions in /api) may read or write. The browser never touches
--  this table directly — it asks /api/entitlement instead.
-- ============================================================================

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  session_key            text not null,
  email                  text,
  tier                   text not null,                      -- 'pro_monthly' | 'tournament' | 'founder'
  status                 text not null default 'active',     -- 'active' | 'canceled' | 'past_due' | 'incomplete'
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,                        -- for recurring; null for one-time passes
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_session_key_idx
  on public.subscriptions (session_key);

-- One row per (session_key, tier) so webhooks can upsert idempotently.
create unique index if not exists subscriptions_session_tier_uidx
  on public.subscriptions (session_key, tier);

-- Lock the table down — service role bypasses RLS, everyone else is denied.
alter table public.subscriptions enable row level security;

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();