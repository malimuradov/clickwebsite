import React from 'react';

function TeamInfo({ team, onLeave, teamBonus, onCollectTeamBonus  }) {
  return (
    <div className="team-info">
      <div>
          <p>Team Bonus Available: {teamBonus}</p>
          <button onClick={onCollectTeamBonus}>Collect Team Bonus</button>
        </div>
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