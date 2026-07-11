import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { SEED_FX, FLAG_ISO, TEAMS } from '../../lib/constants.js';
import { adjustedRatings, titleProbs } from '../../lib/engine.js';
import './index.scss';

function Flag({ code, size = 32 }) {
  const iso = FLAG_ISO[code];
  if (!iso) return null;
  return (
    <img
      src={`https://flagcdn.com/w80/${iso}.png`}
      alt={code}
      width={size}
      height={Math.round(size * 0.67)}
      style={{ borderRadius: 3, objectFit: 'cover', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function TitleRace() {
  const [fx, setFx] = useState(SEED_FX);

  useEffect(() => {
    fetch('/api/fixtures')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.fixtures?.length) setFx(data.fixtures); })
      .catch(() => {});
  }, []);

  const ratings = useMemo(() => adjustedRatings(fx), [fx]);
  const probs = useMemo(() => titleProbs(ratings), [ratings]);

  const podium = probs.slice(0, 3);
  const chartData = probs.slice(0, 16).map(t => ({
    name: t.code,
    pct: parseFloat((t.p * 100).toFixed(1)),
  }));

  const teamByName = Object.fromEntries(TEAMS.map(t => [t.name, t]));

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="chart-tooltip">
        <span className="chart-tooltip__name">{payload[0].payload.name}</span>
        <span className="chart-tooltip__val">{payload[0].value}%</span>
      </div>
    );
  };

  return (
    <div className="title-page">
      <div className="page-header">
        <h1 className="page-title">Title Race</h1>
        <p className="page-sub">Championship probability · Updated after each result</p>
      </div>

      {/* Podium */}
      <div className="podium">
        {podium.map((team, i) => (
          <div key={team.name} className={`podium-card podium-card--${i + 1}`}>
            <div className="podium-card__medal">{MEDALS[i]}</div>
            <Flag code={teamByName[team.name]?.code || ''} size={48} />
            <div className="podium-card__name">{team.name}</div>
            <div className="podium-card__pct">{(team.p * 100).toFixed(1)}%</div>
            <div className="podium-card__rating">Elo {team.r?.toFixed(1)}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="title-chart-card">
        <h2 className="title-chart-card__heading">Top 16 Contenders</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <XAxis dataKey="name" tick={{ fill: '#8899aa', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#8899aa', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={index === 0 ? '#F5A623' : index < 3 ? '#52B69A' : '#1a2f47'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Full table */}
      <div className="title-table-card">
        <h2 className="title-table-card__heading">All 48 Teams</h2>
        <div className="title-table">
          {probs.map((team, i) => (
            <div key={team.name} className="title-row">
              <span className="title-row__rank">{i + 1}</span>
              <Flag code={teamByName[team.name]?.code || ''} size={24} />
              <span className="title-row__name">{team.name}</span>
              <div className="title-row__bar-wrap">
                <div className="title-row__bar" style={{ width: `${(team.p / probs[0].p) * 100}%` }} />
              </div>
              <span className="title-row__pct">{(team.p * 100).toFixed(2)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}