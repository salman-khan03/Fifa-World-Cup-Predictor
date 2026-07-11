// /api/kalshi — proxies Kalshi's public prediction-market API (no auth required)
// GET -> { status: {tradingActive, exchangeActive}, winnerOdds: { "Spain": 0.14, ... } }
// winnerOdds are implied probabilities (mid of yes bid/ask) from the
// "2026 FIFA World Cup Winner" market, keyed by our app's team names.
// Edge-cached for 5 minutes since Kalshi prices move throughout the day.

const BASE = "https://external-api.kalshi.com/trade-api/v2";
const WINNER_EVENT = "KXMENWORLDCUP-26";

// Kalshi team name -> app team name, where they differ
const NAME_MAP = {
  "Turkey": "Türkiye",
  "Bosnia and Herzegovina": "Bosnia",
  "Congo DR": "DR Congo",
  "Curacao": "Curaçao",
};
const norm = n => NAME_MAP[n] || n;

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=1800");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const out = { status: null, winnerOdds: {}, error: null };

  try {
    const status = await getJSON(`${BASE}/exchange/status`);
    out.status = {
      exchangeActive: !!status.exchange_active,
      tradingActive: !!status.trading_active,
    };
  } catch (err) {
    out.error = `status: ${String(err)}`;
  }

  try {
    const data = await getJSON(`${BASE}/markets?event_ticker=${WINNER_EVENT}&limit=100`);
    for (const m of data.markets || []) {
      // Thin/illiquid contracts often show a placeholder ask of $1.00 (no real
      // seller), which would skew a bid/ask midpoint toward 50%. The last
      // traded price is the more honest signal for these; fall back to the
      // bid/ask mid only when there's no trade history at all.
      const last = parseFloat(m.last_price_dollars ?? "");
      let odds;
      if (!Number.isNaN(last) && m.last_price_dollars != null) {
        odds = last;
      } else {
        const bid = parseFloat(m.yes_bid_dollars || 0);
        const ask = parseFloat(m.yes_ask_dollars || 0);
        odds = (bid + ask) / 2;
      }
      if (m.yes_sub_title) out.winnerOdds[norm(m.yes_sub_title)] = +odds.toFixed(4);
    }
  } catch (err) {
    out.error = (out.error ? out.error + "; " : "") + `winnerOdds: ${String(err)}`;
  }

  res.status(200).json(out);
}
