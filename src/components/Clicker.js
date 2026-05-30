import React, { useState, useEffect, useRef, useCallback } from 'react';
import Stats from './Stats';
import '../styles/Clicker.css';
import { useSocket } from '../contexts/SocketContext';

// ─── Accuracy zone definitions ────────────────────────────────────────────────
// Each zone: radiusRatio is max fraction of target radius that qualifies.

const ZONES = [
  { id: 'bullseye', label: 'BULLSEYE', radiusRatio: 0.10, score: 100, color: '#ff3366' },
  { id: 'gold',     label: 'GOLD',     radiusRatio: 0.28, score: 80,  color: '#ffd700' },
  { id: 'silver',   label: 'SILVER',   radiusRatio: 0.50, score: 60,  color: '#94a3b8' },
  { id: 'bronze',   label: 'BRONZE',   radiusRatio: 0.72, score: 40,  color: '#f97316' },
  { id: 'outer',    label: 'OUTER',    radiusRatio: 1.00, score: 20,  color: '#3b82f6' },
  { id: 'miss',     label: 'MISS',     radiusRatio: Infinity, score: 0, color: '#374151' },
];

/**
 * Given a click position and the target's bounding rect,
 * returns the accuracy zone, score, and position relative to target center.
 *
 * @param {number} clickX - viewport X
 * @param {number} clickY - viewport Y
 * @param {DOMRect} rect  - target element bounding rect
 * @returns {{ zone: Object, relX: number, relY: number }}
 */
