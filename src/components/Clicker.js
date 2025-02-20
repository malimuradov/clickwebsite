import React, { useState, useEffect, useRef, useCallback } from 'react';
import ClickButton from './ClickButton';
import Stats from './Stats';
import { useOnlineUsers } from '../contexts/OnlineUsersContext';

function Clicker({ onUnlock, totalClicks, flatClickBonus, percentageClickBonus, bestCPS: propBestCPS }) {
  const { onlineUsers, socket } = useOnlineUsers();
  const [count, setCount] = useState(0);
  const [clientCPS, setClientCPS] = useState(0);
  const clicksRef = useRef([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const cpsRef = useRef(0);

  const calculateClickValue = useCallback(() => {
    const baseClickValue = 1;
    const bonusClickValue = flatClickBonus;
    const multipliedClickValue = (baseClickValue + bonusClickValue) * percentageClickBonus;
    return Math.round(multipliedClickValue);
  }, [flatClickBonus, percentageClickBonus]);

  const processClick = useCallback((clickValue) => {
    socket.emit('incrementCount', clickValue);
    const now = Date.now();
    clicksRef.current.push(now);
    // Update CPS immediately
    const recentClicks = clicksRef.current.filter(click => now - click < 1000);
    cpsRef.current = recentClicks.length;
    const newTotalClicks = totalClicks + clickValue;
    onUnlock(newTotalClicks, Math.max(clientCPS, propBestCPS));
  }, [totalClicks, onUnlock, clientCPS, propBestCPS]);
  
  const handleClick = useCallback(() => {
    const clickValue = calculateClickValue();
    processClick(clickValue);
  }, [calculateClickValue, processClick]);

  useEffect(() => {
    socket.on('updateCount', (newCount) => {
      setCount(newCount);
    });

    let simulationInterval;
    if (isSimulating) {
      simulationInterval = setInterval(() => {
        handleClick();
      }, 5); // Simulate a click every 100ms (10 CPS)
    }

    const intervalId = setInterval(() => {
      const now = Date.now();
      const recentClicks = clicksRef.current.filter(click => now - click < 1000);
      clicksRef.current = recentClicks;

      const instantaneousCPS = recentClicks.length;
      cpsRef.current = instantaneousCPS;

      // Update state less frequently to avoid excessive re-renders
      setClientCPS(cpsRef.current);

      if (cpsRef.current > propBestCPS) {
        onUnlock(totalClicks, cpsRef.current);
      }
    }, 5);

    return () => {
      socket.off('updateCount');
      socket.off('updateGlobalCPS');
      clearInterval(intervalId);
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [handleClick, isSimulating, onUnlock, propBestCPS, totalClicks]);




  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
  };



  return (
    <div>
      <ClickButton onClick={handleClick} />
      <Stats cps={clientCPS} bestCps={propBestCPS} totalClicks={totalClicks} />
      <button onClick={toggleSimulation}>
        {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
      </button>
    </div>
  );
}

export default Clicker;

