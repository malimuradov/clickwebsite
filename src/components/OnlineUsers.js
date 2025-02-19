import React from 'react';

function OnlineUsers({ users, onInvite, currentUser, team }) {
  // Check if users is an array and has items
  const hasUsers = Array.isArray(users) && users.length > 0;
  return (
    <div className="online-users">
      <h3>Online Users</h3>
      {hasUsers ? (
        <ul>
          {users.map(user => (
            <li key={user.id}>
              {user.username}
              {user.username !== currentUser && !team && (
                <button onClick={() => onInvite(user.id)}>Invite to Team</button>
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
