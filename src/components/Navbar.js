import React, { useState, useEffect, useRef } from 'react';
import Settings from './Settings';
import UserProfile from './UserProfile';
import { FaMousePointer, FaBolt, FaUser } from 'react-icons/fa';

function Navbar({ globalClicks, globalCPS, onReset, username }) {
  const [animatedClicks, setAnimatedClicks] = useState(globalClicks);
  const previousGlobalClicks = useRef(globalClicks);
  const [showUserProfile, setShowUserProfile] = useState(false);

  useEffect(() => {
    if (globalClicks !== previousGlobalClicks.current) {
      const animationDuration = 1000; // 1 second
      const steps = 10;
      const startValue = previousGlobalClicks.current;
      const endValue = globalClicks;
      const increment = (endValue - startValue) / steps;
      let currentStep = 0;

      const interval = setInterval(() => {
        if (currentStep < steps) {
          setAnimatedClicks(prev => {
            const newValue = Math.round(startValue + increment * (currentStep + 1));
            return newValue;
          });
          currentStep++;
        } else {
          setAnimatedClicks(endValue);
          clearInterval(interval);
        }
      }, animationDuration / steps);

      previousGlobalClicks.current = globalClicks;

      return () => clearInterval(interval);
    }
  }, [globalClicks]);

  const toggleUserProfile = () => {
    setShowUserProfile(!showUserProfile);
  };

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
      <div>
        <div onClick={toggleUserProfile} style={{ cursor: 'pointer' }}>
          <FaUser /> {username}
        </div>
        {showUserProfile && <UserProfile onClose={toggleUserProfile} />} 
        
        <Settings onReset={onReset} />
      </div>
    </nav>
  );
}

export default Navbar;

