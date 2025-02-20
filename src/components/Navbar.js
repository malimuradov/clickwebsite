import React, { useState, useEffect } from 'react';
import Settings from './Settings';
import { FaMousePointer, FaBolt } from 'react-icons/fa';

function Navbar({ globalClicks, globalCPS, onReset }) {
  const [animatedClicks, setAnimatedClicks] = useState(globalClicks);

  useEffect(() => {
    const animationDuration = 1000; // 1 second
    const steps = 60;
    const increment = (globalClicks - animatedClicks) / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      if (currentStep < steps) {
        setAnimatedClicks(prev => Math.round(prev + increment));
        currentStep++;
      } else {
        setAnimatedClicks(globalClicks);
        clearInterval(interval);
      }
    }, animationDuration / steps);

    return () => clearInterval(interval);
  }, [globalClicks]);

  const getColor = (value) => {
    const hue = Math.min(value / 10, 120); // Max green at 1200 CPS
    return `hsl(${hue}, 100%, 50%)`;
  };
  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 20px',
      backgroundColor: '#f8f9fa',
      borderBottom: '1px solid #e0e0e0',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
      <div></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <FaMousePointer size={24} color="#007bff" />
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>
            {animatedClicks.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>Global Clicks</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <FaBolt size={24} color={getColor(globalCPS)} />
          <div style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '5px', color: getColor(globalCPS) }}>
            {globalCPS}
          </div>
          <div style={{ fontSize: '12px', color: '#6c757d' }}>Global CPS</div>
        </div>
      </div>
      <Settings onReset={onReset} />
    </nav>
  );
}

export default Navbar;

