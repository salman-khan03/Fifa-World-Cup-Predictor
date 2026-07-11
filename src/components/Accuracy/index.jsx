import React, { useMemo } from 'react';
import { SEED_FX } from '../../lib/constants.js';
import { adjustedRatings, predict } from '../../lib/engine.js';
import './index.scss';

const MATCHDAYS = [
  { label: 'MD 1', dates: ['Jun 11','Jun 12','Jun 13','Jun 14','Jun 15','Jun 16','Jun 17'] },
  { label: 'MD 2', dates: ['Jun 18','Jun 19','Jun 20','Jun 21','Jun 22','Jun 23'] },
  { label: 'MD 3', dates: ['Jun 24','Jun 25','Jun 26','Jun 27'] },
];

function grade(pred, actual) {
  if (!pred || !actual) return { label: '?', cls: '' };
  const [ah, aa] = actual;
  const predResult = pred.pW > pred.pL && pred.pW > pred.pD ? 'W' : pred.pL > pred.pW && pred.pL > pred.pD ? 'L' : 'D';
  const actualResult = ah > aa ? 'W' : ah < aa ? 'L' : 'D';
  const correct = predResult === actualResult;
  const exact = pred.top[0].score === `${ah}-${aa}`;
  if (exact) return { label: 'Exact ✓', cls: 'grade--exact' };
  if (correct) return { label: 'Correct ✓', cls: 'grade--correct' };
  return { label: 'Wrong ✗', cls: 'grade--wrong' };
}

function brierOf(pred, actual) {
  if (!pred || !actual) return null;
  const [ah, aa] = actual;
  const actualW = ah > aa ? 1 : 0, actualD = ah === aa ? 1 : 0, actualL = ah < aa ? 1 : 0;
  return (pred.pW - actualW) ** 2 + (pred.pD - actualD) ** 2 + (pred.pL - actualL) ** 2;
}

// Brier gauge: 0 = perfect, BASELINE = random (1/3 each → 0.667)
const BASELINE = 2 / 3;

function BrierGauge({ score }) {
  const pct = Math.max(0, Math.min(1, 1 - score / BASELINE)) * 100;
  const skill = ((1 - score / BASELINE) * 100).toFixed(1);
  return (
    <div className="brier-gauge">
      <div className="brier-gauge__track">
        <div className="brier-gauge__fill" style={{ width: `${pct}%` }} />
        <div className="brier-gauge__marker" style={{ left: `${pct}%` }} />
      </div>
      <div className="brier-gauge__labels">
        <span>Perfect (0)</span>
        <span>Random (0.667)</span>
      </div>
      <div className="brier-gauge__skill">Brier Skill Score: <strong>+{skill}%</strong> vs random baseline</div>
    </div>
  );
}

function StatCard({ num, label, sub, cls }) {
  return (
    <div className={`acc-stat ${cls || ''}`}>
      <span className="acc-stat__num">{num}</span>
      <span className="acc-stat__label">{label}</span>
      {sub && <span className="acc-stat__sub">{sub}</span>}
    </div>
  );
}

