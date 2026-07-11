import React, { useState, useMemo, useEffect } from 'react';
import { SEED_FX, GROUPS, FLAG_ISO, TEAMS } from '../../lib/constants.js';
import { adjustedRatings, standings } from '../../lib/engine.js';
import './index.scss';

function Flag({ code, size = 20 }) {
  const iso = FLAG_ISO[code];
  if (!iso) return <span className="flag-fallback">{code}</span>;
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={code}
      width={size}
      height={Math.round(size * 0.67)}
      style={{ borderRadius: 2, objectFit: 'cover' }}
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}

function buildCodeMap(teams) {
  const map = {};
  teams.forEach(t => { map[t.name] = t.code; });
  return map;
}

export default function Groups() {
  const [fx, setFx] = useState(SEED_FX);

  useEffect(() => {
    fetch('/api/fixtures')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.fixtures?.length) setFx(data.fixtures); })
      .catch(() => {});
  }, []);

  const ratings = useMemo(() => adjustedRatings(fx), [fx]);
  const codeMap = useMemo(() => buildCodeMap(TEAMS), []);

  return (
    <div className="groups-page">
      <div className="page-header">
        <h1 className="page-title">Group Standings</h1>
        <p className="page-sub">12 groups · 4 teams each · Top 2 advance</p>
      </div>

      <div className="groups-grid">
        {GROUPS.map(g => {
          const table = standings(g, fx, ratings);
          if (!table.length) return null;
          return (
            <div key={g} className="group-card">
              <div className="group-card__header">Group {g}</div>
              <table className="standing-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Team</th>
                    <th>P</th>
                    <th>W</th>
                    <th>D</th>
                    <th>L</th>
                    <th>GD</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((row, i) => (
                    <tr key={row.name} className={i < 2 ? 'advance' : ''}>
                      <td className="pos">{i + 1}</td>
                      <td className="team-cell">
                        <Flag code={codeMap[row.name] || ''} size={18} />
                        <span>{row.name}</span>
                      </td>
                      <td>{row.pld}</td>
                      <td>{row.w}</td>
                      <td>{row.d}</td>
                      <td>{row.l}</td>
                      <td className={row.gf - row.ga > 0 ? 'pos-gd' : row.gf - row.ga < 0 ? 'neg-gd' : ''}>
                        {row.gf - row.ga > 0 ? '+' : ''}{row.gf - row.ga}
                      </td>
                      <td className="pts">{row.pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </div>
  );
}