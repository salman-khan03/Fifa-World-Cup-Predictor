import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { supabase, isSupabaseConfigured } from './supabase.js';

/* =========================================================================
   WORLD CUP PREDICTOR — FIFA World Cup 2026
   Self-contained: works offline with seeded data, upgrades to live /api/*.
   Engine: rating-driven bivariate Poisson + live Elo update.

   NOTE FOR DEPLOYMENT: index.html must include:
   <meta name="viewport" content="width=device-width, initial-scale=1">
   for proper mobile scaling on iOS and Android.
   ========================================================================= */

// Palette references CSS variables so a single [data-theme] swap re-themes the
// whole app instantly — no need to touch the 400+ C.* usage sites. Dark + light
// variable sets are defined in GLOBAL_STYLES below.
const C = {
  bg:         "var(--c-bg)",
  panel:      "var(--c-panel)",
  panel2:     "var(--c-panel2)",
  panelGlass: "var(--c-panelGlass)",
  line:       "var(--c-line)",
  lineHover:  "var(--c-lineHover)",
  text:       "var(--c-text)",
  dim:        "var(--c-dim)",
  dimMid:     "var(--c-dimMid)",
  gold:       "var(--c-gold)",
  goldDim:    "var(--c-goldDim)",
  goldGlow:   "var(--c-goldGlow)",
  red:        "var(--c-red)",
  redGlow:    "var(--c-redGlow)",
  green:      "var(--c-green)",
  greenGlow:  "var(--c-greenGlow)",
  blue:       "var(--c-blue)",
  blueGlow:   "var(--c-blueGlow)",
  grad:       "var(--c-grad)",
  gradGlow:   "var(--c-gradGlow)",
};

/* ── helpers ──────────────────────────────────────────────────────────── */

const T = (name, code, rating, conf, host = false) => ({ name, code, rating, conf, host });
const TEAMS = [
  T("Spain", "ESP", 91, "UEFA"), T("France", "FRA", 90, "UEFA"), T("Argentina", "ARG", 89, "CONMEBOL"),
  T("England", "ENG", 88, "UEFA"), T("Brazil", "BRA", 88, "CONMEBOL"), T("Portugal", "POR", 86, "UEFA"),
  T("Germany", "GER", 85, "UEFA"), T("Netherlands", "NED", 84, "UEFA"), T("Belgium", "BEL", 82, "UEFA"),
  T("Croatia", "CRO", 80, "UEFA"), T("Uruguay", "URU", 80, "CONMEBOL"), T("Colombia", "COL", 80, "CONMEBOL"),
  T("Morocco", "MAR", 79, "CAF"), T("Senegal", "SEN", 78, "CAF"), T("Norway", "NOR", 78, "UEFA"),
  T("Switzerland", "SUI", 78, "UEFA"), T("USA", "USA", 77, "CONCACAF", true), T("Japan", "JPN", 77, "AFC"),
  T("Mexico", "MEX", 76, "CONCACAF", true), T("Ecuador", "ECU", 76, "CONMEBOL"), T("Austria", "AUT", 75, "UEFA"),
  T("Sweden", "SWE", 75, "UEFA"), T("Canada", "CAN", 74, "CONCACAF", true), T("South Korea", "KOR", 74, "AFC"),
  T("Türkiye", "TUR", 74, "UEFA"), T("Ivory Coast", "CIV", 74, "CAF"), T("Iran", "IRN", 73, "AFC"),
  T("Egypt", "EGY", 73, "CAF"), T("Algeria", "ALG", 73, "CAF"), T("Australia", "AUS", 72, "AFC"),
  T("Scotland", "SCO", 72, "UEFA"), T("Czechia", "CZE", 72, "UEFA"), T("Ghana", "GHA", 72, "CAF"),
  T("Bosnia", "BIH", 71, "UEFA"), T("Paraguay", "PAR", 71, "CONMEBOL"), T("Tunisia", "TUN", 71, "CAF"),
  T("Saudi Arabia", "KSA", 70, "AFC"), T("Qatar", "QAT", 69, "AFC"), T("Panama", "PAN", 68, "CONCACAF"),
  T("Uzbekistan", "UZB", 68, "AFC"), T("DR Congo", "COD", 68, "CAF"), T("Iraq", "IRQ", 67, "AFC"),
  T("South Africa", "RSA", 66, "CAF"), T("Jordan", "JOR", 66, "AFC"), T("New Zealand", "NZL", 64, "OFC"),
  T("Cape Verde", "CPV", 64, "CAF"), T("Haiti", "HAI", 63, "CONCACAF"), T("Curaçao", "CUW", 62, "CONCACAF"),
];
const byName = Object.fromEntries(TEAMS.map(t => [t.name, t]));

// Maps our 3-letter team code → flagcdn.com ISO2 code
const FLAG_ISO = {
  ESP:"es", FRA:"fr", ARG:"ar", ENG:"gb-eng", BRA:"br", POR:"pt", GER:"de",
  NED:"nl", BEL:"be", CRO:"hr", URU:"uy", COL:"co", MAR:"ma", SEN:"sn",
  NOR:"no", SUI:"ch", USA:"us", JPN:"jp", MEX:"mx", ECU:"ec", AUT:"at",
  SWE:"se", CAN:"ca", KOR:"kr", TUR:"tr", CIV:"ci", IRN:"ir", EGY:"eg",
  ALG:"dz", AUS:"au", SCO:"gb-sct", CZE:"cz", GHA:"gh", BIH:"ba", PAR:"py",
  TUN:"tn", KSA:"sa", QAT:"qa", PAN:"pa", UZB:"uz", COD:"cd", IRQ:"iq",
  RSA:"za", JOR:"jo", NZL:"nz", CPV:"cv", HAI:"ht", CUW:"cw",
};
// Keep FLAGS as alias so dropdown options still work
const FLAGS = Object.fromEntries(Object.entries(FLAG_ISO).map(([k,v]) => [k, v]));

// StatsBomb WC2022 name → our app name
const SB_NAME_MAP = {
  "United States": "USA", "Korea Republic": "South Korea", "IR Iran": "Iran",
  "Côte d'Ivoire": "Ivory Coast", "Serbia": "Serbia", "Wales": "Wales",
  "Saudi Arabia": "Saudi Arabia", "Costa Rica": "Costa Rica",
  "Ecuador": "Ecuador", "Ghana": "Ghana", "Cameroon": "Cameroon",
  "Tunisia": "Tunisia", "Australia": "Australia", "Japan": "Japan",
};
const toAppName = n => SB_NAME_MAP[n] || n;

// ESPN / worldcup26 team name → our app name
const ESPN_NAME_MAP = {
  "United States": "USA", "Turkey": "Türkiye", "Czech Republic": "Czechia",
  "Bosnia and Herzegovina": "Bosnia", "Côte d'Ivoire": "Ivory Coast",
  "Korea Republic": "South Korea", "IR Iran": "Iran",
};
const toAppNameESPN = n => ESPN_NAME_MAP[n] || n;

// Format worldcup26.ir date string "06/14/2026 19:00" → "Jun 14"
function fmtWCDate(s) {
  if (!s) return "";
  const [md] = s.split(" ");
  const [mo, day] = md.split("/");
  const months = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[+mo] || ""} ${+day}`;
}

// Pollinations image helpers — work without a key (free public URLs);
// when VITE_POLLINATIONS_KEY is set, the token raises rate limits and skips the queue.
const POL_KEY = import.meta.env.VITE_POLLINATIONS_KEY;
const polTokenParam = POL_KEY && !POL_KEY.includes('placeholder') ? `&token=${encodeURIComponent(POL_KEY)}` : "";
const teamImg = team => `https://image.pollinations.ai/prompt/${encodeURIComponent(`${team} national soccer team colors abstract art`)}?width=400&height=400&nologo=true${polTokenParam}`;

