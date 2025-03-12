import React, { useState, useRef } from 'react';
import Draggable from 'react-draggable';
import '../styles/ShopPopup.css';
import Shop from './Shop';

function ShopPopup({ 
  isOpen, 
  onClose, 
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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const nodeRef = useRef(null); // Create a ref for the draggable node

  if (!isOpen) return null;

  const handleDrag = (e, ui) => {
    const { x, y } = ui;
    setPosition({ x, y });
  };
  return (
    <div className="shop-popup-overlay">
      <Draggable
        nodeRef={nodeRef}
        handle=".shop-popup-header"
        position={position}
        onDrag={handleDrag}
        bounds="parent"
      >
        <div ref={nodeRef} className="shop-popup-content">
          <div className="shop-popup-header">
            <h3>Shop</h3>
            <button className="close-button" onClick={onClose}>×</button>
          </div>
          <Shop 
            totalClicks={totalClicks}
            onPurchase={onPurchase}
            onUpgrade={onUpgrade}
            bestCPS={bestCPS}
            flatAutoClicker={flatAutoClicker}
            percentAutoClicker={percentAutoClicker}
            onUnlockGambling={onUnlockGambling}
            onUnlockChat={onUnlockChat}
            chatUnlocked={chatUnlocked}
            unlockedCursorSkins={unlockedCursorSkins}
            unlockedCursorAbilities={unlockedCursorAbilities}
            unlockedCursorEffects={unlockedCursorEffects}
            equippedCursorSkin={equippedCursorSkin}
            equippedCursorEffect={equippedCursorEffect}
            equippedCursorAbility={equippedCursorAbility}
            cursorImage={cursorImage}
          />
        </div>
      </Draggable>
    </div>
  );
}

export default ShopPopup;
