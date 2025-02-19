import React from 'react';

function TeamInfo({ team, onLeave }) {
  return (
    <div className="team-info">
      <h3>Your Team</h3>
      <ul>
        {team.members.map(member => (
          <li key={member.id}>{member.username}</li>
        ))}
      </ul>
      <button onClick={onLeave}>Leave Team</button>
    </div>
  );
}

export default TeamInfo;