// t = sort key within day (24h "HH:MM"), d = display date label
const SEED_FX = [
  // ── MD1 · Jun 11 ──────────────────────────────────────────────────────
  { g:"A", d:"Jun 11", t:"13:00", h:"Mexico",       a:"South Africa",  s:[2,0], st:"FT", v:"Estadio Banorte" },
  { g:"A", d:"Jun 11", t:"20:00", h:"South Korea",  a:"Czechia",       s:[2,1], st:"FT", v:"Estadio Akron" },
  // ── MD1 · Jun 12 ──────────────────────────────────────────────────────
  { g:"B", d:"Jun 12", t:"15:00", h:"Canada",       a:"Bosnia",        s:[1,1], st:"FT", v:"BMO Field" },
  // ── MD1 · Jun 13 ──────────────────────────────────────────────────────
  { g:"D", d:"Jun 13", t:"18:00", h:"USA",          a:"Paraguay",      s:[4,1], st:"FT", v:"SoFi Stadium" },
  { g:"B", d:"Jun 13", t:"12:00", h:"Qatar",        a:"Switzerland",   s:[1,1], st:"FT", v:"Levi's Stadium" },
  { g:"C", d:"Jun 13", t:"18:00", h:"Brazil",       a:"Morocco",       s:[1,1], st:"FT", v:"MetLife Stadium" },
  { g:"D", d:"Jun 13", t:"21:00", h:"Australia",    a:"Türkiye",       s:[2,0], st:"FT", v:"BC Place Stadium" },
  { g:"C", d:"Jun 13", t:"21:00", h:"Haiti",        a:"Scotland",      s:[0,1], st:"FT", v:"Gillette Stadium" },
  // ── MD1 · Jun 14 ──────────────────────────────────────────────────────
  { g:"E", d:"Jun 14", t:"12:00", h:"Germany",      a:"Curaçao",       s:[7,1], st:"FT", v:"Reliant Stadium" },
  { g:"F", d:"Jun 14", t:"15:00", h:"Netherlands",  a:"Japan",         s:[2,2], st:"FT", v:"AT&T Stadium" },
  { g:"E", d:"Jun 14", t:"19:00", h:"Ivory Coast",  a:"Ecuador",       s:[1,0], st:"FT", v:"Lincoln Financial Field" },
  { g:"F", d:"Jun 14", t:"20:00", h:"Sweden",       a:"Tunisia",       s:[5,1], st:"FT", v:"Estadio BBVA" },
  // ── MD1 · Jun 15 ──────────────────────────────────────────────────────
  { g:"G", d:"Jun 15", t:"12:00", h:"Belgium",      a:"Egypt",         s:[1,1], st:"FT", v:"Lumen Field" },
  { g:"H", d:"Jun 15", t:"12:00", h:"Spain",        a:"Cape Verde",    s:[0,0], st:"FT", v:"Mercedes-Benz Stadium" },
  { g:"H", d:"Jun 15", t:"18:00", h:"Saudi Arabia", a:"Uruguay",       s:[1,1], st:"FT", v:"Hard Rock Stadium" },
  { g:"G", d:"Jun 15", t:"18:00", h:"Iran",         a:"New Zealand",   s:[2,2], st:"FT", v:"SoFi Stadium" },
  // ── MD1 · Jun 16 ──────────────────────────────────────────────────────
  { g:"I", d:"Jun 16", t:"15:00", h:"France",       a:"Senegal",       s:[3,1], st:"FT", v:"MetLife Stadium" },
  { g:"I", d:"Jun 16", t:"18:00", h:"Iraq",         a:"Norway",        s:[1,4], st:"FT", v:"Gillette Stadium" },
  { g:"J", d:"Jun 16", t:"20:00", h:"Argentina",    a:"Algeria",       s:[3,0], st:"FT", v:"Arrowhead Stadium" },
  { g:"J", d:"Jun 16", t:"21:00", h:"Austria",      a:"Jordan",        s:[3,1], st:"FT", v:"Levi's Stadium" },
  // ── MD1 · Jun 17 ──────────────────────────────────────────────────────
  { g:"K", d:"Jun 17", t:"12:00", h:"Portugal",     a:"DR Congo",      s:[1,1], st:"FT", v:"Reliant Stadium" },
  { g:"L", d:"Jun 17", t:"15:00", h:"England",      a:"Croatia",       s:[4,2], st:"FT", v:"AT&T Stadium" },
  { g:"L", d:"Jun 17", t:"19:00", h:"Ghana",        a:"Panama",        s:[1,0], st:"FT", v:"BMO Field" },
  { g:"K", d:"Jun 17", t:"20:00", h:"Uzbekistan",   a:"Colombia",      s:[1,3], st:"FT", v:"Estadio Banorte" },
  // ── MD2 · Jun 18 ──────────────────────────────────────────────────────
  { g:"B", d:"Jun 18", t:"12:00", h:"Switzerland",  a:"Bosnia",        s:[4,1], st:"FT", v:"SoFi Stadium" },
  { g:"A", d:"Jun 18", t:"12:00", h:"Czechia",      a:"South Africa",  s:[1,1], st:"FT", v:"Mercedes-Benz Stadium" },
  { g:"B", d:"Jun 18", t:"15:00", h:"Canada",       a:"Qatar",         s:[6,0], st:"FT", v:"BC Place Stadium" },
  { g:"A", d:"Jun 18", t:"19:00", h:"Mexico",       a:"South Korea",   s:[1,0], st:"FT", v:"Estadio Akron" },
  // ── MD2 · Jun 19 ──────────────────────────────────────────────────────
  { g:"D", d:"Jun 19", t:"12:00", h:"USA",          a:"Australia",     s:[2,0], st:"FT", v:"Lumen Field" },
  { g:"C", d:"Jun 19", t:"18:00", h:"Scotland",     a:"Morocco",       s:[0,1], st:"FT", v:"Gillette Stadium" },
  { g:"D", d:"Jun 19", t:"20:00", h:"Türkiye",      a:"Paraguay",      s:[0,1], st:"FT", v:"Levi's Stadium" },
  { g:"C", d:"Jun 19", t:"20:30", h:"Brazil",       a:"Haiti",         s:[3,0], st:"FT", v:"Lincoln Financial Field" },
  // ── MD2 · Jun 20 ──────────────────────────────────────────────────────
  { g:"F", d:"Jun 20", t:"12:00", h:"Netherlands",  a:"Sweden",        s:[5,1], st:"FT", v:"Reliant Stadium" },
  { g:"E", d:"Jun 20", t:"16:00", h:"Germany",      a:"Ivory Coast",   s:[2,1], st:"FT", v:"BMO Field" },
  { g:"E", d:"Jun 20", t:"19:00", h:"Ecuador",      a:"Curaçao",       s:[0,0], st:"FT", v:"Arrowhead Stadium" },
  { g:"F", d:"Jun 20", t:"22:00", h:"Tunisia",      a:"Japan",         s:[0,4], st:"FT", v:"Estadio BBVA" },
  // ── MD2 · Jun 21 ──────────────────────────────────────────────────────
  { g:"G", d:"Jun 21", t:"12:00", h:"Belgium",      a:"Iran",          s:[0,0], st:"FT", v:"SoFi Stadium" },
  { g:"H", d:"Jun 21", t:"12:00", h:"Spain",        a:"Saudi Arabia",  s:[4,0], st:"FT", v:"Mercedes-Benz Stadium" },
  { g:"H", d:"Jun 21", t:"18:00", h:"Uruguay",      a:"Cape Verde",    s:[2,2], st:"FT", v:"Hard Rock Stadium" },
  { g:"G", d:"Jun 21", t:"18:00", h:"New Zealand",  a:"Egypt",         s:[1,3], st:"FT", v:"BC Place Stadium" },
  // ── MD2 · Jun 22 ──────────────────────────────────────────────────────
  { g:"J", d:"Jun 22", t:"12:00", h:"Argentina",    a:"Austria",       s:[2,0], st:"FT", v:"AT&T Stadium" },
  { g:"I", d:"Jun 22", t:"17:00", h:"France",       a:"Iraq",          s:[3,0], st:"FT", v:"Lincoln Financial Field" },
  { g:"I", d:"Jun 22", t:"20:00", h:"Norway",       a:"Senegal",       s:[3,2], st:"FT", v:"MetLife Stadium" },
  { g:"J", d:"Jun 22", t:"20:00", h:"Jordan",       a:"Algeria",       s:[1,2], st:"FT", v:"Levi's Stadium" },
  // ── MD2 · Jun 23 ──────────────────────────────────────────────────────
  { g:"K", d:"Jun 23", t:"12:00", h:"Portugal",     a:"Uzbekistan",    s:[5,0], st:"FT", v:"Reliant Stadium" },
  { g:"L", d:"Jun 23", t:"16:00", h:"England",      a:"Ghana",         s:[0,0], st:"FT", v:"Gillette Stadium" },
  { g:"L", d:"Jun 23", t:"19:00", h:"Panama",       a:"Croatia",       s:[0,1], st:"FT", v:"BMO Field" },
  { g:"K", d:"Jun 23", t:"20:00", h:"Colombia",     a:"DR Congo",      s:[1,0], st:"FT", v:"Estadio Akron" },
  // ── MD3 · Jun 24 ──────────────────────────────────────────────────────
  { g:"B", d:"Jun 24", t:"12:00", h:"Bosnia",       a:"Qatar",         s:[3,1], st:"FT", v:"Lumen Field" },
  { g:"B", d:"Jun 24", t:"12:00", h:"Switzerland",  a:"Canada",        s:[2,1], st:"FT", v:"BC Place Stadium" },
  { g:"C", d:"Jun 24", t:"18:00", h:"Morocco",      a:"Haiti",         s:[4,2], st:"FT", v:"Mercedes-Benz Stadium" },
  { g:"C", d:"Jun 24", t:"18:00", h:"Scotland",     a:"Brazil",        s:[0,3], st:"FT", v:"Hard Rock Stadium" },
  { g:"A", d:"Jun 24", t:"19:00", h:"Czechia",      a:"Mexico",        s:[0,3], st:"FT", v:"Estadio Banorte" },
  { g:"A", d:"Jun 24", t:"19:00", h:"South Africa", a:"South Korea",   s:[1,0], st:"FT", v:"Estadio BBVA" },
  // ── MD3 · Jun 25 ──────────────────────────────────────────────────────
  { g:"E", d:"Jun 25", t:"16:00", h:"Ecuador",      a:"Germany",       s:[2,1], st:"FT", v:"MetLife Stadium" },
  { g:"E", d:"Jun 25", t:"16:00", h:"Curaçao",      a:"Ivory Coast",   s:[0,2], st:"FT", v:"Lincoln Financial Field" },
  { g:"F", d:"Jun 25", t:"18:00", h:"Japan",        a:"Sweden",        s:[1,1], st:"FT", v:"AT&T Stadium" },
  { g:"F", d:"Jun 25", t:"18:00", h:"Tunisia",      a:"Netherlands",   s:[1,3], st:"FT", v:"Arrowhead Stadium" },
  { g:"D", d:"Jun 25", t:"19:00", h:"Paraguay",     a:"Australia",     s:[0,0], st:"FT", v:"Levi's Stadium" },
  { g:"D", d:"Jun 25", t:"19:00", h:"Türkiye",      a:"USA",           s:[3,2], st:"FT", v:"SoFi Stadium" },
  // ── MD3 · Jun 26 ──────────────────────────────────────────────────────
  { g:"I", d:"Jun 26", t:"15:00", h:"Norway",       a:"France",        s:[1,4], st:"FT", v:"Gillette Stadium" },
  { g:"I", d:"Jun 26", t:"15:00", h:"Senegal",      a:"Iraq",          s:[5,0], st:"FT", v:"BMO Field" },
  { g:"H", d:"Jun 26", t:"18:00", h:"Uruguay",      a:"Spain",         s:[0,1], st:"FT", v:"Estadio Akron" },
  { g:"H", d:"Jun 26", t:"19:00", h:"Cape Verde",   a:"Saudi Arabia",  s:[0,0], st:"FT", v:"Reliant Stadium" },
  { g:"G", d:"Jun 26", t:"20:00", h:"Egypt",        a:"Iran",          s:[1,1], st:"FT", v:"Lumen Field" },
  { g:"G", d:"Jun 26", t:"20:00", h:"New Zealand",  a:"Belgium",       s:[1,5], st:"FT", v:"BC Place Stadium" },
  // ── MD3 · Jun 27 ──────────────────────────────────────────────────────
  { g:"L", d:"Jun 27", t:"17:00", h:"Panama",       a:"England",       s:[0,2], st:"FT", v:"MetLife Stadium" },
  { g:"L", d:"Jun 27", t:"17:00", h:"Croatia",      a:"Ghana",         s:[2,1], st:"FT", v:"Lincoln Financial Field" },
  { g:"K", d:"Jun 27", t:"19:30", h:"DR Congo",     a:"Uzbekistan",    s:[3,1], st:"FT", v:"Mercedes-Benz Stadium" },
  { g:"K", d:"Jun 27", t:"19:30", h:"Colombia",     a:"Portugal",      s:[0,0], st:"FT", v:"Hard Rock Stadium" },
  { g:"J", d:"Jun 27", t:"21:00", h:"Algeria",      a:"Austria",       s:[3,3], st:"FT", v:"Arrowhead Stadium" },
  { g:"J", d:"Jun 27", t:"21:00", h:"Jordan",       a:"Argentina",     s:[1,3], st:"FT", v:"AT&T Stadium" },
  // ── R32 · Jun 28 ──────────────────────────────────────────────────────
  { g:"R32", d:"Jun 28", t:"12:00", h:"South Africa", a:"Canada",      st:"UP", v:"SoFi Stadium" },
  // ── R32 · Jun 29 ──────────────────────────────────────────────────────
  { g:"R32", d:"Jun 29", t:"12:00", h:"Brazil",       a:"Japan",       st:"UP", v:"Reliant Stadium" },
  { g:"R32", d:"Jun 29", t:"16:30", h:"Germany",      a:"Paraguay",    st:"UP", v:"Gillette Stadium" },
  { g:"R32", d:"Jun 29", t:"19:00", h:"Netherlands",  a:"Morocco",     st:"UP", v:"Estadio BBVA" },
  // ── R32 · Jun 30 ──────────────────────────────────────────────────────
  { g:"R32", d:"Jun 30", t:"12:00", h:"Ivory Coast",  a:"Norway",      st:"UP", v:"AT&T Stadium" },
  { g:"R32", d:"Jun 30", t:"17:00", h:"France",       a:"Sweden",      st:"UP", v:"MetLife Stadium" },
  { g:"R32", d:"Jun 30", t:"19:00", h:"Mexico",       a:"Ecuador",     st:"UP", v:"Estadio Banorte" },
  // ── R32 · Jul 1 ───────────────────────────────────────────────────────
  { g:"R32", d:"Jul 1",  t:"12:00", h:"England",      a:"DR Congo",    st:"UP", v:"Mercedes-Benz Stadium" },
  { g:"R32", d:"Jul 1",  t:"13:00", h:"Belgium",      a:"Senegal",     st:"UP", v:"Lumen Field" },
  { g:"R32", d:"Jul 1",  t:"17:00", h:"USA",          a:"Bosnia",      st:"UP", v:"Levi's Stadium" },
  // ── R32 · Jul 2 ───────────────────────────────────────────────────────
  { g:"R32", d:"Jul 2",  t:"12:00", h:"Spain",        a:"Austria",     st:"UP", v:"SoFi Stadium" },
  { g:"R32", d:"Jul 2",  t:"19:00", h:"Portugal",     a:"Croatia",     st:"UP", v:"BMO Field" },
  { g:"R32", d:"Jul 2",  t:"20:00", h:"Switzerland",  a:"Algeria",     st:"UP", v:"BC Place Stadium" },
  // ── R32 · Jul 3 ───────────────────────────────────────────────────────
  { g:"R32", d:"Jul 3",  t:"13:00", h:"Australia",    a:"Egypt",       st:"UP", v:"AT&T Stadium" },
  { g:"R32", d:"Jul 3",  t:"18:00", h:"Argentina",    a:"Cape Verde",  st:"UP", v:"Hard Rock Stadium" },
  { g:"R32", d:"Jul 3",  t:"20:30", h:"Colombia",     a:"Ghana",       st:"UP", v:"Arrowhead Stadium" },
];

const factorial = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const pois = (k, l) => Math.exp(-l) * Math.pow(l, k) / factorial(k);

function adjustedRatings(fx) {
  const r = Object.fromEntries(TEAMS.map(t => [t.name, t.rating]));
  fx.filter(f => f.st === "FT" && f.s).forEach(f => {
    if (r[f.h] == null || r[f.a] == null) return;
    const exp = 1 / (1 + Math.pow(10, (r[f.a] - r[f.h]) / 40));
    const res = f.s[0] > f.s[1] ? 1 : f.s[0] < f.s[1] ? 0 : 0.5;
    const k = 1.6 * (1 + Math.log(1 + Math.abs(f.s[0] - f.s[1])));
    r[f.h] += k * (res - exp); r[f.a] -= k * (res - exp);
  });
  return r;
}
function predict(home, away, ratings, neutral = true) {
  const H = byName[home], A = byName[away], rH = ratings[home], rA = ratings[away];
  const hostBoost = (!neutral && H.host) ? 0.18 : 0;
  const diff = (rH - rA) / 100, base = 1.38;
  const xgH = Math.max(0.15, base * Math.exp(0.95 * diff + hostBoost));
  const xgA = Math.max(0.15, base * Math.exp(-0.95 * diff - hostBoost * 0.5));
  let pW = 0, pD = 0, pL = 0; const scl = [];
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const p = pois(i, xgH) * pois(j, xgA);
    if (i > j) pW += p; else if (i === j) pD += p; else pL += p;
    scl.push({ score: `${i}-${j}`, p });
  }
  return { xgH, xgA, pW, pD, pL, top: scl.sort((a, b) => b.p - a.p).slice(0, 5), rH, rA };
}
function titleProbs(ratings) {
  const arr = TEAMS.map(t => ({ name: t.name, code: t.code, r: ratings[t.name] }));
  const max = Math.max(...arr.map(a => a.r));
  const exps = arr.map(a => ({ ...a, e: Math.exp((a.r - max) / 3.4) }));
  const sum = exps.reduce((s, a) => s + a.e, 0);
  return exps.map(a => ({ ...a, p: a.e / sum })).sort((x, y) => y.p - x.p);
}
function standings(group, fx, ratings) {
  const teams = {}; const add = n => teams[n] = teams[n] || { name: n, pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  fx.filter(f => f.g === group).forEach(f => {
    add(f.h); add(f.a);
    if (f.st !== "FT" || !f.s) return;
    const H = teams[f.h], Aw = teams[f.a], [gh, ga] = f.s;
    H.pld++; Aw.pld++; H.gf += gh; H.ga += ga; Aw.gf += ga; Aw.ga += gh;
    if (gh > ga) { H.w++; Aw.l++; H.pts += 3; } else if (gh < ga) { Aw.w++; H.l++; Aw.pts += 3; }
    else { H.d++; Aw.d++; H.pts++; Aw.pts++; }
  });
  return Object.values(teams).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || ratings[b.name] - ratings[a.name]);
}

/* ── design primitives ────────────────────────────────────────────────── */

const glassCard = {
  background: C.panelGlass,
  backdropFilter: "blur(16px) saturate(180%)",
  WebkitBackdropFilter: "blur(16px) saturate(180%)",
  border: `1px solid ${C.line}`,
  borderRadius: 16,
  padding: 18,
};

const pill = (bg, text) => ({
  display: "inline-flex", alignItems: "center", gap: 5,
  padding: "4px 11px", borderRadius: 999, fontSize: 12, fontWeight: 700,
  background: bg + "22", color: text || bg, border: `1px solid ${bg}44`,
  letterSpacing: 0.3,
});

/* ── small shared components ──────────────────────────────────────────── */

const Flag = ({ code, size = 24 }) => {
  const iso = FLAG_ISO[code];
  if (!iso) return (
    <span style={{
      fontFamily: "monospace", fontWeight: 700, fontSize: 10, letterSpacing: 0.8,
      color: C.dimMid, border: `1px solid ${C.line}`, borderRadius: 4,
      padding: "2px 5px", background: C.panel2, flexShrink: 0, display: "inline-block",
    }}>{code || "?"}</span>
  );
  const h = Math.round(size * 0.67);
  return (
    <img
      src={`https://flagcdn.com/w${size <= 20 ? 20 : 40}/${iso}.png`}
      alt={code}
      width={size}
      height={h}
      style={{
        flexShrink: 0, borderRadius: 3, display: "inline-block",
        objectFit: "cover", verticalAlign: "middle",
        boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
      }}
      onError={e => {
        e.target.style.display = "none";
        e.target.insertAdjacentHTML("afterend",
          `<span style="font-family:monospace;font-size:10px;color:#a0aec0;border:1px solid #1a2438;border-radius:4px;padding:2px 5px;background:#0a0f1a">${code}</span>`
        );
      }}
    />
  );
};

