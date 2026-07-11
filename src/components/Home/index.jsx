import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFutbol, faBullseye, faTrophy, faTableList } from '@fortawesome/free-solid-svg-icons';
import AnimatedLetters from '../AnimatedLetters/index.jsx';
import './index.scss';

const features = [
  { icon: faFutbol,    label: 'Matches',   desc: 'Live fixtures & results',         to: '/matches'   },
  { icon: faBullseye,  label: 'Predictor', desc: 'AI-powered match predictions',    to: '/predictor' },
  { icon: faTrophy,    label: 'Title Race',desc: 'Championship probabilities',       to: '/title'     },
  { icon: faTableList, label: 'Groups',    desc: 'All 12 group standings',           to: '/groups'    },
];

export default function Home() {
  return (
    <div className="home">
      <div className="home__hero">
        <div className="home__hero-glow" />

        <p className="home__eyebrow">FIFA World Cup 2026</p>

        <h1 className="home__heading">
          <AnimatedLetters text="Predict the" delay={0.1} />
          <br />
          <AnimatedLetters text="Beautiful Game" className="home__heading--gold" delay={0.5} />
        </h1>

        <p className="home__tagline" style={{ animationDelay: '1.2s' }}>
          Bivariate Poisson engine · Live Elo ratings · Groq AI analysis
        </p>

        <div className="home__actions" style={{ animationDelay: '1.5s' }}>
          <Link to="/predictor" className="home__btn home__btn--primary">
            Run a Prediction
          </Link>
          <Link to="/matches" className="home__btn home__btn--outline">
            View Fixtures
          </Link>
        </div>
      </div>

      <div className="home__features">
        {features.map(({ icon, label, desc, to }) => (
          <Link to={to} key={label} className="feature-card">
            <div className="feature-card__icon">
              <FontAwesomeIcon icon={icon} />
            </div>
            <h3 className="feature-card__label">{label}</h3>
            <p className="feature-card__desc">{desc}</p>
          </Link>
        ))}
      </div>

      <div className="home__stats">
        <div className="home__stat">
          <span className="home__stat-num">48</span>
          <span className="home__stat-label">Teams</span>
        </div>
        <div className="home__stat">
          <span className="home__stat-num">104</span>
          <span className="home__stat-label">Matches</span>
        </div>
        <div className="home__stat">
          <span className="home__stat-num">16</span>
          <span className="home__stat-label">Venues</span>
        </div>
        <div className="home__stat">
          <span className="home__stat-num">3</span>
          <span className="home__stat-label">Host Nations</span>
        </div>
      </div>
    </div>
  );
}