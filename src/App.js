import React, { useState, useEffect, useCallback } from 'react';
import Clicker from './components/Clicker';
import UnlockedContent from './components/UnlockedContent';
import DrawingCanvas from './components/DrawingCanvas';
import Settings from './components/Settings';
import io from 'socket.io-client';
import CursorOverlay from './components/CursorOverlay';
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
const [unlockedCursors, setUnlockedCursors] = useState(['default']);
const [equippedCursor, setEquippedCursor] = useState('default');
const [socket, setSocket] = useState(null);
const [cursors, setCursors] = useState({});

const [username, setUsername] = useState(`User${Math.floor(Math.random() * 10000)}`);

const handleUsernameChange = (newUsername) => {
  setUsername(newUsername);
};

useEffect(() => {
  const newSocket = io('http://localhost:4000');
  setSocket(newSocket);

  newSocket.on('updateCursors', (updatedCursors) => {
    setCursors(updatedCursors);
  });

  return () => newSocket.close();
}, []);

const handleMouseMove = useCallback((event) => {
  if (socket) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top + window.scrollY;
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
    setTotalClicks(parsedData.totalClicks);
    setUnlocked(parsedData.totalClicks >= 100);
    setDrawingUnlocked(parsedData.drawingUnlocked);
    setBestCPS(parsedData.bestCPS);
    setClickMultiplier(parsedData.clickMultiplier);
    setFlatClickBonus(parsedData.flatClickBonus);
    setPercentageClickBonus(parsedData.percentageClickBonus);
    setFlatAutoClicker(parsedData.flatAutoClicker);
    setPercentAutoClicker(parsedData.percentAutoClicker);
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
    <Settings onReset={resetGame} />
    {drawingUnlocked && <DrawingCanvas />}
    <CursorOverlay cursors={cursors} username={username}/>
    <div className="content">
      <Clicker
        onUnlock={handleUnlock} 
        totalClicks={totalClicks} 
        flatClickBonus={flatClickBonus}
        percentageClickBonus={percentageClickBonus}
        bestCPS={bestCPS}
        cursorImage={cursorImage}
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
        />
          ) : null}
        </div>
      </div>
    );
}

export default App;