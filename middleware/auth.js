const jwt = require('jsonwebtoken');
const { emitError } = require('../utils/asyncHandler');
const { limiters }  = require('../utils/rateLimiter');

const { JWT_SECRET, TEMP_JWT_SECRET } = process.env;

/**
 * Socket.IO middleware — runs ONCE per connection before any event.
 * Verifies the token sent in socket.handshake.auth.token,
 * attaches user identity to socket, and rejects unauthenticated connections.
 *
 * Client usage:
 *   const socket = io({ auth: { token: storedToken } });
 *
 * @param {import('socket.io').Socket} socket
 * @param {Function} next
 */
const authMiddleware = async (socket, next) => {
  const token = socket.handshake.auth?.token;

  // ── No token: still allow connection, mark as unauthenticated ────────────
  // The client will then emit 'auth:guest' to create a temp account.
  if (!token) {
    socket.isAuthenticated = false;
    return next();
  }

  // ── Rate-limit auth attempts by IP ───────────────────────────────────────
  const ip = socket.handshake.address;
  if (!limiters.auth.allow(ip, 'connect')) {
    return next(new Error('RATE_LIMITED'));
  }

  // ── Try permanent token ───────────────────────────────────────────────────
  try {
    const decoded = /** @type {import('../types').AuthPayload} */ (
      jwt.verify(token, JWT_SECRET)
    );

    socket.userId      = decoded.id;
    socket.username    = decoded.username;
    socket.isTemporary = false;
    socket.isAuthenticated = true;
    return next();
  } catch (_) { /* fall through to temp token */ }

  // ── Try temporary token ───────────────────────────────────────────────────
  try {
    const decoded = /** @type {import('../types').AuthPayload} */ (
      jwt.verify(token, TEMP_JWT_SECRET)
    );

    if (!decoded.isTemporary) throw new Error('not a temp token');

    socket.userId      = decoded.id;
    socket.username    = decoded.username;
    socket.isTemporary = true;
    socket.isAuthenticated = true;
    return next();
  } catch (_) { /* fall through */ }

  // ── Both failed: reject ───────────────────────────────────────────────────
  return next(new Error('AUTH_FAILED'));
};

/**
 * Guard middleware for events that require an authenticated socket.
 * Use inside handlers: if (!requireAuth(socket)) return;
 *
 * @param {import('../types').AuthSocket} socket
 * @returns {boolean}
 */
const requireAuth = (socket) => {
  if (!socket.userId) {
    emitError(socket, 'UNAUTHORIZED', 'You must be authenticated');
    return false;
  }
  return true;
};

module.exports = { authMiddleware, requireAuth };
