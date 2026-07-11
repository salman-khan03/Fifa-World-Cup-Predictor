import React, { useMemo, useState, useCallback } from 'react';
import { SEED_FX, FLAG_ISO } from '../../lib/constants.js';
import { adjustedRatings, predict } from '../../lib/engine.js';
import './index.scss';

// ── Bracket structure ─────────────────────────────────────────────────────────
// R32 seeds pulled from SEED_FX in order
const R32_MATCHES = SEED_FX.filter(f => f.g === 'R32');

// Rounds in bracket order
const ROUNDS = ['R32', 'R16', 'QF', 'SF', 'F'];
const ROUND_LABELS = { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarter-finals', SF: 'Semi-finals', F: 'Final' };
const MATCH_COUNTS = { R32: 16, R16: 8, QF: 4, SF: 2, F: 1 };

// Build empty picks state
function emptyPicks() {
  return Object.fromEntries(ROUNDS.map(r => [r, Array(MATCH_COUNTS[r]).fill(null)]));
}

// In knockout rounds there are no draws; use pW + pD*0.5 as home advance probability
function koProbs(pred) {
  if (!pred) return { ph: 0.5, pa: 0.5 };
  const ph = Math.min(0.99, Math.max(0.01, pred.pW + pred.pD * 0.5));
  return { ph, pa: +(1 - ph).toFixed(4) };
}

// Get the two teams for a match in a given round (from picks of previous round)
function getTeams(picks, round, idx) {
  if (round === 'R32') {
    const m = R32_MATCHES[idx];
    return m ? [m.h, m.a] : [null, null];
  }
  const prev = ROUNDS[ROUNDS.indexOf(round) - 1];
  return [picks[prev][idx * 2] ?? null, picks[prev][idx * 2 + 1] ?? null];
}

// Simulate one round using model — returns array of winners
function simulateRound(picks, round, ratings) {
  const count = MATCH_COUNTS[round];
  const winners = [];
  for (let i = 0; i < count; i++) {
    const [home, away] = getTeams(picks, round, i);
    if (!home || !away) { winners.push(null); continue; }
    const pred = predict(home, away, ratings, true);
    const { ph } = koProbs(pred);
    winners.push(ph >= 0.5 ? home : away);
  }
  return winners;
}

// Clear all picks from a given round index onwards
function clearFrom(picks, fromRoundIdx) {
  const next = { ...picks };
  for (let i = fromRoundIdx; i < ROUNDS.length; i++) {
    next[ROUNDS[i]] = Array(MATCH_COUNTS[ROUNDS[i]]).fill(null);
  }
  return next;
}

function Flag({ code, size = 22 }) {
  const iso = FLAG_ISO[code];
  if (!iso) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      alt={code}
      width={size}
      height={Math.round(size * 0.67)}
      className="bk-flag"
      onError={e => { e.target.style.display = 'none'; }}
    />
  );
}

// Map team name → flag code
import { TEAMS } from '../../lib/constants.js';
const nameToCode = Object.fromEntries(TEAMS.map(t => [t.name, t.code]));

function MatchCard({ homeTeam, awayTeam, homePick, onPick, pred, roundIdx }) {
  const { ph, pa } = koProbs(pred);
  const modelPick = pred ? (ph >= 0.5 ? homeTeam : awayTeam) : null;

  function TeamRow({ team, prob, isWinner, isModelPick }) {
    if (!team) {
      return (
        <div className="bk-team bk-team--tbd">
          <span className="bk-tbd">TBD</span>
        </div>
      );
    }
    return (
      <button
        className={`bk-team${isWinner ? ' bk-team--winner' : ''}${isModelPick && !homePick ? ' bk-team--model' : ''}`}
        onClick={() => onPick(team)}
        title={`Pick ${team}`}
      >
        <Flag code={nameToCode[team] || ''} size={20} />
        <span className="bk-team__name">{team}</span>
        {prob != null && (
          <span className="bk-team__prob">{(prob * 100).toFixed(0)}%</span>
        )}
        {isWinner && <span className="bk-team__crown">▶</span>}
      </button>
    );
  }

  return (
    <div className={`bk-match${homePick ? ' bk-match--decided' : ''}`}>
      <TeamRow
        team={homeTeam}
        prob={homeTeam ? ph : null}
        isWinner={homePick === homeTeam}
        isModelPick={modelPick === homeTeam}
      />
      <div className="bk-divider" />
      <TeamRow
        team={awayTeam}
        prob={awayTeam ? pa : null}
        isWinner={homePick === awayTeam}
        isModelPick={modelPick === awayTeam}
      />
    </div>
  );
}

