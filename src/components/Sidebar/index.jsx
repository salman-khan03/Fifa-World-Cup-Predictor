import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome, faFutbol, faBullseye, faTrophy,
  faTableList, faStar, faChartBar, faBars, faXmark,
  faSitemap, faChartLine
} from '@fortawesome/free-solid-svg-icons';
import './index.scss';

const links = [
  { to: '/',           icon: faHome,      label: 'Home'        },
  { to: '/matches',    icon: faFutbol,    label: 'Matches'     },
  { to: '/predictor',  icon: faBullseye,  label: 'Predictor'   },
  { to: '/bracket',    icon: faSitemap,   label: 'Bracket'     },
  { to: '/title',      icon: faTrophy,    label: 'Title Race'  },
  { to: '/groups',     icon: faTableList, label: 'Groups'      },
  { to: '/trajectory', icon: faChartLine, label: 'Trajectory'  },
  { to: '/reviews',    icon: faStar,      label: 'Reviews'     },
  { to: '/accuracy',   icon: faChartBar,  label: 'Accuracy'    },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__trophy">🏆</span>
          <div>
            <div className="sidebar__title">FIFA</div>
            <div className="sidebar__sub">World Cup 2026</div>
          </div>
        </div>

        <nav className="sidebar__nav">
          {links.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
            >
              <FontAwesomeIcon icon={icon} className="sidebar__icon" />
              <span className="sidebar__label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <span>Powered by Elo + AI</span>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="topbar">
        <div className="topbar__brand">
          <span>🏆</span>
          <span>WC 2026</span>
        </div>
        <button className="topbar__menu-btn" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
          <FontAwesomeIcon icon={mobileOpen ? faXmark : faBars} />
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="mobile-drawer" onClick={() => setMobileOpen(false)}>
          <nav className="mobile-drawer__nav" onClick={e => e.stopPropagation()}>
            {links.map(({ to, icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) => `mobile-drawer__link${isActive ? ' mobile-drawer__link--active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <FontAwesomeIcon icon={icon} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      )}

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
          >
            <FontAwesomeIcon icon={icon} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}