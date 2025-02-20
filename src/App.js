import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import Settings from './components/Settings';
import Clicker from './components/Clicker';
import UnlockedContent from './components/UnlockedContent';
import './App.css';

import { OnlineUsersProvider } from './contexts/OnlineUsersContext';

function App() {
  // Game state
  const [unlocked, setUnlocked] = useState(false);
  const [totalClicks, setTotalClicks] = useState(0);
  const [bestCPS, setBestCPS] = useState(0);
  const [clickMultiplier, setClickMultiplier] = useState(1);
  const [isLoaded, setIsLoaded] = useState(false);

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
  const [cursorImage, setCursorImage] = useState(null);
  const [unlockedCursors, setUnlockedCursors] = useState([]);
  const [equippedCursor, setEquippedCursor] = useState(null);

  // Multiplayer
  const [socket, setSocket] = useState(null);
  const [cursors, setCursors] = useState({});
  const [username, setUsername] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [team, setTeam] = useState(null);
  const [teamInvites, setTeamInvites] = useState([]);

  const isDevelopment = process.env.NODE_ENV === 'development';
  const socketUrl = isDevelopment ? 'http://localhost:4000' : 'http://52.59.228.62:8080';

  // Socket connection
  useEffect(() => {
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.on('updateCursors', (updatedCursors) => {
      setCursors(updatedCursors);
    });

    return () => newSocket.close();
  }, [socketUrl]);

  // Socket event listeners
  useEffect(() => {
    if (socket) {
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
        socket.off('updateOnlineUsers');
        socket.off('teamInvite');
        socket.off('teamUpdate');
      };
    }
  }, [socket, username]);

  // Username change handler
  useEffect(() => {
    if (socket && username) {
      socket.emit('setUsername', username);
    }
  }, [socket, username]);

  // Generate random username
  const generateRandomUsername = () => {
    const adjectives = ['Happy', 'Lucky', 'Sunny', 'Clever', 'Swift'];
    const nouns = ['Clicker', 'Gamer', 'Player', 'Champion', 'Star'];
    const randomNumber = Math.floor(Math.random() * 1000);
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${randomAdjective}${randomNoun}${randomNumber}`;
  };

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
        cursorImage,
        unlockedCursors,
        equippedCursor,
        username,
        team,
        teamInvites
      };
      localStorage.setItem('gameState', JSON.stringify(gameState));
    }
  }, [isLoaded, totalClicks, drawingUnlocked, bestCPS, clickMultiplier, flatClickBonus, percentageClickBonus, flatAutoClicker, percentAutoClicker, gamblingUnlocked, chatUnlocked, cursorImage, unlockedCursors, equippedCursor, username, team, teamInvites]);

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
      setCursorImage(parsedData.cursorImage || null);
      setUnlockedCursors(parsedData.unlockedCursors || []);
      setEquippedCursor(parsedData.equippedCursor || null);
      setUsername(parsedData.username || '');
      setTeam(parsedData.team || null);
      setTeamInvites(parsedData.teamInvites || []);
      // Check if username exists, if not generate a new one
      const storedUsername = parsedData.username;
      console.log(`Stored username: ${storedUsername}`);
      if (storedUsername) {
        setUsername(storedUsername);
      } else {
        const newUsername = generateRandomUsername();
        setUsername(newUsername);
      }
    } else {
      // If no stored data, generate a new username
      const newUsername = generateRandomUsername();
      setUsername(newUsername);
      console.log(`Generated new username: ${newUsername}`);
    }
    setIsLoaded(true);
    console.log('Game state loaded successfully');
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
        handleCursorUpgrade(additionalData.id, additionalData.cost, additionalData.cursorImage);
        break;
    }
  }, []);

  const handleCursorUpgrade = useCallback((cursorId, cost, newCursorImage) => {
    if (totalClicks >= cost) {
      setTotalClicks(prevClicks => prevClicks - cost);
      setUnlockedCursors(prev => [...prev, cursorId]);
      setEquippedCursor(cursorId);
      setCursorImage(newCursorImage);
    }
  }, [totalClicks]);

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
    if (cursorImage) {
      document.body.style.cursor = `url(${cursorImage}), auto`;
    } else {
      document.body.style.cursor = 'default';
    }
    return () => {
      document.body.style.cursor = 'default';
    };
  }, [cursorImage]);

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
    localStorage.removeItem('gameState');
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
    <div className="App" onMouseMove={handleMouseMove}>
      <div className="content">
        <Settings onReset={resetGame} />
        <OnlineUsersProvider>
          <Clicker
            onUnlock={handleUnlock} 
            totalClicks={totalClicks} 
            flatClickBonus={flatClickBonus}
            percentageClickBonus={percentageClickBonus}
            bestCPS={bestCPS}
            onlineUsers={onlineUsers}
          />
        {unlocked ? (
          <UnlockedContent
            totalClicks={totalClicks} 
            onPurchase={handlePurchase} 
            onUnlockDrawing={handleUnlockDrawing}
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
            cursorImage={cursorImage}
            onCursorUpgrade={handleCursorUpgrade}
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
          />
        ) : null}
      </OnlineUsersProvider>
      </div>
    </div>
  );
}

export default App;