export default function Accuracy() {
  const played = SEED_FX.filter(f => f.st === 'FT' && f.s);

  const graded = useMemo(() => {
    const fxBefore = [];
    return played.map(match => {
      const ratings = adjustedRatings(fxBefore);
      const pred = predict(match.h, match.a, ratings, true);
      const g = grade(pred, match.s);
      const b = brierOf(pred, match.s);
      const conf = pred ? Math.max(pred.pW, pred.pD, pred.pL) : null;
      fxBefore.push(match);
      return { match, pred, grade: g, brier: b, conf };
    });
  }, []);

  const total = graded.length;
  const correct = graded.filter(g => g.grade.cls !== 'grade--wrong').length;
  const exact = graded.filter(g => g.grade.cls === 'grade--exact').length;
  const brier = graded.reduce((s, g) => s + (g.brier ?? 0), 0) / Math.max(total, 1);

  // Per-matchday breakdown
  const matchdayStats = MATCHDAYS.map(md => {
    const rows = graded.filter(g => md.dates.includes(g.match.d));
    if (!rows.length) return null;
    const n = rows.length;
    const c = rows.filter(r => r.grade.cls !== 'grade--wrong').length;
    const e = rows.filter(r => r.grade.cls === 'grade--exact').length;
    const b = rows.reduce((s, r) => s + (r.brier ?? 0), 0) / n;
    return { label: md.label, n, acc: (c / n * 100).toFixed(0), exact: (e / n * 100).toFixed(0), brier: b.toFixed(3) };
  }).filter(Boolean);

  // Confidence calibration buckets
  const confBuckets = [
    { label: 'High (>60%)', test: c => c > 0.60 },
    { label: 'Med (45–60%)', test: c => c >= 0.45 && c <= 0.60 },
    { label: 'Low (<45%)',  test: c => c < 0.45 },
  ].map(bucket => {
    const rows = graded.filter(g => g.conf != null && bucket.test(g.conf));
    if (!rows.length) return { ...bucket, n: 0, acc: '—' };
    const c = rows.filter(r => r.grade.cls !== 'grade--wrong').length;
    return { ...bucket, n: rows.length, acc: (c / rows.length * 100).toFixed(0) + '%' };
  });

  const resultCls = correct / total >= 0.70 ? 'acc-stat--good' : correct / total >= 0.60 ? 'acc-stat--ok' : 'acc-stat--bad';
  const brierCls  = brier <= 0.50 ? 'acc-stat--good' : brier <= 0.62 ? 'acc-stat--ok' : 'acc-stat--bad';
  const exactCls  = exact / total >= 0.20 ? 'acc-stat--good' : exact / total >= 0.10 ? 'acc-stat--ok' : 'acc-stat--bad';

  return (
    <div className="accuracy-page">
      <div className="page-header">
        <h1 className="page-title">Model Accuracy</h1>
        <p className="page-sub">Live out-of-sample validation · {total} matches graded</p>
      </div>

      <div className="acc-stats">
        <StatCard
          num={total > 0 ? (correct / total * 100).toFixed(1) + '%' : '—'}
          label="Result Accuracy"
          sub={`${correct} of ${total} correct`}
          cls={resultCls}
        />
        <StatCard
          num={total > 0 ? (exact / total * 100).toFixed(1) + '%' : '—'}
          label="Exact Scoreline"
          sub={`${exact} of ${total} exact`}
          cls={exactCls}
        />
        <StatCard
          num={brier.toFixed(3)}
          label="Brier Score"
          sub={`baseline 0.667 · ${((1 - brier / BASELINE) * 100).toFixed(1)}% skill`}
          cls={brierCls}
        />
        <StatCard
          num={total}
          label="Matches Graded"
          sub={`${MATCHDAYS.length} matchdays`}
        />
      </div>

      <BrierGauge score={brier} />

      {/* Matchday breakdown */}
      <div className="acc-breakdown-row">
        <div className="acc-card">
          <h2 className="acc-card__heading">Matchday Breakdown</h2>
          <table className="breakdown-table">
            <thead>
              <tr><th>Round</th><th>Matches</th><th>Accuracy</th><th>Exact</th><th>Brier</th></tr>
            </thead>
            <tbody>
              {matchdayStats.map(md => (
                <tr key={md.label}>
                  <td className="md-label">{md.label}</td>
                  <td>{md.n}</td>
                  <td><span className="pct-pill">{md.acc}%</span></td>
                  <td>{md.exact}%</td>
                  <td>{md.brier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Confidence calibration */}
        <div className="acc-card">
          <h2 className="acc-card__heading">Confidence Calibration</h2>
          <p className="acc-card__note">How accurate is the model when it is confident vs uncertain?</p>
          <table className="breakdown-table">
            <thead>
              <tr><th>Confidence</th><th>Matches</th><th>Accuracy</th></tr>
            </thead>
            <tbody>
              {confBuckets.map(b => (
                <tr key={b.label}>
                  <td>{b.label}</td>
                  <td>{b.n}</td>
                  <td><span className="pct-pill">{b.acc}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Match-by-match gradecard */}
      <div className="acc-table-card">
        <h2 className="acc-table-card__heading">Match-by-Match Gradecard</h2>
        <div className="acc-table-wrap">
          <table className="acc-table">
            <thead>
              <tr>
                <th>Match</th>
                <th>Score</th>
                <th>Pred</th>
                <th>Win%</th>
                <th>Draw%</th>
                <th>Loss%</th>
                <th>Brier</th>
                <th>Grade</th>
              </tr>
            </thead>
            <tbody>
              {graded.map(({ match, pred, grade: g, brier: b }, i) => {
                const [ah, aa] = match.s;
                const predResult = pred
                  ? pred.pW > pred.pL && pred.pW > pred.pD ? 'W' : pred.pL > pred.pW && pred.pL > pred.pD ? 'L' : 'D'
                  : '?';
                const brierCls = b == null ? '' : b < 0.30 ? 'brier--good' : b < 0.55 ? 'brier--ok' : 'brier--bad';
                return (
                  <tr key={i}>
                    <td className="match-cell">
                      <span className="team">{match.h}</span>
                      <span className="vs">vs</span>
                      <span className="team">{match.a}</span>
                    </td>
                    <td className="score-cell">{ah}–{aa}</td>
                    <td className="result-cell">{predResult}</td>
                    <td>{pred ? (pred.pW * 100).toFixed(0) + '%' : '—'}</td>
                    <td>{pred ? (pred.pD * 100).toFixed(0) + '%' : '—'}</td>
                    <td>{pred ? (pred.pL * 100).toFixed(0) + '%' : '—'}</td>
                    <td><span className={`brier-val ${brierCls}`}>{b != null ? b.toFixed(3) : '—'}</span></td>
                    <td><span className={`grade-chip ${g.cls}`}>{g.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
