// POST /api/create-checkout  { tier, sessionKey }  ->  { url }
// Creates a Stripe Checkout Session and returns its hosted URL.
// The browser just does `window.location = url`.

import { stripe, TIERS, resolvePrice, userFromReq } from "./_lib/stripe.js";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  // When the secret key isn't configured, fall back to the static Payment Link
  // (covers all three tiers). Entitlement won't auto-attach — the user will
  // need to contact support — but it's better than a hard error.
  if (!stripe) {
    const fallback = process.env.STRIPE_PAYMENT_LINK;
    if (fallback) { res.status(200).json({ url: fallback }); return; }
    res.status(501).json({ error: "STRIPE_SECRET_KEY not configured" });
    return;
  }

  const { tier, sessionKey } = req.body || {};
  const conf = TIERS[tier];
  if (!conf) { res.status(400).json({ error: "Unknown tier" }); return; }
  if (!sessionKey) { res.status(400).json({ error: "Missing sessionKey" }); return; }

  const price = await resolvePrice(tier);
  if (!price) { res.status(501).json({ error: `Price ID for "${tier}" not configured` }); return; }

  // If signed in, bind the purchase to the account too (cross-device access).
  const user = await userFromReq(req);
  const meta = { sessionKey, tier, ...(user ? { userId: user.id } : {}) };

  // Build absolute URLs back to the app from the incoming request.
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const origin = `${proto}://${host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: conf.mode,
      line_items: [{ price, quantity: 1 }],
      // Tie the purchase back to this browser's anonymous identity.
      client_reference_id: sessionKey,
      metadata: meta,
      // Prefill the email + reuse the customer when we know the account.
      ...(user?.email ? { customer_email: user.email } : {}),
      // For subscriptions, copy metadata onto the subscription object too.
      ...(conf.mode === "subscription"
        ? { subscription_data: { metadata: meta } }
        : {}),
      allow_promotion_codes: true,
      success_url: `${origin}/?checkout=success&tier=${tier}`,
      cancel_url: `${origin}/?checkout=cancel`,
    });
    res.status(200).json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}