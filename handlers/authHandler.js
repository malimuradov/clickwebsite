const { asyncHandler, emitError } = require('../utils/asyncHandler');
const { validate, schemas }       = require('../utils/validate');
const { limiters }                = require('../utils/rateLimiter');
const {
  createGuestUser, onlineUsers, getUserSkinsMap, patchUser,
} = require('../services/userService');

// Shared state passed in from server.js
let recentMessages, clickCount;

/**
 * Emits the standard "initial data" burst to a newly authenticated socket.
 * Always called after any successful auth path.
 *
 * @param {import('../types').AuthSocket} socket
 * @param {import('socket.io').Server} io
 */
const emitInitialData = (socket, io) => {
  socket.emit('state:messages',  recentMessages);
  socket.emit('state:count',     clickCount);
  socket.emit('state:userSkins', getUserSkinsMap());
  io.emit('users:online', Array.from(onlineUsers.values()));
};

/**
 * Registers all authentication-related socket events.
 *
 * Events handled:
 *   auth:guest       → create or restore a temporary account
 *   auth:restore     → restore session from a valid token (already decoded by middleware)
 *
 * @param {import('../types').AuthSocket} socket
 * @param {import('socket.io').Server} io
 * @param {Object} sharedState
 */
const registerAuthHandlers = (socket, io, sharedState) => {
  recentMessages = sharedState.recentMessages;
  clickCount     = sharedState.clickCount;

  // ── If middleware already authenticated the socket, restore immediately ──
  if (socket.isAuthenticated && socket.userId) {
    patchUser(socket.userId, { socketId: socket.id, isOnline: true });
    emitInitialData(socket, io);
    return;
  }

  // ── auth:guest ─────────────────────────────────────────────────────────────
  // Client sends this on first visit (no token) or when they want a fresh guest.
  // Optionally accepts { username, equippedCursor } for a named guest.
  socket.on('auth:guest', asyncHandler(socket, 'auth:guest', async (payload = {}) => {
    if (!limiters.auth.allow(socket.id, 'auth:guest')) {
      return emitError(socket, 'RATE_LIMITED', 'Too many auth attempts');
    }

    const { username, equippedCursor } = payload ?? {};

    const { userId, username: assignedUsername, tempToken, profile } =
      createGuestUser(socket.id, username, equippedCursor);

    // Attach to socket for all subsequent handlers
    socket.userId      = userId;
    socket.username    = assignedUsername;
    socket.isTemporary = true;

    socket.emit('auth:guestCreated', {
      token:    tempToken,       // ← client persists this in localStorage
      userId,
      username: assignedUsername,
      isGuest:  true,
    });

    emitInitialData(socket, io);
  }));
};

module.exports = { registerAuthHandlers };
