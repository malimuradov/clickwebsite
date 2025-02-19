import React, { useState, useEffect, useCallback } from 'react';
import Clicker from './components/Clicker';
import UnlockedContent from './components/UnlockedContent';
import DrawingCanvas from './components/DrawingCanvas';
import Settings from './components/Settings';
import io from 'socket.io-client';
import './App.css';

function App() {
const [unlocked, setUnlocked] = useState(false);
const [totalClicks, setTotalClicks] = useState(0);
const [drawingUnlocked, setDrawingUnlocked] = useState(false);
const [bestCPS, setBestCPS] = useState(0);
const [clickMultiplier, setClickMultiplier] = useState(1);
const [isLoaded, setIsLoaded] = useState(false);
const [flatClickBonus, setFlatClickBonus] = useState(0);
const [percentageClickBonus, setPercentageClickBonus] = useState(1);
const [flatAutoClicker, setFlatAutoClicker] = useState(0);
const [percentAutoClicker, setPercentAutoClicker] = useState(0);
const [gamblingUnlocked, setGamblingUnlocked] = useState(false);
const [chatUnlocked, setChatUnlocked] = useState(false);
const [cursorImage, setCursorImage] = useState(null);
const [unlockedCursors, setUnlockedCursors] = useState([]);
const [equippedCursor, setEquippedCursor] = useState(null);
const [socket, setSocket] = useState(null);
const [cursors, setCursors] = useState({});
const [username, setUsername] = useState('');
const [onlineUsers, setOnlineUsers] = useState([]);
const [team, setTeam] = useState(null);
const [teamInvites, setTeamInvites] = useState([]);

const isDevelopment = process.env.NODE_ENV === 'development';
const socketUrl = isDevelopment ? 'http://localhost:4000' : 'http://52.59.228.62:8080';


const handleUsernameChange = (newUsername) => {
  setUsername(newUsername);
};

useEffect(() => {
  const newSocket = io(socketUrl);
  setSocket(newSocket);

  newSocket.on('updateCursors', (updatedCursors) => {
    setCursors(updatedCursors);
  });

  // // Implement ping-pong
  // const pingInterval = setInterval(() => {
  //   console.log('Pinging server...');
  //   newSocket.emit('ping');
  // }, 5000); // Send a ping every 5 seconds

  // newSocket.on('pong', () => {
  //   console.log('Pong received');
  // });

  return () => {
    // clearInterval(pingInterval);
    newSocket.close();
  };
}, []);

useEffect(() => {
  if (socket) {
    socket.on('updateOnlineUsers', (users) => {
      // Ensure users is always an array
      setOnlineUsers(Array.isArray(users) ? users : []);
    });

    socket.on('teamInvite', (inviterId) => {
      setTeamInvites(prev => [...prev, inviterId]);
    });

    socket.on('teamUpdate', (newTeam) => {
      setTeam(newTeam);
    });

    // Emit the username when connecting, but only if it's not empty
    if (username) {
      socket.emit('setUsername', username);
    }

    // Add a listener for username changes
    return () => {
      socket.off('updateOnlineUsers');
      socket.off('teamInvite');
      socket.off('teamUpdate');
    };
  }
}, [socket, username]);

// Add a new useEffect to handle username changes
useEffect(() => {
  if (socket && username) {
    socket.emit('setUsername', username);
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
useEffect(() => {
  const newSocket = io(socketUrl);
  setSocket(newSocket);

  newSocket.on('updateCursors', (updatedCursors) => {
    setCursors(updatedCursors);
  });

  return () => newSocket.close();
}, []);

const handleMouseMove = useCallback((event) => {
  if (socket) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX / rect.width * 100;
    const y = event.clientY + window.scrollY;
    socket.emit('cursorMove', { x, y, username });
  }
}, [socket, username]);

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
      percentAutoClicker
    };
    localStorage.setItem('gameState', JSON.stringify(gameState));
  }
}, [isLoaded, totalClicks, drawingUnlocked, bestCPS, clickMultiplier, flatClickBonus, percentageClickBonus, flatAutoClicker, percentAutoClicker]);

useEffect(() => {
  // Load all data from localStorage
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
    setOnlineUsers(parsedData.onlineUsers || []);
    setTeam(parsedData.team || null);
    setTeamInvites(parsedData.teamInvites || []);
  }
  setIsLoaded(true);
}, []);

const handleUnlockChat = useCallback(() => {
  setChatUnlocked(true);
}, []);

const handleSendMessage = useCallback((cost) => {
  if (totalClicks >= cost) {
    setTotalClicks(prevClicks => prevClicks - cost);
  }
}, [totalClicks]);

useEffect(() => {
  if (isLoaded) {
    saveGameState();
  }
}, [isLoaded, saveGameState]);

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
}, [totalClicks]);

const handleCursorUpgrade = useCallback((cursorId, cost, newCursorImage) => {
  if (totalClicks >= cost) {
    setTotalClicks(prevClicks => {
      return prevClicks - cost;
    });
    setUnlockedCursors(prev => [...prev, cursorId]);
    setEquippedCursor(cursorId);
    setCursorImage(newCursorImage);
  } else {
    console.log('Not enough clicks to upgrade cursor');
  }
}, [totalClicks]);

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

const handleUnlockDrawing = useCallback(() => {
  setDrawingUnlocked(true);
}, []);

const handleUnlockGambling = useCallback(() => {
  setGamblingUnlocked(true);
}, []);

const handleGamble = useCallback((cost) => {
  if (totalClicks >= cost) {
    setTotalClicks(prevClicks => prevClicks - cost);
    // Add gambling logic here
  }
}, [totalClicks]);



useEffect(() => {
  const intervalId = setInterval(() => {
    const flatIncome = flatAutoClicker;
    const percentIncome = Math.floor(bestCPS * (percentAutoClicker / 100));
    const totalIncome = flatIncome + percentIncome;
    setTotalClicks(prev => prev + totalIncome);
  }, 1000);

  return () => clearInterval(intervalId);
}, [flatAutoClicker, percentAutoClicker, bestCPS]);

return (
  <div className="App" onMouseMove={handleMouseMove}>
    <div className="content">
      <Settings onReset={resetGame} />
      <Clicker
        onUnlock={handleUnlock} 
        totalClicks={totalClicks} 
        flatClickBonus={flatClickBonus}
        percentageClickBonus={percentageClickBonus}
        bestCPS={bestCPS}
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
    </div>
  </div>
);
}

export default App;