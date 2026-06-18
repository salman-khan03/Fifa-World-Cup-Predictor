// POST /api/stripe-webhook  — Stripe event receiver.
// Verifies the signature, then upserts the subscriptions table so the app
// knows who is Pro. Configure this URL + signing secret in the Stripe Dashboard
// (Developers → Webhooks). Send: checkout.session.completed,
// customer.subscription.updated, customer.subscription.deleted.

import { stripe, admin } from "./_lib/stripe.js";

// Stripe requires the RAW request body to verify the signature, so turn off
// Vercel's automatic JSON body parsing for this route.
export const config = { api: { bodyParser: false } };

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", c => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function upsert(row) {
  if (!admin) return;
  // onConflict on (session_key, tier) — idempotent across retries.
  await admin.from("subscriptions").upsert(row, { onConflict: "session_key,tier" });
}

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (!stripe) { res.status(501).json({ error: "Stripe not configured" }); return; }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    const raw = await readRaw(req);
    event = stripe.webhooks.constructEvent(raw, req.headers["stripe-signature"], secret);
  } catch (err) {
    res.status(400).json({ error: `Signature verification failed: ${err.message}` });
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        const sessionKey = s.client_reference_id || s.metadata?.sessionKey;
        const tier = s.metadata?.tier;
        if (!sessionKey || !tier) break;

        let periodEnd = null;
        let stripeSubId = null;
        if (s.mode === "subscription" && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(s.subscription);
          stripeSubId = sub.id;
          periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        }
        await upsert({
          session_key: sessionKey,
          user_id: s.metadata?.userId || null,
          email: s.customer_details?.email || null,
          tier,
          status: "active",
          stripe_customer_id: s.customer || null,
          stripe_subscription_id: stripeSubId,
          current_period_end: periodEnd,
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const sessionKey = sub.metadata?.sessionKey;
        const tier = sub.metadata?.tier || "pro_monthly";
        if (!sessionKey) break;
        const active = sub.status === "active" || sub.status === "trialing";
        await upsert({
          session_key: sessionKey,
          user_id: sub.metadata?.userId || null,
          tier,
          status: active ? "active" : "canceled",
          stripe_customer_id: sub.customer || null,
          stripe_subscription_id: sub.id,
          current_period_end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000).toISOString() : null,
        });
        break;
      }

      default:
        break; // ignore other events
    }
    res.status(200).json({ received: true });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}