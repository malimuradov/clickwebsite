import React, { useState } from 'react';
import '../styles/CursorUpgradePopup.css';

function CursorUpgradePopup({ onClose, onUpgrade, totalClicks }) {
  const [activeTab, setActiveTab] = useState('common');
  const [equippedCursor, setEquippedCursor] = useState('default');

  const cursorUpgrades = {
    common: [
      { id: 'default', name: 'Default Cursor', cost: 0, effect: 'Standard click power', icon: '🖱️', owned: true },
      { id: 'wood', name: 'Wooden Cursor', cost: 50, effect: '+1 click power', icon: '🖱️🌳' },
      { id: 'stone', name: 'Stone Cursor', cost: 100, effect: '+2 click power', icon: '🖱️🪨' },
    ],
    rare: [
      { id: 'silver', name: 'Silver Cursor', cost: 500, effect: '+5 click power', icon: '🖱️✨' },
      { id: 'crystal', name: 'Crystal Cursor', cost: 1000, effect: '+7 click power', icon: '🖱️💎' },
    ],
    epic: [
      { id: 'amethyst', name: 'Amethyst Cursor', cost: 5000, effect: '+15 click power', icon: '🖱️💜' },
      { id: 'emerald', name: 'Emerald Cursor', cost: 10000, effect: '+20 click power', icon: '🖱️💚' },
    ],
    legendary: [
      { id: 'golden', name: 'Golden Cursor', cost: 50000, effect: '+50 click power', icon: '🖱️🌟' },
      { id: 'diamond', name: 'Diamond Cursor', cost: 100000, effect: '+100 click power', icon: '🖱️💎' },
    ],
    mythic: [
      { id: 'rainbow', name: 'Rainbow Cursor', cost: 1000000, effect: '+500 click power', icon: '🖱️🌈' },
      { id: 'cosmic', name: 'Cosmic Cursor', cost: 10000000, effect: '+1000 click power', icon: '🖱️🌌' },
    ],
  };

  const handleUpgrade = (upgrade) => {
    if (totalClicks >= upgrade.cost && !upgrade.owned) {
      onUpgrade(upgrade.id, upgrade.cost);
      upgrade.owned = true;
    }
  };

  const handleEquip = (cursorId) => {
    setEquippedCursor(cursorId);
  };

  const renderUpgrades = (category) => (
    <div className={`upgrade-grid ${category}`}>
      {cursorUpgrades[category].map(upgrade => (
        <div key={upgrade.id} className={`upgrade-item ${upgrade.owned ? 'owned' : ''}`}>
          <span className="upgrade-icon">{upgrade.icon}</span>
          <span className="upgrade-name">{upgrade.name}</span>
          <span className="upgrade-effect">{upgrade.effect}</span>
          {!upgrade.owned && <span className="upgrade-cost">Cost: {upgrade.cost} clicks</span>}
          {upgrade.owned ? (
            <button 
              onClick={() => handleEquip(upgrade.id)}
              className={equippedCursor === upgrade.id ? 'equipped' : ''}
            >
              {equippedCursor === upgrade.id ? 'Equipped' : 'Equip'}
            </button>
          ) : (
            <button 
              onClick={() => handleUpgrade(upgrade)}
              disabled={totalClicks < upgrade.cost}
            >
              Buy
            </button>
          )}
        </div>
      ))}
    </div>
  );
  return (
    <div className="cursor-upgrade-popup">
      <div className="popup-header">
        <h2>Cursor Upgrades</h2>
        <button onClick={onClose}>Close</button>
      </div>
      <div className="popup-tabs">
        {Object.keys(cursorUpgrades).map(category => (
          <button 
            key={category}
            className={`tab-${category} ${activeTab === category ? 'active' : ''}`}
            onClick={() => setActiveTab(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>
      <div className="popup-content">
        {renderUpgrades(activeTab)}
      </div>
    </div>
  );
}

export default CursorUpgradePopup;
