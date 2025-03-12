import React, { useState } from 'react';
import CursorOverlay from './CursorOverlay';
import OnlineUsers from './OnlineUsers';
import TeamInvites from './TeamInvites';
import TeamInfo from './TeamInfo';
import GlobalChat from './GlobalChat'; 
import ShopPopup from './ShopPopup';

function UnlockedContent({
  isOpen,
  onClose,
  totalClicks, 
  onPurchase, 
  onUpgrade, 
  bestCPS,
  flatAutoClicker,
  percentAutoClicker,
  onUnlockGambling,
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
  unlockedCursorSkins,
  unlockedCursorAbilities,
  unlockedCursorEffects,
  equippedCursorSkin,
  equippedCursorEffect,
  equippedCursorAbility,
  onUsernameChange,
  teamBonus,
  onCollectTeamBonus,
  currentUserId,
}) {
  return (
    <div>
      <CursorOverlay 
        cursors={cursors} 
        currentUsername={username}
        equippedCursorSkin={equippedCursorSkin}
        equippedCursorEffect={equippedCursorEffect}
        equippedCursorAbility={equippedCursorAbility}
      />

      <OnlineUsers 
        users={onlineUsers} 
        onInvite={onInvite} 
        currentUser={username}
        team={team}
      />

      <TeamInvites invites={teamInvites} onAccept={onAcceptInvite} />

      {team && <TeamInfo team={team} onLeave={onLeaveTeam} teamBonus={teamBonus} onCollectTeamBonus={onCollectTeamBonus} />}

      <ShopPopup 
        isOpen={isOpen}
        onClose={onClose}
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
      />

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

