import React, { useState, useEffect } from 'react';
import '../styles/Shop.css';
import { cursorSkins, cursorEffects, cursorAbilities } from '../data/cursorData';



function Shop({ 
  totalClicks, 
  onPurchase, 
  onUpgrade, 
  bestCPS, 
  flatAutoClicker, 
  percentAutoClicker, 
  onUnlockGambling,
  onUnlockChat,
  chatUnlocked,
  unlockedCursorSkins,
  unlockedCursorAbilities,
  unlockedCursorEffects,
  equippedCursorSkin,
  equippedCursorEffect,
  equippedCursorAbility,
  cursorImage
}) {
    const [items, setItems] = useState([
      { id: 2, name: "Flat Auto Clicker", cost: 100, owned: 0, effect: 0, category: "upgrade", icon: "⚙️" },
      { id: 3, name: "Percent Auto Clicker", cost: 200, owned: 0, effect: 0, category: "upgrade", icon: "📈" },
      { id: 4, name: "Flat Click Bonus", cost: 200, owned: 0, category: "upgrade", icon: "➕" },
      { id: 5, name: "Percentage Click Bonus", cost: 500, owned: 0, category: "upgrade", icon: "💹" },
      { id: 7, name: "Unlock Global Chat", cost: 500, owned: 0, category: "unlockable", icon: "💬" },
    ]);

    const [activeTab, setActiveTab] = useState('upgrade');

    useEffect(() => {
      setItems(prevItems => 
        prevItems.map(item => {
          if (item.id === 2) {
            return { ...item, owned: flatAutoClicker, effect: flatAutoClicker };
          } else if (item.id === 3) {
            return { ...item, owned: percentAutoClicker / 10, effect: Math.floor(bestCPS * (percentAutoClicker / 100)) };
          } else if (item.id === 7) {
            return { ...item, owned: chatUnlocked ? 1 : 0 };
          }
          return item;
        })
      );
    }, [flatAutoClicker, percentAutoClicker, bestCPS, chatUnlocked]);

    const handleBuy = (item) => {
      if (totalClicks >= item.cost && (item.category === "upgrade" || item.owned === 0)) {
        onPurchase(item.cost);
        const updatedItems = items.map(i =>
          i.id === item.id ? { ...i, owned: i.owned + 1 } : i
        );
        setItems(updatedItems);

        switch(item.id) {
          case 2: // Flat Auto Clicker
            onUpgrade('flatAutoClicker', 1);
            console.log(unlockedCursorSkins);
            break;
          case 3: // Percent Auto Clicker
            onUpgrade('percentAutoClicker', 10);
            break;
          case 4: // Flat Click Bonus
            onUpgrade('flatClickBonus', 1);
            break;
          case 5: // Percentage Click Bonus
            onUpgrade('percentageClickBonus', 0.1);
            break;
          case 7: // Unlock Global Chat
            if (item.owned === 0) {
              onUnlockChat();
            }
            break;
          default:
            break;
        }
      }
    };

    const handleCursorUpgrade = (cursor) => {
      // Determine which arrays to check based on cursor type
      let isUnlocked = false;
      let unlockType = '';
      let equipType = '';

      switch(cursor.type) {
        case 'skin':
          isUnlocked = unlockedCursorSkins.includes(cursor.id);
          unlockType = 'unlockCursorSkin';
          equipType = 'equipCursorSkin';
          break;
        case 'effect':
          isUnlocked = unlockedCursorEffects.includes(cursor.id);
          unlockType = 'unlockCursorEffect';
          equipType = 'equipCursorEffect';
          break;
        case 'ability':
          isUnlocked = unlockedCursorAbilities.includes(cursor.id);
          unlockType = 'unlockCursorAbility';
          equipType = 'equipCursorAbility';
          break;
        default:
          console.error('Unknown cursor type:', cursor.type);
          return;
      }
      // Check if the user has enough clicks to purchase
      if (totalClicks >= cursor.cost && !isUnlocked) {
        // Purchase the cursor
        onPurchase(cursor.cost);
        // Unlock the cursor
        onUpgrade(unlockType, cursor.id);
        // Equip the cursor
        onUpgrade(equipType, cursor.id);

        console.log(`Purchased and equipped ${cursor.type}: ${cursor.name}`);
      } else if (isUnlocked) {
        // If already unlocked, just equip it
        onUpgrade(equipType, cursor.id);
        console.log(`Equipped already owned ${cursor.type}: ${cursor.name}`);
      } else {
        console.log(`Not enough clicks to purchase ${cursor.type}: ${cursor.name}`);
      }
    };





    const renderItemGroup = (category) => {
      return items
        .filter(item => item.category === category)
        .map(item => (
          <div key={item.id} className={`shop-item ${item.category}`}>
            <div className="item-info">
              <span className="item-icon">{item.icon}</span>
              <span className="item-name">{item.name}</span>
              <span className="item-owned">Owned: {item.owned}</span>
              {item.effect !== undefined && <span className="item-effect">Effect: +{item.effect} clicks/s</span>}
            </div>
            <div className="item-purchase">
              <span className="item-cost">Cost: {item.cost} clicks</span>
              <button 
                onClick={() => handleBuy(item)} 
                disabled={totalClicks < item.cost || (item.category === "unlockable" && item.owned > 0)}
              >
                {item.category === "upgrade" ? "Buy" : (item.owned > 0 ? "Unlocked" : "Unlock")}
              </button>
            </div>
          </div>
        ));
    };

    const renderCursorUpgrades = () => {
      const allCursorUpgrades = [
        ...cursorSkins.map(item => ({ ...item, type: 'skin' })),
        ...cursorEffects.map(item => ({ ...item, type: 'effect' })),
        ...cursorAbilities.map(item => ({ ...item, type: 'ability' }))
      ];

      return allCursorUpgrades.map(upgrade => {
        // Determine which array to check based on the upgrade type
        let isUnlocked = false;
        let isEquipped = false;

        switch(upgrade.type) {
          case 'skin':
            isUnlocked = unlockedCursorSkins.includes(upgrade.id);
            isEquipped = equippedCursorSkin === upgrade.id;
            break;
          case 'effect':
            isUnlocked = unlockedCursorEffects.includes(upgrade.id);
            isEquipped = equippedCursorEffect === upgrade.id;
            break;
          case 'ability':
            isUnlocked = unlockedCursorAbilities.includes(upgrade.id);
            isEquipped = equippedCursorAbility === upgrade.id;
            break;
          default:
            break;
        }

        return (
          <div key={upgrade.id} className="shop-item cursor-upgrade">
            <div className="item-info">
              <img 
                src={upgrade.image || '/cursor-images/placeholder.png'} 
                alt={upgrade.name} 
                style={{ width: '30px', height: '30px' }} 
              />
              <span className="item-name">{upgrade.name}</span>
              <span className="item-cost">Cost: {upgrade.cost} clicks</span>
            </div>
            <button 
              onClick={() => handleCursorUpgrade(upgrade)}
              disabled={totalClicks < upgrade.cost && !isUnlocked}
            >
              {isUnlocked ? 'Equip' : 'Buy'}
            </button>
            {isEquipped && <span className="equipped-indicator">(Equipped)</span>}
          </div>
        );
      });
    };



    return (
      <div className="shop">
        <h2>Shop</h2>
        <p>Your clicks: {totalClicks}</p>
        <div className="shop-tabs">
          <button onClick={() => setActiveTab('upgrade')} className={activeTab === 'upgrade' ? 'active' : ''}>Upgrades</button>
          <button onClick={() => setActiveTab('unlockable')} className={activeTab === 'unlockable' ? 'active' : ''}>Unlockables</button>
          <button onClick={() => setActiveTab('cursor')} className={activeTab === 'cursor' ? 'active' : ''}>Cursor Upgrades</button>
        </div>
        <div className="shop-items">
          {activeTab === 'upgrade' && renderItemGroup('upgrade')}
          {activeTab === 'unlockable' && renderItemGroup('unlockable')}
          {activeTab === 'cursor' && renderCursorUpgrades()}
        </div>
      </div>
    );
}

export default Shop;

