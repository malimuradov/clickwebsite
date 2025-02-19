import React from 'react';
import '../styles/CursorOverlay.css';

function CursorOverlay({ cursors }) {
  return (
    <div className="cursor-overlay">
      {Object.entries(cursors).map(([id, { x, y, username }]) => (
        <div key={id} className="cursor-container" style={{ left: `${x}px`, top: `${y}px` }}>
          <div className="cursor" />
          <div className="cursor-username">{username}</div>
        </div>
      ))}
    </div>
  );
}

export default CursorOverlay;

