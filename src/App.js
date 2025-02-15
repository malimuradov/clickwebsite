import React, { useState, useEffect, useCallback } from 'react';
import Clicker from './components/Clicker';
import UnlockedContent from './components/UnlockedContent';
import DrawingCanvas from './components/DrawingCanvas';
import Settings from './components/Settings';
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

  const handleUpgrade = useCallback((type, value) => {
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
    }
  }, []);

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
    <div className="App">
      <Settings onReset={resetGame} />
      {drawingUnlocked && <DrawingCanvas />}
      <div className="content">
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
            />
          ) : null}
        </div>
      </div>
    );
}

export default App;