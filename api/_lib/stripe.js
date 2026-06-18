// Shared server-side helpers for the Stripe flow (Vercel serverless, ESM).
// NOTE: everything here runs on the server only — never imported by the browser.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" })
  : null;

// Service-role Supabase client — bypasses RLS so we can read/write subscriptions.
export const admin = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  : null;

// Maps a tier key (sent by the browser) → its Stripe Price ID + checkout mode.
// Price IDs live in env vars so they are never shipped to the client.
export const TIERS = {
  pro_monthly: { mode: "subscription", price: () => process.env.STRIPE_PRICE_PRO_MONTHLY, label: "Pro Monthly" },
  tournament:  { mode: "payment",      price: () => process.env.STRIPE_PRICE_TOURNAMENT,  label: "Tournament Pass" },
  founder:     { mode: "payment",      price: () => process.env.STRIPE_PRICE_FOUNDER,     label: "Founder's Pass" },
};

// Resolve the Supabase auth user from a request's Bearer token (or null).
// Used so entitlements can be tied to a logged-in account, not just a browser.
export async function userFromReq(req) {
  if (!admin) return null;
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const { data, error } = await admin.auth.getUser(token);
    if (error) return null;
    return data?.user || null;
  } catch {
    return null;
  }
}

// Is a subscription row currently entitling the user to Pro?
export function isRowActive(row) {
  if (!row) return false;
  if (row.status !== "active") return false;
  // Recurring tiers expire at period end; one-time passes have null period_end (never expire here).
  if (row.current_period_end && new Date(row.current_period_end) < new Date()) return false;
  return true;
}