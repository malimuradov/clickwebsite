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
        const cachedData = localStorage.getItem('tempAccountData');
        if (cachedData) {
          console.log('Using cached temporary account data');
          const { username, equippedCursor } = JSON.parse(cachedData);
          setUsername(username);
          setEquippedCursor(equippedCursor);
          setIsTemporary(true);
          newSocket.emit('setTempAccount', { username, equippedCursor });
        } else {
          console.log('Creating a new temporary account');
          setIsTemporary(true);
          newSocket.emit('setTempAccount');
        }
      }
    });

    newSocket.on('authenticationSuccess', ({ userId, username }) => {
      setUserId(userId);
      setUsername(username);
      setIsLoggedIn(true);
      setIsTemporary(false);
      // Clear temporary account data if it exists
      localStorage.removeItem('tempAccountData');
    });

    newSocket.on('authenticationFailure', () => {
      // Authentication failed, fallback to temporary account
      const cachedData = localStorage.getItem('tempAccountData');
      if (cachedData) {
        const { username, equippedCursor } = JSON.parse(cachedData);
        setUsername(username);
        setEquippedCursor(equippedCursor);
        setIsTemporary(true);
        newSocket.emit('setTempAccount', { username, equippedCursor });
      } else {
        newSocket.emit('setTempAccount');
      }
    });

    newSocket.on('tempAccResult', (username) => {
      if(username) {
        setUsername(username);
        setIsTemporary(true);
      }
    })
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
    // This should emit a 'login' event to the server with the credentials
    socket.emit('login', credentials);
  };

  const register = (userData) => {
    // Implement registration logic here
    // This should emit a 'register' event to the server with the user data
    socket.emit('register', userData);
  };

  const logout = () => {
    // Implement logout logic here
    localStorage.removeItem('userToken');
    setIsTemporary(true);
    setUserId(null);
    setUsername('');
    // Optionally, reconnect to get a new temporary account
    socket.disconnect().connect();
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
      login,
      register,
      logout
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

