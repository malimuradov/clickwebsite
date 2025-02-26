import React, { useState, useEffect, useRef } from 'react';
import { useOnlineUsers } from '../contexts/OnlineUsersContext';
import { cursorSkins } from '../data/cursorData';
import { useSocket } from '../contexts/SocketContext';


function CursorOverlay({ currentUserId, userSkin, userEffect, userAbility }) {
  const [localCursor, setLocalCursor] = useState({ x: 0, y: 0 });
  const { onlineUsers } = useOnlineUsers();
  const [isClicking, setIsClicking] = useState(false);
  const [showClickAnimation, setShowClickAnimation] = useState(false);
  const clickTimeoutRef = useRef(null);
  const trailRef = useRef([]);
  const [userSkins, setUserSkins] = useState({});
  const { socket } = useSocket();

  const getCursorImage = (skinId) => {
    const skin = cursorSkins.find(skin => skin.id === skinId);
    return skin ? skin.image : '/cursor-images/default.png';
  };
  useEffect(() => {
    if (socket) {
      socket.on('updateUserSkins', (updatedSkins) => {
        setUserSkins(updatedSkins);
        console.log('Updated cursor skins:', updatedSkins);
      });

      return () => {
        socket.off('updateUserSkins');
      };
    }
  }, [socket]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const newPosition = {
        x: (e.clientX / window.innerWidth) * 100,
        y: e.clientY
      };
      setLocalCursor(newPosition);

      // Update trail for effect
      if (userEffect === 'fire') {
        trailRef.current.push(newPosition);
        if (trailRef.current.length > 10) {
          trailRef.current.shift();
        }
      }
    };

    const handleMouseDown = () => {
      setIsClicking(true);
      clickTimeoutRef.current = setTimeout(() => {
        setShowClickAnimation(true);
      }, 1000);
    };

    const handleMouseUp = () => {
      setIsClicking(false);
      setShowClickAnimation(false);
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [userEffect]);

  const renderCursorEffect = () => {
    switch (userEffect) {
      case 'fire':
        return trailRef.current.map((pos, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: `${pos.x}%`,
              top: `${pos.y}px`,
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: 'orange',
              opacity: (index + 1) / trailRef.current.length,
            }}
          />
        ));
      case 'glow':
        return (
          <div
            style={{
              position: 'absolute',
              left: `${localCursor.x}%`,
              top: `${localCursor.y}px`,
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              filter: 'blur(5px)',
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      default:
        return null;
    }
  };

  const renderCursorAbility = () => {
    if (!showClickAnimation) return null;

    switch (userAbility) {
      case 'fireBreath':
        return (
          <div
            style={{
              position: 'absolute',
              left: `${localCursor.x}%`,
              top: `${localCursor.y}px`,
              width: '100px',
              height: '50px',
              background: 'linear-gradient(90deg, red, orange, yellow)',
              transform: 'translate(0, -50%)',
              opacity: 0.7,
              borderRadius: '0 25px 25px 0',
            }}
          />
        );
      case 'iceBlast':
        return (
          <div
            style={{
              position: 'absolute',
              left: `${localCursor.x}%`,
              top: `${localCursor.y}px`,
              width: '80px',
              height: '80px',
              background: 'radial-gradient(circle, white, lightblue, blue)',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              opacity: 0.7,
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      {renderCursorEffect()}
      {renderCursorAbility()}
      {Object.entries(onlineUsers).map(([id, user]) => (
        <div key={id}>
          <div
            style={{
              position: 'absolute',
              left: `${user.x}%`,
              top: `${user.y}px`,
              width: '20px',
              height: '20px',
              backgroundImage: `url(${getCursorImage(userSkins[id] || userSkin)})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${user.x}%`,
              top: `${user.y + 20}px`,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              padding: '2px 4px',
              borderRadius: '3px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            {user.username}
          </div>
        </div>
      ))}
    </div>

  );
}

export default CursorOverlay;

