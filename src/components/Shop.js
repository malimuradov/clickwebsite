import React, { useState, useEffect } from 'react';

function Shop({ totalClicks, onPurchase, onUpgrade, bestCPS, flatAutoClicker, percentAutoClicker, onUnlockGambling }) {
    const [items, setItems] = useState([
      { id: 1, name: "Cursor Upgrade", cost: 50, owned: 0 },
      { id: 2, name: "Flat Auto Clicker", cost: 100, owned: 0, effect: 0 },
      { id: 3, name: "Percent Auto Clicker", cost: 200, owned: 0, effect: 0 },
      { id: 4, name: "Flat Click Bonus", cost: 200, owned: 0 },
      { id: 5, name: "Percentage Click Bonus", cost: 500, owned: 0 },
      // Temporarily disabled: { id: 6, name: "Drawing Tool", cost: 1000, owned: 0 }
      { id: 6, name: "Unlock Gambling", cost: 1000, owned: 0 },
    ]);

    useEffect(() => {
      setItems(prevItems => 
        prevItems.map(item => {
          if (item.id === 2) {
            return { ...item, owned: flatAutoClicker, effect: flatAutoClicker };
          } else if (item.id === 3) {
            return { ...item, owned: percentAutoClicker / 10, effect: Math.floor(bestCPS * (percentAutoClicker / 100)) };
          }
          return item;
        })
      );
    }, [flatAutoClicker, percentAutoClicker, bestCPS]);

    const handleBuy = (item) => {
      if (totalClicks >= item.cost) {
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
          // Temporarily disabled:
          // case 6: // Drawing Tool
          //   if (item.owned === 0) {
          //     onUnlockDrawing();
          //   }
          //   break;
          case 6: // Unlock Gambling
            if (item.owned === 0) {
              onUnlockGambling();
            }
            break;
        }
      }
    };

  return (
    <div>
      <h3>Shop</h3>
      <p>Your clicks: {totalClicks}</p>
      {items.map(item => (
        <div key={item.id}>
          <span>{item.name} - Cost: {item.cost} clicks</span>
          <button onClick={() => handleBuy(item)} disabled={totalClicks < item.cost}>
            Buy
          </button>
          <span>Owned: {item.owned}</span>
          {item.id === 2 && <span> (Effect: +{item.effect} clicks/s)</span>}
          {item.id === 3 && <span> (Effect: +{item.effect} clicks/s)</span>}
          {item.id === 4 && <span> (Effect: +{item.owned} clicks/click)</span>}
          {item.id === 5 && <span> (Effect: +{item.owned * 10}% clicks/click)</span>}
        </div>
      ))}
    </div>
  );
}

export default Shop;

