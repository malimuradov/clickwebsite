import React, { useState } from 'react';
import '../styles/Settings.css';

function Settings({ onReset }) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleReset = () => {
    if (window.confirm('Are you sure you want to reset the game? This action cannot be undone.')) {
      onReset();
      setIsOpen(false);
    }
  };

  return (
    <div className="settings-container">
      <button className="settings-button" onClick={toggleDropdown}>
        ⚙️
      </button>
      {isOpen && (
        <div className="settings-dropdown">
          <button onClick={handleReset}>Reset Game</button>
          {/* Add more settings options here */}
        </div>
      )}
    </div>
  );
}

export default Settings;
