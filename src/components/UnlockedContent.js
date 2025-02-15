import React from 'react';
import Shop from './Shop';
import Gambling from './Gambling';

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
  onGamble
}) {
  return (
    <div>
      <h2>Congratulations! You've unlocked the secret content!</h2>
      <p>You can now use your clicks to purchase items from the shop and try your luck with gambling.</p>
      <Shop 
        totalClicks={totalClicks} 
        onPurchase={onPurchase} 
        onUpgrade={onUpgrade}
        bestCPS={bestCPS}
        flatAutoClicker={flatAutoClicker}
        percentAutoClicker={percentAutoClicker}
        onUnlockGambling={onUnlockGambling}
      />
      {gamblingUnlocked && (
        <Gambling 
          totalClicks={totalClicks}
          onGamble={onGamble}
        />
      )}
    </div>
  );
}

export default UnlockedContent;

