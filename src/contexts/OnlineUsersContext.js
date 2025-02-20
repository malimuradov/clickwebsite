import React, { createContext, useState, useEffect, useContext } from 'react';
import io from 'socket.io-client';

const OnlineUsersContext = createContext();

const isDevelopment = process.env.NODE_ENV === 'development';
const socketUrl = isDevelopment ? 'http://localhost:4000' : 'http://52.59.228.62:8080';
const socket = io(socketUrl);

export const OnlineUsersProvider = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const handleUpdateOnlineUsers = (users) => {
      setOnlineUsers(users);
    };

    socket.on('updateOnlineUsers', handleUpdateOnlineUsers);

    // Request initial online users list
    socket.emit('getOnlineUsers');

    return () => {
      socket.off('updateOnlineUsers', handleUpdateOnlineUsers);
    };
  }, []);

  return (
    <OnlineUsersContext.Provider value={{ onlineUsers, socket }}>
      {children}
    </OnlineUsersContext.Provider>
  );
};

export const useOnlineUsers = () => useContext(OnlineUsersContext);