import { TEAMS, byName } from './constants.js';

const factorial = n => { let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; };
const pois = (k, l) => Math.exp(-l) * Math.pow(l, k) / factorial(k);

export function adjustedRatings(fx) {
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

export function predict(home, away, ratings, neutral = true) {
  const H = byName[home], A = byName[away];
  if (!H || !A) return null;
  const rH = ratings[home], rA = ratings[away];
  const hostBoost = (!neutral && H.host) ? 0.18 : 0;
  const diff = (rH - rA) / 100, base = 1.38;
  const xgH = Math.max(0.15, base * Math.exp(0.95 * diff + hostBoost));
  const xgA = Math.max(0.15, base * Math.exp(-0.95 * diff - hostBoost * 0.5));
  let pW = 0, pD = 0, pL = 0;
  const scl = [];
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const p = pois(i, xgH) * pois(j, xgA);
    if (i > j) pW += p; else if (i === j) pD += p; else pL += p;
    scl.push({ score: `${i}-${j}`, p });
  }
  return { xgH, xgA, pW, pD, pL, top: scl.sort((a, b) => b.p - a.p).slice(0, 5), rH, rA };
}

export function titleProbs(ratings) {
  const arr = TEAMS.map(t => ({ name: t.name, code: t.code, r: ratings[t.name] }));
  const max = Math.max(...arr.map(a => a.r));
  const exps = arr.map(a => ({ ...a, e: Math.exp((a.r - max) / 3.4) }));
  const sum = exps.reduce((s, a) => s + a.e, 0);
  return exps.map(a => ({ ...a, p: a.e / sum })).sort((x, y) => y.p - x.p);
}

export function standings(group, fx, ratings) {
  const teams = {};
  const add = n => { teams[n] = teams[n] || { name: n, pld: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }; };
  fx.filter(f => f.g === group).forEach(f => {
    add(f.h); add(f.a);
    if (f.st !== "FT" || !f.s) return;
    const H = teams[f.h], Aw = teams[f.a], [gh, ga] = f.s;
    H.pld++; Aw.pld++; H.gf += gh; H.ga += ga; Aw.gf += ga; Aw.ga += gh;
    if (gh > ga) { H.w++; Aw.l++; H.pts += 3; }
    else if (gh < ga) { Aw.w++; H.l++; Aw.pts += 3; }
    else { H.d++; Aw.d++; H.pts++; Aw.pts++; }
  });
  return Object.values(teams).sort(
    (a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || ratings[b.name] - ratings[a.name]
  );
}