function SkeletonRow() {
  return (
    <div style={{ ...glassCard, display: "flex", gap: 12, alignItems: "center", overflow: "hidden" }}>
      <div className="skeleton" style={{ width: 70, height: 14, borderRadius: 7 }} />
      <div className="skeleton" style={{ flex: 1, height: 14, borderRadius: 7 }} />
      <div className="skeleton" style={{ width: 54, height: 26, borderRadius: 8 }} />
      <div className="skeleton" style={{ width: 90, height: 14, borderRadius: 7 }} />
    </div>
  );
}

function Trophy() {
  const [loaded, setLoaded] = React.useState(false);
  const [err, setErr] = React.useState(false);
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "12px 0 4px", minHeight: 190 }}>
      {!err ? (
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/6/65/World_Cup_Trophy.png"
          alt="FIFA World Cup Trophy"
          onLoad={() => setLoaded(true)}
          onError={() => setErr(true)}
          style={{
            height: 190, width: "auto", display: loaded ? "block" : "none",
            filter: `drop-shadow(0 0 28px ${C.gold}cc) drop-shadow(0 0 10px ${C.gold}88)`,
            objectFit: "contain",
            animation: loaded ? "fadeUp 0.4s ease both" : "none",
          }}
        />
      ) : null}
      {/* spinner while loading */}
      {!loaded && !err && (
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.gold}44`, borderTopColor: C.gold, animation: "spin3d 0.8s linear infinite" }} />
      )}
    </div>
  );
}

/* Circular probability donut gauge */
function ProbGauge({ w, d, l, homeLabel, awayLabel }) {
  const size = 180;
  const r = 72;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const gap = 3;
  const segs = [
    { p: w, col: C.green },
    { p: d, col: C.gold },
    { p: l, col: C.red },
  ];
  let offset = 0;
  const arcs = segs.map(s => {
    const len = s.p * circ - gap;
    const arc = { ...s, dasharray: `${Math.max(0, len)} ${circ - Math.max(0, len)}`, dashoffset: -offset };
    offset += s.p * circ;
    return arc;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <svg width={size} height={size} style={{ overflow: "visible", filter: "drop-shadow(0 0 12px rgba(0,0,0,0.6))" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.line} strokeWidth={14} />
        {arcs.map((a, i) => (
          <circle key={i} cx={cx} cy={cy} r={r}
            fill="none" stroke={a.col} strokeWidth={13}
            strokeDasharray={a.dasharray}
            strokeDashoffset={a.dashoffset}
            strokeLinecap="round"
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px`, transition: "stroke-dasharray 0.6s ease" }}
          />
        ))}
        <text x={cx} y={cy - 8} textAnchor="middle" fill={C.gold} fontSize={26} fontWeight={800}>{Math.round(w * 100)}%</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill={C.dim} fontSize={11} fontWeight={600}>{homeLabel} win</text>
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, width: "100%" }}>
        {[
          { label: `${homeLabel} Win`, val: `${Math.round(w * 100)}%`, col: C.green, glow: C.greenGlow },
          { label: "Draw", val: `${Math.round(d * 100)}%`, col: C.gold, glow: C.goldGlow },
          { label: `${awayLabel} Win`, val: `${Math.round(l * 100)}%`, col: C.red, glow: C.redGlow },
        ].map(({ label, val, col, glow }) => (
          <div key={label} style={{
            background: C.panel2, border: `1px solid ${col}44`, borderRadius: 12,
            padding: "12px 8px", textAlign: "center",
            boxShadow: `0 4px 18px ${glow}`,
          }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: col }}>{val}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Match card (used in Matches tab) ────────────────────────────────── */
function MatchCard({ f, poss }) {
  const isFT = f.st === "FT";
  const isLive = f.st === "LIVE";
  const hCode = byName[f.h]?.code;
  const aCode = byName[f.a]?.code;
  const homeWon = isFT && f.s && f.s[0] > f.s[1];
  const awayWon = isFT && f.s && f.s[1] > f.s[0];

  // ── AI commentary (ElevenLabs via /api/commentary) ────────────────────────
  const [commentaryState, setCommentaryState] = useState("idle"); // idle | loading | playing | error
  async function playCommentary() {
    if (commentaryState === "loading" || commentaryState === "playing") return;
    setCommentaryState("loading");
    const line = f.s
      ? `${f.h} ${f.s[0]}, ${f.a} ${f.s[1]}. Full time at the final whistle. ${
          homeWon ? f.h : awayWon ? f.a : "Neither side"
        } ${homeWon || awayWon ? "takes the win" : "settle for a share of the points"} here in the 2026 World Cup.`
      : `${f.h} versus ${f.a}, coming up next in the World Cup.`;
    try {
      const r = await fetch("/api/commentary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: line }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Commentary unavailable");
      }
      const blob = await r.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.onended = () => setCommentaryState("idle");
      audio.onerror = () => setCommentaryState("error");
      setCommentaryState("playing");
      audio.play();
    } catch {
      setCommentaryState("error");
      setTimeout(() => setCommentaryState("idle"), 2500);
    }
  }

  // Mouse-follow 3D tilt — perspective rotation toward the cursor + sheen position
  const ref = useRef(null);
  function handleTilt(e) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rotY = (px - 0.5) * 10;   // left/right
    const rotX = (0.5 - py) * 10;   // up/down
    el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-3px)`;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
  }
  function resetTilt() {
    const el = ref.current; if (!el) return;
    el.style.transform = "";
  }

  return (
    <div ref={ref} onMouseMove={handleTilt} onMouseLeave={resetTilt}
      className={`match-card tilt${isLive ? " live-card" : ""}`} style={{
      ...glassCard, padding: "12px 16px",
    }}>
      {/* top row: group · date · status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 0.6,
          color: C.dim, background: C.panel2, border: `1px solid ${C.line}`,
          borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap", flexShrink: 0,
        }}>
          {["R32","R16","QF","SF","FINAL","3RD"].includes(f.g) ? f.g : `GRP ${f.g}`}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {f.t && f.st === "UP" && <span style={{ color: C.dimMid, fontSize: 12, fontWeight: 600 }}>{f.t}</span>}
          <StatusChip st={f.st} clock={f.clock} />
        </div>
      </div>

      {/* teams + score */}
      <div className="match-card-inner" style={{
        display: "grid", gridTemplateColumns: "1fr 70px 1fr",
        gap: 10, alignItems: "center",
      }}>
        {/* home */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "flex-end", minWidth: 0 }}>
          <span className="team-name-lg" style={{
            fontWeight: 800, fontSize: 14, textAlign: "right",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: homeWon ? C.text : isFT ? C.dim : C.text,
          }}>{f.h}</span>
          <Flag code={hCode} size={22} />
        </div>

        {/* score badge */}
        <div className="match-score-center" style={{ textAlign: "center" }}>
          <div className="score-badge" style={{
            fontWeight: 900, fontSize: 20,
            color: isLive ? C.red : isFT ? C.gold : C.dimMid,
            background: isLive ? C.redGlow : isFT ? C.goldGlow : C.panel2,
            border: `2px solid ${isLive ? C.red + "55" : isFT ? C.gold + "44" : C.line}`,
            borderRadius: 10, padding: "5px 8px", display: "block", textAlign: "center",
            boxShadow: isLive ? `0 0 16px ${C.redGlow}` : isFT ? `0 0 10px ${C.goldGlow}` : "none",
            letterSpacing: 1, whiteSpace: "nowrap",
          }}>
            {f.s ? `${f.s[0]}–${f.s[1]}` : "vs"}
          </div>
        </div>

        {/* away */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
          <Flag code={aCode} size={22} />
          <span className="team-name-lg" style={{
            fontWeight: 800, fontSize: 14,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: awayWon ? C.text : isFT ? C.dim : C.text,
          }}>{f.a}</span>
        </div>
      </div>

      {/* venue + AI commentary */}
      <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        {f.v && (
          <span style={{ color: C.dim, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            📍 {f.v}
          </span>
        )}
        {isFT && (
          <button onClick={playCommentary} disabled={commentaryState === "loading" || commentaryState === "playing"}
            title="AI match commentary (ElevenLabs)"
            style={{
              display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 9px",
              borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer",
              border: `1px solid ${C.gold}44`, background: C.goldGlow, color: C.gold,
              opacity: commentaryState === "loading" ? 0.6 : 1,
            }}>
            {commentaryState === "loading" ? "⏳" : commentaryState === "playing" ? "🔊" : commentaryState === "error" ? "⚠️" : "🔈"}
            {commentaryState === "loading" ? "Loading…" : commentaryState === "playing" ? "Playing…" : commentaryState === "error" ? "Unavailable" : "Hear the call"}
          </button>
        )}
      </div>

      {/* possession bar (fbref.com) — shown for completed & live matches */}
      {poss && (isFT || isLive) && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontWeight: 700, color: C.dimMid, marginBottom: 3, letterSpacing: 0.5 }}>
            <span>{poss.home}%</span>
            <span style={{ color: C.dim, fontWeight: 500 }}>Possession</span>
            <span>{poss.away}%</span>
          </div>
          <div style={{ display: "flex", height: 5, borderRadius: 4, overflow: "hidden", background: C.panel2, border: `1px solid ${C.line}` }}>
            <div style={{ width: `${poss.home}%`, background: isLive ? C.red : C.blue, transition: "width 0.5s ease" }} />
            <div style={{ width: `${poss.away}%`, background: isLive ? "#e2374455" : C.grad, transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}
    </div>
  );
}

/* Status chip */
const StatusChip = ({ st, clock }) => {
  if (st === "LIVE") return (
    <span style={{ ...pill(C.red), animation: "pulse 1.4s ease-in-out infinite" }}>
      ● {clock ? clock : "LIVE"}
    </span>
  );
  if (st === "FT") return <span style={pill(C.dimMid)}>FT</span>;
  return <span style={pill(C.blue)}>Upcoming</span>;
};

/* ── global injected styles ───────────────────────────────────────────── */
const GLOBAL_STYLES = `
  /* ── Dark theme (default) ── */
  :root {
    --c-bg: #07090f;      --c-panel: #0f1520;    --c-panel2: #0a0f1a;
    --c-panelGlass: rgba(15,21,32,0.72);
    --c-line: #1a2438;    --c-lineHover: #2a3a55;
    --c-text: #e8edf6;    --c-dim: #7a8899;      --c-dimMid: #a0aec0;
    --c-gold: #f5c451;    --c-goldDim: #9a7d2e;  --c-goldGlow: rgba(245,196,81,0.22);
    --c-red: #e23744;     --c-redGlow: rgba(226,55,68,0.2);
    --c-green: #2bb673;   --c-greenGlow: rgba(43,182,115,0.2);
    --c-blue: #3b82f6;    --c-blueGlow: rgba(59,130,246,0.2);
    --c-grad: #7c5cff;    --c-gradGlow: rgba(124,92,255,0.2);
  }
  /* ── Light theme ── */
  [data-theme="light"] {
    --c-bg: #f4f6fb;      --c-panel: #ffffff;    --c-panel2: #eef1f7;
    --c-panelGlass: rgba(255,255,255,0.78);
    --c-line: #d8dee9;    --c-lineHover: #b9c4d6;
    --c-text: #15202b;    --c-dim: #5a6b7d;      --c-dimMid: #44505e;
    --c-gold: #b8860b;    --c-goldDim: #8a6608;  --c-goldGlow: rgba(184,134,11,0.16);
    --c-red: #c92a36;     --c-redGlow: rgba(201,42,54,0.13);
    --c-green: #1a8f57;   --c-greenGlow: rgba(26,143,87,0.13);
    --c-blue: #2563eb;    --c-blueGlow: rgba(37,99,235,0.13);
    --c-grad: #6741e0;    --c-gradGlow: rgba(103,65,224,0.13);
  }
  html { transition: none; }
  body, .app-root, .glass, .match-card, .nav-btn { transition: background 0.25s ease, color 0.25s ease, border-color 0.25s ease; }

  .app-root {
    background:
      radial-gradient(ellipse 1000px 600px at 85% -8%, color-mix(in srgb, var(--c-grad) 10%, transparent), transparent),
      radial-gradient(ellipse 800px 500px at -5% 0%, color-mix(in srgb, var(--c-green) 6%, transparent), transparent),
      radial-gradient(ellipse 600px 400px at 50% 100%, color-mix(in srgb, var(--c-blue) 5%, transparent), transparent),
      var(--c-bg);
  }

  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; overscroll-behavior: none; }
  body { background: ${C.bg}; }
  ::-webkit-scrollbar { width: 4px; background: ${C.panel2}; }
  ::-webkit-scrollbar-thumb { background: ${C.line}; border-radius: 4px; }

  @keyframes spin3d { from { transform: rotateY(0) } to { transform: rotateY(360deg) } }
  @keyframes shimmer-glow { 0%,100% { filter: brightness(1) } 50% { filter: brightness(1.4) } }
  @keyframes blink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
  @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity: 0.45; } }
  @keyframes skeletonWave {
    0% { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes headerGrad {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  .tro { transform-style: preserve-3d; animation: spin3d 9s linear infinite; }
  .cup { animation: shimmer-glow 3s ease-in-out infinite; }

  .tab-content { animation: fadeUp 0.22s ease both; }

  .skeleton {
    background: linear-gradient(90deg, ${C.panel2} 25%, ${C.line} 50%, ${C.panel2} 75%);
    background-size: 800px 100%;
    animation: skeletonWave 1.4s ease-in-out infinite;
  }

  .match-card:hover { border-color: ${C.lineHover} !important; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.4) !important; }
  .match-card { transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s; cursor: default; }
  .match-card.live-card { border-color: ${C.red}66 !important; box-shadow: 0 0 24px ${C.redGlow}, 0 4px 16px rgba(0,0,0,0.3) !important; animation: livePulse 2.5s ease-in-out infinite; }
  @keyframes livePulse { 0%,100% { box-shadow: 0 0 18px ${C.redGlow}, 0 4px 16px rgba(0,0,0,0.3); } 50% { box-shadow: 0 0 36px rgba(226,55,68,0.35), 0 4px 16px rgba(0,0,0,0.3); } }
  .section-label { font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; color: ${C.dim}; padding: 4px 2px 8px; display: flex; align-items: center; gap: 8px; }
  .section-label::after { content: ""; flex: 1; height: 1px; background: ${C.line}; }

  .nav-btn { transition: background 0.18s, color 0.18s, border-color 0.18s, box-shadow 0.18s; }
  .nav-btn:hover { border-color: ${C.gold}88 !important; }
  .nav-btn:active { transform: scale(0.97); }

  .sel-opt:hover { background: ${C.lineHover} !important; }

  .auth-input:focus { outline: none; border-color: ${C.gold}88 !important; box-shadow: 0 0 0 3px ${C.goldGlow}; }
  .auth-btn:hover { opacity: 0.88; }
  .auth-btn:active { transform: scale(0.98); }

  .star-btn { background: none; border: none; cursor: pointer; padding: 2px 3px; transition: transform 0.12s; line-height: 1; }
  .star-btn:hover { transform: scale(1.18); }

  /* Desktop nav */
  .top-nav { display: flex; }
  .bottom-nav { display: none; }
  .main-pad { padding: 26px 20px 60px; }

  /* Mobile first breakpoints */
  @media (max-width: 640px) {
    .top-nav { display: none !important; }
    .bottom-nav { display: flex !important; }
    .main-pad { padding: 16px 12px 88px; }
    .header-title { font-size: 18px !important; }
    .header-subtitle { display: none !important; }
    .header-pills { display: none !important; }
    .match-grid { grid-template-columns: 1fr !important; }
    .match-card-inner { grid-template-columns: 60px 1fr 60px !important; gap: 6px !important; }
    .match-score-center { order: 0; }
    .stat-grid { grid-template-columns: 1fr 1fr !important; }
    .groups-grid { grid-template-columns: 1fr !important; }
    .semifinal-grid { grid-template-columns: 1fr 1fr !important; }
    .radar-wrap { display: none; }
    .podium-wrap { flex-direction: column; align-items: center; }
    .podium-wrap > div { width: 100% !important; max-width: 320px; }
  }

  @media (min-width: 641px) and (max-width: 900px) {
    .groups-grid { grid-template-columns: 1fr 1fr !important; }
  }

  /* Ensure no horizontal overflow at 375px */
  @media (max-width: 390px) {
    .score-badge { font-size: 20px !important; min-width: 44px !important; }
    .team-name-lg { font-size: 14px !important; }
    table { font-size: 11px !important; }
  }

  /* ── Living aurora background ─────────────────────────────────────── */
  .aurora-blob {
    position: absolute; display: block; border-radius: 50%;
    filter: blur(90px); opacity: 0.5; mix-blend-mode: screen;
    will-change: transform;
  }
  .aurora-1 { width: 46vw; height: 46vw; left: -8vw; top: -10vw;
    background: radial-gradient(circle, ${C.grad}, transparent 70%);
    animation: auroraDrift1 26s ease-in-out infinite; }
  .aurora-2 { width: 40vw; height: 40vw; right: -10vw; top: 8vh;
    background: radial-gradient(circle, ${C.green}, transparent 70%);
    animation: auroraDrift2 32s ease-in-out infinite; }
  .aurora-3 { width: 38vw; height: 38vw; left: 30vw; bottom: -14vw;
    background: radial-gradient(circle, ${C.blue}, transparent 70%);
    animation: auroraDrift3 38s ease-in-out infinite; }
  @keyframes auroraDrift1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(8vw,6vh) scale(1.18); } }
  @keyframes auroraDrift2 { 0%,100% { transform: translate(0,0) scale(1.1); } 50% { transform: translate(-7vw,5vh) scale(0.9); } }
  @keyframes auroraDrift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-5vw,-7vh) scale(1.22); } }

  /* ── Cinematic mount: staggered reveal of tab content children ────── */
  .tab-content > * { animation: fadeUp 0.5s cubic-bezier(.22,1,.36,1) both; }
  .tab-content > *:nth-child(1) { animation-delay: 0.02s; }
  .tab-content > *:nth-child(2) { animation-delay: 0.08s; }
  .tab-content > *:nth-child(3) { animation-delay: 0.14s; }
  .tab-content > *:nth-child(4) { animation-delay: 0.20s; }
  .tab-content > *:nth-child(5) { animation-delay: 0.26s; }
  .tab-content > *:nth-child(n+6) { animation-delay: 0.32s; }

  /* ── 3D tilt + sheen for interactive cards ───────────────────────── */
  .tilt { transform-style: preserve-3d; transition: transform 0.18s ease, box-shadow 0.25s ease; will-change: transform; position: relative; }
  .tilt::after {
    content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
    background: radial-gradient(420px circle at var(--mx,50%) var(--my,0%), rgba(255,255,255,0.10), transparent 45%);
    opacity: 0; transition: opacity 0.3s ease;
  }
  .tilt:hover::after { opacity: 1; }
  .tilt:hover { box-shadow: 0 22px 60px rgba(0,0,0,0.55), 0 0 24px ${C.gradGlow} !important; }

  /* Honor reduced-motion preference */
  @media (prefers-reduced-motion: reduce) {
    .aurora-blob, .tab-content > *, .cup, .tro { animation: none !important; }
    .tilt { transition: none !important; }
  }
