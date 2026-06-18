-- ============================================================================
--  Migration: link entitlements to authenticated users (cross-device access)
--  Run AFTER subscriptions.sql, in the Supabase SQL editor.
--
--  Adds a nullable user_id. Purchases made while logged out still attach to the
--  anonymous session_key; once a user signs in we "claim" those rows by stamping
--  their user_id (see /api/claim). Entitlement is granted if EITHER the
--  session_key OR the user_id matches an active row.
-- ============================================================================

alter table public.subscriptions
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists subscriptions_user_id_idx
  on public.subscriptions (user_id);