export default function Bracket() {
  const [picks, setPicks] = useState(emptyPicks);
  const [activeRound, setActiveRound] = useState('R32');

  const ratings = useMemo(() => {
    const played = SEED_FX.filter(f => f.st === 'FT' && f.s);
    return adjustedRatings(played);
  }, []);

  // Pre-compute predictions for every possible match pair that could appear
  const predCache = useMemo(() => {
    const cache = {};
    function getPred(home, away) {
      if (!home || !away) return null;
      const key = `${home}|${away}`;
      if (!cache[key]) cache[key] = predict(home, away, ratings, true);
      return cache[key];
    }
    // Walk all rounds and cache what we can
    const tempPicks = emptyPicks();
    for (const round of ROUNDS) {
      const count = MATCH_COUNTS[round];
      for (let i = 0; i < count; i++) {
        const [h, a] = getTeams(tempPicks, round, i);
        if (h && a) getPred(h, a);
      }
    }
    return cache;
  }, [ratings]);

  function getPred(home, away) {
    if (!home || !away) return null;
    const key = `${home}|${away}`;
    if (predCache[key]) return predCache[key];
    return predict(home, away, ratings, true);
  }

  function handlePick(round, matchIdx, team) {
    const roundIdx = ROUNDS.indexOf(round);
    setPicks(prev => {
      const next = clearFrom(prev, roundIdx);
      next[round] = [...next[round]];
      next[round][matchIdx] = team;

      // Propagate: if the next round's match slot is now determined (both teams picked
      // from prev round), leave it unpicked so user must click through
      return next;
    });
  }

  function simulateAll() {
    setPicks(() => {
      let current = emptyPicks();
      for (const round of ROUNDS) {
        current[round] = simulateRound(current, round, ratings);
      }
      return current;
    });
  }

  function simulateFrom(round) {
    setPicks(prev => {
      let current = { ...prev };
      const startIdx = ROUNDS.indexOf(round);
      for (let i = startIdx; i < ROUNDS.length; i++) {
        const r = ROUNDS[i];
        current[r] = simulateRound(current, r, ratings);
      }
      return current;
    });
  }

  function reset() { setPicks(emptyPicks()); setActiveRound('R32'); }

  const champion = picks.F[0];
  const matchCount = MATCH_COUNTS[activeRound];
  const roundIdx = ROUNDS.indexOf(activeRound);

  return (
    <div className="bracket-page">
      <div className="page-header">
        <h1 className="page-title">Bracket Simulator</h1>
        <p className="page-sub">Click a team to pick the winner · percentages show model's advance probability</p>
      </div>

      {/* Champion banner */}
      {champion && (
        <div className="bk-champion">
          <span className="bk-champion__label">🏆 Model Champion</span>
          <Flag code={nameToCode[champion] || ''} size={28} />
          <span className="bk-champion__name">{champion}</span>
        </div>
      )}

      {/* Controls */}
      <div className="bk-controls">
        <button className="bk-btn bk-btn--primary" onClick={simulateAll}>
          ⚡ Simulate All Rounds
        </button>
        <button className="bk-btn" onClick={() => simulateFrom(activeRound)}>
          Simulate from {ROUND_LABELS[activeRound]}
        </button>
        <button className="bk-btn bk-btn--danger" onClick={reset}>
          Reset
        </button>
      </div>

      {/* Round tabs */}
      <div className="bk-tabs">
        {ROUNDS.map((r, i) => {
          const picksInRound = picks[r].filter(Boolean).length;
          const total = MATCH_COUNTS[r];
          const complete = picksInRound === total;
          return (
            <button
              key={r}
              className={`bk-tab${activeRound === r ? ' bk-tab--active' : ''}${complete ? ' bk-tab--done' : ''}`}
              onClick={() => setActiveRound(r)}
            >
              <span className="bk-tab__label">{ROUND_LABELS[r]}</span>
              <span className="bk-tab__prog">{picksInRound}/{total}</span>
            </button>
          );
        })}
      </div>

      {/* Matches grid */}
      <div className={`bk-grid bk-grid--${activeRound}`}>
        {Array.from({ length: matchCount }, (_, i) => {
          const [home, away] = getTeams(picks, activeRound, i);
          const pred = getPred(home, away);
          const winner = picks[activeRound][i];
          return (
            <MatchCard
              key={i}
              homeTeam={home}
              awayTeam={away}
              homePick={winner}
              onPick={team => handlePick(activeRound, i, team)}
              pred={pred}
              roundIdx={roundIdx}
            />
          );
        })}
      </div>

      {/* Navigation hint */}
      <div className="bk-nav-hint">
        {activeRound !== 'F' && (
          <button
            className="bk-btn bk-btn--next"
            onClick={() => setActiveRound(ROUNDS[roundIdx + 1])}
          >
            Next: {ROUND_LABELS[ROUNDS[roundIdx + 1]]} →
          </button>
        )}
      </div>
    </div>
  );
}
