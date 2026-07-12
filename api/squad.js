// /api/squad?team=Argentina  ->  { team, players: [{ name, age, number, position, photo }] }
//
// Wraps api-football (api-sports.io) so API_FOOTBALL_KEY never reaches the browser.
// Two calls chained: /teams?name= to resolve the national-team id, then
// /players/squads?team= for the roster. Both endpoints are available on the
// free plan (unlike /fixtures, /standings, /players/topscorers for the 2026
// season, which the free plan blocks) — see api/fixtures.js for that fallback.
//
// In-memory cache (per serverless instance) since the 48 WC26 teams' squads
// barely change match to match and the free plan is capped at 100 req/day.

const CACHE = new Map(); // name -> { at, data }
const TTL_MS = 6 * 60 * 60 * 1000; // 6h

async function getJSON(url, key) {
  const r = await fetch(url, { headers: { "x-apisports-key": key } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=21600");

  const team = String(req.query?.team || "").trim();
  if (!team) { res.status(400).json({ error: "Missing ?team= name" }); return; }

  const key = process.env.API_FOOTBALL_KEY;
  if (!key) { res.status(200).json({ team, players: [], error: "API_FOOTBALL_KEY not configured" }); return; }

  const cached = CACHE.get(team);
  if (cached && Date.now() - cached.at < TTL_MS) { res.status(200).json(cached.data); return; }

  try {
    const teamsRes = await getJSON(`https://v3.football.api-sports.io/teams?name=${encodeURIComponent(team)}`, key);
    const teamId = teamsRes.response?.[0]?.team?.id;
    if (!teamId) throw new Error("team not found");

    const squadRes = await getJSON(`https://v3.football.api-sports.io/players/squads?team=${teamId}`, key);
    const players = (squadRes.response?.[0]?.players || []).map(p => ({
      name: p.name, age: p.age, number: p.number, position: p.position, photo: p.photo,
    }));

    const data = { team, players };
    CACHE.set(team, { at: Date.now(), data });
    res.status(200).json(data);
  } catch (err) {
    res.status(200).json({ team, players: [], error: String(err) });
  }
}