`;

/* ── Reviews Tab ──────────────────────────────────────────────────────── */

const GOOGLE_REVIEW_SAMPLES = [
  {
    name: "Marcus Delacroix",
    rating: 5,
    date: "June 2026",
    text: "Absolutely love this app! The Poisson prediction engine is surprisingly accurate — it nailed the Germany vs Curaçao scoreline almost perfectly. Refreshing to see real stats driving predictions rather than just vibes.",
  },
  {
    name: "Priya Nair",
    rating: 5,
    date: "June 2026",
    text: "Stunning design and super fast. I've been using it every day to check Group Stage standings. The live Elo adjustment is a brilliant touch. Highly recommend to any World Cup fan!",
  },
  {
    name: "Carlos Mendez",
    rating: 5,
    date: "June 2026",
    text: "The Tactical Breakdown AI feature is genuinely insightful — it gave me talking points I hadn't considered for the Spain vs Brazil matchup. Best free World Cup predictor I've tried.",
  },
  {
    name: "Aïcha Bensalah",
    rating: 5,
    date: "June 2026",
    text: "Followed Morocco's whole group on here. The live standings and the win-probability donut are so clean. Runs perfectly on my phone too.",
  },
  {
    name: "Tom Whitaker",
    rating: 4,
    date: "June 2026",
    text: "Great predictor and lovely UI. Would love an option to simulate the full knockout bracket — but the group-stage forecasts have been spot on so far.",
  },
  {
    name: "Sofia Rossi",
    rating: 5,
    date: "June 2026",
    text: "The stadium hero art and the projected final card are a beautiful touch. Feels like a proper product, not a hobby project. Five stars.",
  },
];

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          className="star-btn"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          aria-label={`${s} star${s > 1 ? "s" : ""}`}
          style={{ fontSize: 28 }}
        >
          <span style={{ color: s <= (hover || value) ? C.gold : C.line, filter: s <= (hover || value) ? `drop-shadow(0 0 6px ${C.gold}88)` : "none", transition: "color 0.12s, filter 0.12s" }}>
            ★
          </span>
        </button>
      ))}
      {value > 0 && <span style={{ color: C.dim, fontSize: 13, marginLeft: 6 }}>{value}/5</span>}
    </div>
  );
}

function StarDisplay({ rating, size = 16 }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} style={{ fontSize: size, color: s <= rating ? C.gold : C.line, lineHeight: 1 }}>★</span>
      ))}
    </span>
  );
}

// Generate or retrieve a persistent session key for this browser
function getSessionKey() {
  let k = localStorage.getItem("wc26_session_key");
  if (!k) { k = crypto.randomUUID(); localStorage.setItem("wc26_session_key", k); }
  return k;
}

function ReviewsTab() {
  const sessionKey = React.useMemo(() => getSessionKey(), []);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState("");
  const [editId, setEditId] = useState(null);
  const [editRating, setEditRating] = useState(0);
  const [editText, setEditText] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showAll, setShowAll] = useState(false);

  async function loadReviews() {
    setReviewsLoading(true);
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (!error) setReviews(data || []);
    setReviewsLoading(false);
  }

  useEffect(() => {
    loadReviews();
    const channel = supabase
      .channel('reviews-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => {
        loadReviews();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (rating === 0) { setFormError("Please select a star rating."); return; }
    if (!text.trim()) { setFormError("Please write something in your review."); return; }
    const { error } = await supabase.from('reviews').insert({
      user_name: name.trim() || "Anonymous",
      rating,
      content: text.trim(),
      session_key: sessionKey,
    });
    if (error) { setFormError("Could not save — " + error.message); return; }
    setRating(0); setName(""); setText("");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3500);
    loadReviews();
  }

  async function handleEditSave(rv) {
    setEditError("");
    if (editRating === 0) { setEditError("Select a rating."); return; }
    if (!editText.trim()) { setEditError("Review text is required."); return; }
    const { error } = await supabase.from('reviews').update({
      rating: editRating,
      content: editText.trim(),
    }).eq('id', rv.id).eq('session_key', sessionKey);
    if (error) { setEditError("Update failed — " + error.message); return; }
    setEditId(null);
    loadReviews();
  }

  async function handleDelete(rv) {
    await supabase.from('reviews').delete().eq('id', rv.id).eq('session_key', sessionKey);
    setDeleteConfirm(null);
    loadReviews();
  }

  function getDisplayName(rv) { return rv.user_name || "Anonymous"; }
  function getDisplayText(rv) { return rv.content || ""; }
  function getDisplayDate(rv) {
    if (!rv.created_at) return "";
    return new Date(rv.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function isOwn(rv) { return rv.session_key === sessionKey; }

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    background: C.panel2, color: C.text, border: `1px solid ${C.line}`,
    fontSize: 14, fontFamily: "inherit", boxSizing: "border-box",
  };

  // Combined feed for the "All Reviews" page — community + Google, newest-ish first
  const allReviews = [
    ...reviews.map(rv => ({
      key: `c-${rv.id}`, name: getDisplayName(rv), rating: rv.rating,
      text: getDisplayText(rv), date: getDisplayDate(rv), source: "Community", own: isOwn(rv),
    })),
    ...GOOGLE_REVIEW_SAMPLES.map((rv, i) => ({
      key: `g-${i}`, name: rv.name, rating: rv.rating, text: rv.text, date: rv.date, source: "Google", own: false,
    })),
  ];
  const totalCount = allReviews.length;
  const avgRating = totalCount ? allReviews.reduce((s, r) => s + (r.rating || 0), 0) / totalCount : 0;

  return (
    <div style={{ display: "grid", gap: 18 }}>

      {/* ── Write / Edit a review ─────────────────────────────────────── */}
      <div style={glassCard}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
          ✍️ Leave a Review
        </h3>
        {!isSupabaseConfigured && (
          <div style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", color: C.red, fontSize: 13, marginBottom: 14 }}>
            ⚠️ Reviews database isn't connected on this deployment. Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your hosting env vars, then run <code>supabase/reviews.sql</code>.
          </div>
        )}
        {submitted ? (
          <div style={{ textAlign: "center", padding: "22px 0", color: C.gold, fontWeight: 800, fontSize: 17 }}>
            Review submitted! ⭐ Saved to database.
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ color: C.dim, fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                Your name <span style={{ fontWeight: 400 }}>(optional)</span>
              </div>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Anonymous" style={inputStyle} />
            </div>
            <div>
              <div style={{ color: C.dim, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Rating</div>
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ color: C.dim, fontSize: 12, fontWeight: 600 }}>Review</span>
                <span style={{ color: text.length > 460 ? C.red : C.dim, fontSize: 11 }}>{text.length}/500</span>
              </div>
              <textarea value={text} onChange={e => setText(e.target.value.slice(0, 500))}
                placeholder="Share your thoughts on World Cup 2026 Predictor…"
                rows={4} style={{ ...inputStyle, resize: "vertical" }} />
            </div>
            {formError && (
              <div style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", color: C.red, fontSize: 13 }}>
                {formError}
              </div>
            )}
            <button type="submit" style={{
              padding: "12px 0", borderRadius: 10, cursor: "pointer",
              fontWeight: 800, fontSize: 14, border: `1px solid ${C.gold}`,
              background: `linear-gradient(135deg, ${C.gold}22, ${C.grad}14)`, color: C.gold,
            }}>
              Submit Review
            </button>
          </form>
        )}
      </div>

      {/* ── Community Reviews ─────────────────────────────────────────── */}
      <div style={glassCard}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
          💬 Community Reviews
          {reviews.length > 0 && (
            <span style={{ ...pill(C.gold), fontSize: 11, marginLeft: "auto" }}>
              {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </span>
          )}
        </h3>
        <div style={{ color: C.dim, fontSize: 12, marginBottom: 14 }}>
          Saved to Supabase · visible to everyone · you can edit or delete your own
        </div>

        {reviewsLoading ? (
          <div style={{ display: "grid", gap: 8 }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ textAlign: "center", color: C.dim, fontSize: 14, padding: "28px 0" }}>
            No reviews yet — be the first!
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {reviews.map((rv, idx) => {
              const own = isOwn(rv);
              const isEditing = editId === rv.id;
              return (
                <div key={rv.id || idx} style={{
                  background: C.panel2,
                  border: `1px solid ${own ? C.gold + "55" : C.line}`,
                  borderRadius: 12, padding: "14px 16px",
                  position: "relative",
                }}>
                  {/* header row */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${own ? C.gold : C.grad}44, ${own ? C.gold : C.blue}33)`,
                      border: `1px solid ${own ? C.gold : C.line}44`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 900, fontSize: 14, color: own ? C.gold : C.dimMid,
                    }}>
                      {getDisplayName(rv)[0]?.toUpperCase() || "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        {getDisplayName(rv)}
                        {own && <span style={{ fontSize: 10, color: C.gold, fontWeight: 700, background: C.gold + "22", border: `1px solid ${C.gold}44`, borderRadius: 4, padding: "1px 6px", letterSpacing: 0.5 }}>YOU</span>}
                      </div>
                      <div style={{ color: C.dim, fontSize: 11 }}>{getDisplayDate(rv)}</div>
                    </div>
                    {!isEditing && <StarDisplay rating={rv.rating} size={15} />}
                    {own && !isEditing && deleteConfirm !== rv.id && (
                      <div style={{ display: "flex", gap: 6, marginLeft: 6 }}>
                        <button onClick={() => { setEditId(rv.id); setEditRating(rv.rating); setEditText(rv.content || ""); setEditError(""); }}
                          style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.blue}55`, background: C.blue + "18", color: C.blue, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Edit
                        </button>
                        <button onClick={() => setDeleteConfirm(rv.id)}
                          style={{ padding: "4px 10px", borderRadius: 7, border: `1px solid ${C.red}55`, background: C.red + "18", color: C.red, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Delete
                        </button>
                      </div>
                    )}
                  </div>

                  {/* delete confirm */}
                  {deleteConfirm === rv.id && (
                    <div style={{ background: C.redGlow, border: `1px solid ${C.red}44`, borderRadius: 8, padding: "10px 14px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ color: C.red, fontSize: 13, flex: 1 }}>Delete this review?</span>
                      <button onClick={() => handleDelete(rv)} style={{ padding: "5px 14px", borderRadius: 7, border: `1px solid ${C.red}`, background: C.red, color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Yes, delete</button>
                      <button onClick={() => setDeleteConfirm(null)} style={{ padding: "5px 14px", borderRadius: 7, border: `1px solid ${C.line}`, background: C.panel2, color: C.dimMid, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                    </div>
                  )}

                  {/* edit form */}
                  {isEditing ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      <StarPicker value={editRating} onChange={setEditRating} />
                      <textarea value={editText} onChange={e => setEditText(e.target.value.slice(0, 500))}
                        rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                      {editError && <div style={{ color: C.red, fontSize: 12 }}>{editError}</div>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => handleEditSave(rv)} style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${C.gold}`, background: C.gold + "22", color: C.gold, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Save</button>
                        <button onClick={() => setEditId(null)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${C.line}`, background: C.panel2, color: C.dimMid, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: C.text, fontSize: 14, lineHeight: 1.65, borderLeft: `2px solid ${own ? C.gold + "55" : C.line}`, paddingLeft: 12 }}>
                      {getDisplayText(rv)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Google Reviews sample ─────────────────────────────────────── */}
      <div style={{ ...glassCard, border: `1px solid ${C.gold}33` }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>G</span> Google Reviews
        </h3>
        <p style={{ color: C.dim, fontSize: 13, margin: "0 0 16px" }}>What people are saying across the web</p>
        <div style={{ display: "grid", gap: 12, marginBottom: 18 }}>
          {GOOGLE_REVIEW_SAMPLES.map((rv, i) => (
            <div key={i} style={{ background: C.panel2, border: `1px solid ${C.line}`, borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${C.blue}44, ${C.grad}33)`, border: `1px solid ${C.blue}44`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, color: C.blue, flexShrink: 0 }}>
                  {rv.name[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{rv.name}</div>
                  <div style={{ color: C.dim, fontSize: 11 }}>{rv.date} · Google</div>
                </div>
                <StarDisplay rating={rv.rating} size={15} />
              </div>
              <div style={{ color: C.text, fontSize: 14, lineHeight: 1.65, borderLeft: `2px solid ${C.blue}44`, paddingLeft: 12 }}>{rv.text}</div>
            </div>
          ))}
        </div>
        <button onClick={() => setShowAll(true)} className="nav-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 22px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, border: `1px solid ${C.gold}`, background: `${C.gold}1c`, color: C.gold }}>
          ⭐ See all reviews ({totalCount})
        </button>
      </div>

      {/* ── All Reviews overlay page ──────────────────────────────────── */}
      {showAll && (
        <div onClick={() => setShowAll(false)} style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(4,6,11,0.78)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
          display: "flex", justifyContent: "center", alignItems: "flex-start",
          padding: "5vh 16px 16px", overflowY: "auto",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            ...glassCard, width: "100%", maxWidth: 760,
            animation: "fadeUp 0.25s ease both", background: C.panel,
          }}>
            {/* header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ margin: "0 0 8px", fontSize: 20 }}>All Reviews</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 30, fontWeight: 900, color: C.gold, lineHeight: 1 }}>{avgRating.toFixed(1)}</span>
                  <StarDisplay rating={Math.round(avgRating)} size={20} />
                  <span style={{ color: C.dim, fontSize: 13 }}>
                    based on {totalCount} review{totalCount !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowAll(false)} aria-label="Close"
                style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, cursor: "pointer", border: `1px solid ${C.line}`, background: C.panel2, color: C.dimMid, fontSize: 18, fontWeight: 700, lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {/* full list */}
            <div style={{ display: "grid", gap: 12 }}>
              {allReviews.map(rv => (
                <div key={rv.key} style={{
                  background: C.panel2,
                  border: `1px solid ${rv.own ? C.gold + "55" : C.line}`,
                  borderRadius: 12, padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                      background: `linear-gradient(135deg, ${rv.source === "Google" ? C.blue : C.grad}44, ${C.blue}33)`,
                      border: `1px solid ${C.line}44`, display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 900, fontSize: 14, color: rv.source === "Google" ? C.blue : C.dimMid,
                    }}>
                      {rv.name[0]?.toUpperCase() || "?"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {rv.name}
                        {rv.own && <span style={{ fontSize: 10, color: C.gold, fontWeight: 700, background: C.gold + "22", border: `1px solid ${C.gold}44`, borderRadius: 4, padding: "1px 6px", letterSpacing: 0.5 }}>YOU</span>}
                      </div>
                      <div style={{ color: C.dim, fontSize: 11 }}>{rv.date}{rv.date ? " · " : ""}{rv.source}</div>
                    </div>
                    <StarDisplay rating={rv.rating} size={15} />
                  </div>
                  <div style={{ color: C.text, fontSize: 14, lineHeight: 1.65, borderLeft: `2px solid ${rv.own ? C.gold + "55" : C.line}`, paddingLeft: 12 }}>
                    {rv.text}
                  </div>
                </div>
              ))}
              {totalCount === 0 && (
                <div style={{ textAlign: "center", color: C.dim, fontSize: 14, padding: "28px 0" }}>
                  No reviews yet — be the first!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Pricing / Premium ────────────────────────────────────────────────── */


/* Email magic-link sign-in modal (Supabase Auth) */
function AuthModal({ onClose }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function send(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin + "/?tab=pricing" },
      });
      if (error) throw error;
      setSent(true);
    } catch (e2) {
      setErr(String(e2.message || e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1100, background: "rgba(4,6,11,0.82)",
      backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      display: "flex", justifyContent: "center", alignItems: "center", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        ...glassCard, maxWidth: 400, width: "100%", background: C.panel,
        animation: "fadeUp 0.25s ease both", border: `1px solid ${C.blue}44`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Sign in</h3>
          <button onClick={onClose} aria-label="Close" style={{
            width: 32, height: 32, borderRadius: 8, cursor: "pointer", border: `1px solid ${C.line}`,
            background: C.panel2, color: C.dimMid, fontSize: 16,
          }}>✕</button>
        </div>
        {sent ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 34, marginBottom: 8 }}>📬</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Check your email</div>
            <div style={{ color: C.dim, fontSize: 13, lineHeight: 1.5 }}>
              We sent a magic sign-in link to <strong style={{ color: C.text }}>{email}</strong>. Open it on any device to sign in.
            </div>
          </div>
        ) : (
          <form onSubmit={send} style={{ display: "grid", gap: 12 }}>
            <p style={{ color: C.dim, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
              We'll email you a one-tap magic link — no password. Your subscription will follow your account across devices.
            </p>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" className="auth-input" autoFocus
              style={{ width: "100%", padding: "11px 13px", borderRadius: 10, background: C.panel2, color: C.text, border: `1px solid ${C.line}`, fontSize: 14, boxSizing: "border-box" }} />
            {err && <div style={{ color: C.red, fontSize: 12 }}>⚠️ {err}</div>}
            <button type="submit" disabled={busy} className="auth-btn" style={{
              padding: "12px 0", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 14,
              border: `1px solid ${C.blue}`, background: `linear-gradient(135deg, ${C.blue}26, ${C.grad}12)`, color: C.blue,
              opacity: busy ? 0.6 : 1,
            }}>{busy ? "Sending…" : "Email me a magic link"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

/* (Paywall removed — Stripe stripped out) */
function _Paywall_removed({ feature, onClose, onUpgrade }) {
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(4,6,11,0.8)",
      backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
      display: "flex", justifyContent: "center", alignItems: "center", padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        ...glassCard, maxWidth: 420, width: "100%", textAlign: "center",
        background: C.panel, animation: "fadeUp 0.25s ease both",
        border: `1px solid ${C.gold}44`, boxShadow: `0 0 40px ${C.goldGlow}`,
      }}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>💎</div>
        <h3 style={{ margin: "0 0 8px", fontSize: 20 }}>{feature} is a Pro feature</h3>
        <p style={{ color: C.dim, fontSize: 14, margin: "0 0 20px", lineHeight: 1.5 }}>
          Upgrade to unlock AI breakdowns, hero art, advanced stats and the knockout simulator —
          from <strong style={{ color: C.text }}>$4.99/mo</strong> or a <strong style={{ color: C.gold }}>$9.99 Tournament Pass</strong>.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onUpgrade} className="nav-btn" style={{
            flex: 1, padding: "12px 0", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 14,
            border: `1px solid ${C.gold}`, background: `linear-gradient(135deg, ${C.gold}26, ${C.grad}12)`, color: C.gold,
          }}>See plans</button>
          <button onClick={onClose} style={{
            padding: "12px 18px", borderRadius: 10, cursor: "pointer", fontSize: 14,
            border: `1px solid ${C.line}`, background: C.panel2, color: C.dimMid,
          }}>Maybe later</button>
        </div>
      </div>
    </div>
  );
}

function AccuracyTab({ fx }) {
  // Honest out-of-sample check: predict each FINISHED match using PRE-tournament
  // base ratings (not ratings adjusted by that same result), then compare to reality.
  const baseRatings = React.useMemo(
    () => Object.fromEntries(TEAMS.map(t => [t.name, t.rating])), []
  );

  const finished = fx.filter(f => f.st === "FT" && f.s && byName[f.h] && byName[f.a]);

  const rows = finished.map(f => {
    const pr = predict(f.h, f.a, baseRatings, false);
    // model's favoured outcome
    const modelPick = pr.pW >= pr.pD && pr.pW >= pr.pL ? "H"
                    : pr.pL >= pr.pW && pr.pL >= pr.pD ? "A" : "D";
    const actual = f.s[0] > f.s[1] ? "H" : f.s[0] < f.s[1] ? "A" : "D";
    const correct = modelPick === actual;
    const exact = `${Math.round(pr.xgH)}-${Math.round(pr.xgA)}` === `${f.s[0]}-${f.s[1]}`;
    // Brier: 1 - sum (p_i - o_i)^2 across the 3 outcomes (lower error = better)
    const o = { H: actual === "H" ? 1 : 0, D: actual === "D" ? 1 : 0, A: actual === "A" ? 1 : 0 };
    const brier = Math.pow(pr.pW - o.H, 2) + Math.pow(pr.pD - o.D, 2) + Math.pow(pr.pL - o.A, 2);
    const conf = Math.max(pr.pW, pr.pD, pr.pL);
    return { f, modelPick, actual, correct, exact, brier, conf };
  });

  const n = rows.length;
  const hits = rows.filter(r => r.correct).length;
  const exacts = rows.filter(r => r.exact).length;
  const hitRate = n ? (hits / n * 100) : 0;
  const exactRate = n ? (exacts / n * 100) : 0;
  const avgBrier = n ? rows.reduce((s, r) => s + r.brier, 0) / n : 0;
  // baseline: always pick home — for context
  const homeBaseline = n ? rows.filter(r => r.actual === "H").length / n * 100 : 0;

  const Stat = ({ label, value, sub, accent }) => (
    <div style={{ ...glassCard, padding: 16, textAlign: "center" }}>
      <div style={{ fontSize: 30, fontWeight: 900, color: accent || C.gold, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={glassCard}>
        <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>📈 Model Accuracy — live scorecard</h3>
        <div style={{ color: C.dim, fontSize: 12, lineHeight: 1.6 }}>
          Every finished match re-predicted using <strong>pre-tournament base ratings only</strong>
          {" "}(true out-of-sample — the model never sees the result it's being graded on).
          Updates automatically as more matches finish.
        </div>
      </div>

      {n === 0 ? (
        <div style={{ ...glassCard, textAlign: "center", color: C.dim, padding: "36px 0" }}>
          No finished matches to grade yet — check back after kickoff.
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
            <Stat label="Result hit rate" value={`${hitRate.toFixed(0)}%`}
              sub={`${hits} of ${n} matches`} accent={C.green} />
            <Stat label="Exact scoreline" value={`${exactRate.toFixed(0)}%`}
              sub={`${exacts} of ${n} matches`} accent={C.gold} />
            <Stat label="Brier score" value={avgBrier.toFixed(3)}
              sub="lower is better (0–2)" accent={C.blue} />
            <Stat label="vs home-pick baseline" value={`${(hitRate - homeBaseline >= 0 ? "+" : "")}${(hitRate - homeBaseline).toFixed(0)}%`}
              sub={`baseline ${homeBaseline.toFixed(0)}%`} accent={C.grad} />
          </div>

          <div style={glassCard}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Match-by-match grades</div>
            <div style={{ display: "grid", gap: 6 }}>
              {rows.slice().reverse().map((r, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                  borderRadius: 10, background: C.panel2,
                  border: `1px solid ${r.correct ? C.green + "44" : C.red + "33"}`,
                }}>
                  <span style={{ fontSize: 16 }}>{r.correct ? "✅" : "❌"}</span>
                  <span style={{ flex: 1, fontSize: 13, color: C.text }}>
                    {r.f.h} <strong>{r.f.s[0]}–{r.f.s[1]}</strong> {r.f.a}
                  </span>
                  {r.exact && <span style={pill(C.gold)}>exact</span>}
                  <span style={{ fontSize: 11, color: C.dim }}>
                    model: {r.modelPick === "H" ? r.f.h : r.modelPick === "A" ? r.f.a : "Draw"} ({(r.conf * 100).toFixed(0)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...glassCard, fontSize: 11, color: C.dim, lineHeight: 1.6 }}>
            <strong style={{ color: C.text }}>Why this matters:</strong> a model that just memorises
            results looks perfect but means nothing. Grading on pre-match ratings only is the honest
            test recruiters look for — it shows the engine generalises. Random guessing ≈ 33% result
            hit rate; a strong football model lands ~50–60%.
          </div>
        </>
      )}
    </div>
  );
}

/* ── main App ─────────────────────────────────────────────────────────── */

export default function App() {

  // ── Theme (dark default, persisted) ──────────────────────────────────────
  const [theme, setTheme] = useState(() => {
    if (typeof localStorage !== "undefined") return localStorage.getItem("wc26_theme") || "dark";
    return "dark";
  });
  useEffect(() => {
    if (theme === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("wc26_theme", theme); } catch {}
  }, [theme]);

  const [fx, setFx] = useState(SEED_FX);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("matches");
  const [home, setHome] = useState("Spain");
  const [away, setAway] = useState("Brazil");
  const [neutral, setNeutral] = useState(true);
  const [hero, setHero] = useState(null);
  const [heroLoading, setHeroLoading] = useState(false);
  const [heroError, setHeroError] = useState("");
  const [punditText, setPunditText] = useState("");
  const [punditLoading, setPunditLoading] = useState(false);
  const punditKey = useRef(`${home}|${away}`);
  const [sbStats, setSbStats] = useState({});      // StatsBomb WC2022 team records
  const [liveClocks, setLiveClocks] = useState({}); // ESPN live clocks
  const [possData, setPossData] = useState({});     // fbref.com possession per match

  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession?.().then(({ data }) => {
      if (active) setUser(data?.session?.user || null);
    }).catch(() => {});
    const sub = supabase.auth.onAuthStateChange?.((_event, session) => {
      setUser(session?.user || null);
    });
    return () => { active = false; sub?.data?.subscription?.unsubscribe?.(); };
  }, []);

  const ratings = useMemo(() => adjustedRatings(fx), [fx]);
  const probs = useMemo(() => titleProbs(ratings), [ratings]);
  const pred = useMemo(() => predict(home, away, ratings, neutral), [home, away, ratings, neutral]);

  async function getAIAnalysis() {
    setPunditLoading(true);
    setPunditText("");
    punditKey.current = `${home}|${away}`;
    const key = import.meta.env.VITE_GROQ_API_KEY;
    const homeT = byName[home], awayT = byName[away];
    const prompt = `You are a sharp, opinionated football pundit covering FIFA World Cup 2026.
Give a concise 3-paragraph match preview for ${home} vs ${away}.
Stats you can use: ${home} model rating ${pred.rH.toFixed(1)}, xG ${pred.xgH.toFixed(2)}, win probability ${(pred.pW*100).toFixed(0)}%.
${away} model rating ${pred.rA.toFixed(1)}, xG ${pred.xgA.toFixed(2)}, win probability ${(pred.pL*100).toFixed(0)}%. Draw ${(pred.pD*100).toFixed(0)}%. Most likely scoreline: ${pred.top[0].score}.
Confederation: ${homeT?.conf} vs ${awayT?.conf}.
Be punchy, reference real playing styles, mention key tactical matchups. End with a bold prediction. 3 short paragraphs max.`;

    // Primary: Groq
    let groqOk = false;
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 320,
          stream: true,
        }),
      });
      if (!res.ok) throw new Error(res.status);
      groqOk = true;
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const delta = JSON.parse(line.slice(6))?.choices?.[0]?.delta?.content;
            if (delta) setPunditText(t => t + delta);
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch {
      groqOk = false;
    }

    // Fallback: Pollinations text generation (streaming)
    if (!groqOk) {
      try {
        const polKey = import.meta.env.VITE_POLLINATIONS_KEY;
        const headers = { 'Content-Type': 'application/json' };
        if (polKey && !polKey.includes('placeholder')) headers['Authorization'] = `Bearer ${polKey}`;
        const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'openai',
            messages: [{ role: 'user', content: prompt }],
            stream: true,
          }),
        });
        if (!res.ok) throw new Error(res.status);
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop();
          for (const line of lines) {
            if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
            try {
              const delta = JSON.parse(line.slice(6))?.choices?.[0]?.delta?.content;
              if (delta) setPunditText(t => t + delta);
            } catch { /* skip malformed chunk */ }
          }
        }
      } catch {
        setPunditText("⚠️ Could not reach Groq or Pollinations — check your API keys or network.");
      }
    }

    setPunditLoading(false);
  }

  useEffect(() => {
    const tid = setTimeout(() => setLoading(false), 700);
    fetch("/api/fixtures").then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (Array.isArray(d?.fixtures) && d.fixtures.length) { setFx(d.fixtures); } })
      .catch(() => {
        fetch("https://api.football-data.org/v4/competitions/WC/matches", {
          headers: { "X-Auth-Token": "b5efd2f5ad43450cb4e7cadd5bca7f00" },
        }).then(r => {
          const remaining = r.headers.get("X-Requests-Available-Minute");
          if (remaining != null && Number(remaining) < 2) return Promise.reject("throttled");
          return r.ok ? r.json() : Promise.reject(r.status);
        }).then(data => {
          const arr = Array.isArray(data?.matches) ? data.matches : [];
          if (!arr.length) return;
          const mapped = arr.map(m => ({
            g: m.group?.replace("GROUP_", "").replace("Group ", "") || "?",
            d: m.utcDate ? m.utcDate.slice(5, 10).replace("-", " Jun ").replace("-", " Jul ") : "",
            h: m.homeTeam?.name || m.homeTeam?.shortName || "",
            a: m.awayTeam?.name || m.awayTeam?.shortName || "",
            s: m.score?.fullTime?.home != null ? [m.score.fullTime.home, m.score.fullTime.away] : undefined,
            st: m.status === "FINISHED" ? "FT" : m.status === "IN_PLAY" || m.status === "PAUSED" ? "LIVE" : "UP",
            v: m.venue || "",
          })).filter(m => m.h && m.a);
          if (mapped.length) setFx(mapped);
        }).catch(() => {
          fetch("https://v3.football.api-sports.io/fixtures?league=1&season=2026", {
            headers: { "x-apisports-key": "61556355315e8d264decff4f1232ce83" },
          }).then(r => r.ok ? r.json() : Promise.reject(r.status))
            .then(data => {
              const arr = Array.isArray(data?.response) ? data.response : [];
              if (!arr.length) return Promise.reject("empty");
              const mapped = arr.map(m => ({
                g: m.league?.round?.replace("Group Stage - ", "") || "?",
                d: m.fixture?.date ? m.fixture.date.slice(5, 10).replace("-", " ") : "",
                h: m.teams?.home?.name || "",
                a: m.teams?.away?.name || "",
                s: m.fixture?.status?.short === "FT" && m.goals?.home != null
                  ? [m.goals.home, m.goals.away] : undefined,
                st: m.fixture?.status?.short === "FT" ? "FT"
                  : m.fixture?.status?.short === "1H" || m.fixture?.status?.short === "2H" ? "LIVE" : "UP",
                v: m.fixture?.venue?.name || "",
              })).filter(m => m.h && m.a);
              if (mapped.length) setFx(mapped);
            }).catch(() => {
              fetch("https://worldcup26.ir/get/games")
                .then(r => r.ok ? r.json() : Promise.reject())
                .then(data => {
                  const arr = Array.isArray(data) ? data : data?.games || data?.matches || [];
                  if (!arr.length) return;
                  const mapped = arr.map(m => ({
                    g: m.group || m.Group || "?",
                    d: fmtWCDate(m.local_date || m.date || ""),
                    h: toAppNameESPN(m.home_team_name_en || m.home_team || m.home || ""),
                    a: toAppNameESPN(m.away_team_name_en || m.away_team || m.away || ""),
                    s: (m.finished === "TRUE" || m.finished === true) && m.home_score != null
                      ? [Number(m.home_score), Number(m.away_score)] : undefined,
                    st: (m.finished === "TRUE" || m.finished === true) ? "FT"
                      : (m.time_elapsed === "live" || m.status === "live") ? "LIVE" : "UP",
                    v: m.venue || "",
                  })).filter(m => m.h && m.a);
                  if (mapped.length) setFx(mapped);
                }).catch(() => { });
            });
        });
      }).finally(() => { clearTimeout(tid); setLoading(false); });
    return () => clearTimeout(tid);
  }, []);

  useEffect(() => { setPunditText(""); }, [home, away]);

  // ── StatsBomb WC2022: load team records once ──────────────────────────
  useEffect(() => {
    fetch("https://raw.githubusercontent.com/statsbomb/open-data/master/data/matches/43/106.json")
      .then(r => r.json())
      .then(matches => {
        const stats = {};
        const add = n => { if (!stats[n]) stats[n] = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0 }; };
        matches.forEach(m => {
          const h = toAppName(m.home_team?.home_team_name || "");
          const a = toAppName(m.away_team?.away_team_name || "");
          const hs = m.home_score, as_ = m.away_score;
          if (!h || !a || hs == null) return;
          add(h); add(a);
          stats[h].p++; stats[a].p++;
          stats[h].gf += hs; stats[h].ga += as_;
          stats[a].gf += as_; stats[a].ga += hs;
          if (hs > as_) { stats[h].w++; stats[a].l++; }
          else if (hs < as_) { stats[a].w++; stats[h].l++; }
          else { stats[h].d++; stats[a].d++; }
        });
        setSbStats(stats);
      })
      .catch(() => {});
  }, []);

  // ── fbref.com possession data ─────────────────────────────────────────
  useEffect(() => {
    fetch("/api/possession")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { if (d?.matches) setPossData(d.matches); })
      .catch(() => {});
  }, []);

  // ── Live polling: OneFootball (primary) + ESPN (fallback) every 30s ───
  useEffect(() => {
    const LIVE_PERIODS = new Set([
      "FIRST_HALF","SECOND_HALF","EXTRA_TIME_FIRST_HALF",
      "EXTRA_TIME_SECOND_HALF","EXTRA_TIME","PENALTY_SHOOTOUT",
    ]);
    const FT_PERIODS = new Set(["FULL_TIME","POST_MATCH"]);

    // Merge an array of {hn,an,hs,as_,isLive,isFinal,clock} into fx state
    const applyUpdates = updates => {
      if (!updates.length) return;
      setFx(prev => prev.map(f => {
        const u = updates.find(m => {
          const fuzzy = (a, b) => {
            if (!a || !b) return false;
            const al = a.toLowerCase(), bl = b.toLowerCase();
            return al === bl || al.startsWith(bl.slice(0, 5)) || bl.startsWith(al.slice(0, 5));
          };
          return fuzzy(m.hn, f.h) && fuzzy(m.an, f.a);
        });
        if (!u || (!u.isLive && !u.isFinal)) return f;
        return { ...f, s: [u.hs, u.as_], st: u.isFinal ? "FT" : "LIVE", clock: u.clock };
      }));
    };

    // OneFootball — live minute, score, period for FIFA WC (competition_id "12")
    const pollOF = () =>
      fetch("https://api.onefootball.com/web-experience/en/matches")
        .then(r => r.json())
        .then(data => {
          const updates = [];
          (data?.containers || []).forEach(c => {
            const cards = c?.fullWidth?.component?.matchCardsList?.matchCards || [];
            cards.forEach(m => {
              const params = m.trackingEvents?.[0]?.typedServerParameter || {};
              if (params.competition_id?.value !== "12") return;
              const period = m.period || "";
              updates.push({
                hn: toAppNameESPN(m.homeTeam?.name || ""),
                an: toAppNameESPN(m.awayTeam?.name || ""),
                hs: parseInt(m.homeTeam?.score) || 0,
                as_: parseInt(m.awayTeam?.score) || 0,
                isLive: LIVE_PERIODS.has(period),
                isFinal: FT_PERIODS.has(period),
                clock: m.timePeriod || "",
              });
            });
          });
          applyUpdates(updates);
          return updates.length > 0; // true = OF had WC data
        })
        .catch(() => false);

    // ESPN — fallback when OneFootball has no live WC data
    const pollESPN = () =>
      fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard")
        .then(r => r.json())
        .then(data => {
          const updates = [];
          (data?.events || []).forEach(ev => {
            const comp = ev.competitions?.[0];
            const home = (comp?.competitors || []).find(c => c.homeAway === "home");
            const away = (comp?.competitors || []).find(c => c.homeAway === "away");
            if (!home || !away) return;
            const state = ev.status?.type?.state;
            updates.push({
              hn: toAppNameESPN(home.team?.displayName || ""),
              an: toAppNameESPN(away.team?.displayName || ""),
              hs: parseInt(home.score) || 0,
              as_: parseInt(away.score) || 0,
              isLive: state === "in",
              isFinal: state === "post",
              clock: ev.status?.displayClock || "",
            });
          });
          applyUpdates(updates);
        })
        .catch(() => {});

    const poll = async () => {
      const ofOk = await pollOF();
      if (!ofOk) pollESPN(); // ESPN as fallback only
    };

    poll();
    const id = setInterval(poll, 30000);
    return () => clearInterval(id);
  }, []);

  async function genHero() {
    setHeroLoading(true);
    setHero(null);
    setHeroError("");
    const prompt = "cinematic packed football stadium World Cup final night, roaring crowd of fans waving flags and scarves, anonymous soccer players celebrating on the pitch in foreground, confetti, dramatic floodlights and light beams, epic atmosphere, painterly, no logos, no recognizable faces";

    // Pollinations returns images via a plain GET URL — set as img src directly
    // (avoids CORS issues that occur when using fetch() on image endpoints).
    const seed = Math.floor(Math.random() * 999999);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=1024&height=512&nologo=true&seed=${seed}${polTokenParam}`;

    // Pre-load to detect errors, then hand off to <img> tag via state
    const img = new Image();
    img.onload = () => { setHero(url); setHeroLoading(false); };
    img.onerror = () => {
      setHeroError("Image generation failed — Pollinations.ai did not return an image. Try again.");
      setHeroLoading(false);
    };
    img.src = url;
    // onerror/onload will fire asynchronously — don't call setHeroLoading(false) here
  }

  const TABS = [
    { k: "matches", icon: "⚽", label: "Matches" },
    { k: "predict", icon: "🎯", label: "Predictor" },
    { k: "title", icon: "📊", label: "Title Race" },
    { k: "accuracy", icon: "📈", label: "Accuracy" },
    { k: "groups", icon: "📋", label: "Groups" },
    { k: "bracket", icon: "🏆", label: "Final Path" },
    { k: "reviews", icon: "⭐", label: "Reviews" },
  ];

  return (
    <div className="app-root" style={{
      minHeight: "100vh",
      color: C.text,
      fontFamily: "ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
      WebkitFontSmoothing: "antialiased",
      overflowX: "hidden",
    }}>
      {/* global style injection */}
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_STYLES }} />

      {/* living aurora background — slow drifting color fields */}
      <div className="aurora" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        <span className="aurora-blob aurora-1" />
        <span className="aurora-blob aurora-2" />
        <span className="aurora-blob aurora-3" />
      </div>

      {/* subtle grid overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.04, zIndex: 0,
        backgroundImage: `linear-gradient(${C.text} 1px,transparent 1px),linear-gradient(90deg,${C.text} 1px,transparent 1px)`,
        backgroundSize: "52px 52px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, #000 40%, transparent 100%)",
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }} className="main-pad">

        {/* ── HEADER ────────────────────────────────────────────────── */}
        {(() => {
          const liveCount = fx.filter(f => f.st === "LIVE").length;
          return (
            <header style={{
              display: "flex", alignItems: "center", gap: 14, marginBottom: 20,
              background: "linear-gradient(270deg, #7c5cff18, #2bb67318, #3b82f618, #f5c45118)",
              backgroundSize: "400% 400%",
              animation: "headerGrad 12s ease infinite",
              border: `1px solid ${C.line}`, borderRadius: 18, padding: "14px 18px",
              backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            }}>
              <div style={{ fontSize: 32, flexShrink: 0 }}>🏆</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h1 className="header-title" style={{ margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>
                  World Cup <span style={{ color: C.gold }}>Predictor</span>
                </h1>
                <div className="header-subtitle" style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>
                  FIFA World Cup 2026 · USA · Canada · Mexico — live results &amp; Poisson engine
                </div>
              </div>
              <div className="header-pills" style={{ display: "flex", gap: 6, flexWrap: "wrap", flexShrink: 0, alignItems: "center" }}>
                {liveCount > 0 && (
                  <span style={{ ...pill(C.red), animation: "pulse 1.4s ease-in-out infinite" }}>
                    ● {liveCount} LIVE
                  </span>
                )}
                <button onClick={() => setTheme(t => t === "light" ? "dark" : "light")}
                  className="nav-btn" aria-label="Toggle light / dark mode"
                  title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                  style={{ ...pill(C.gold), cursor: "pointer", background: C.panel2, minWidth: 38 }}>
                  {theme === "light" ? "🌙" : "☀️"}
                </button>
                <span style={pill(C.red)}>🇨🇦</span>
                <span style={pill(C.green)}>🇲🇽</span>
                <span style={pill(C.blue)}>🇺🇸</span>
                {user ? (
                  <button onClick={() => supabase.auth.signOut()} className="nav-btn" title={user.email}
                    style={{ ...pill(C.dimMid), cursor: "pointer", background: C.panel2 }}>
                    {user.email?.[0]?.toUpperCase() || "U"} · Sign out
                  </button>
                ) : (
                  <button onClick={() => setShowAuth(true)} className="nav-btn"
                    style={{ ...pill(C.blue), cursor: "pointer" }}>
                    Sign in
                  </button>
                )}
              </div>
            </header>
          );
        })()}

        {/* ── DESKTOP TOP NAV ─────────────────────────────────────── */}
        <nav className="top-nav" style={{ gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {TABS.map(({ k, icon, label }) => (
            <button key={k} className="nav-btn" onClick={() => setTab(k)} style={{
              padding: "10px 18px", borderRadius: 12, cursor: "pointer",
              fontWeight: 700, fontSize: 14, border: `1px solid ${tab === k ? C.gold : C.line}`,
              background: tab === k
                ? `linear-gradient(135deg, ${C.gold}22, ${C.grad}18)`
                : C.panel,
              color: tab === k ? C.gold : C.dim,
              boxShadow: tab === k ? `0 0 16px ${C.goldGlow}` : "none",
              minHeight: 44, minWidth: 44,
            }}>
              {icon} {label}
            </button>
          ))}
        </nav>

        {/* ── TAB CONTENT ─────────────────────────────────────────── */}
        <div key={tab} className="tab-content">

          {/* MATCHES ------------------------------------------------ */}
          {tab === "matches" && (() => {
            // Date order map for sorting "Jun 11" → 20260611, etc.
            const MONTHS = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 };
            const dateKey = d => { const [m, day] = d.split(" "); return MONTHS[m] * 100 + parseInt(day); };
            const sortKey = f => dateKey(f.d) * 10000 + parseInt((f.t || "00:00").replace(":",""));

            const live     = fx.filter(f => f.st === "LIVE").sort((a,b) => sortKey(a) - sortKey(b));
            const upcoming = fx.filter(f => f.st === "UP").sort((a,b) => sortKey(a) - sortKey(b));
            const done     = fx.filter(f => f.st === "FT").sort((a,b) => sortKey(b) - sortKey(a));

            // Group an array of matches by date label (preserving sort order)
            const byDate = arr => {
              const map = [];
              const seen = {};
              arr.forEach(f => {
                if (!seen[f.d]) { seen[f.d] = []; map.push({ date: f.d, matches: seen[f.d] }); }
                seen[f.d].push(f);
              });
              return map;
            };

            return (
              <div style={{ display: "grid", gap: 8 }}>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                ) : (
                  <>
                    {/* 1 — LIVE matches (always first) */}
                    {live.length > 0 && (
                      <>
                        <div className="section-label" style={{ color: C.red, display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{width:8,height:8,borderRadius:"50%",background:C.red,display:"inline-block",animation:"pulse 1.4s ease-in-out infinite"}} />
                          Live Now · {live.length} match{live.length !== 1 ? "es" : ""}
                        </div>
                        {live.map((f, i) => <MatchCard key={`live-${i}`} f={f} poss={possData[`${f.h}|${f.a}`]} />)}
                      </>
                    )}

                    {/* 2 — COMPLETED — newest date first */}
                    {done.length > 0 && (
                      <>
                        <div className="section-label" style={{ marginTop: live.length ? 8 : 0 }}>
                          Completed · {done.length} results
                          {!live.length && (
                            <span style={{ color: C.dimMid, fontWeight: 400, fontSize: 11, marginLeft: 8 }}>
                              · no matches live right now
                            </span>
                          )}
                        </div>
                        {byDate(done).map(({ date, matches }) => (
                          <React.Fragment key={`ft-${date}`}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.dimMid, letterSpacing: 1.2, textTransform: "uppercase", padding: "4px 2px 2px", borderBottom: `1px solid ${C.line}` }}>{date}</div>
                            {matches.map((f, i) => <MatchCard key={`ft-${date}-${i}`} f={f} poss={possData[`${f.h}|${f.a}`]} />)}
                          </React.Fragment>
                        ))}
                      </>
                    )}

                    {/* 3 — UPCOMING — chronological, nearest first */}
                    {upcoming.length > 0 && (
                      <>
                        <div className="section-label" style={{ marginTop: done.length || live.length ? 8 : 0 }}>
                          Upcoming · {upcoming.length} matches
                        </div>
                        {byDate(upcoming).map(({ date, matches }) => (
                          <React.Fragment key={`up-${date}`}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: C.dimMid, letterSpacing: 1.2, textTransform: "uppercase", padding: "4px 2px 2px", borderBottom: `1px solid ${C.line}` }}>{date}</div>
                            {matches.map((f, i) => <MatchCard key={`up-${date}-${i}`} f={f} poss={possData[`${f.h}|${f.a}`]} />)}
                          </React.Fragment>
                        ))}
                      </>
                    )}
                  </>
                )}
                <div style={{ color: C.dim, fontSize: 11, marginTop: 4, padding: "0 2px", textAlign: "center" }}>
                  Live scores via OneFootball · ESPN · worldcup26.ir · refreshes every 30s
                </div>
              </div>
            );
          })()}

          {/* PREDICTOR ---------------------------------------------- */}
          {tab === "predict" && (
            <div style={{ display: "grid", gap: 16 }}>
              {/* team picker */}
              <div style={glassCard}>
                {/* team art banners */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  <img src={teamImg(home)} alt={home} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.green}44` }} onError={e => { e.target.style.display = "none"; }} />
                  <img src={teamImg(away)} alt={away} style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.red}44` }} onError={e => { e.target.style.display = "none"; }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 14, alignItems: "end" }}>
                  <Sel label="Home / Team A" value={home} onChange={setHome} />
                  <div style={{ textAlign: "center", color: C.gold, fontWeight: 900, fontSize: 22, paddingBottom: 8 }}>VS</div>
                  <Sel label="Away / Team B" value={away} onChange={setAway} />
                </div>
                <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14, color: C.dim, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={neutral} onChange={e => setNeutral(e.target.checked)} />
                  Neutral venue (uncheck to give Team A host-nation home advantage)
                </label>
              </div>

              {/* probability gauge */}
              <div style={glassCard}>
                <h3 style={{ margin: "0 0 16px", fontSize: 15, color: C.text }}>Win probability</h3>
                <ProbGauge w={pred.pW} d={pred.pD} l={pred.pL} homeLabel={home.split(" ")[0]} awayLabel={away.split(" ")[0]} />
              </div>

              {/* xG stats */}
              <div style={glassCard}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Expected goals</h3>
                <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Stat label={`xG — ${home}`} val={pred.xgH.toFixed(2)} col={C.green} />
                  <Stat label={`xG — ${away}`} val={pred.xgA.toFixed(2)} col={C.red} />
                  <Stat label="Rating gap" val={`${pred.rH - pred.rA > 0 ? "+" : ""}${(pred.rH - pred.rA).toFixed(1)}`} col={C.blue} />
                  <Stat label="Home rating" val={pred.rH.toFixed(1)} col={C.gold} />
                </div>
              </div>

              {/* StatsBomb WC2022 historical record */}
              {(sbStats[home] || sbStats[away]) && (
                <div style={glassCard}>
                  <h3 style={{ margin: "0 0 14px", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                    📊 <span>WC2022 Performance <span style={{ color: C.dim, fontWeight: 400, fontSize: 12 }}>(StatsBomb open data)</span></span>
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {[{ name: home, col: C.green }, { name: away, col: C.red }].map(({ name, col }) => {
                      const s = sbStats[name];
                      if (!s) return (
                        <div key={name} style={{ background: C.panel2, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.line}` }}>
                          <div style={{ color: col, fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{name}</div>
                          <div style={{ color: C.dim, fontSize: 12 }}>Not in WC2022</div>
                        </div>
                      );
                      return (
                        <div key={name} style={{ background: C.panel2, borderRadius: 10, padding: "12px 14px", border: `1px solid ${col}33` }}>
                          <div style={{ color: col, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{name}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 12 }}>
                            <span style={{ color: C.dim }}>Played</span><span style={{ fontWeight: 700 }}>{s.p}</span>
                            <span style={{ color: C.dim }}>W / D / L</span><span style={{ fontWeight: 700 }}>{s.w}/{s.d}/{s.l}</span>
                            <span style={{ color: C.dim }}>Goals</span><span style={{ fontWeight: 700 }}>{s.gf}–{s.ga}</span>
                            <span style={{ color: C.dim }}>Diff</span>
                            <span style={{ fontWeight: 700, color: s.gf - s.ga > 0 ? C.green : s.gf - s.ga < 0 ? C.red : C.dim }}>
                              {s.gf - s.ga > 0 ? "+" : ""}{s.gf - s.ga}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* scoreline list */}
              <div style={glassCard}>
                <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Most likely scorelines</h3>
                <div style={{ display: "grid", gap: 10 }}>
                  {pred.top.map((s, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: 12,
                      background: i === 0 ? C.goldGlow : "transparent",
                      borderRadius: 10, padding: i === 0 ? "8px 10px" : "4px 2px",
                      border: i === 0 ? `1px solid ${C.gold}33` : "1px solid transparent",
                    }}>
                      <div style={{
                        width: 60, fontWeight: 900, fontSize: 18,
                        color: i === 0 ? C.gold : C.text,
                        textAlign: "center",
                      }}>{s.score}</div>
                      <div style={{ flex: 1, height: 10, background: C.panel2, borderRadius: 6, overflow: "hidden" }}>
                        <div style={{
                          width: `${(s.p / pred.top[0].p) * 100}%`, height: "100%",
                          background: i === 0
                            ? `linear-gradient(90deg,${C.gold},${C.grad})`
                            : `linear-gradient(90deg,${C.grad},${C.blue})`,
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                      <span style={{ width: 46, textAlign: "right", color: C.dim, fontSize: 13, fontWeight: 600 }}>
                        {(s.p * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ color: C.dim, fontSize: 11, marginTop: 14 }}>
                  Engine: rating-driven bivariate Poisson, auto-updated by Elo pass over finished matches.
                </div>
              </div>

              {/* AI Pundit card */}
              <div style={glassCard}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15 }}>⚡ Tactical Breakdown</h3>
                    <div style={{ color: C.dim, fontSize: 12, marginTop: 3 }}>Powered by Groq · Llama 3.3 70B (Pollinations fallback)</div>
                  </div>
                  <button onClick={getAIAnalysis} disabled={punditLoading} style={{
                    padding: "10px 20px", borderRadius: 10, cursor: punditLoading ? "not-allowed" : "pointer",
                    fontWeight: 700, fontSize: 13, border: `1px solid ${C.grad}`,
                    background: `linear-gradient(135deg,${C.grad}22,${C.blue}11)`,
                    color: C.grad, minHeight: 44, opacity: punditLoading ? 0.6 : 1,
                    transition: "opacity 0.2s",
                  }}>
                    {punditLoading ? "Analysing…" : punditText ? "Regenerate" : "Analyse this match"}
                  </button>
                </div>
                {punditLoading && !punditText && (
                  <div style={{ display: "grid", gap: 8 }}>
                    {[100, 85, 92, 70].map((w, i) => (
                      <div key={i} className="skeleton" style={{ height: 13, borderRadius: 6, width: `${w}%` }} />
                    ))}
                  </div>
                )}
                {punditText && (
                  <div style={{
                    color: C.text, fontSize: 14, lineHeight: 1.72,
                    borderLeft: `3px solid ${C.grad}66`, paddingLeft: 14,
                    whiteSpace: "pre-wrap",
                  }}>
                    {punditText}
                    {punditLoading && <span style={{ animation: "blink 1s step-end infinite", color: C.grad }}>▍</span>}
                  </div>
                )}
                {!punditText && !punditLoading && (
                  <div style={{ color: C.dim, fontSize: 13, textAlign: "center", padding: "12px 0" }}>
                    Pick two teams above, then hit <strong style={{ color: C.grad }}>Analyse this match</strong> for a tactical breakdown.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TITLE RACE -------------------------------------------- */}
          {tab === "title" && (
            <div style={{ display: "grid", gap: 16 }}>
              {/* podium top 3 */}
              <div style={glassCard}>
                <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>Championship favorites — podium</h3>
                <div className="podium-wrap" style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                  {[
                    { rank: 1, medal: "🥇", col: C.gold, glow: C.goldGlow, scale: 1.08 },
                    { rank: 0, medal: "🥈", col: "#c0c8d8", glow: "rgba(192,200,216,0.15)", scale: 1 },
                    { rank: 2, medal: "🥉", col: "#cd7f32", glow: "rgba(205,127,50,0.18)", scale: 0.95 },
                  ].map(({ rank, medal, col, glow, scale }) => {
                    const p = probs[rank];
                    return (
                      <div key={rank} style={{
                        background: C.panel2, border: `1px solid ${col}55`,
                        borderRadius: 16, padding: "20px 24px", textAlign: "center",
                        flex: "1 1 140px", maxWidth: 200,
                        boxShadow: `0 8px 28px ${glow}`,
                        transform: `scale(${scale})`,
                        transition: "transform 0.2s",
                      }}>
                        <div style={{ fontSize: 30 }}>{medal}</div>
                        <Flag code={p.code} size={36} />
                        <div style={{ fontWeight: 900, fontSize: 17, marginTop: 8 }}>{p.name}</div>
                        <div style={{ ...pill(col), margin: "8px auto 0", display: "inline-flex" }}>
                          {p.code}
                        </div>
                        <div style={{ color: col, fontWeight: 800, fontSize: 22, marginTop: 10 }}>
                          {(p.p * 100).toFixed(1)}%
                        </div>
                        <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>win probability</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* bar chart */}
              <div style={glassCard}>
                <h3 style={{ margin: "0 0 4px", fontSize: 16 }}>Full model probability — top 12</h3>
                <p style={{ margin: "0 0 14px", color: C.dim, fontSize: 13 }}>
                  Market favorites: Spain (~+400), England, France, Argentina &amp; Brazil (~+800).
                </p>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart
                    data={probs.slice(0, 12).map(p => ({ name: p.code, prob: +(p.p * 100).toFixed(1) }))}
                    layout="vertical" margin={{ left: 8, right: 24 }}
                  >
                    <XAxis type="number" stroke={C.dim} tick={{ fontSize: 12 }} unit="%" />
                    <YAxis type="category" dataKey="name" stroke={C.dim} width={44} tick={{ fontSize: 12, fontWeight: 700 }} />
                    <Tooltip
                      contentStyle={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 10, color: C.text }}
                      formatter={v => [`${v}%`, "Win prob"]}
                    />
                    <Bar dataKey="prob" radius={[0, 8, 8, 0]}>
                      {probs.slice(0, 12).map((_, i) => (
                        <Cell key={i} fill={i === 0 ? C.gold : i === 1 ? "#c0c8d8" : i === 2 ? "#cd7f32" : i < 5 ? C.grad : C.blue} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* radar chart */}
              <div style={glassCard} className="radar-wrap">
                <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Contender profile — top 6</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={probs.slice(0, 6).map(p => ({ team: p.code, rating: ratings[p.name] }))}>
                    <PolarGrid stroke={C.line} />
                    <PolarAngleAxis dataKey="team" tick={{ fill: C.text, fontSize: 12, fontWeight: 700 }} />
                    <PolarRadiusAxis domain={[70, 95]} tick={{ fill: C.dim, fontSize: 10 }} />
                    <Radar dataKey="rating" stroke={C.gold} fill={C.gold} fillOpacity={0.25} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* GROUPS ------------------------------------------------- */}
          {tab === "groups" && (
            <div className="groups-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
              {["A", "B", "C", "D", "E", "F"].map(g => {
                const rows = standings(g, fx, ratings);
                return (
                  <div key={g} style={glassCard}>
                    <h3 style={{ margin: "0 0 12px", fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ ...pill(C.gold), fontSize: 13 }}>Group {g}</span>
                    </h3>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ color: C.dim, textAlign: "right" }}>
                          <th style={{ textAlign: "left", fontWeight: 600, paddingBottom: 8 }}>Team</th>
                          <th style={{ paddingBottom: 8 }}>P</th>
                          <th style={{ paddingBottom: 8 }}>W</th>
                          <th style={{ paddingBottom: 8 }}>D</th>
                          <th style={{ paddingBottom: 8 }}>L</th>
                          <th style={{ paddingBottom: 8 }}>GD</th>
                          <th style={{ color: C.gold, paddingBottom: 8 }}>Pts</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((t, i) => {
                          const promoted = i < 2;
                          return (
                            <tr key={t.name} style={{
                              borderTop: `1px solid ${C.line}`,
                              background: promoted
                                ? i === 0 ? `${C.green}14` : `${C.green}09`
                                : i % 2 === 0 ? "transparent" : `${C.panel2}88`,
                            }}>
                              <td style={{ textAlign: "left", padding: "7px 0", fontWeight: promoted ? 700 : 500 }}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                  <span style={{
                                    width: 20, height: 20, borderRadius: "50%",
                                    background: promoted ? C.green + "33" : C.panel2,
                                    border: `1px solid ${promoted ? C.green + "66" : C.line}`,
                                    color: promoted ? C.green : C.dim,
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 10, fontWeight: 800, flexShrink: 0,
                                  }}>{i + 1}</span>
                                  <Flag code={byName[t.name]?.code} size={16} />
                                  <span style={{ color: promoted ? C.text : C.dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{t.name}</span>
                                </span>
                              </td>
                              <td style={{ textAlign: "right", color: C.dim }}>{t.pld}</td>
                              <td style={{ textAlign: "right", color: t.w > 0 ? C.green : C.dim }}>{t.w}</td>
                              <td style={{ textAlign: "right", color: C.dim }}>{t.d}</td>
                              <td style={{ textAlign: "right", color: t.l > 0 ? C.red : C.dim }}>{t.l}</td>
                              <td style={{ textAlign: "right", color: (t.gf - t.ga) > 0 ? C.green : (t.gf - t.ga) < 0 ? C.red : C.dim }}>
                                {t.gf - t.ga > 0 ? "+" : ""}{t.gf - t.ga}
                              </td>
                              <td style={{ textAlign: "right", fontWeight: 900, color: promoted ? C.gold : C.dim, fontSize: 15 }}>{t.pts}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {rows.length === 0 && (
                      <div style={{ color: C.dim, fontSize: 12, padding: "8px 0" }}>No matches played yet.</div>
                    )}
                  </div>
                );
              })}
              <div style={{ ...glassCard, gridColumn: "1/-1", color: C.dim, fontSize: 12 }}>
                <span style={{ color: C.green, fontWeight: 700 }}>Green rows</span> = top 2 advance automatically.
                Best 8 third-place teams also progress to the Round of 32.
              </div>
            </div>
          )}

          {/* BRACKET / FINAL PATH ------------------------------------ */}
          {tab === "bracket" && (
            <div style={{ display: "grid", gap: 16 }}>
              {/* hero / trophy */}
              <div style={{ ...glassCard, textAlign: "center", overflow: "hidden" }}>
                <Trophy />
                <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>
                  Final · July 19, 2026 · MetLife Stadium, New York / New Jersey
                </div>
              </div>

              {/* projected final VS card */}
              <div style={{
                ...glassCard,
                background: `linear-gradient(135deg, ${C.gold}12, ${C.grad}10)`,
                border: `1px solid ${C.gold}44`,
                boxShadow: `0 0 32px ${C.goldGlow}`,
                textAlign: "center",
              }}>
                <div style={{ color: C.dim, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                  Projected Final
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 100px", textAlign: "center" }}>
                    <Flag code={probs[0].code} size={44} />
                    <div style={{ fontWeight: 900, fontSize: 22, color: C.gold, marginTop: 8 }}>{probs[0].name}</div>
                    <div style={{ color: C.green, fontWeight: 700, marginTop: 4 }}>{(probs[0].p * 100).toFixed(1)}% to win</div>
                  </div>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: `radial-gradient(circle, ${C.grad}44, ${C.panel2})`,
                    border: `2px solid ${C.grad}88`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: 16, color: C.grad, flexShrink: 0,
                    boxShadow: `0 0 18px ${C.gradGlow}`,
                  }}>VS</div>
                  <div style={{ flex: "1 1 100px", textAlign: "center" }}>
                    <Flag code={probs[1].code} size={44} />
                    <div style={{ fontWeight: 900, fontSize: 22, color: C.text, marginTop: 8 }}>{probs[1].name}</div>
                    <div style={{ color: C.dim, fontWeight: 600, marginTop: 4 }}>{(probs[1].p * 100).toFixed(1)}% to win</div>
                  </div>
                </div>
              </div>

              {/* top 8 projected */}
              <div style={glassCard}>
                <h3 style={{ margin: "0 0 14px", fontSize: 15 }}>Top 8 projected</h3>
                <div className="semifinal-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                  {probs.slice(0, 8).map((p, i) => {
                    const accent = [C.gold, "#c0c8d8", "#cd7f32", C.blue, C.grad, C.green, C.red, C.dimMid][i];
                    const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣"];
                    return (
                      <div key={p.name} style={{
                        background: C.panel2, border: `1px solid ${accent}44`,
                        borderRadius: 12, padding: "14px 10px", textAlign: "center",
                        borderTop: `3px solid ${accent}`,
                        boxShadow: i < 2 ? `0 4px 16px ${accent}22` : "none",
                      }}>
                        <div style={{ fontSize: 16, marginBottom: 6 }}>{medals[i]}</div>
                        <Flag code={p.code} size={28} />
                        <div style={{ fontWeight: 800, marginTop: 6, fontSize: 13, lineHeight: 1.2 }}>{p.name}</div>
                        <div style={{ color: accent, fontSize: 14, fontWeight: 900, marginTop: 5 }}>
                          {(p.p * 100).toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ color: C.dim, fontSize: 11, marginTop: 12 }}>
                  Model forecast — updates live as Elo ratings shift with each result.
                </div>
              </div>

              {/* hero gen button */}
              <div style={{ ...glassCard, textAlign: "center" }}>
                <button onClick={genHero} disabled={heroLoading} className="nav-btn" style={{
                  padding: "12px 24px", borderRadius: 12, cursor: "pointer",
                  fontWeight: 700, fontSize: 14, border: `1px solid ${C.gold}`,
                  background: `linear-gradient(135deg, ${C.gold}1c, ${C.grad}10)`,
                  color: C.gold, minHeight: 48, minWidth: 48,
                  opacity: heroLoading ? 0.6 : 1,
                }}>
                  {heroLoading ? "Generating…" : "Generate stadium hero art"}
                </button>

                {/* generated art preview — shows here at the bottom */}
                {heroLoading && (
                  <div style={{ marginTop: 16, height: 260, borderRadius: 14, border: `1px solid ${C.line}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: C.panel2 }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.gold}44`, borderTopColor: C.gold, animation: "spin3d 0.8s linear infinite" }} />
                    <div style={{ color: C.dim, fontSize: 12 }}>Painting the stadium, fans &amp; players…</div>
                  </div>
                )}
                {!heroLoading && hero && (
                  <figure style={{ margin: "16px 0 0" }}>
                    <img src={hero} alt="Generated World Cup final stadium with fans and players"
                      style={{ width: "100%", borderRadius: 14, border: `1px solid ${C.gold}44`, display: "block", boxShadow: `0 8px 32px rgba(0,0,0,0.4)`, animation: "fadeUp 0.4s ease both" }} />
                    <figcaption style={{ color: C.dim, fontSize: 11, marginTop: 8 }}>
                      AI-generated World Cup final atmosphere · fans, players &amp; crowd
                    </figcaption>
                  </figure>
                )}

                <div style={{ color: C.dim, fontSize: 11, marginTop: 8 }}>
                  Via Pollinations.ai (key optional) · falls back to free URL · then Gemini if <code>VITE_GEMINI_API_KEY</code> is set.
                {heroError && (
                  <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 8, background: C.redGlow, border: `1px solid ${C.red}44`, color: C.red, fontSize: 12, textAlign: "left", wordBreak: "break-word" }}>
                    ⚠️ {heroError}
                  </div>
                )}
                </div>
              </div>
            </div>
          )}

          {/* REVIEWS ------------------------------------------------- */}
          {tab === "accuracy" && <AccuracyTab fx={fx} />}
          {tab === "reviews" && <ReviewsTab />}


        </div>

        {/* footer */}
        <footer style={{ marginTop: 36, color: C.dim, fontSize: 11, textAlign: "center", paddingBottom: 8 }}>
          World Cup Predictor · predictions are model estimates · seeded with real WC2026 data through Jun 14, 2026
        </footer>
      </div>

      {/* ── MOBILE BOTTOM TAB BAR ─────────────────────────────────────── */}
      <nav className="bottom-nav" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "rgba(7,9,15,0.92)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        borderTop: `1px solid ${C.line}`,
        display: "flex", justifyContent: "space-around", alignItems: "stretch",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {TABS.map(({ k, icon, label }) => {
          const active = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)} style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 3, padding: "10px 4px",
              background: "none", border: "none", cursor: "pointer",
              minHeight: 56, minWidth: 44,
              color: active ? C.gold : C.dim,
              borderTop: active ? `2px solid ${C.gold}` : "2px solid transparent",
              transition: "color 0.18s, border-top-color 0.18s",
            }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: 0.2 }}>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── AUTH MODAL ──────────────────────────────────────────────── */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

/* ── helper components ────────────────────────────────────────────────── */

function Sel({ label, value, onChange }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ color: C.dim, fontSize: 12, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        width: "100%", padding: "11px 12px", borderRadius: 10,
        background: C.panel2, color: C.text, border: `1px solid ${C.line}`,
        fontSize: 14, fontWeight: 700, cursor: "pointer", appearance: "none",
        WebkitAppearance: "none",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238a97ad' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        paddingRight: 36,
      }}>
        {[...TEAMS].sort((a, b) => b.rating - a.rating).map(t => (
          <option key={t.name} value={t.name}>{t.name} ({t.code}) · {t.rating}</option>
        ))}
      </select>
    </label>
  );
}

function Stat({ label, val, col }) {
  return (
    <div style={{
      background: C.panel2, border: `1px solid ${(col || C.gold) + "33"}`,
      borderRadius: 12, padding: "14px 16px",
      boxShadow: `0 4px 16px ${(col || C.gold) + "18"}`,
    }}>
      <div style={{ color: C.dim, fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: col || C.gold, marginTop: 4 }}>{val}</div>
    </div>
  );
}
