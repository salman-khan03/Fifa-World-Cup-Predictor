// GET /api/entitlement?key=<sessionKey>
//   -> { pro: boolean, tier: string|null, status: string|null, current_period_end: string|null }
// The browser calls this to find out if it has paid. Reads with the service
// role so the subscriptions table can stay fully locked behind RLS.

import { admin, isRowActive, userFromReq } from "./_lib/stripe.js";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.status(405).json({ error: "GET only" }); return; }

  const key = req.query.key;

  // If Supabase isn't configured, fail open as "not pro" (app stays usable, free tier).
  if (!admin) { res.status(200).json({ pro: false, tier: null, status: null, current_period_end: null }); return; }

  // Entitlement is granted if EITHER the browser session_key OR the logged-in
  // user_id matches an active row — so access follows the account across devices.
  const user = await userFromReq(req);
  if (!key && !user) { res.status(400).json({ error: "Missing key" }); return; }

  try {
    const ors = [];
    if (key) ors.push(`session_key.eq.${key}`);
    if (user) ors.push(`user_id.eq.${user.id}`);
    const { data, error } = await admin
      .from("subscriptions")
      .select("tier,status,current_period_end")
      .or(ors.join(","));
    if (error) throw error;

    const active = (data || []).find(isRowActive);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      pro: !!active,
      tier: active?.tier || null,
      status: active?.status || null,
      current_period_end: active?.current_period_end || null,
    });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}