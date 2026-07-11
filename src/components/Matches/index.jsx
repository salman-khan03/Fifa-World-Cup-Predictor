import React, { useState, useMemo, useEffect } from 'react';
import { SEED_FX, FLAG_ISO, ROUND_LABELS } from '../../lib/constants.js';
import './index.scss';

function Flag({ code, size = 28 }) {
  const iso = FLAG_ISO[code];
  if (!iso) return <span className="flag-fallback">{code}</span>;
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={code}
      width={size}
      height={Math.round(size * 0.67)}
      className="flag-img"
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}

function StatusChip({ st }) {
  const map = { FT: ['FT', 'chip--ft'], UP: ['Upcoming', 'chip--up'], LIVE: ['LIVE', 'chip--live'] };
  const [label, cls] = map[st] || [st, ''];
  return <span className={`chip ${cls}`}>{label}</span>;
}

function PossessionBar({ poss, homeTeam, awayTeam }) {
  if (!poss) return null;
  const [h, a] = poss;
  return (
    <div className="poss-bar">
      <span className="poss-bar__pct poss-bar__pct--home">{h}%</span>
      <div className="poss-bar__track">
        <div className="poss-bar__home" style={{ width: `${h}%` }} />
      </div>
      <span className="poss-bar__pct poss-bar__pct--away">{a}%</span>
      <span className="poss-bar__label">Possession</span>
    </div>
  );
}

// Build a name → code map from FLAG_ISO keys and team names
import { TEAMS } from '../../lib/constants.js';
const nameToCode = Object.fromEntries(TEAMS.map(t => [t.name, t.code]));
const normTeam = s => (s || '').toLowerCase().replace(/[^a-z]/g, '');
const formatRound = g => ROUND_LABELS[g] || `Group ${g}`;

export default function Matches() {
  const [fx, setFx] = useState(SEED_FX);
  const [possession, setPossession] = useState({});
  const [groupFilter, setGroupFilter] = useState('ALL');

  useEffect(() => {
    fetch('/api/fixtures')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.fixtures?.length) setFx(data.fixtures); })
      .catch(() => {});

    // Enrich with FBRef possession data; fall back to seed poss already on each fixture
    fetch('/api/possession')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.possession?.length) return;
        const map = {};
        for (const row of data.possession) {
          if (row.poss_h != null && row.poss_a != null) {
            // Index by both exact and normalised keys for fuzzy matching
            const exact = `${row.home}|${row.away}`;
            const fuzzy = `${normTeam(row.home)}|${normTeam(row.away)}`;
            const entry = [Number(row.poss_h), Number(row.poss_a)];
            map[exact] = entry;
            map[fuzzy] = entry;
          }
        }
        setPossession(map);
      })
      .catch(() => {});
  }, []);

  const groups = useMemo(() => {
    const gs = [...new Set(fx.map(f => f.g))];
    // Keep group-stage letters sorted A-L, then knockout rounds in bracket order
    const knockoutOrder = ['R32','R16','QF','SF','3P','F'];
    const groupLetters = gs.filter(g => !ROUND_LABELS[g]).sort();
    const knockout = knockoutOrder.filter(r => gs.includes(r));
    return ['ALL', ...groupLetters, ...knockout];
  }, [fx]);

  const filtered = groupFilter === 'ALL' ? fx : fx.filter(f => f.g === groupFilter);

  const byDate = filtered.reduce((acc, f) => {
    acc[f.d] = acc[f.d] || [];
    acc[f.d].push(f);
    return acc;
  }, {});

  return (
    <div className="matches-page">
      <div className="page-header">
        <h1 className="page-title">Fixtures</h1>
        <p className="page-sub">
          FIFA World Cup 2026 · All Matches ·{' '}
          <a
            href="https://fbref.com/en/comps/1/World-Cup-Stats"
            target="_blank"
            rel="noopener noreferrer"
            className="fbref-link"
          >
            Stats via FBRef
          </a>
        </p>
      </div>

      <div className="group-filter">
        {groups.map(g => (
          <button
            key={g}
            className={`group-btn${groupFilter === g ? ' group-btn--active' : ''}`}
            onClick={() => setGroupFilter(g)}
          >
            {g === 'ALL' ? 'All' : formatRound(g)}
          </button>
        ))}
      </div>

      {Object.entries(byDate).map(([date, matches]) => (
        <div key={date} className="date-section">
          <div className="date-label">{date}</div>
          <div className="match-grid">
            {matches.map((m, i) => {
              // Resolve possession: API (exact) > API (normalised) > seed data
              const apiKey = `${m.h}|${m.a}`;
              const fuzzyKey = `${normTeam(m.h)}|${normTeam(m.a)}`;
              const poss = possession[apiKey] || possession[fuzzyKey] || m.poss || null;

              return (
                <div key={i} className={`match-card${m.st === 'FT' ? ' match-card--ft' : ''}`}>
                  <div className="match-card__header">
                    <span className="match-card__group">{formatRound(m.g)}</span>
                    <StatusChip st={m.st} />
                    <span className="match-card__time">{m.t}</span>
                  </div>

                  <div className="match-card__teams">
                    <div className="match-card__team">
                      <Flag code={nameToCode[m.h] || ''} size={28} />
                      <span className="match-card__team-name">{m.h}</span>
                    </div>
                    <div className="match-card__score">
                      {m.st === 'FT' && m.s
                        ? <span className="match-card__score-val">{m.s[0]} – {m.s[1]}</span>
                        : <span className="match-card__score-vs">vs</span>
                      }
                    </div>
                    <div className="match-card__team match-card__team--away">
                      <span className="match-card__team-name">{m.a}</span>
                      <Flag code={nameToCode[m.a] || ''} size={28} />
                    </div>
                  </div>

                  {poss && <PossessionBar poss={poss} homeTeam={m.h} awayTeam={m.a} />}

                  <div className="match-card__venue">{m.v}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}