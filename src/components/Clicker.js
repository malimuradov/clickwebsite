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

  const [isTimerEnabled, setIsTimerEnabled] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(10);
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [timerClicks, setTimerClicks] = useState(0);
  const [records, setRecords] = useState([]);

  const timeLeftRef = useRef(timerDuration);
  const timerStartTimeRef = useRef(0);

  const calculateClickValue = useCallback(() => {
    const baseClickValue = 1;
    const bonusClickValue = flatClickBonus;
    const multipliedClickValue = (baseClickValue + bonusClickValue) * percentageClickBonus;
    return Math.round(multipliedClickValue);
  }, [flatClickBonus, percentageClickBonus]);

  const startTimer = useCallback(() => {
    setIsTimerRunning(true);
    setTimeLeft(timerDuration);
    timeLeftRef.current = timerDuration;
    timerStartTimeRef.current = Date.now();
    setTimerClicks(0);
  }, [timerDuration]);

  const stopTimer = useCallback(() => {
    setIsTimerRunning(false);
    const actualDuration = (Date.now() - timerStartTimeRef.current) / 1000;
    const averageCPS = timerClicks / actualDuration;
    setRecords(prevRecords => [...prevRecords, { clicks: timerClicks, averageCPS, duration: actualDuration }]);
  }, [timerClicks]);

  const resetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerDuration);
    timeLeftRef.current = timerDuration;
    setTimerClicks(0);
  };

  const toggleTimerEnable = () => {
    setIsTimerEnabled(!isTimerEnabled);
    if (isTimerRunning) {
      stopTimer();
    }
  };

  const processClick = useCallback((clickValue) => {
    socket.emit('incrementCount', clickValue);
    const now = Date.now();
    clicksRef.current.push(now);
    const recentClicks = clicksRef.current.filter(click => now - click < 1000);
    cpsRef.current = recentClicks.length;
    const newTotalClicks = totalClicks + clickValue;
    onUnlock(newTotalClicks, Math.max(clientCPS, propBestCPS));

    if (isTimerRunning) {
      setTimerClicks(prevClicks => prevClicks + 1);
      const elapsedTime = (now - timerStartTimeRef.current) / 1000;
      const remainingTime = Math.max(0, timerDuration - elapsedTime);
      timeLeftRef.current = remainingTime;
      setTimeLeft(Math.ceil(remainingTime));

      if (remainingTime <= 0) {
        stopTimer();
      }
    }
  }, [totalClicks, onUnlock, clientCPS, propBestCPS, isTimerRunning, timerDuration, stopTimer]);

  const handleClick = useCallback(() => {
    const clickValue = calculateClickValue();
    processClick(clickValue);
    if (isTimerEnabled && !isTimerRunning) {
      startTimer();
    }
  }, [calculateClickValue, processClick, isTimerEnabled, isTimerRunning, startTimer]);

  useEffect(() => {
    socket.on('updateCount', (newCount) => {
      setCount(newCount);
    });

    let simulationInterval;
    if (isSimulating) {
      simulationInterval = setInterval(() => {
        handleClick();
      }, 5);
    }

    const intervalId = setInterval(() => {
      const now = Date.now();
      const recentClicks = clicksRef.current.filter(click => now - click < 1000);
      clicksRef.current = recentClicks;
      const instantaneousCPS = recentClicks.length;
      cpsRef.current = instantaneousCPS;
      setClientCPS(cpsRef.current);

      if (cpsRef.current > propBestCPS) {
        onUnlock(totalClicks, cpsRef.current);
      }

      if (isTimerRunning) {
        const elapsedTime = (now - timerStartTimeRef.current) / 1000;
        const remainingTime = Math.max(0, timerDuration - elapsedTime);
        timeLeftRef.current = remainingTime;
        setTimeLeft(Math.ceil(remainingTime));

        if (remainingTime <= 0) {
          stopTimer();
        }
      }
    }, 5);

    return () => {
      socket.off('updateCount');
      socket.off('updateGlobalCPS');
      clearInterval(intervalId);
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [handleClick, isSimulating, onUnlock, propBestCPS, totalClicks, isTimerRunning, timerDuration, stopTimer]);

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
      {/* Timer controls */}
      <div>
        <label>
          <input 
            type="checkbox" 
            checked={isTimerEnabled}
            onChange={toggleTimerEnable}
          />
          Enable Timer
        </label>
        <input 
          type="number" 
          value={timerDuration} 
          onChange={(e) => setTimerDuration(Number(e.target.value))}
          min="1"
        />
        <button onClick={resetTimer} disabled={isTimerRunning}>
          Reset Timer
        </button>
        {isTimerEnabled && (isTimerRunning ? (
          <p>Time left: {timeLeft}s</p>
        ) : (
          <p>Click to start timer</p>
        ))}
      </div>


      {/* Display records */}
      <div>
        <h3>Records:</h3>
        <ul>
          {records.map((record, index) => (
            <li key={index}>
              Clicks: {record.clicks}, 
              Avg CPS: {record.averageCPS.toFixed(2)}, 
              Duration: {record.duration}s
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Clicker;

