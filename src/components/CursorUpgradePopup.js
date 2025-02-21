import React from 'react';

function CursorUpgradePopup({ onUpgrade, totalClicks, unlockedCursors, equippedCursor }) {
  const cursorSkins = [
    { id: 'default', name: 'Default Cursor', cost: 0, image: '/cursor-images/default-cursor.png' },
    { id: 'gold', name: 'Gold Cursor', cost: 1000, image: '/cursor-images/mouseByFreepik.png' },
    { id: 'dragon', name: 'Dragon Cursor', cost: 5000, image: '/cursor-images/dragonByIcongeek26.png' },
  ];

  const cursorEffects = [
    { id: 'none', name: 'No Effect', cost: 0 },
    { id: 'fire', name: 'Fire Trail', cost: 2000 },
    { id: 'glow', name: 'Glow Effect', cost: 3000 },
  ];

  const cursorAbilities = [
    { id: 'none', name: 'No Ability', cost: 0 },
    { id: 'fireBreath', name: 'Fire Breath', cost: 5000 },
    { id: 'iceBlast', name: 'Ice Blast', cost: 7000 },
  ];

  const handleUpgrade = (type, item) => {
    if (totalClicks >= item.cost) {
      onUpgrade(type, item.id, { cost: item.cost, cursorImage: item.image });
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
          <span>{effect.name} - Cost: {effect.cost}</span>
          <button 
            onClick={() => handleUpgrade('cursorEffect', effect)} 
            disabled={totalClicks < effect.cost}
          >
            Buy
          </button>
        </div>
      ))}

      <h3>Cursor Abilities</h3>
      {cursorAbilities.map(ability => (
        <div key={ability.id}>
          <span>{ability.name} - Cost: {ability.cost}</span>
          <button 
            onClick={() => handleUpgrade('cursorAbility', ability)} 
            disabled={totalClicks < ability.cost}
          >
            Buy
          </button>
        </div>
      ))}
    </div>
  );
}

export default CursorUpgradePopup;


