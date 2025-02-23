import React, { useState, useEffect } from 'react';
import '../styles/Shop.css';
import CursorUpgradePopup from './CursorUpgradePopup';

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
  gamblingUnlocked,
  unlockedCursors,
  equippedCursor,
  cursorImage
}) {
    const [items, setItems] = useState([
      { id: 1, name: "Cursor Upgrade", cost: 50, owned: 0, category: "upgrade", icon: "🖱️" },
      { id: 2, name: "Flat Auto Clicker", cost: 100, owned: 0, effect: 0, category: "upgrade", icon: "⚙️" },
      { id: 3, name: "Percent Auto Clicker", cost: 200, owned: 0, effect: 0, category: "upgrade", icon: "📈" },
      { id: 4, name: "Flat Click Bonus", cost: 200, owned: 0, category: "upgrade", icon: "➕" },
      { id: 5, name: "Percentage Click Bonus", cost: 500, owned: 0, category: "upgrade", icon: "💹" },
      { id: 6, name: "Unlock Gambling", cost: 1000, owned: 0, category: "unlockable", icon: "🎰" },
      { id: 7, name: "Unlock Global Chat", cost: 500, owned: 0, category: "unlockable", icon: "💬" },
    ]);

    const [showCursorPopup, setShowCursorPopup] = useState(false);

    useEffect(() => {
      setItems(prevItems => 
        prevItems.map(item => {
          if (item.id === 2) {
            return { ...item, owned: flatAutoClicker, effect: flatAutoClicker };
          } else if (item.id === 3) {
            return { ...item, owned: percentAutoClicker / 10, effect: Math.floor(bestCPS * (percentAutoClicker / 100)) };
          } else if (item.id === 6) {
            return { ...item, owned: gamblingUnlocked ? 1 : 0 };
          } else if (item.id === 7) {
            return { ...item, owned: chatUnlocked ? 1 : 0 };
          }
          return item;
        })
      );
    }, [flatAutoClicker, percentAutoClicker, bestCPS, gamblingUnlocked, chatUnlocked]);

    const handleBuy = (item) => {
      if (item.id === 1) {
        setShowCursorPopup(true);
      } else if (totalClicks >= item.cost && (item.category === "upgrade" || item.owned === 0)) {
        onPurchase(item.cost);
        const updatedItems = items.map(i =>
          i.id === item.id ? { ...i, owned: i.owned + 1 } : i
        );
        setItems(updatedItems);

        switch(item.id) {
          case 2: // Flat Auto Clicker
            onUpgrade('flatAutoClicker', 1);
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
          case 6: // Unlock Gambling
            onUnlockGambling();
            break;
          case 7: // Unlock Global Chat
            onUnlockChat();
            break;
        }
      }
    };

    const handleCursorUpgrade = (cursorData, cursorId) => {
      onUpgrade(cursorData, null, cursorId);
    };

    const renderItemGroup = (category) => {
      return items
        .filter(item => item.category === category)
        .map(item => (
          <div key={item.id} className={`shop-item ${item.category}`}>
            <span className="item-icon">{item.icon}</span>
            <span className="item-name">{item.name}</span>
            <span className="item-cost">Cost: {item.cost} clicks</span>
            <button 
              onClick={() => handleBuy(item)} 
              disabled={totalClicks < item.cost || (item.category === "unlockable" && item.owned > 0)}
            >
              {item.id === 1 ? "Upgrade" : (item.category === "upgrade" ? "Buy" : (item.owned > 0 ? "Unlocked" : "Unlock"))}
            </button>
            <span className="item-owned">Owned: {item.owned}</span>
            {item.effect !== undefined && <span className="item-effect">Effect: +{item.effect} clicks/s</span>}
          </div>
        ));
    };

    return (
      <div className="shop-component">
        <h3>Shop</h3>
        <p>Your clicks: {totalClicks}</p>
        <div className="shop-section">
          <h4>Upgrades</h4>
          {renderItemGroup("upgrade")}
        </div>
        <div className="shop-section">
          <h4>Unlockables</h4>
          {renderItemGroup("unlockable")}
        </div>
        {showCursorPopup && (
          <CursorUpgradePopup
            onClose={() => setShowCursorPopup(false)}
            onUpgrade={handleCursorUpgrade}
            totalClicks={totalClicks}
            unlockedCursors={unlockedCursors}
            equippedCursor={equippedCursor}
            cursorImage={cursorImage}
          />
        )}

      </div>
    );
}

export default Shop;