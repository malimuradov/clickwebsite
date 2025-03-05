import React, { useState, useEffect, useRef } from 'react';
import { cursorSkins } from '../data/cursorData';
import { useSocket } from '../contexts/SocketContext';

function CursorOverlay({ currentUsername, userEffect, userAbility }) {
  const [localCursor, setLocalCursor] = useState({ x: 100, y: 100 });
  const [cursors, setCursors] = useState({});
  const [isClicking, setIsClicking] = useState(false);
  const [showClickAnimation, setShowClickAnimation] = useState(false);
  const clickTimeoutRef = useRef(null);
  const trailRef = useRef([]);
  const [userSkins, setUserSkins] = useState({});
  const { socket } = useSocket();
  const [cursorsImages, setUserCursorImages] = useState({});
  const [cursorAdjustments, setCursorAdjustments] = useState({});

  const defaultCursor = { cursorSkinName: 'default', cursorImage: '/cursor-images/defaultMouseByFreepik.png', xAdjust: '6.5px', yAdjust: '10px' };

  const getCursorImage = (skinId) => {
    const skin = cursorSkins.find(skin => skin.id === skinId.cursorSkin);
    return skin ? skin.image : defaultCursor.cursorImage;
  };

  const getCursorAdjustments = (skinId) => {
    const skin = cursorSkins.find(skin => skin.id === skinId.cursorSkin);
    return skin ? { xAdjust: skin.xAdjust, yAdjust: skin.yAdjust } : { xAdjust: defaultCursor.xAdjust, yAdjust: defaultCursor.yAdjust };
  };

  const initializeCursorAdjustments = () => {
    const initialAdjustments = Object.fromEntries(
      Object.keys(cursors).map(username => [
        username,
        getCursorAdjustments({ cursorSkin: defaultCursor.cursorSkinName })
      ])
    );
    setCursorAdjustments(initialAdjustments);
  };

  useEffect(() => {
    if (socket) {
      socket.on('updateUserSkins', (updatedSkins) => {
        setUserSkins(updatedSkins);
        updateCursorsImages();
        updateCursorAdjustments(updatedSkins);
      });

      socket.on('updateCursors', (updatedCursors) => {
        setCursors(updatedCursors);
        if (Object.keys(cursorsImages).length === 0) {
          updateCursorsImages();
        }
        if (Object.keys(cursorAdjustments).length === 0) {
          initializeCursorAdjustments();
        }
      });

      return () => {
        socket.off('updateOnlineUsers');
        socket.off('updateUserSkins');
        socket.off('updateCursors');
      };
    }
  }, [socket, userSkins, cursorsImages, cursors, cursorAdjustments]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      const newPosition = {
        x: (e.clientX / window.innerWidth) * 100,
        y: e.clientY + window.scrollY
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

  const updateCursorsImages = () => {
    const newCursorsImages = Object.fromEntries(
      Object.entries(userSkins).map(([username, skinId]) => [
        username,
        { cursorImage: getCursorImage(skinId) }
      ])
    );
    setUserCursorImages(newCursorsImages);
  };

  const updateCursorAdjustments = (updatedSkins) => {
    const newCursorAdjustments = Object.fromEntries(
      Object.entries(updatedSkins).map(([username, skinId]) => [
        username,
        getCursorAdjustments(skinId)
      ])
    );
    setCursorAdjustments(prevAdjustments => ({ ...prevAdjustments, ...newCursorAdjustments }));
  };

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

  const isDefaultCursor = !userSkins[currentUsername] || userSkins[currentUsername].cursorSkin === 'default';

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1000 }}>
      {renderCursorEffect()}
      {renderCursorAbility()}
      {/* Render Local Cursor */}
      {!isDefaultCursor && (
        <div>
          <div
            style={{
              position: 'absolute',
              left: `calc(${localCursor.x}% + ${cursorAdjustments[currentUsername]?.xAdjust || defaultCursor.xAdjust})`,
              top: `${localCursor.y + parseInt(cursorAdjustments[currentUsername]?.yAdjust || defaultCursor.yAdjust)}px`,
              width: '20px',
              height: '20px',
              backgroundImage: `url(${cursorsImages[currentUsername]?.cursorImage})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${localCursor.x}%`,
              top: `${localCursor.y + 30}px`,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(231, 0, 0, 0.5)',
              color: 'white',
              padding: '2px 4px',
              borderRadius: '3px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            (YOU) { currentUsername } 
          </div>
        </div>
      )}

      {/* Render online cursors */}
      {Object.entries(cursors).filter(([username]) => username !== currentUsername).map(([username, user]) => (
        <div key={username}>
          <div
            style={{
              position: 'absolute',
              left: `calc(${user.x}% + ${cursorAdjustments[username]?.xAdjust || defaultCursor.xAdjust})`,
              top: `${user.y + parseInt(cursorAdjustments[username]?.yAdjust || defaultCursor.yAdjust)}px`,
              width: '20px',
              height: '20px',
              backgroundImage: `url(${cursorsImages[username]?.cursorImage ? cursorsImages[username]?.cursorImage : defaultCursor.cursorImage})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              transform: 'translate(-50%, -50%)',
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `${user.x}%`,
              top: `${user.y + 30}px`,
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              padding: '2px 4px',
              borderRadius: '3px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            {username}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CursorOverlay;

