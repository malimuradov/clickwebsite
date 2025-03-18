import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  const [equippedCursor, setEquippedCursor] = useState(null);
  const [username, setUsername] = useState('');
  const [cursors, setCursors] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [isTemporary, setIsTemporary] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isDevelopment = process.env.NODE_ENV === 'development';
  const socketUrl = isDevelopment ? 'http://localhost:4000' : 'http://52.59.228.62:8080';

  useEffect(() => {
    console.log('Setting up socket connection');
    const newSocket = io(socketUrl);

    newSocket.on('connect', () => {
      console.log('Connected to the server');
      setIsConnected(true);

      // Check for existing auth token
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Authenticating with token');
        newSocket.emit('authenticate', token);
      } else {
        console.log('No token found, creating a new temporary account');
        // Check for cached temporary account data
        const tempToken = localStorage.getItem('tempToken');
        if (tempToken) {
          console.log('Using existing temporary token');
          newSocket.emit('authenticateTemp', tempToken);
        } else {
          console.log('Creating a new temporary account');
          setIsTemporary(true);
          newSocket.emit('createTempUser');
        }
      }
    });

    newSocket.on('authenticationSuccess', ({ userId, username }) => {
      setUserId(userId);
      setUsername(username);
      setIsLoggedIn(true);
      setIsTemporary(false);
      // Clear temporary account data if it exists
      localStorage.removeItem('tempToken');
      localStorage.removeItem('tempAccountData');
    });

    newSocket.on('tempUserCreated', ({ tempUserId, tempUsername, tempToken }) => {
      console.log('Temporary user created:', tempUsername);
      setUserId(tempUserId);
      setUsername(tempUsername);
      setIsTemporary(true);
      
      // Store the temporary token with 2 weeks expiration
      localStorage.setItem('tempToken', tempToken);
      
      // Store initial account data
      const initialData = {
        username: tempUsername,
        equippedCursor: 'default'
      };
      localStorage.setItem('tempAccountData', JSON.stringify(initialData));
    });

    newSocket.on('tempAuthSuccess', ({ tempUserId, tempUsername, gameData }) => {
      console.log('Temporary authentication successful:', tempUsername);
      setUserId(tempUserId);
      setUsername(tempUsername);
      setIsTemporary(true);
      
      // If we have game data from the server, update the local state
      if (gameData) {
        if (gameData.equippedCursor) {
          setEquippedCursor(gameData.equippedCursor);
        }
        
        // Update tempAccountData with the latest data
        const updatedData = {
          username: tempUsername,
          equippedCursor: gameData.equippedCursor || 'default',
          // Add any other game state you want to preserve
        };
        localStorage.setItem('tempAccountData', JSON.stringify(updatedData));
      }
    });

    newSocket.on('tempAuthFailure', () => {
      console.log('Temporary token expired or invalid, creating new temp user');
      // Remove the invalid token
      localStorage.removeItem('tempToken');
      localStorage.removeItem('tempAccountData');
      
      // Create a new temporary user
      newSocket.emit('createTempUser');
    });

    newSocket.on('authenticationFailure', () => {
      // Authentication failed, fallback to temporary account
      const tempToken = localStorage.getItem('tempToken');
      if (tempToken) {
        newSocket.emit('authenticateTemp', tempToken);
      } else {
        newSocket.emit('createTempUser');
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('Failed to connect to the server:', err);
      setIsConnected(false);
    });

    newSocket.on('updateCursors', (updatedCursors) => {
      setCursors(updatedCursors);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const login = (credentials) => {
    // Implement login logic here
    socket.emit('login', credentials);
  };

  const register = (userData) => {
    // Implement registration logic here
    socket.emit('register', userData);
  };

  const logout = () => {
    // Implement logout logic here
    localStorage.removeItem('token');
    setIsLoggedIn(false);
    setIsTemporary(true);
    setUserId(null);
    setUsername('');
    
    // Check if we have a temporary token to fall back to
    const tempToken = localStorage.getItem('tempToken');
    if (tempToken) {
      socket.emit('authenticateTemp', tempToken);
    } else {
      // Create a new temporary user
      socket.emit('createTempUser');
    }
  };

  const upgradeToPermAccount = (userData) => {
    // Convert temporary account to permanent
    if (isTemporary && userId) {
      socket.emit('upgradeTemp', { tempUserId: userId, ...userData });
    }
  };

  if (!isConnected) {
    return <div>Connecting to server...</div>;
  }

  return (
    <SocketContext.Provider value={{ 
      socket, 
      userId, 
      username,
      equippedCursor,
      setEquippedCursor,
      cursors, 
      setUsername,
      isTemporary,
      isLoggedIn,
      login,
      register,
      logout,
      upgradeToPermAccount
    }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

