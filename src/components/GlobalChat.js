import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import '../styles/GlobalChat.css';
import { useOnlineUsers } from '../contexts/OnlineUsersContext';

function GlobalChat({ totalClicks, onSendMessage, username, onUsernameChange }) {
  
  const { onlineUsers, socket } = useOnlineUsers();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChangingUsername, setIsChangingUsername] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messageCost = 100;
  const usernameCost = 5000;
  const chatContainerRef = useRef(null);

  useEffect(() => {
    socket.on('updateRecentMessages', (recentMessages) => {
      setMessages(prevMessages => {
        const newMessages = recentMessages.filter(newMsg => 
          !prevMessages.some(existingMsg => existingMsg.timestamp === newMsg.timestamp)
        );
        return [...prevMessages, ...newMessages].sort((a, b) => a.timestamp - b.timestamp);
      });
    });

    socket.on('chat message', (msg) => {
      setMessages(prevMessages => {
        if (!prevMessages.some(existingMsg => existingMsg.timestamp === msg.timestamp)) {
          return [...prevMessages, msg].sort((a, b) => a.timestamp - b.timestamp);
        }
        return prevMessages;
      });
    });

    return () => {
      socket.off('updateRecentMessages');
      socket.off('chat message');
    };
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && totalClicks >= messageCost) {
      onSendMessage(messageCost);
      socket.emit('chat message', { message: inputMessage, username });
      setInputMessage('');
    }
  };

  const handleUsernameChange = (e) => {
    e.preventDefault();
    if (totalClicks >= usernameCost) {
      onSendMessage(usernameCost);
      onUsernameChange(inputMessage);
      setInputMessage('');
      setIsChangingUsername(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };
  return (
    <div className={`global-chat ${isMinimized ? 'minimized' : ''}`}>
      <div className="chat-header">
        <h3>Global Chat</h3>
        <button onClick={toggleMinimize}>
          {isMinimized ? 'Maximize' : 'Minimize'}
        </button>
      </div>
      {!isMinimized && (
        <>
          <div className="username-section">
            <span>Your username: {username}</span>
            <button onClick={() => setIsChangingUsername(!isChangingUsername)}>
              {isChangingUsername ? 'Cancel' : 'Change Username'}
            </button>
          </div>
          {isChangingUsername && (
            <form onSubmit={handleUsernameChange} className="username-form">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="New username..."
                className="username-input"
              />
              <button type="submit" disabled={totalClicks < usernameCost} className="username-change-button">
                Change ({usernameCost} clicks)
              </button>
            </form>
          )}
          <div className="chat-container" ref={chatContainerRef}>
            {messages.map((msg, index) => (
              <div key={index} className="chat-message">
                <span className="username">{msg.username}:</span>
                <span className="message-text">{msg.message}</span>
                <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="chat-input-form">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Type a message..."
              className="chat-input"
            />
            <button type="submit" disabled={totalClicks < messageCost} className="chat-send-button">
              Send ({messageCost} clicks)
            </button>
          </form>
        </>
      )}
    </div>
  );
}


export default GlobalChat;

