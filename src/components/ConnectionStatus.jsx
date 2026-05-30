import React from 'react';
import { useSocket } from '../contexts/SocketContext';
import '../styles/ConnectionStatus.css';

/**
 * Minimal status pill displayed in a fixed corner.
 * Shows nothing when online and queue is empty — invisible in the happy path.
 * Surfaces actionable info (retry, pending count) when degraded.
 */
function ConnectionStatus() {
  const { connectionState, isOffline, pendingCount, retryConnection } = useSocket();

  // Completely hidden when everything is fine
  if (connectionState === 'online' && pendingCount === 0) return null;

  const configs = {
    connecting: {
      label: 'Connecting…',
      color: 'var(--text-dim)',
      pulse: true,
      showRetry: false,
    },
    reconnecting: {
      label: 'Reconnecting…',
      color: 'var(--accent-gold)',
      pulse: true,
      showRetry: false,
    },
    offline: {
      label: 'Offline',
      color: 'var(--accent-red)',
      pulse: false,
      showRetry: true,
    },
    online: {
      // Only shown here when pendingCount > 0
      label: 'Syncing…',
      color: 'var(--accent-cyan)',
      pulse: true,
      showRetry: false,
    },
  };

  const cfg = configs[connectionState] ?? configs.offline;

  return (
    <div className={`conn-status ${isOffline ? 'conn-offline' : ''}`} data-nav>
      {/* Dot */}
      <span
        className={`conn-dot ${cfg.pulse ? 'pulse' : ''}`}
        style={{ background: cfg.color, boxShadow: `0 0 5px ${cfg.color}` }}
      />

      {/* Label */}
      <span className="conn-label" style={{ color: cfg.color }}>
        {cfg.label}
      </span>

      {/* Pending queue count */}
      {pendingCount > 0 && (
        <span className="conn-queue" title={`${pendingCount} event(s) will sync when reconnected`}>
          {pendingCount} queued
        </span>
      )}

      {/* Retry button */}
      {cfg.showRetry && (
        <button className="conn-retry" onClick={retryConnection}>
          Retry
        </button>
      )}
    </div>
  );
}

export default ConnectionStatus;
