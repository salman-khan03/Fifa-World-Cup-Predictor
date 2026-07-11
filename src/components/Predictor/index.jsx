import React, { useState, useMemo, useEffect } from 'react';
import { TEAMS, SEED_FX, FLAG_ISO } from '../../lib/constants.js';
import { adjustedRatings, predict } from '../../lib/engine.js';
import './index.scss';

function Flag({ code, size = 40 }) {
  const iso = FLAG_ISO[code];
  if (!iso) return null;
  return (
    <img
      src={`https://flagcdn.com/w80/${iso}.png`}
      alt={code}
      width={size}
      height={Math.round(size * 0.67)}
      className="pred-flag"
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}

function ProbBar({ label, pct, color }) {
  return (
    <div className="prob-bar">
      <div className="prob-bar__info">
        <span className="prob-bar__label">{label}</span>
        <span className="prob-bar__pct" style={{ color }}>{(pct * 100).toFixed(1)}%</span>
      </div>
      <div className="prob-bar__track">
        <div className="prob-bar__fill" style={{ width: `${pct * 100}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Predictor() {
  const [fx, setFx] = useState(SEED_FX);
  const [home, setHome] = useState('Brazil');
  const [away, setAway] = useState('France');
  const [neutral, setNeutral] = useState(true);

  useEffect(() => {
    fetch('/api/fixtures')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.fixtures?.length) setFx(data.fixtures); })
      .catch(() => {});
  }, []);

  const ratings = useMemo(() => adjustedRatings(fx), [fx]);
  const result = useMemo(() => predict(home, away, ratings, neutral), [home, away, ratings, neutral]);

  const homeTeam = TEAMS.find(t => t.name === home);
  const awayTeam = TEAMS.find(t => t.name === away);

  return (
    <div className="predictor-page">
      <div className="page-header">
        <h1 className="page-title">Match Predictor</h1>
        <p className="page-sub">Bivariate Poisson model · Live Elo ratings</p>
      </div>

      <div className="predictor-layout">
        {/* Controls */}
        <div className="pred-controls">
          <div className="pred-team-row">
            <div className="pred-team-select">
              <label className="pred-label">Home Team</label>
              {homeTeam && <Flag code={homeTeam.code} size={48} />}
              <select className="pred-select" value={home} onChange={e => setHome(e.target.value)}>
                {TEAMS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>

            <div className="pred-vs">VS</div>

            <div className="pred-team-select">
              <label className="pred-label">Away Team</label>
              {awayTeam && <Flag code={awayTeam.code} size={48} />}
              <select className="pred-select" value={away} onChange={e => setAway(e.target.value)}>
                {TEAMS.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <label className="neutral-toggle">
            <input type="checkbox" checked={neutral} onChange={e => setNeutral(e.target.checked)} />
            <span>Neutral venue</span>
          </label>
        </div>

        {/* Results */}
        {result && (
          <div className="pred-results">
            <div className="pred-card">
              <h2 className="pred-card__title">Win Probabilities</h2>
              <ProbBar label={`${home} Win`} pct={result.pW} color="var(--teal)" />
              <ProbBar label="Draw" pct={result.pD} color="var(--dim)" />
              <ProbBar label={`${away} Win`} pct={result.pL} color="#ff7043" />

              <div className="pred-xg">
                <div className="pred-xg__item">
                  <span className="pred-xg__num">{result.xgH.toFixed(2)}</span>
                  <span className="pred-xg__label">xG {home}</span>
                </div>
                <div className="pred-xg__divider" />
                <div className="pred-xg__item">
                  <span className="pred-xg__num">{result.xgA.toFixed(2)}</span>
                  <span className="pred-xg__label">xG {away}</span>
                </div>
              </div>
            </div>

            <div className="pred-card">
              <h2 className="pred-card__title">Most Likely Scorelines</h2>
              <div className="scorelines">
                {result.top.map(({ score, p }, i) => (
                  <div key={score} className={`scoreline${i === 0 ? ' scoreline--top' : ''}`}>
                    <span className="scoreline__rank">#{i + 1}</span>
                    <span className="scoreline__score">{score}</span>
                    <span className="scoreline__pct">{(p * 100).toFixed(1)}%</span>
                    <div className="scoreline__bar" style={{ width: `${(p / result.top[0].p) * 100}%` }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="pred-card pred-ratings">
              <h2 className="pred-card__title">Current Elo Ratings</h2>
              <div className="rating-row">
                <span>{home}</span>
                <span className="rating-val">{result.rH?.toFixed(1)}</span>
              </div>
              <div className="rating-row">
                <span>{away}</span>
                <span className="rating-val">{result.rA?.toFixed(1)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}