const getAccuracy = (clickX, clickY, rect) => {
  const cx      = rect.left + rect.width  / 2;
  const cy      = rect.top  + rect.height / 2;
  const maxR    = rect.width / 2;
  const relX    = clickX - cx;
  const relY    = clickY - cy;
  const dist    = Math.sqrt(relX ** 2 + relY ** 2);
  const ratio   = dist / maxR;
  const zone    = ZONES.find(z => ratio <= z.radiusRatio) ?? ZONES.at(-1);
  return { zone, relX, relY };
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * @param {{ onUnlock: Function, totalClicks: number, flatClickBonus: number,
 *           percentageClickBonus: number, bestCPS: number }} props
 */
function Clicker({ onUnlock, totalClicks, flatClickBonus, percentageClickBonus, bestCPS: propBestCPS }) {
  const { socket } = useSocket();

  // ── CPS tracking ──────────────────────────────────────────────────────────
  const [clientCPS, setClientCPS] = useState(0);
  const clickTimestampsRef = useRef([]);
  const cpsRef             = useRef(0);

  // ── Simulation ────────────────────────────────────────────────────────────
  const [isSimulating, setIsSimulating] = useState(false);

  // ── Timer ─────────────────────────────────────────────────────────────────
  const [isTimerEnabled,  setIsTimerEnabled]  = useState(true);
  const [isTimerRunning,  setIsTimerRunning]  = useState(false);
  const [timerDuration,   setTimerDuration]   = useState(10);
  const [timeLeft,        setTimeLeft]        = useState(10);
  const [timerClicks,     setTimerClicks]     = useState(0);
  const [records,         setRecords]         = useState([]);
  const timerStartRef  = useRef(0);
  const timeLeftRef    = useRef(10);

  // ── Key binding ───────────────────────────────────────────────────────────
  const [listeningForKey, setListeningForKey] = useState(false);
  const [selectedKey,     setSelectedKey]     = useState(null);
  const [keyPressed,      setKeyPressed]      = useState(false);

  // ── Dartboard / accuracy ──────────────────────────────────────────────────
  /** Center position of the draggable target in the viewport (px). */
  const [targetPos, setTargetPos] = useState({
    x: typeof window !== 'undefined' ? window.innerWidth  / 2 : 400,
    y: typeof window !== 'undefined' ? window.innerHeight / 2 : 300,
  });
  /** Fading click markers rendered on the dartboard. */
  const [clickMarkers,    setClickMarkers]    = useState([]);
  /** Last 60 accuracy scores for average calculation. */
  const [accuracyHistory, setAccuracyHistory] = useState([]);
  /** Zone label flash (e.g. "BULLSEYE!") for visual feedback. */
  const [zoneFlash,       setZoneFlash]       = useState(null);

  const targetRef    = useRef(null);
  const isDragging   = useRef(false);
  const dragOffset   = useRef({ x: 0, y: 0 });
  const flashTimerRef = useRef(null);

  // ── Derived accuracy stats ─────────────────────────────────────────────────
  const avgAccuracy  = accuracyHistory.length
    ? Math.round(accuracyHistory.reduce((a, b) => a + b, 0) / accuracyHistory.length)
    : 0;
  const bestAccuracy = accuracyHistory.length ? Math.max(...accuracyHistory) : 0;
  const totalHits    = accuracyHistory.filter(s => s > 0).length;

  // ─────────────────────────────────────────────────────────────────────────
  // Click value
  // ─────────────────────────────────────────────────────────────────────────

  const calculateClickValue = useCallback(() => {
    const base = 1;
    return Math.round((base + flatClickBonus) * percentageClickBonus);
  }, [flatClickBonus, percentageClickBonus]);

  // ─────────────────────────────────────────────────────────────────────────
  // Core click processing  (shared by global handler + simulation)
  // ─────────────────────────────────────────────────────────────────────────

  const processClick = useCallback((clickValue) => {
    socket.emit('incrementCount', clickValue);

    const now = Date.now();
    clickTimestampsRef.current.push(now);
    const fresh = clickTimestampsRef.current.filter(t => now - t < 1000);
    cpsRef.current = fresh.length;

    onUnlock(totalClicks + clickValue, Math.max(cpsRef.current, propBestCPS));

    if (isTimerRunning) {
      setTimerClicks(prev => prev + 1);
      const elapsed   = (now - timerStartRef.current) / 1000;
      const remaining = Math.max(0, timerDuration - elapsed);
      timeLeftRef.current = remaining;
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0) stopTimer();
    }
  }, [socket, totalClicks, onUnlock, propBestCPS, isTimerRunning, timerDuration]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────────────────────
  // Dartboard helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Adds a fading marker dot on the dartboard at the click position. */
  const addClickMarker = useCallback((relX, relY, zone) => {
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    setClickMarkers(prev => [...prev.slice(-15), { id, relX, relY, zone }]);
    setTimeout(() => setClickMarkers(prev => prev.filter(m => m.id !== id)), 1400);
  }, []);

  /** Flashes the zone label briefly. */
  const flashZone = useCallback((zone) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setZoneFlash(zone);
    flashTimerRef.current = setTimeout(() => setZoneFlash(null), 700);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Global click handler — listens on the document, skips nav elements
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleGlobalClick = (e) => {
      
      if (isTimerEnabled && !isTimerRunning) startTimer();
      // Skip navigation or explicitly excluded elements
      if (e.target.closest('[data-nav], nav, header, .navbar, [data-exclude-tracking]')) return;
      // Skip during drag (mouseup fires a click; ignore it)
      if (isDragging.current) return;

      // Calculate accuracy relative to dartboard target
      if (targetRef.current) {
        const rect          = targetRef.current.getBoundingClientRect();
        const { zone, relX, relY } = getAccuracy(e.clientX, e.clientY, rect);
        addClickMarker(relX, relY, zone);
        flashZone(zone);
        setAccuracyHistory(prev => [...prev.slice(-59), zone.score]);
      }

      processClick(calculateClickValue());

      // if (isTimerEnabled && !isTimerRunning) startTimer();
    };

    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, [processClick, calculateClickValue, addClickMarker, flashZone, isTimerEnabled, isTimerRunning]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────────────────────
  // Dartboard drag-to-reposition
  // ─────────────────────────────────────────────────────────────────────────

  const onDragStart = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    dragOffset.current = {
      x: e.clientX - targetPos.x,
      y: e.clientY - targetPos.y,
    };
  }, [targetPos]);

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return;
      setTargetPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const onUp = () => {
      // Small delay so the document click handler sees isDragging = true and ignores the drag-end click
      setTimeout(() => { isDragging.current = false; }, 50);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // CPS interval
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const id = setInterval(() => {
      const now   = Date.now();
      const fresh = clickTimestampsRef.current.filter(t => now - t < 1000);
      clickTimestampsRef.current = fresh;
      cpsRef.current             = fresh.length;
      setClientCPS(fresh.length);

      if (fresh.length > propBestCPS) onUnlock(totalClicks, fresh.length);

      if (isTimerRunning) {
        const remaining = Math.max(0, timerDuration - (now - timerStartRef.current) / 1000);
        timeLeftRef.current = remaining;
        setTimeLeft(Math.ceil(remaining));
        if (remaining <= 0) stopTimer();
      }
    }, 100);
    return () => clearInterval(id);
  }, [isTimerRunning, timerDuration, propBestCPS, totalClicks, onUnlock]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────────────────────
  // Simulation interval
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isSimulating) return;
    const id = setInterval(() => processClick(calculateClickValue()), 5);
    return () => clearInterval(id);
  }, [isSimulating, processClick, calculateClickValue]);

  // ─────────────────────────────────────────────────────────────────────────
  // Key binding
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedKey) return;
    const onDown = (e) => { if (e.key === selectedKey && !keyPressed) { e.preventDefault(); setKeyPressed(true); } };
    const onUp   = (e) => { if (e.key === selectedKey &&  keyPressed) { setKeyPressed(false); processClick(calculateClickValue()); } };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup',   onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [selectedKey, keyPressed, processClick, calculateClickValue]);

  useEffect(() => {
    if (!listeningForKey) return;
    const onKey = (e) => { setSelectedKey(e.key); setListeningForKey(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [listeningForKey]);

  // ─────────────────────────────────────────────────────────────────────────
  // Timer helpers
  // ─────────────────────────────────────────────────────────────────────────

  const startTimer = useCallback(() => {
    setIsTimerRunning(true);
    setTimeLeft(timerDuration);
    timeLeftRef.current  = timerDuration;
    timerStartRef.current = Date.now();
    setTimerClicks(0);
  }, [timerDuration]);

  const stopTimer = useCallback(() => {
    setIsTimerRunning(false);
    const duration   = (Date.now() - timerStartRef.current) / 1000;
    const averageCPS = timerClicks / Math.max(duration, 0.001);
    setRecords(prev => [...prev, { clicks: timerClicks, averageCPS, duration }]);
  }, [timerClicks]);

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerDuration);
    timeLeftRef.current = timerDuration;
    setTimerClicks(0);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Helpfull functions
  // ─────────────────────────────────────────────────────────────────────────

  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="clicker-root">

      {/* ── Draggable Dartboard Target ─────────────────────────────────── */}
      <div
        className="target-wrapper"
        style={{ left: targetPos.x, top: targetPos.y }}
        ref={targetRef}
      >
        {/* Drag handle — grab the outer rim to reposition */}
        {/* <div className="target-drag-handle" onMouseDown={onDragStart} title="Drag to reposition" /> */}

        {/* Zone flash label */}
        {zoneFlash && (
          <div className="zone-flash" style={{ color: zoneFlash.color }}>
            {zoneFlash.label}
          </div>
        )}

        {/* SVG Dartboard */}
        <svg className="dartboard-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-subtle">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <radialGradient id="board-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="#1a1f2e" />
              <stop offset="100%" stopColor="#0d1117" />
            </radialGradient>
          </defs>

          {/* Board base */}
          <circle cx="150" cy="150" r="148" fill="url(#board-bg)" stroke="#00d4ff18" strokeWidth="1" />

          {/* Zone rings — outer → inner */}
          <circle cx="150" cy="150" r="146" fill="#0d1117"  />
          <circle cx="150" cy="150" r="146" fill="none" stroke="#3b82f620" strokeWidth="1" />

          <circle cx="150" cy="150" r="105" fill="#111521"  />
          <circle cx="150" cy="150" r="105" fill="none" stroke="#f9731630" strokeWidth="1.5" />

          <circle cx="150" cy="150" r="75"  fill="#0d1117"  />
          <circle cx="150" cy="150" r="75"  fill="none" stroke="#94a3b830" strokeWidth="1.5" />

          <circle cx="150" cy="150" r="42"  fill="#111521"  />
          <circle cx="150" cy="150" r="42"  fill="none" stroke="#ffd70040" strokeWidth="2" />

          <circle cx="150" cy="150" r="15"  fill="#ff336680" filter="url(#glow-red)" />
          <circle cx="150" cy="150" r="6"   fill="#ff3366"   filter="url(#glow-red)" />

          {/* Zone score labels */}
          <text x="150" y="10"  fill="#3b82f660" fontSize="9" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">20</text>
          <text x="150" y="55"  fill="#f9731660" fontSize="9" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">40</text>
          <text x="150" y="85"  fill="#94a3b860" fontSize="9" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">60</text>
          <text x="150" y="118" fill="#ffd70060" fontSize="9" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">80</text>
          <text x="150" y="144" fill="#ff336680" fontSize="8" textAnchor="middle" fontFamily="'JetBrains Mono', monospace">100</text>

          {/* Crosshair */}
          <line x1="150" y1="2"   x2="150" y2="298" stroke="#00d4ff08" strokeWidth="0.5" strokeDasharray="4 6" />
          <line x1="2"   y1="150" x2="298" y2="150" stroke="#00d4ff08" strokeWidth="0.5" strokeDasharray="4 6" />
        </svg>

        {/* Click markers — fading dots showing where each click landed */}
        <div className="marker-layer">
          {clickMarkers.map(({ id, relX, relY, zone }) => (
            <div
              key={id}
              className="click-marker"
              style={{
                left:  `calc(50% + ${relX}px)`,
                top:   `calc(50% + ${relY}px)`,
                background:   zone.color,
                boxShadow:    `0 0 6px ${zone.color}`,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Left Panel — Stats + Accuracy ─────────────────────────────── */}
      <aside className="panel panel-left">
        <div className="panel-section">
          <Stats cps={clientCPS} bestCps={propBestCPS} totalClicks={totalClicks} />
        </div>

        <div className="panel-section">
          <h3 className="panel-label">ACCURACY</h3>
          <div className="accuracy-grid">
            <div className="acc-stat">
              <span className="acc-value" style={{ color: '#00d4ff' }}>{avgAccuracy}<span className="acc-unit">%</span></span>
              <span className="acc-label">Average</span>
            </div>
            <div className="acc-stat">
              <span className="acc-value" style={{ color: '#ffd700' }}>{bestAccuracy}<span className="acc-unit">%</span></span>
              <span className="acc-label">Best</span>
            </div>
            <div className="acc-stat">
              <span className="acc-value" style={{ color: '#94a3b8' }}>{totalHits}<span className="acc-unit">pts</span></span>
              <span className="acc-label">Hits</span>
            </div>
            <div className="acc-stat">
              <span className="acc-value" style={{ color: '#374151' }}>{accuracyHistory.length - totalHits}</span>
              <span className="acc-label">Misses</span>
            </div>
          </div>

          {/* Records */}
          <div className="panel-section records">
            <h3 className="panel-label">RECORDS</h3>
            <ul className="records-list">
              {records.slice(-5).reverse().map((r, i) => (
                <li key={i} className="record-row">
                  <span className="record-clicks">{r.clicks} clicks</span>
                  <span className="record-cps">{r.averageCPS.toFixed(1)} cps</span>
                  <span className="record-dur">{r.duration.toFixed(1)}s</span>
                </li>
              ))}
            </ul>
          </div>
              
          <div className="panel-section">
            <div className="accuracy-grid">
                <div className="acc-stat">
                  <span className="acc-value" style={{ color: '#1eff00' }}>{avg(records.slice(-5).map((r, i)=> (r.averageCPS.toFixed(1))))}<span className="acc-unit"></span></span>
                  <span className="acc-label">Average</span>
                </div>
                <div className="acc-stat">
                  <span className="acc-value" style={{ color: '#ff0000' }}>{propBestCPS}<span className="acc-unit"></span></span>
                  <span className="acc-label">Best</span>
                </div>
              </div>
          </div>
        </div>
      </aside>

      {/* ── Right Panel — Timer + Controls ────────────────────────────── */}
      <aside className="panel panel-right">

        {/* Timer */}
        <div className="panel-section">
          <h3 className="panel-label">TIMER</h3>
          <label className="toggle-row">
            <input type="checkbox" checked={isTimerEnabled} onChange={() => { setIsTimerEnabled(v => !v); if (isTimerRunning) stopTimer(); }} />
            <span>Enable timer</span>
          </label>

          {isTimerEnabled && (
            <>
              <div className="timer-display">
                <span className="timer-count">{isTimerRunning ? timeLeft : timerDuration}</span>
                <span className="timer-unit">s</span>
              </div>
              <div className="timer-row">
                <input
                  type="number"
                  className="timer-input"
                  value={timerDuration}
                  min={1}
                  onChange={e => setTimerDuration(Number(e.target.value))}
                />
                <button className="btn-secondary" onClick={resetTimer}>Reset</button>
              </div>
              {isTimerRunning && (
                <p className="timer-hint">{timerClicks} clicks — {timeLeft}s left</p>
              )}
              {!isTimerRunning && (
                <p className="timer-hint">Click anywhere to start</p>
              )}
            </>
          )}
        </div>

        

        {/* Key binding */}
        <div className="panel-section">
          <h3 className="panel-label">KEY BIND</h3>
          <button
            className={`btn-keybind ${listeningForKey ? 'listening' : ''}`}
            onClick={() => setListeningForKey(true)}
          >
            {listeningForKey ? 'Press any key…' : selectedKey ? `Bound: [${selectedKey}]` : 'Set key bind'}
          </button>
        </div>

        {/* Simulation */}
        <div className="panel-section">
          <h3 className="panel-label">DEBUG</h3>
          <button
            className={`btn-sim ${isSimulating ? 'active' : ''}`}
            onClick={() => setIsSimulating(v => !v)}
          >
            {isSimulating ? '■ Stop simulation' : '▶ Start simulation'}
          </button>
        </div>

      </aside>
    </div>
  );
}

export default Clicker;