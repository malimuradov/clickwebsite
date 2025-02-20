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
  cursorImage,
  onUsernameChange,
  teamBonus,
  onCollectTeamBonus
}) {

  return (
    <div>
      {/* <CursorOverlay cursors={cursors} username={username}/> */}
      <CursorOverlay 
        cursors={cursors} 
        currentUserId={username} 
        userSkin={cursorImage} 
      />

      <OnlineUsers 
        users={onlineUsers} 
        onInvite={onInvite} 
        currentUser={username}
        team={team}
      />

      <TeamInvites invites={teamInvites} onAccept={onAcceptInvite} />

      {team && <TeamInfo team={team} onLeave={onLeaveTeam} teamBonus={teamBonus} onCollectTeamBonus={onCollectTeamBonus} />}
      
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
          onUsernameChange={onUsernameChange}
          totalClicks={totalClicks}
          onSendMessage={onSendMessage}
          username={username}
        />
      )}
    </div>
  );
}


export default UnlockedContent;

