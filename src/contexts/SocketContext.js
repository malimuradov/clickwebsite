import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [cursors, setCursors] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const [isTemporary, setIsTemporary] = useState(true);

  const isDevelopment = process.env.NODE_ENV === 'development';
  const socketUrl = isDevelopment ? 'http://localhost:4000' : 'http://52.59.228.62:8080';

  useEffect(() => {
    console.log('Setting up socket connection');
    const newSocket = io(socketUrl);

    newSocket.on('connect', () => {
      console.log('Connected to the server');
      setIsConnected(true);

      // Attempt to authenticate with stored token
      try {
        const storedToken = localStorage.getItem('userToken');
        newSocket.emit('authenticate', storedToken);
      } catch (err) {
        console.warn('No token present:', err);
        setIsTemporary(true);
      }
    });

    newSocket.on('connect_error', (err) => {
      console.error('Failed to connect to the server:', err);
      setIsConnected(false);
    });

    newSocket.on('updateCursors', (updatedCursors) => {
      setCursors(updatedCursors);
    });

    newSocket.on('authenticationResult', ({ userId, username, isTemporary }) => {
      setUserId(userId);
      setUsername(username);
      setIsTemporary(isTemporary);

      if (!isTemporary) {
        // If it's not a temporary account, we can store the token
        // This assumes the server sends back a token for non-temporary accounts
        try {
          localStorage.setItem('userToken', newSocket.auth.token);
        } catch (err) {
          console.error('Failed to store token:', err);
        }
      }
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

