import React, { useState, useEffect, useRef, useCallback } from 'react';
import ClickButton from './ClickButton';
import Stats from './Stats';
import '../styles/Clicker.css'; // Import the CSS file

import { useSocket } from '../contexts/SocketContext';

/**
 * @typedef {Object} ClickerProps
 * @property {function} onUnlock - Function to call when unlocking content
 * @property {number} totalClicks - Total number of clicks
 * @property {number} flatClickBonus - Flat bonus applied to each click
 * @property {number} percentageClickBonus - Percentage bonus applied to each click
 * @property {number} bestCPS - Best clicks per second achieved
 */

/**
 * Clicker component for handling user clicks and displaying click information.
 * @param {ClickerProps} props - Component props
 * @returns {JSX.Element} Clicker component
 */
function Clicker({ onUnlock, totalClicks, flatClickBonus, percentageClickBonus, bestCPS: propBestCPS }) {
  const { socket, userId, username, cursors, setUsername } = useSocket();

  const [clientCPS, setClientCPS] = useState(0);
  const clicksRef = useRef([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const cpsRef = useRef(0);

  const [isTimerEnabled, setIsTimerEnabled] = useState(true);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerDuration, setTimerDuration] = useState(10);
  const [timeLeft, setTimeLeft] = useState(timerDuration);
  const [timerClicks, setTimerClicks] = useState(0);
  const [records, setRecords] = useState([]);

  const timeLeftRef = useRef(timerDuration);
  const timerStartTimeRef = useRef(0);

  const [listeningForKey, setListeningForKey] = useState(false);
  const [selectedKey, setSelectedKey] = useState(null);
  const [keyPressed, setKeyPressed] = useState(false); // state to track key press

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
    // Increment the global click count
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
  }, [totalClicks, onUnlock, clientCPS, propBestCPS, isTimerRunning, timerDuration, stopTimer, socket]);

  const handleClick = useCallback(() => {
    const clickValue = calculateClickValue();
    processClick(clickValue);
    if (isTimerEnabled && !isTimerRunning) {
      startTimer();
    }
  }, [calculateClickValue, processClick, isTimerEnabled, isTimerRunning, startTimer]);

  useEffect(() => {
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
      clearInterval(intervalId);
      if (simulationInterval) clearInterval(simulationInterval);
    };
  }, [handleClick, isSimulating, onUnlock, propBestCPS, totalClicks, isTimerRunning, timerDuration, stopTimer]);

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === selectedKey && !keyPressed) {
        event.preventDefault(); // Prevent default behavior
        setKeyPressed(true);
      }
    };

    const handleKeyRelease = (event) => {
      if (event.key === selectedKey && keyPressed) {
        setKeyPressed(false);
        handleClick();
      }
    };

    if (selectedKey) {
      window.addEventListener('keydown', handleKeyPress);
      window.addEventListener('keyup', handleKeyRelease);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keyup', handleKeyRelease);
    };
  }, [selectedKey, handleClick, keyPressed]);

  const toggleSimulation = () => {
    setIsSimulating(!isSimulating);
  };

  const startListeningForKey = () => {
    setListeningForKey(true);
  };

  const handleKeySelection = (event) => {
    if (listeningForKey) {
      setSelectedKey(event.key);
      setListeningForKey(false);
    }
  };

  useEffect(() => {
    if (listeningForKey) {
      window.addEventListener('keydown', handleKeySelection);
    }

    return () => {
      window.removeEventListener('keydown', handleKeySelection);
    };
  }, [listeningForKey]);

  return (
    <div className="clicker-container">
      <div className="left-section">
        <ClickButton onClick={handleClick} />
      </div>
      <div className="middle-section">
        <Stats cps={clientCPS} bestCps={propBestCPS} totalClicks={totalClicks} />
        <button onClick={toggleSimulation}>
          {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
        </button>
      </div>
      <div className="right-section">
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
          <button onClick={resetTimer}>
            Reset Timer
          </button>
          {isTimerEnabled && (isTimerRunning ? (
            <p>Time left: {timeLeft}s</p>
          ) : (
            <p>Click to start timer</p>
          ))}
        </div>

        {/* Key selection */}
        <div>
          <button onClick={startListeningForKey}>
            {listeningForKey ? 'Press any key...' : 'Listen for key'}
          </button>
          {selectedKey && !listeningForKey && (
            <p>Selected key: {selectedKey}</p>
          )}
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
    </div>
  );
}

export default Clicker;

