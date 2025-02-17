import React from 'react';
import Shop from './Shop';
import Gambling from './Gambling';
import GlobalChat from './GlobalChat';

function UnlockedContent({ 
  totalClicks, 
  onPurchase, 
  onUnlockDrawing, 
  onUpgrade, 
  bestCPS, 
  flatAutoClicker, 
  percentAutoClicker, 
  onUnlockGambling, 
  gamblingUnlocked, 
  onGamble,
  onUnlockChat,
  chatUnlocked,
  onSendMessage
}) {
  return (
    <div>
      <h2>Congratulations! You've unlocked the secret content!</h2>
      <p>You can now use your clicks to purchase items from the shop and try your luck with gambling.</p>
      <div className="content-grid">
        <div className="shop-section">
          <Shop 
            totalClicks={totalClicks} 
            onPurchase={onPurchase} 
            onUpgrade={onUpgrade}
            onUnlockDrawing={onUnlockDrawing}
            bestCPS={bestCPS}
            flatAutoClicker={flatAutoClicker}
            percentAutoClicker={percentAutoClicker}
            onUnlockGambling={onUnlockGambling}
            gamblingUnlocked={gamblingUnlocked}
            onUnlockChat={onUnlockChat}
            chatUnlocked={chatUnlocked}
          />
        </div>
        <div className="gambling-chat-section">
          {gamblingUnlocked && (
            <Gambling 
              totalClicks={totalClicks}
              onGamble={onGamble}
            />
          )}
          {chatUnlocked && (
            <GlobalChat
              totalClicks={totalClicks}
              onSendMessage={onSendMessage}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default UnlockedContent;

