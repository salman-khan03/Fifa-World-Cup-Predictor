// /api/player-search?q=messi  ->  { source, players: [...] }
//
// Wraps RapidAPI "free-api-live-football-data" player search so the key never
// reaches the browser. Powers a player lookup (e.g. for the Avatar tab or MOTM
// picker) with real player names/photos instead of placeholders.
//
// Free tier: 100 req/day on the Basic plan. Cached 5 min server-side to stretch it.

export default async function handler(req, res) {
  const key = process.env.RAPIDAPI_KEY;
  const q = String(req.query?.q || req.query?.search || "").trim();

  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  if (!q) {
    res.status(400).json({ error: "Missing ?q= search term" });
    return;
  }
  if (!key) {
    // Graceful fallback — app stays functional, just without real player data.
    res.status(200).json({ source: "unconfigured", players: [] });
    return;
  }

  try {
    const r = await fetch(
      `https://free-api-live-football-data.p.rapidapi.com/football-players-search?search=${encodeURIComponent(q)}`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": key,
          "x-rapidapi-host": "free-api-live-football-data.p.rapidapi.com",
        },
      }
    );
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const data = await r.json();
    res.status(200).json({ source: "rapidapi", players: data?.response ?? data ?? [] });
  } catch (err) {
    res.status(200).json({ source: "error-fallback", error: String(err), players: [] });
  }
}
