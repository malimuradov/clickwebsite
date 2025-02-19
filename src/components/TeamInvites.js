import React from 'react';

function TeamInvites({ invites, onAccept }) {
  return (
    <div className="team-invites">
      <h3>Team Invites</h3>
      <ul>
        {invites.map(inviterId => (
          <li key={inviterId}>
            Invite from {inviterId}
            <button onClick={() => onAccept(inviterId)}>Accept</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TeamInvites;