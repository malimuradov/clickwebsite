const { onlineUsers, removeUser } = require('../services/userService');
const { dissolveOrShrinkTeam }    = require('./teamHandler');
const { userClicks }              = require('./gameHandler');

/**
 * Registers disconnect lifecycle handlers.
 *
 * 'disconnecting' fires while the socket is still in its rooms.
 * 'disconnect'    fires after the socket has left all rooms.
 *
 * @param {import('../types').AuthSocket} socket
 * @param {import('socket.io').Server} io
 * @param {{ teams: Map, updateAllUsers: Function }} sharedState
 */
const registerDisconnectHandler = (socket, io, sharedState) => {
  const { teams, updateAllUsers } = sharedState;

  // ── disconnecting: notify peers BEFORE leaving rooms ───────────────────────
  socket.on('disconnecting', () => {
    if (!socket.userId) return;

    // Notify teammates so they can update their UI immediately
    dissolveOrShrinkTeam(socket.userId, teams, io);
  });

  // ── disconnect: clean up all in-memory state ────────────────────────────────
  socket.on('disconnect', (reason) => {
    if (!socket.userId) return;

    console.log(`[disconnect] ${socket.username ?? socket.id} — reason: ${reason}`);

    // Remove from online users map and cursor store
    removeUser(socket.userId, socket.username);

    // Remove click tracking (or persist first if you want to save progress)
    userClicks.delete(socket.userId);

    // Notify all remaining clients of the updated user list
    updateAllUsers();
  });
};

module.exports = { registerDisconnectHandler };
