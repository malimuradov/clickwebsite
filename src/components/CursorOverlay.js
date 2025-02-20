import React, { useState, useEffect } from 'react';
import '../styles/CursorOverlay.css';
import { useOnlineUsers } from '../contexts/OnlineUsersContext';

function CursorOverlay({ cursors, currentUserId, userSkin }) {
  const [localCursor, setLocalCursor] = useState({ x: 0, y: 0 });
  const { onlineUsers, socket } = useOnlineUsers();

  useEffect(() => {
    const handleMouseMove = (e) => {
      setLocalCursor({
        x: (e.clientX / window.innerWidth) * 100,
        y: e.clientY
      });
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  useEffect(() => {
    // Hide the real cursor
    document.body.style.cursor = 'none';

    return () => {
      document.body.style.cursor = 'default';
    };
  }, []);

  const getCursorImage = (skin) => {
    // You can define more skins here
    const skins = {
      default: '/cursor-images/default.png',
      gold: '/cursor-images/gold.png',
      rainbow: '/cursor-images/rainbow.png',
      // Add more skins as needed
    };
    return skins[skin] || skins.default;
  };
  return (
    <div className="cursor-overlay">
      {/* Render other users' cursors */}
      {Object.entries(cursors).map(([id, { x, y, username, skin }]) => (
        // console.log(id, socket.id),
        id !== socket.id && (
          <div key={id} className="cursor-container" style={{ left: `${x}%`, top: `${y}px` }}>
            <img 
              src={getCursorImage(skin)} 
              alt="Cursor" 
              className="cursor-image"
            />
            <div className="cursor-username">{username}</div>
          </div>
        )
      ))}

      {/* Render current user's cursor */}
      {/* <div 
        className="cursor-container local-cursor" 
        style={{ left: `${localCursor.x}%`, top: `${localCursor.y}px` }}
      >
        <img 
          src={getCursorImage(userSkin)} 
          alt="Your Cursor" 
          className="cursor-image"
        />
      </div> */}
    </div>
  );
}

export default CursorOverlay;


