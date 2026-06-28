// /api/possession — scrapes fbref.com for per-match possession data
// Returns: { matches: { "Home|Away": { home: 55, away: 45 } } }
// Edge-cached for 1 hour; stale-while-revalidate for 24 hours.
// Fetches the 20 most recent completed match reports to stay within
// Vercel's 10-second execution limit.

const FBREF_SCHEDULE = "https://fbref.com/en/comps/1/schedule/World-Cup-Scores-and-Fixtures";
const FBREF_BASE = "https://fbref.com";
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Referer": "https://fbref.com/en/comps/1/World-Cup-Stats",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "same-origin",
};

// fbref team name → app team name (based on actual fbref 2026 WC data)
const FBREF_NAME_MAP = {
  "United States":           "USA",
  "Korea Republic":          "South Korea",
  "IR Iran":                 "Iran",
  "Côte d'Ivoire":           "Ivory Coast",
  "Bosnia and Herzegovina":  "Bosnia",
  "Bosnia & Herz.":          "Bosnia",
  "Turkey":                  "Türkiye",
  "Czech Republic":          "Czechia",
  "Cape Verde Islands":      "Cape Verde",
  "Cabo Verde":              "Cape Verde",
  "Congo DR":                "DR Congo",
};
const norm = n => FBREF_NAME_MAP[n?.trim()] || n?.trim() || "";

// ── Schedule parsing ──────────────────────────────────────────────────────────
// Extracts completed match rows from the fbref schedule table.
// Returns array of { home, away, reportUrl } for matches with a score.
function parseSchedule(html) {
  // fbref schedule table id is typically "sched_all"
  const tableStart = html.indexOf('id="sched_all"');
  if (tableStart === -1) return [];
  const tableEnd = html.indexOf("</table>", tableStart);
  if (tableEnd === -1) return [];
  const table = html.slice(tableStart, tableEnd + 8);

  const rows = [];
  const rowRe = /<tr[\s\S]*?<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowRe.exec(table)) !== null) {
    const row = rowMatch[0];

    // Skip header rows
    if (row.includes("<th ") && !row.includes('data-stat="home_team"')) continue;

    // Home team: <td data-stat="home_team"...><a ...>Name</a></td>
    const homeMatch = row.match(/data-stat="home_team"[^>]*>(?:<[^>]+>)*([^<]+)/);
    const awayMatch = row.match(/data-stat="away_team"[^>]*>(?:<[^>]+>)*([^<]+)/);

    // Score cell has an <a> link to the match report when a result is available
    const scoreMatch = row.match(/data-stat="score"[^>]*>[\s\S]*?<a\s+href="(\/en\/matches\/[a-zA-Z0-9/_-]+)"[^>]*>([^<]+)<\/a>/);

    if (!homeMatch || !awayMatch || !scoreMatch) continue;

    const home = norm(homeMatch[1]);
    const away = norm(awayMatch[1]);
    const reportPath = scoreMatch[1];
    const scoreText = scoreMatch[2].trim();

    // Only include finished matches (score has digits like "2–0")
    if (!home || !away || !/\d/.test(scoreText)) continue;

    rows.push({ home, away, reportPath });
  }

  return rows;
}

// ── Match report possession parsing ──────────────────────────────────────────
// fbref match report pages include a #team_stats div with a Possession row.
// The row renders two percentage bars — each as text inside the bar div.
// Example HTML:
//   <div id="team_stats">...<tr>...<td>Possession</td>
//     <td><div style="width:55.0%">55%</div>...</td>
//     <td><div style="width:45.0%">45%</div>...</td>
//   </tr>...</div>
function parsePossession(html) {
  // Find the team_stats section
  const statsStart = html.indexOf('id="team_stats"');
  if (statsStart === -1) return null;

  // Take a generous window (12 000 chars) to cover the full table
  const section = html.slice(statsStart, statsStart + 12000);

  // Find the "Possession" label anywhere in the section
  const possIdx = section.indexOf("Possession");
  if (possIdx === -1) return null;

  // Look in the 2 000 chars following "Possession" for two percentages
  const after = section.slice(possIdx, possIdx + 2000);

  // fbref renders each percentage as NN% (1-2 digits)
  const allPct = [...after.matchAll(/(\d{1,2})%/g)].map(m => parseInt(m[1]));
  if (allPct.length < 2) return null;

  // The first two matches are home and away possession
  const home = allPct[0];
  const away = allPct[1];

  // Sanity-check: they should add up to ~100
  if (home + away < 90 || home + away > 110) return null;

  return { home, away };
}

async function fetchText(url) {
  const r = await fetch(url, { headers: BROWSER_HEADERS });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    const schedHtml = await fetchText(FBREF_SCHEDULE);
    const matches = parseSchedule(schedHtml);

    if (!matches.length) {
      return res.status(200).json({ matches: {}, note: "schedule parsed but no completed matches found" });
    }

    // Take the 20 most recent completed matches to stay within Vercel's 10s limit.
    // Older match possession data is stable — the cache covers gaps between calls.
    const toFetch = matches.slice(-20);

    const results = await Promise.allSettled(
      toFetch.map(m =>
        fetchText(FBREF_BASE + m.reportPath)
          .then(html => ({ ...m, poss: parsePossession(html) }))
          .catch(() => ({ ...m, poss: null }))
      )
    );

    const possMap = {};
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { home, away, poss } = result.value;
      if (poss) possMap[`${home}|${away}`] = poss;
    }

    res.status(200).json({
      matches: possMap,
      fetched: toFetch.length,
      parsed: Object.keys(possMap).length,
    });
  } catch (err) {
    res.status(200).json({ matches: {}, error: String(err) });
  }
}
