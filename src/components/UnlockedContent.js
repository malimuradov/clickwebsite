import React from 'react';
import Shop from './Shop';
import Gambling from './Gambling';
import CursorOverlay from './CursorOverlay';
import OnlineUsers from './OnlineUsers';
import TeamInvites from './TeamInvites';
import TeamInfo from './TeamInfo';
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
  cursors,
  username,
  onlineUsers,
  onInvite,
  team,
  teamInvites,
  onAcceptInvite,
  onLeaveTeam,
  chatUnlocked,
  onSendMessage,
  onUnlockChat,
  onCursorUpgrade,
  unlockedCursors,
  equippedCursor,
  cursorImage
}) {

  return (
    <div>
      <h2>Congratulations! You've unlocked the secret content!</h2>
      <p>You can now use your clicks to purchase items from the shop and try your luck with gambling.</p>

      <CursorOverlay cursors={cursors} username={username}/>

      <OnlineUsers 
        users={onlineUsers} 
        onInvite={onInvite} 
        currentUser={username}
        team={team}
      />

      <TeamInvites invites={teamInvites} onAccept={onAcceptInvite} />

      {team && <TeamInfo team={team} onLeave={onLeaveTeam} />}
      
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
        gamblingUnlocked={gamblingUnlocked}
        onCursorUpgrade={onCursorUpgrade}
        unlockedCursors={unlockedCursors}
        equippedCursor={equippedCursor}
        cursorImage={cursorImage}
      />

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
          username={username}
        />
      )}
    </div>
  );
}


export default UnlockedContent;

