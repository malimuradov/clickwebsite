const { asyncHandler, emitError } = require('../utils/asyncHandler');
const { requireAuth }             = require('../middleware/auth');

/**
 * Registers team-related socket events.
 *
 * Events handled:
 *   team:invite  → send invite to another user
 *   team:accept  → accept a pending invite, form/join team
 *   team:leave   → leave current team
 *
 * @param {import('../types').AuthSocket} socket
 * @param {import('socket.io').Server} io
 * @param {{ teams: Map<string, { members: string[] }> }} sharedState
 */
const registerTeamHandlers = (socket, io, sharedState) => {
  const { teams } = sharedState;

  // ── team:invite ─────────────────────────────────────────────────────────────
  socket.on('team:invite', (inviteeId) => {
    if (!requireAuth(socket)) return;
    if (typeof inviteeId !== 'string') return;
    if (inviteeId === socket.userId) return; // can't invite yourself

    io.to(inviteeId).emit('team:invited', { fromId: socket.userId, fromUsername: socket.username });
  });

  // ── team:accept ─────────────────────────────────────────────────────────────
  socket.on('team:accept', asyncHandler(socket, 'team:accept', async (inviterId) => {
    if (!requireAuth(socket)) return;
    if (typeof inviterId !== 'string') return;

    let team;
    if (teams.has(inviterId)) {
      team = teams.get(inviterId);
      if (!team.members.includes(socket.userId)) {
        team.members.push(socket.userId);
      }
    } else {
      team = { members: [inviterId, socket.userId] };
      teams.set(inviterId, team);
    }

    // Notify all team members of the updated roster
    team.members.forEach(memberId => {
      io.to(memberId).emit('team:updated', team);
    });
  }));

  // ── team:leave ──────────────────────────────────────────────────────────────
  socket.on('team:leave', () => {
    if (!requireAuth(socket)) return;
    dissolveOrShrinkTeam(socket.userId, teams, io);
  });
};

/**
 * Removes a userId from their team.
 * Dissolves the team if only one member remains.
 * Extracted so disconnect handler can reuse it.
 *
 * @param {string} userId
 * @param {Map<string, { members: string[] }>} teams
 * @param {import('socket.io').Server} io
 */
const dissolveOrShrinkTeam = (userId, teams, io) => {
  for (const [teamId, team] of teams) {
    const idx = team.members.indexOf(userId);
    if (idx === -1) continue;

    team.members.splice(idx, 1);

    if (team.members.length <= 1) {
      teams.delete(teamId);
      if (team.members[0]) {
        io.to(team.members[0]).emit('team:updated', null); // dissolved
      }
    } else {
      team.members.forEach(id => io.to(id).emit('team:updated', team));
    }
    break;
  }
};

module.exports = { registerTeamHandlers, dissolveOrShrinkTeam };
