import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState('');
  const [cursors, setCursors] = useState({});

  const isDevelopment = process.env.NODE_ENV === 'development';
  const socketUrl = isDevelopment ? 'http://localhost:4000' : 'http://52.59.228.62:8080';
  useEffect(() => {
    const newSocket = io(socketUrl);
    newSocket.on('authentication', ({ token, userId, username }) => {
      localStorage.setItem('token', token);
      setUserId(userId);
      setUsername(username);
    });

    // Authenticate with the server
    const token = localStorage.getItem('token');
    if (token) {
      newSocket.emit('authenticate', token);
    } else {
      newSocket.emit('authenticate', null);
    }
    newSocket.on('connect', () => {
      console.log('Connected to the server');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Failed to connect to the server:', err);
    });

    newSocket.on('updateCursors', (updatedCursors) => {
      setCursors(updatedCursors);
    });
    setSocket(newSocket);

    return () => newSocket.close();
  }, [socketUrl]);

  return (
    <SocketContext.Provider value={{ socket, userId, username, cursors, setUsername }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
