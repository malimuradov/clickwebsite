import React from 'react';
import { useOnlineUsers } from '../contexts/OnlineUsersContext';
import { useSocket } from '../contexts/SocketContext';

function OnlineUsers({ currentUser, team }) {
  const {socket} = useSocket();
  const { onlineUsers } = useOnlineUsers();

  const handleInvite = (userId) => {
    socket.emit('inviteToTeam', userId);
  };
  return (
    <div className="online-users">
      <h3>Online Users ({onlineUsers.length})</h3>
      {onlineUsers.length > 0 ? (
        <ul>
          {onlineUsers.map(user => (
            <li key={user.id}>
              {user.username}
              {user.username !== currentUser && !team && (
                <button onClick={() => handleInvite(user.id)}>Invite to Team</button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>No users online</p>
      )}
    </div>
  );
}

export default OnlineUsers;

