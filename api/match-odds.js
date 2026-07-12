// /api/match-odds?home=Argentina&away=Brazil
//  -> { found, eventTicker, marketUrl, status, odds: { home, draw, away } }
//
// Proxies Kalshi's public "World Cup Game" (KXWCGAME) series — real
// head-to-head moneyline markets per match ("England vs Argentina Winner?"),
// distinct from api/kalshi.js's tournament-winner market. No auth required.
//
// Kalshi opens one event per fixture, named after the two team's Kalshi
// display names (not always identical to our app's team names — e.g. "IR
// Iran" vs our "Iran"). Rather than reconstruct ticker codes (which use a
// different 3-letter convention for a few teams, e.g. Algeria is ALG in our
// app but DZA on Kalshi), we fetch the full event list and match by name —
// more robust, and cheap since the whole tournament is ~100 events.

const BASE = "https://external-api.kalshi.com/trade-api/v2";
const SERIES = "KXWCGAME";

// our app's team name -> Kalshi's display name, where they differ
const TO_KALSHI_NAME = {
  "Iran": "IR Iran",
  "Türkiye": "Turkiye",
  "South Korea": "Korea Republic",
  "Curaçao": "Curacao",
  "Bosnia": "Bosnia and Herzegovina",
  "DR Congo": "Congo DR",
};
const toKalshiName = n => TO_KALSHI_NAME[n] || n;

let eventsCache = { at: 0, events: [] };
const EVENTS_TTL_MS = 30 * 60 * 1000; // 30 min — new events appear as the tournament progresses

async function getJSON(url) {
  const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function getAllEvents() {
  if (Date.now() - eventsCache.at < EVENTS_TTL_MS && eventsCache.events.length) return eventsCache.events;
  const events = [];
  let cursor = "";
  for (let i = 0; i < 5; i++) { // series is ~100 events; a few pages is plenty
    const url = `${BASE}/events?series_ticker=${SERIES}&limit=200${cursor ? `&cursor=${cursor}` : ""}`;
    const data = await getJSON(url);
    events.push(...(data.events || []));
    if (!data.cursor) break;
    cursor = data.cursor;
  }
  eventsCache = { at: Date.now(), events };
  return events;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=120, stale-while-revalidate=600");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const home = String(req.query?.home || "").trim();
  const away = String(req.query?.away || "").trim();
  if (!home || !away) { res.status(400).json({ error: "Missing ?home= and ?away= team names" }); return; }

  const kHome = toKalshiName(home);
  const kAway = toKalshiName(away);

  try {
    const events = await getAllEvents();
    const event = events.find(e => e.title?.includes(kHome) && e.title?.includes(kAway));
    if (!event) {
      res.status(200).json({ found: false, odds: null });
      return;
    }

    const marketsRes = await getJSON(`${BASE}/markets?event_ticker=${event.event_ticker}&limit=10`);
    const markets = marketsRes.markets || [];

    const priceOf = m => {
      const last = parseFloat(m.last_price_dollars ?? "");
      if (!Number.isNaN(last) && m.last_price_dollars != null) return last;
      const bid = parseFloat(m.yes_bid_dollars || 0);
      const ask = parseFloat(m.yes_ask_dollars || 0);
      return (bid + ask) / 2;
    };

    // Kalshi's yes_sub_title format isn't consistent across events — some are
    // plain ("England"), some prefixed ("Reg Time: England") — so match by
    // substring rather than exact equality.
    const find = sub => markets.find(m => m.yes_sub_title?.toLowerCase().includes(sub.toLowerCase()));
    const homeM = find(kHome), awayM = find(kAway), tieM = find("Tie");

    res.status(200).json({
      found: true,
      eventTicker: event.event_ticker,
      marketUrl: `https://kalshi.com/markets/${SERIES.toLowerCase()}/world-cup-game/${event.event_ticker.toLowerCase()}`,
      status: markets[0]?.status || null,
      odds: {
        home: homeM ? +priceOf(homeM).toFixed(4) : null,
        draw: tieM ? +priceOf(tieM).toFixed(4) : null,
        away: awayM ? +priceOf(awayM).toFixed(4) : null,
      },
    });
  } catch (err) {
    res.status(200).json({ found: false, odds: null, error: String(err) });
  }
}
