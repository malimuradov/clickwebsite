import React from 'react';
import { useOnlineUsers } from '../contexts/OnlineUsersContext';

function OnlineUsers({ currentUser, team }) {
  const { onlineUsers, socket } = useOnlineUsers();

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

