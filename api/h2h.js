// /api/h2h?home=Argentina&away=Brazil
//  -> { home, away, record: { home, draw, away }, matches: [{ date, home, away, score, competition }] }
//
// Wraps api-football (api-sports.io) so API_FOOTBALL_KEY never reaches the
// browser. Two calls chained: /teams?name= to resolve each team's id, then
// /fixtures/headtohead?h2h=id1-id2 for the full history. Both endpoints are
// available on the free plan (unlike /fixtures for the 2026 season — see
// api/squad.js for that same free-plan quirk).
//
// Caches aggressively (server-instance memory) since head-to-head history
// between two national teams basically never changes and the free plan is
// capped at 100 req/day.

const TEAM_ID_CACHE = new Map(); // name -> id, no TTL — ids are permanent
const H2H_CACHE = new Map();     // "id1-id2" -> { at, data }
const H2H_TTL_MS = 24 * 60 * 60 * 1000; // 24h

async function getJSON(url, key) {
  const r = await fetch(url, { headers: { "x-apisports-key": key } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function resolveTeamId(name, key) {
  if (TEAM_ID_CACHE.has(name)) return TEAM_ID_CACHE.get(name);
  const res = await getJSON(`https://v3.football.api-sports.io/teams?name=${encodeURIComponent(name)}`, key);
  const id = res.response?.[0]?.team?.id;
  if (id) TEAM_ID_CACHE.set(name, id);
  return id;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=43200");

  const home = String(req.query?.home || "").trim();
  const away = String(req.query?.away || "").trim();
  if (!home || !away) { res.status(400).json({ error: "Missing ?home= and ?away= team names" }); return; }

  const key = process.env.API_FOOTBALL_KEY;
  if (!key) { res.status(200).json({ home, away, record: null, matches: [], error: "API_FOOTBALL_KEY not configured" }); return; }

  try {
    const [homeId, awayId] = await Promise.all([resolveTeamId(home, key), resolveTeamId(away, key)]);
    if (!homeId || !awayId) throw new Error("could not resolve one or both team ids");

    const pairKey = [homeId, awayId].sort().join("-");
    const cached = H2H_CACHE.get(pairKey);
    let fixtures;
    if (cached && Date.now() - cached.at < H2H_TTL_MS) {
      fixtures = cached.data;
    } else {
      const h2hRes = await getJSON(`https://v3.football.api-sports.io/fixtures/headtohead?h2h=${homeId}-${awayId}`, key);
      fixtures = h2hRes.response || [];
      H2H_CACHE.set(pairKey, { at: Date.now(), data: fixtures });
    }

    const played = fixtures.filter(f => f.fixture?.status?.short === "FT");
    const record = { home: 0, draw: 0, away: 0 };
    const matches = played
      .sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date))
      .map(f => {
        const h = f.teams.home, a = f.teams.away;
        const gh = f.goals.home, ga = f.goals.away;
        // Tally relative to THIS request's home/away, not the historical fixture's home/away
        const winnerIsOurHome = (h.id === homeId && gh > ga) || (a.id === homeId && ga > gh);
        const winnerIsOurAway = (h.id === awayId && gh > ga) || (a.id === awayId && ga > gh);
        if (gh === ga) record.draw++;
        else if (winnerIsOurHome) record.home++;
        else if (winnerIsOurAway) record.away++;

        return {
          date: f.fixture.date,
          home: h.name, away: a.name,
          score: `${gh}-${ga}`,
          competition: f.league?.name || "",
        };
      })
      .slice(0, 10);

    res.status(200).json({ home, away, record, matches });
  } catch (err) {
    res.status(200).json({ home, away, record: null, matches: [], error: String(err) });
  }
}
