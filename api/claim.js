// POST /api/claim  { sessionKey }   (Authorization: Bearer <supabase access token>)
// When a user signs in, link any purchases made anonymously on this browser
// (matched by session_key, user_id still null) to their account so they carry
// across devices.

import { admin, userFromReq } from "./_lib/stripe.js";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "POST only" }); return; }
  if (!admin) { res.status(501).json({ error: "Supabase not configured" }); return; }

  const user = await userFromReq(req);
  if (!user) { res.status(401).json({ error: "Not authenticated" }); return; }

  const { sessionKey } = req.body || {};
  if (!sessionKey) { res.status(400).json({ error: "Missing sessionKey" }); return; }

  try {
    const { data, error } = await admin
      .from("subscriptions")
      .update({ user_id: user.id })
      .eq("session_key", sessionKey)
      .is("user_id", null)
      .select("id");
    if (error) throw error;
    res.status(200).json({ claimed: data?.length || 0 });
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}