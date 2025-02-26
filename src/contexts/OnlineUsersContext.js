import React, { createContext, useState, useEffect, useContext } from 'react';
import { useSocket } from './SocketContext'; // Import the useSocket hook

const OnlineUsersContext = createContext();

export const OnlineUsersProvider = ({ children }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const { socket } = useSocket(); // Use the socket from SocketContext

  useEffect(() => {
    if (socket) {
      const handleUpdateOnlineUsers = (users) => {
        setOnlineUsers(users);
      };

      socket.on('updateOnlineUsers', handleUpdateOnlineUsers);

      // Request initial online users list
      socket.emit('getOnlineUsers');

      return () => {
        socket.off('updateOnlineUsers', handleUpdateOnlineUsers);
      };
    }
  }, [socket]);

  return (
    <OnlineUsersContext.Provider value={{ onlineUsers }}>
      {children}
    </OnlineUsersContext.Provider>
  );
};

export const useOnlineUsers = () => useContext(OnlineUsersContext);
