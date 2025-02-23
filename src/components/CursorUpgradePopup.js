import React from 'react';
import { cursorSkins, cursorEffects, cursorAbilities } from '../data/cursorData';

function CursorUpgradePopup({ onUpgrade, totalClicks, unlockedCursors, equippedCursor }) {
  const handleUpgrade = (type, item) => {
    if (totalClicks >= item.cost) {
      onUpgrade(type, item.id);
    }
  };

  return (
    <div className="cursor-upgrade-popup">
      <h2>Cursor Upgrades</h2>

      <h3>Cursor Skins</h3>
      {cursorSkins.map(skin => (
        <div key={skin.id}>
          <img src={skin.image} alt={skin.name} style={{ width: '20px', height: '20px' }} />
          <span>{skin.name} - Cost: {skin.cost}</span>
          <button 
            onClick={() => handleUpgrade('cursorUpgrade', skin)} 
            disabled={totalClicks < skin.cost || unlockedCursors.includes(skin.id)}
          >
            {unlockedCursors.includes(skin.id) ? 'Owned' : 'Buy'}
          </button>
          {equippedCursor === skin.id && <span> (Equipped)</span>}
        </div>
      ))}
      
      
      <h3>Cursor Effects</h3>
      {cursorEffects.map(effect => (
        <div key={effect.id}>
          <img src={effect.image} alt={effect.name} style={{ width: '20px', height: '20px' }} />
          <span>{effect.name} - Cost: {effect.cost}</span>
          <button
          onClick={() => handleUpgrade('cursorUpgrade', effect)}
          disabled={totalClicks < effect.cost || unlockedCursors.includes(effect.id)}
          >
            {unlockedCursors.includes(effect.id)? 'Owned' : 'Buy'}
          </button>
          {equippedCursor === effect.id && <span> (Equipped)</span>}
          </div>
      ))}
      
      <h3>Cursor Abilities</h3>
      {cursorAbilities.map(ability => (
        <div key={ability.id}>
          <img src={ability.image} alt={ability.name} style={{ width: '20px', height: '20px' }} />
          <span>{ability.name} - Cost: {ability.cost}</span>
          <button
          onClick={() => handleUpgrade('cursorUpgrade', ability)}
          disabled={totalClicks < ability.cost || unlockedCursors.includes(ability.id)}
          >
            {unlockedCursors.includes(ability.id)? 'Owned' : 'Buy'}
          </button>
          {equippedCursor === ability.id && <span> (Equipped)</span>}
          </div>
      ))}
    </div>
  );
}

export default CursorUpgradePopup;

