import React, { useState, useEffect, useCallback } from 'react';
import Clicker from './components/Clicker';
import UnlockedContent from './components/UnlockedContent';
import './App.css';

import Navbar from './components/Navbar';

import { OnlineUsersProvider } from './contexts/OnlineUsersContext';
import { cursorSkins, cursorEffects, cursorAbilities } from './data/cursorData';

import { useSocket } from './contexts/SocketContext';

function App() {
  // Auth
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);

  // Game state
  const [unlocked, setUnlocked] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);
  const [bestCPS, setBestCPS] = useState(0);
  const [clickMultiplier, setClickMultiplier] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isTemporaryAccount, setIsTemporaryAccount] = useState(false);
  const [hideCursor, setHideCursor] = useState(false);

  // Upgrades
  const [flatClickBonus, setFlatClickBonus] = useState(0);
  const [percentageClickBonus, setPercentageClickBonus] = useState(1);
  const [flatAutoClicker, setFlatAutoClicker] = useState(0);
  const [percentAutoClicker, setPercentAutoClicker] = useState(0);

  // Unlockables
  const [drawingUnlocked, setDrawingUnlocked] = useState(false);
  const [gamblingUnlocked, setGamblingUnlocked] = useState(false);
  const [chatUnlocked, setChatUnlocked] = useState(false);

  // Cursor
  const [unlockedCursors, setUnlockedCursors] = useState([]);
  const [cursorEffect, setCursorEffect] = useState(null);
  const [cursorAbility, setCursorAbility] = useState(null)

  // Multiplayer
  const [teamBonus, setTeamBonus] = useState(0);
  const [globalClicks, setGlobalClicks] = useState(0);
  const [globalCPS, setGlobalCPS] = useState(0);
  // const [socket, setSocket] = useSocket();
  const { socket, userId, username, equippedCursor, setEquippedCursor, cursors, setUsername, isLoggedIn, setIsLoggedIn } = useSocket();

  // const [cursors, setCursors] = useState({});
  // const [username, setUsername] = useState('');
  // const [userId, setUserId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [team, setTeam] = useState(null);
  const [teamInvites, setTeamInvites] = useState([]);

  // const isDevelopment = process.env.NODE_ENV === 'development';
  // const socketUrl = isDevelopment ? 'http://localhost:4000' : 'http://52.59.228.62:8080';

  // // Socket connection
  // useEffect(() => {
  //   const storedToken = localStorage.getItem('userToken');
  //   const newSocket = io(socketUrl);

  //   newSocket.on('authentication', ({ token, userId, username }) => {
  //     localStorage.setItem('token', token);
  //     setUserId(userId);
  //     setUsername(username);
  //   });

  //   // Authenticate with the server
  //   const token = localStorage.getItem('token');
  //   if (token) {
  //     newSocket.emit('authenticate', token);
  //   } else {
  //     newSocket.emit('authenticate', null);
  //   }

  //   newSocket.on('connect', () => {
  //     console.log('Connected to the server');
  //   });

  //   newSocket.on('connect_error', (err) => {
  //     console.error('Failed to connect to the server:', err);
  //   });

  //   // newSocket.on('authentication', ({ token, userId, username }) => {
  //   //   localStorage.setItem('userToken', token);
  //   //   setUserId(userId);
  //   //   setUsername(username);
  //   // });
  //   setSocket(newSocket)

  //   newSocket.on('updateCursors', (updatedCursors) => {
  //     setCursors(updatedCursors);
  //   });

  //   return () => newSocket.close();
  // }, [socketUrl]);

  // Auth handle
  const handleLogin = useCallback((token) => {
    setIsLoggedIn(true);
    setIsTemporaryAccount(false);
    if (socket) {
      socket.emit('authenticate', token);
    }
    // Clear temporary account data
    // localStorage.removeItem('tempAccountData');
  }, [socket]);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    localStorage.removeItem('token');
    if (socket) {
      socket.emit('logout');
    }
    // Load temporary account data if it exists
    const cachedData = localStorage.getItem('tempAccountData');
    // if (cachedData) {
    //   const { username, equippedCursor, gameState } = JSON.parse(cachedData);
    //   setUsername(username);
    //   setEquippedCursor(equippedCursor);
    //   setIsTemporaryAccount(true);
    //   // Load other game state data as needed
    //   // For example:
    //   setTotalClicks(gameState.totalClicks);
    //   setDrawingUnlocked(gameState.drawingUnlocked);
    //   // ... (load other state variables)
    // } else {
    //   // Generate new temporary account
    //   const tempUsername = generateRandomUsername();
    //   setUsername(tempUsername);
    //   setIsTemporaryAccount(true);
    //   socket.emit('setTempAccount', { username: tempUsername });
    // }
  }, [socket]);

  const upgradeToPermAccount = useCallback((token) => {
    if (socket) {
      socket.emit('upgradeAccount', token);
    }
    setIsTemporaryAccount(false);
    setIsLoggedIn(true);
    // Clear temporary account data
    localStorage.removeItem('tempAccountData');
  }, [socket]);

  // Socket event listeners
  useEffect(() => {
    if (socket) {
      socket.on('updateCount', (newCount) => {
        setGlobalClicks(newCount);
      });
  
      socket.on('updateGlobalCPS', (newCPS) => {
        setGlobalCPS(newCPS);
      });

      socket.on('teamClickBonus', (bonus) => {
        setTeamBonus(prevBonus => {
          const numPrevBonus = Number(prevBonus) || 0;
          const numBonus = Number(bonus) || 0;
          return Number((numPrevBonus + numBonus).toFixed(2));
        });
      });

      socket.on('updateOnlineUsers', (users) => {
        setOnlineUsers(Array.isArray(users) ? users : []);
      });

      socket.on('teamInvite', (inviterId) => {
        setTeamInvites(prev => [...prev, inviterId]);
      });

      socket.on('teamUpdate', (newTeam) => {
        setTeam(newTeam);
      });

      if (username) {
        socket.emit('setUsername', username);
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
  }, [socket, username]);

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
        drawingUnlocked,
        bestCPS,
        clickMultiplier,
        flatClickBonus,
        percentageClickBonus,
        flatAutoClicker,
        percentAutoClicker,
        gamblingUnlocked,
        chatUnlocked,
        unlockedCursors,
        equippedCursor,
        username,
        team,
        teamInvites,
        cursorEffect,
        cursorAbility,
        chatUnlocked
      };
      if (isTemporaryAccount) {
        // Save to tempAccountData in localStorage
        localStorage.setItem('tempAccountData', JSON.stringify({
          username,
          equippedCursor,
          gameState
        }));
      } else {
        // Save to regular gameState in localStorage
        localStorage.setItem('gameState', JSON.stringify(gameState));
      }
    }
  }, [isLoaded, totalClicks, drawingUnlocked, bestCPS, clickMultiplier, flatClickBonus, percentageClickBonus, flatAutoClicker, percentAutoClicker, gamblingUnlocked, chatUnlocked, unlockedCursors, equippedCursor, username, team, teamInvites, isTemporaryAccount]);
  

  useEffect(() => {
    const storedData = localStorage.getItem('gameState');
    if (storedData) {
      const parsedData = JSON.parse(storedData);
      setTotalClicks(parsedData.totalClicks || 0);
      setUnlocked(parsedData.totalClicks >= 100);
      setDrawingUnlocked(parsedData.drawingUnlocked || false);
      setBestCPS(parsedData.bestCPS || 0);
      setClickMultiplier(parsedData.clickMultiplier || 1);
      setFlatClickBonus(parsedData.flatClickBonus || 0);
      setPercentageClickBonus(parsedData.percentageClickBonus || 1);
      setFlatAutoClicker(parsedData.flatAutoClicker || 0);
      setPercentAutoClicker(parsedData.percentAutoClicker || 0);
      setGamblingUnlocked(parsedData.gamblingUnlocked || false);
      setChatUnlocked(parsedData.chatUnlocked || false);
      setUnlockedCursors(parsedData.unlockedCursors || []);
      setEquippedCursor(parsedData.equippedCursor || null);
      setUsername(parsedData.username || '');
      setTeam(parsedData.team || null);
      setTeamInvites(parsedData.teamInvites || []);
      setChatUnlocked(parsedData.chatUnlocked || false);
      setCursorAbility(parsedData.cursorAbility || null);
      setCursorEffect(parsedData.cursorEffect || null);
      // Check if username exists, if not generate a new one
      const storedUsername = parsedData.username;
      if (storedUsername) {
        setUsername(storedUsername);
      } else {
        // const newUsername = generateRandomUsername();
        // setUsername(newUsername);
      }
    } else {
      // // If no stored data, generate a new username
      // const newUsername = generateRandomUsername();
      // setUsername(newUsername);
    }
    setIsLoaded(true);
  }, []);

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

  const handleCursorUpgrade = useCallback((cursorId, cost, newCursorImage) => {
    if (totalClicks >= cost) {
      setTotalClicks(prevClicks => prevClicks - cost);
      setUnlockedCursors(prev => [...prev, cursorId]);
      setEquippedCursor(cursorId);
      console.log(equippedCursor)
      socket.emit('changeCursorSkin', cursorId);
    }
  }, [totalClicks]);

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
      case 'cursorUpgrade':
        const cursorInfo = cursorSkins.find(cursor => cursor.id === additionalData);
        if (cursorInfo) {
          handleCursorUpgrade(cursorInfo.id, cursorInfo.cost, cursorInfo.cursorImage);
        }
        break;
      case 'cursorEffect':
        setCursorEffect(value);
        break;
      case 'cursorAbility':
        setCursorAbility(value);
        break;
    }
  }, [handleCursorUpgrade]);

  

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

  // Cursor effect
  useEffect(() => {
    if (equippedCursor) {
      document.body.style.cursor = `url(${equippedCursor}), auto`;
    } else {
      document.body.style.cursor = 'default';
    }
    return () => {
      document.body.style.cursor = 'default';
    };
  }, [equippedCursor]);

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
    setDrawingUnlocked(false);
    setBestCPS(0);
    setClickMultiplier(1);
    setFlatClickBonus(0);
    setPercentageClickBonus(1);
    setFlatAutoClicker(0);
    setPercentAutoClicker(0);
    setUnlockedCursors([]);
    setEquippedCursor('default');
    localStorage.removeItem('tempAccountData');
  }, []);

  const handleUnlockDrawing = useCallback(() => {
    setDrawingUnlocked(true);
  }, []);

  const handleUnlockGambling = useCallback(() => {
    setGamblingUnlocked(true);
  }, []);

  const handleUnlockChat = useCallback(() => {
    setChatUnlocked(true);
  }, []);

  const handleGamble = useCallback((cost) => {
    if (totalClicks >= cost) {
      setTotalClicks(prevClicks => prevClicks - cost);
      // Add gambling logic here
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

  return (
    <div className={`App ${hideCursor ? 'HideCursor' : ''}`} onMouseMove={handleMouseMove}>
      <div className="content">
        <OnlineUsersProvider>
          <Navbar globalClicks={globalClicks} globalCPS={globalCPS} onReset={resetGame} username={username} isLoggedIn={isLoggedIn} onLogin={handleLogin} onLogout={handleLogout} />
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
              totalClicks={totalClicks} 
              onPurchase={handlePurchase} 
              onUpgrade={handleUpgrade}
              bestCPS={bestCPS}
              flatAutoClicker={flatAutoClicker}
              percentAutoClicker={percentAutoClicker}
              onUnlockGambling={handleUnlockGambling}
              gamblingUnlocked={gamblingUnlocked}
              onGamble={handleGamble}
              onUnlockChat={handleUnlockChat}
              chatUnlocked={chatUnlocked}
              onSendMessage={handleSendMessage}
              unlockedCursors={unlockedCursors}
              equippedCursor={equippedCursor}
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
              userSkin={equippedCursor}
              userEffect={cursorEffect}
              userAbility={cursorAbility}
              currentUserId={userId}
            />
          ) : null}
        </OnlineUsersProvider>
      </div>
    </div>
  );
}

export default App;