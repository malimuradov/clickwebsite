import React, { useState, useEffect, useRef, useCallback } from 'react';
import ClickButton from './ClickButton';
import io from 'socket.io-client';

const socket = io('/');
function Clicker({ onUnlock, totalClicks, flatClickBonus, percentageClickBonus, bestCPS: propBestCPS }) {
  const [count, setCount] = useState(0);
  const [clientCPS, setClientCPS] = useState(0);
  const [globalCPS, setGlobalCPS] = useState(0);
  const clicksRef = useRef([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const cpsRef = useRef(0);
  const [onlineUsers, setOnlineUsers] = useState(0);

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
    socket.on('updateOnlineUsers', (numUsers) => {
      setOnlineUsers(numUsers);
    });

    return () => {
      socket.off('updateOnlineUsers');
    };
  }, []);

  useEffect(() => {
    socket.on('updateCount', (newCount) => {
      setCount(newCount);
    });

    socket.on('updateGlobalCPS', (newCPS) => {
      setGlobalCPS(newCPS);
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
      socket.off('updateOnlineUsers');  // Don't forget to remove the listener
      clearInterval(intervalId);
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [handleClick, isSimulating, onUnlock, propBestCPS, totalClicks]);



  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
  };



  return (
    <div>
      <h2>Globally Clicked: {count} times</h2>
      <h3>Your CPS: {clientCPS}</h3>
      <h3>Your Best CPS: {propBestCPS}</h3>
      <h3>Global CPS: {globalCPS}</h3>
      <h3>Online Users: {onlineUsers}</h3> 
      <ClickButton onClick={handleClick} />

      <h3>Your Total Clicks: {totalClicks}</h3>
      <button onClick={toggleSimulation}>
        {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
      </button>
    </div>
  );
}

export default Clicker;

