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
  onUsernameChange,
  teamBonus,
  onCollectTeamBonus,
  currentUserId,
  userSkin,
  userEffect,
  userAbility
}) {

  return (
    <div>
      {/* <CursorOverlay cursors={cursors} username={username}/> */}
      <CursorOverlay 
        cursors={cursors} 
        currentUserId={currentUserId} 
        userSkin={userSkin}
        userEffect={userEffect}
        userAbility={userAbility}
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
        unlockedCursors={unlockedCursors}
        equippedCursor={equippedCursor}
        userSkin={userSkin}
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

