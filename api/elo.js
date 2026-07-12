// /api/elo — proxies eloratings.net's public World Football Elo Ratings feed
// (no auth required; same feed that powers eloratings.net's own table).
// GET -> { updated: "2026-...", ratings: { "Spain": 2190, "France": 2163, ... } }
// Ratings are keyed by our app's team names, values are live Elo points
// (roughly 1000-2200 scale) — the frontend rescales these onto its own
// 0-100 rating band. Edge-cached for an hour since Elo only moves after
// full-time results.

const WORLD_TSV = "https://eloratings.net/World.tsv";

// eloratings.net 2-letter code -> our app's team name
const CODE_MAP = {
  ES: "Spain", FR: "France", AR: "Argentina", EN: "England", BR: "Brazil",
  PT: "Portugal", DE: "Germany", NL: "Netherlands", BE: "Belgium", HR: "Croatia",
  UY: "Uruguay", CO: "Colombia", MA: "Morocco", SN: "Senegal", NO: "Norway",
  CH: "Switzerland", US: "USA", JP: "Japan", MX: "Mexico", EC: "Ecuador",
  AT: "Austria", SE: "Sweden", CA: "Canada", KR: "South Korea", TR: "Türkiye",
  CI: "Ivory Coast", IR: "Iran", EG: "Egypt", DZ: "Algeria", AU: "Australia",
  SQ: "Scotland", CZ: "Czechia", GH: "Ghana", BA: "Bosnia", PY: "Paraguay",
  TN: "Tunisia", SA: "Saudi Arabia", QA: "Qatar", PA: "Panama", UZ: "Uzbekistan",
  CD: "DR Congo", IQ: "Iraq", ZA: "South Africa", JO: "Jordan", NZ: "New Zealand",
  CV: "Cape Verde", HT: "Haiti", CW: "Curaçao",
};

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=21600");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const r = await fetch(WORLD_TSV, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const text = await r.text();

    const ratings = {};
    for (const line of text.split("\n")) {
      const cols = line.split("\t");
      const code = cols[2];
      const rating = parseFloat(cols[3]);
      const name = CODE_MAP[code];
      if (name && Number.isFinite(rating)) ratings[name] = rating;
    }

    res.status(200).json({ updated: new Date().toISOString(), ratings });
  } catch (err) {
    res.status(200).json({ updated: null, ratings: {}, error: String(err) });
  }
}
