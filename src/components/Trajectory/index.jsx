import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { SEED_FX, TEAMS, FLAG_ISO } from '../../lib/constants.js';
import { adjustedRatings } from '../../lib/engine.js';
import './index.scss';

const PALETTE = [
  '#F5A623','#52B69A','#4FC3F7','#E91E63','#9C27B0',
  '#FF5722','#8BC34A','#00BCD4','#FF9800','#3F51B5',
  '#26C6DA','#FF4081','#69F0AE','#F06292','#CE93D8','#80CBC4',
];

const played = SEED_FX.filter(f => f.st === 'FT' && f.s);

// Build trajectory: one rating snapshot per match (before + after each)
function buildTrajectory() {
  const fxBefore = [];
  const snaps = [];

  // Point 0: initial ratings before any match
  const initR = adjustedRatings([]);
  snaps.push({ x: 0, label: 'Start', ratings: { ...initR } });

  for (const match of played) {
    fxBefore.push(match);
    const r = adjustedRatings(fxBefore);
    snaps.push({
      x: snaps.length,
      label: `${match.h} ${match.s[0]}–${match.s[1]} ${match.a}`,
      date: match.d,
      ratings: { ...r },
    });
  }
  return snaps;
}

function Flag({ code, size = 20 }) {
  const iso = FLAG_ISO[code];
  if (!iso) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={code}
      width={size}
      height={Math.round(size * 0.67)}
      className="traj-flag"
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const snap = payload[0]?.payload;
  return (
    <div className="traj-tooltip">
      <div className="traj-tooltip__match">{snap?.label || label}</div>
      {snap?.date && <div className="traj-tooltip__date">{snap.date}</div>}
      <div className="traj-tooltip__rows">
        {payload.map(p => (
          <div key={p.dataKey} className="traj-tooltip__row">
            <span className="traj-tooltip__dot" style={{ background: p.color }} />
            <span className="traj-tooltip__name">{p.dataKey}</span>
            <span className="traj-tooltip__val">{Number(p.value).toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Sort teams by final rating descending; default top 8 selected
const sortedTeams = [...TEAMS].sort((a, b) => b.rating - a.rating);
const DEFAULT_SELECTED = new Set(sortedTeams.slice(0, 8).map(t => t.name));

export default function Trajectory() {
  const [selected, setSelected] = useState(DEFAULT_SELECTED);
  const [search, setSearch] = useState('');

  const snaps = useMemo(() => buildTrajectory(), []);

  // Build chart data: each snap becomes one data point with a key per team
  const chartData = useMemo(() =>
    snaps.map(s => {
      const point = { x: s.x, label: s.label, date: s.date };
      for (const name of selected) point[name] = +s.ratings[name]?.toFixed(1);
      return point;
    }),
  [snaps, selected]);

  const teamColor = useMemo(() => {
    const map = {};
    sortedTeams.forEach((t, i) => { map[t.name] = PALETTE[i % PALETTE.length]; });
    return map;
  }, []);

  function toggle(name) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  const finalRatings = snaps[snaps.length - 1]?.ratings || {};
  const filteredTeams = sortedTeams.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="traj-page">
      <div className="page-header">
        <h1 className="page-title">Rating Trajectory</h1>
        <p className="page-sub">How each team's Elo rating has moved across {played.length} group stage matches</p>
      </div>

      <div className="traj-layout">
        {/* Chart */}
        <div className="traj-chart-card">
          <ResponsiveContainer width="100%" height={420}>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="x"
                tick={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                label={{ value: 'Matches played →', position: 'insideBottomRight', offset: -8, fill: '#8899aa', fontSize: 11 }}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: '#8899aa', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={38}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ display: 'none' }}
              />
              {[...selected].map(name => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={teamColor[name]}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          {selected.size === 0 && (
            <div className="traj-empty">Select at least one team from the panel →</div>
          )}
        </div>

        {/* Team selector */}
        <div className="traj-panel">
          <div className="traj-panel__header">
            <span className="traj-panel__title">Teams</span>
            <span className="traj-panel__count">{selected.size} selected</span>
          </div>
          <input
            className="traj-search"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <div className="traj-panel__actions">
            <button className="traj-action-btn" onClick={() => setSelected(new Set(sortedTeams.map(t => t.name)))}>All</button>
            <button className="traj-action-btn" onClick={() => setSelected(new Set())}>None</button>
            <button className="traj-action-btn" onClick={() => setSelected(DEFAULT_SELECTED)}>Top 8</button>
          </div>
          <div className="traj-team-list">
            {filteredTeams.map((t, i) => {
              const isOn = selected.has(t.name);
              const delta = +(finalRatings[t.name] - t.rating).toFixed(1);
              return (
                <button
                  key={t.name}
                  className={`traj-team-btn${isOn ? ' traj-team-btn--on' : ''}`}
                  style={isOn ? { borderColor: teamColor[t.name], background: teamColor[t.name] + '18' } : {}}
                  onClick={() => toggle(t.name)}
                >
                  <span
                    className="traj-team-dot"
                    style={{ background: isOn ? teamColor[t.name] : 'transparent', borderColor: teamColor[t.name] }}
                  />
                  <Flag code={t.code} size={16} />
                  <span className="traj-team-name">{t.name}</span>
                  <span className={`traj-team-delta ${delta >= 0 ? 'delta--up' : 'delta--down'}`}>
                    {delta >= 0 ? '+' : ''}{delta}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
