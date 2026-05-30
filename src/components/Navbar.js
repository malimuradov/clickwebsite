import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaMousePointer, FaBolt, FaUser, FaStore, FaCog } from 'react-icons/fa';
import UserProfile from './UserProfile';
import Settings from './Settings';
import '../styles/Navbar.css';

/**
 * Maps a CPS value to a colour token from the design system.
 * 0–5 → muted | 5–15 → cyan | 15–30 → gold | 30+ → red
 *
 * @param {number} cps
 * @returns {string} CSS colour value
 */
const getCpsColor = (cps) => {
  if (cps >= 30) return 'var(--accent-red)';
  if (cps >= 15) return 'var(--accent-gold)';
  if (cps >=  5) return 'var(--accent-cyan)';
  return 'var(--text-dim)';
};

/**
 * Smoothly animates a number from its previous value to a new one.
 * Returns the current animated value.
 *
 * @param {number} target
 * @param {number} durationMs
 * @returns {number}
 */
const useAnimatedNumber = (target, durationMs = 800) => {
  const [display, setDisplay] = useState(target);
  const prevRef  = useRef(target);
  const frameRef = useRef(null);

  useEffect(() => {
    if (target === prevRef.current) return;

    const start     = prevRef.current;
    const end       = target;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease-out quad
      const eased    = 1 - (1 - progress) ** 2;
      setDisplay(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, durationMs]);

  return display;
};

// ─── Component ────────────────────────────────────────────────────────────────

function Navbar({ globalClicks, globalCPS, onReset, username, isLoggedIn, onLogin, onLogout, onToggleShop }) {
  const [showUserProfile, setShowUserProfile] = useState(false);
  const animatedClicks = useAnimatedNumber(globalClicks);
  const cpsColor       = getCpsColor(globalCPS);

  // Cap the CPS bar at a reasonable ceiling (50 CPS = 100%)
  const cpsBarPercent = Math.min((globalCPS / 50) * 100, 100);

  const toggleUserProfile = useCallback(() => setShowUserProfile(v => !v), []);

  return (
    // data-nav excludes ALL navbar clicks from the global click tracker
    <nav className="navbar" data-nav>

      {/* ── Left — Logo ─────────────────────────────────────────────────── */}
      <div className="navbar-left">
        <div className="navbar-logo">
          <span className="logo-bracket">[</span>
          <span className="logo-text">CLICKER</span>
          <span className="logo-bracket">]</span>
        </div>
        <div className="logo-sub">PRECISION MODE</div>
      </div>

      {/* ── Center — Live Stats ──────────────────────────────────────────── */}
      <div className="navbar-center">

        {/* Global clicks */}
        <div className="stat-block">
          <FaMousePointer className="stat-icon" style={{ color: 'var(--accent-cyan)' }} />
          <div className="stat-body">
            <span className="stat-value">{animatedClicks.toLocaleString()}</span>
            <span className="stat-label">Global Clicks</span>
          </div>
        </div>

        <div className="stat-sep" />

        {/* Global CPS + live bar */}
        <div className="stat-block">
          <FaBolt className="stat-icon" style={{ color: cpsColor, filter: `drop-shadow(0 0 4px ${cpsColor})` }} />
          <div className="stat-body">
            <span className="stat-value" style={{ color: cpsColor }}>
              {globalCPS}
              <span className="stat-unit">cps</span>
            </span>
            <span className="stat-label">Global CPS</span>
          </div>
          {/* Thin live CPS bar */}
          <div className="cps-track">
            <div
              className="cps-fill"
              style={{
                width:      `${cpsBarPercent}%`,
                background:  cpsColor,
                boxShadow:  `0 0 6px ${cpsColor}`,
              }}
            />
          </div>
        </div>

      </div>

      {/* ── Right — Actions ──────────────────────────────────────────────── */}
      <div className="navbar-right">

        <button className="nav-action" onClick={onToggleShop} title="Shop" data-nav>
          <FaStore className="action-icon" />
          <span className="action-label">Shop</span>
        </button>

        <button
          className={`nav-action ${showUserProfile ? 'active' : ''}`}
          onClick={toggleUserProfile}
          title="Account"
          data-nav
        >
          <FaUser className="action-icon" />
          <span className="action-label">{username || 'Guest'}</span>
          {/* Online indicator dot */}
          <span className="online-dot" />
        </button>

        {/* Render existing Settings component — it gets styled by its own sheet,
            but the icon wrapper picks up .nav-action globally */}
        <div className="nav-action-wrap" data-nav>
          <Settings onReset={onReset} />
        </div>

      </div>

      {/* ── UserProfile dropdown ─────────────────────────────────────────── */}
      {showUserProfile && (
        <UserProfile
          onClose={toggleUserProfile}
          isLoggedIn={isLoggedIn}
          onLogin={onLogin}
          onLogout={onLogout}
        />
      )}
    </nav>
  );
}

export default Navbar;