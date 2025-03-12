import React, { useState, useEffect, useCallback } from 'react';
import Clicker from './components/Clicker';
import UnlockedContent from './components/UnlockedContent';
import './App.css';

import Navbar from './components/Navbar';

import { OnlineUsersProvider } from './contexts/OnlineUsersContext';
import { cursorSkins } from './data/cursorData';

import { useSocket } from './contexts/SocketContext';

function App() {
  // Auth
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isTemporaryAccount, setIsTemporaryAccount] = useState(false);

  // Game state
  const [unlocked, setUnlocked] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);
  const [bestCPS, setBestCPS] = useState(0);
  const [clickMultiplier, setClickMultiplier] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hideCursor, setHideCursor] = useState(false);
  const [isShopOpen, setIsShopOpen] = useState(false);

  // Upgrades
  const [flatClickBonus, setFlatClickBonus] = useState(0);
  const [percentageClickBonus, setPercentageClickBonus] = useState(1);
  const [flatAutoClicker, setFlatAutoClicker] = useState(0);
  const [percentAutoClicker, setPercentAutoClicker] = useState(0);

  // Unlockables
  const [chatUnlocked, setChatUnlocked] = useState(false);

  // Cursor customization
  const [unlockedCursorSkins, setUnlockedCursorSkins] = useState(['default']);
  const [unlockedCursorEffects, setUnlockedCursorEffects] = useState(['default']);
  const [unlockedCursorAbilities, setUnlockedCursorAbilities] = useState(['default']);
  const [equippedCursorSkin, setEquippedCursorSkin] = useState('default');
  const [equippedCursorEffect, setEquippedCursorEffect] = useState('default');
  const [equippedCursorAbility, setEquippedCursorAbility] = useState('default');

  // Multiplayer
  const [teamBonus, setTeamBonus] = useState(0);
  const [globalClicks, setGlobalClicks] = useState(0);
  const [globalCPS, setGlobalCPS] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [team, setTeam] = useState(null);
  const [teamInvites, setTeamInvites] = useState([]);
  const { socket, userId, username, equippedCursor, setEquippedCursor, cursors, setUsername } = useSocket();

  // Auth handlers
  const handleLogin = useCallback((token) => {
    setIsLoggedIn(true);
    setIsTemporaryAccount(false);
    if (socket) {
      socket.emit('authenticate', token);
    }
  }, [socket]);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    if (socket) {
      socket.emit('logout');
    }
  }, [socket]);

  const upgradeToPermAccount = useCallback((token) => {
    if (socket) {
      socket.emit('upgradeAccount', token);
    }
    setIsTemporaryAccount(false);
    setIsLoggedIn(true);
    localStorage.removeItem('tempAccountData');
  }, [socket]);

  // Socket event listeners
  // Socket event listeners
  useEffect(() => {
    if (socket) {
      socket.on('updateCount', setGlobalClicks);
      socket.on('updateGlobalCPS', setGlobalCPS);
      socket.on('teamClickBonus', (bonus) => {
        setTeamBonus(prevBonus => Number((Number(prevBonus) + Number(bonus)).toFixed(2)));
      });
      socket.on('updateOnlineUsers', (users) => {
        setOnlineUsers(Array.isArray(users) ? users : []);
      });
      socket.on('teamInvite', (inviterId) => {
        setTeamInvites(prev => [...prev, inviterId]);
      });
      socket.on('teamUpdate', setTeam);

      if (username) {
        socket.emit('setUsername', username);
      }

      // Send the equipped cursor skin to the server when connection is established
      if (equippedCursorSkin && equippedCursorSkin !== 'default') {
        socket.emit('changeCursorSkin', equippedCursorSkin);
      }
      return () => {
        socket.off('updateCount');
        socket.off('updateGlobalCPS');
        socket.off('updateOnlineUsers');
        socket.off('teamInvite');
        socket.off('teamUpdate');
        socket.off('teamClickBonus');
      };
    }
  }, [socket, username, equippedCursorSkin]);

  // Username change handler
  useEffect(() => {
    if (socket && username) {
      socket.emit('setUsername', username);
    }
  }, [socket, username]);

  // Game state management
  const saveGameState = useCallback(() => {
    if (isLoaded) {
      const gameState = {
        totalClicks,
        bestCPS,
        clickMultiplier,
        flatClickBonus,
        percentageClickBonus,
        flatAutoClicker,
        percentAutoClicker,
        chatUnlocked,
        unlockedCursorSkins,
        equippedCursorSkin,
        equippedCursorEffect,
        equippedCursorAbility,
        username,
        team,
        teamInvites,
      };
      if (isTemporaryAccount) {
        localStorage.setItem('tempAccountData', JSON.stringify({ username, equippedCursorSkin, gameState }));
      } else {
        localStorage.setItem('gameState', JSON.stringify(gameState));
      }
    }
  }, [isLoaded, totalClicks, bestCPS, clickMultiplier, flatClickBonus, percentageClickBonus, flatAutoClicker, percentAutoClicker, chatUnlocked, unlockedCursorSkins, equippedCursorSkin, equippedCursorEffect, equippedCursorAbility, username, team, teamInvites, isTemporaryAccount]);

  useEffect(() => {
    const storedData = localStorage.getItem('gameState');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      setTotalClicks(parsedData.totalClicks || 0);
      setUnlocked(parsedData.totalClicks >= 100);
      setBestCPS(parsedData.bestCPS || 0);
      setClickMultiplier(parsedData.clickMultiplier || 1);
      setFlatClickBonus(parsedData.flatClickBonus || 0);
      setPercentageClickBonus(parsedData.percentageClickBonus || 1);
      setFlatAutoClicker(parsedData.flatAutoClicker || 0);
      setPercentAutoClicker(parsedData.percentAutoClicker || 0);
      setChatUnlocked(parsedData.chatUnlocked || false);
      setUnlockedCursorSkins(parsedData.unlockedCursorSkins || ['default']);
      setEquippedCursorSkin(parsedData.equippedCursorSkin || 'default');
      setEquippedCursorEffect(parsedData.equippedCursorEffect || 'default');
      setEquippedCursorAbility(parsedData.equippedCursorAbility || 'default');
      setUsername(parsedData.username || '');
      setTeam(parsedData.team || null);
      setTeamInvites(parsedData.teamInvites || []);

      // If socket is already connected, send the equipped cursor skin
      if (socket && parsedData.equippedCursorSkin && parsedData.equippedCursorSkin !== 'default') {
        socket.emit('changeCursorSkin', parsedData.equippedCursorSkin);
      }
    }
    setIsLoaded(true);
  }, [socket]);

  useEffect(() => {
    if (isLoaded) {
      saveGameState();
    }
  }, [isLoaded, saveGameState]);

  // Game mechanics
  const handleUnlock = useCallback((newTotalClicks, newCPS) => {
    setTotalClicks(newTotalClicks);
    if (newTotalClicks >= 100) {
      setUnlocked(true);
    }
    setBestCPS(prevBestCPS => Math.max(prevBestCPS, newCPS));
  }, []);

  const handleCursorUpgrade = useCallback((cursorId, cost) => {
    if (totalClicks >= cost) {
      setTotalClicks(prevClicks => prevClicks - cost);
      setUnlockedCursorSkins(prev => [...prev, cursorId]);
      setEquippedCursorSkin(cursorId);
      socket.emit('changeCursorSkin', cursorId);
    }
  }, [totalClicks, socket]);

  const handlePurchase = useCallback((cost) => {
    if (totalClicks >= cost) {
      setTotalClicks(prevClicks => prevClicks - cost);
    }
  }, [totalClicks]);

  const handleUpgrade = useCallback((type, value, additionalData) => {
    switch(type) {
      case 'flatAutoClicker':
        setFlatAutoClicker(prev => prev + value);
        break;
      case 'percentAutoClicker':
        setPercentAutoClicker(prev => prev + value);
        break;
      case 'flatClickBonus':
        setFlatClickBonus(prev => prev + value);
        break;
      case 'percentageClickBonus':
        setPercentageClickBonus(prev => prev + value);
        break;
      case 'unlockCursorSkin':
        // Add the cursor to unlockedCursorSkins if it's not already there
        setUnlockedCursorSkins(prev => {
          if (!prev.includes(value)) {
            return [...prev, value];
          }
          return prev;
        });
        break;
      case 'equipCursorSkin':
        // Set the equipped cursor skin
        setEquippedCursorSkin(value);
        // Send the change to the server
        socket.emit('changeCursorSkin', value);
        break;
      // Add cases for cursor abilities and effects if needed
    }
  }, [socket, username]);

  const collectTeamBonus = useCallback(() => {
    setTotalClicks(prevClicks => prevClicks + teamBonus);
    setTeamBonus(0);
  }, [teamBonus]);

  // Auto clicker effect
  useEffect(() => {
    const intervalId = setInterval(() => {
      const flatIncome = flatAutoClicker;
      const percentIncome = Math.floor(bestCPS * (percentAutoClicker / 100));
      const totalIncome = flatIncome + percentIncome;
      setTotalClicks(prev => prev + totalIncome);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [flatAutoClicker, percentAutoClicker, bestCPS]);

  // // Cursor effect
  // useEffect(() => {
  //   if (equippedCursorSkin) {
  //     document.body.style.cursor = `url(${equippedCursorSkin}), auto`;
  //   } else {
  //     document.body.style.cursor = 'default';
  //   }
  //   return () => {
  //     document.body.style.cursor = 'default';
  //   };
  // }, [equippedCursorSkin]);

  // Multiplayer handlers
  const handleMouseMove = useCallback((event) => {
    if (socket) {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX / rect.width * 100;
      const y = event.clientY + window.scrollY;
      socket.emit('cursorMove', { x, y, username });
    }
  }, [socket, username]);

  const handleInviteToTeam = (inviteeId) => {
    if (socket) {
      socket.emit('inviteToTeam', inviteeId);
    }
  };

  const handleAcceptInvite = (inviterId) => {
    if (socket) {
      socket.emit('acceptTeamInvite', inviterId);
      setTeamInvites(prev => prev.filter(id => id !== inviterId));
    }
  };

  const handleLeaveTeam = () => {
    if (socket) {
      socket.emit('leaveTeam');
      setTeam(null);
    }
  };

  // Other handlers
  const resetGame = useCallback(() => {
    setUnlocked(false);
    setTotalClicks(0);
    setBestCPS(0);
    setClickMultiplier(1);
    setFlatClickBonus(0);
    setPercentageClickBonus(1);
    setFlatAutoClicker(0);
    setPercentAutoClicker(0);
    setUnlockedCursorSkins(['default']);
    setEquippedCursorSkin('default');
    localStorage.removeItem('tempAccountData');
  }, []);

  const handleUnlockChat = useCallback(() => {
    setChatUnlocked(true);
  }, []);

  const handleGamble = useCallback((cost) => {
    if (totalClicks >= cost) {
      setTotalClicks(prevClicks => prevClicks - cost);
    }
  }, [totalClicks]);

  const handleSendMessage = useCallback((cost) => {
    if (totalClicks >= cost) {
      setTotalClicks(prevClicks => prevClicks - cost);
    }
  }, [totalClicks]);

  const handleUsernameChange = (newUsername) => {
    setUsername(newUsername);
  };

  const toggleShop = () => {
    setIsShopOpen(!isShopOpen);
  };

  return (
    <div className={`App ${equippedCursorSkin !== 'default' || hideCursor ? 'HideCursor' : ''}`} onMouseMove={handleMouseMove}>
      <div className="content">
        <OnlineUsersProvider>
          <Navbar 
            globalClicks={globalClicks} 
            globalCPS={globalCPS} 
            onReset={resetGame} 
            username={username} 
            isLoggedIn={isLoggedIn} 
            onLogin={handleLogin} 
            onLogout={handleLogout}
            onToggleShop={toggleShop}
            />
          <main style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Clicker
                onUnlock={handleUnlock} 
                totalClicks={totalClicks} 
                flatClickBonus={flatClickBonus}
                percentageClickBonus={percentageClickBonus}
                bestCPS={bestCPS}
              />
          </main>
          {unlocked ? (
            <UnlockedContent
              isOpen={isShopOpen}
              onClose={() => setIsShopOpen(false)}
              totalClicks={totalClicks} 
              onPurchase={handlePurchase} 
              onUpgrade={handleUpgrade}
              bestCPS={bestCPS}
              flatAutoClicker={flatAutoClicker}
              percentAutoClicker={percentAutoClicker}
              onGamble={handleGamble}
              onUnlockChat={handleUnlockChat}
              chatUnlocked={chatUnlocked}
              onSendMessage={handleSendMessage}
              unlockedCursorSkins={unlockedCursorSkins}
              unlockedCursorAbilities={unlockedCursorAbilities}
              unlockedCursorEffects={unlockedCursorEffects}
              equippedCursorSkin={equippedCursorSkin}
              equippedCursorEffect={equippedCursorEffect}
              equippedCursorAbility={equippedCursorAbility}
              username={username}
              onUsernameChange={handleUsernameChange}
              cursors={cursors}
              onlineUsers={onlineUsers}
              onInvite={handleInviteToTeam}
              team={team}
              teamInvites={teamInvites}
              onAcceptInvite={handleAcceptInvite}
              onLeaveTeam={handleLeaveTeam}
              teamBonus={teamBonus}
              onCollectTeamBonus={collectTeamBonus}
              currentUserId={userId}
            />
          ) : null}
        </OnlineUsersProvider>
      </div>
    </div>
  );
}

export default App;