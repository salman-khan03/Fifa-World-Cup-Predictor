// POST /api/portal  { sessionKey }  ->  { url }
// Opens the Stripe Customer Portal so a subscriber can update/cancel their plan.

import { stripe, admin, userFromReq } from "./_lib/stripe.js";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (!stripe || !admin) { res.status(501).json({ error: "Stripe/Supabase not configured" }); return; }

  const { sessionKey } = req.body || {};
  const user = await userFromReq(req);
  if (!sessionKey && !user) { res.status(400).json({ error: "Missing sessionKey" }); return; }

  try {
    const ors = [];
    if (sessionKey) ors.push(`session_key.eq.${sessionKey}`);
    if (user) ors.push(`user_id.eq.${user.id}`);
    const { data } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .or(ors.join(","))
      .not("stripe_customer_id", "is", null)
      .limit(1);

    const customer = data?.[0]?.stripe_customer_id;
    if (!customer) { res.status(404).json({ error: "No Stripe customer for this session" }); return; }

    const proto = req.headers["x-forwarded-proto"] || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const portal = await stripe.billingPortal.sessions.create({
      customer,
      return_url: `${proto}://${host}/?tab=pricing`,
    });
    res.status(200).json({ url: portal.url });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}