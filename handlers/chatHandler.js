const { asyncHandler, emitError } = require('../utils/asyncHandler');
const { validate, schemas }       = require('../utils/validate');
const { limiters }                = require('../utils/rateLimiter');
const { requireAuth }             = require('../middleware/auth');

/**
 * Registers chat-related socket events.
 *
 * Events handled:
 *   chat:message  → broadcast a message to all users in the room
 *
 * @param {import('../types').AuthSocket} socket
 * @param {import('socket.io').Server} io
 * @param {{ recentMessages: Object[], addRecentMessage: Function }} sharedState
 */
const registerChatHandlers = (socket, io, sharedState) => {
  const { recentMessages, addRecentMessage } = sharedState;

  // ── chat:message ────────────────────────────────────────────────────────────
  socket.on('chat:message', asyncHandler(socket, 'chat:message', async (data) => {
    if (!requireAuth(socket)) return;

    if (!limiters.chat.allow(socket.userId, 'chat:message')) {
      return emitError(socket, 'RATE_LIMITED', 'You are sending messages too fast');
    }

    const { valid, errors } = validate(data, schemas.chatMessage);
    if (!valid) return emitError(socket, 'VALIDATION_ERROR', errors.join(', '));

    // Sanitize: strip HTML tags (replace with a proper sanitizer lib in prod)
    const safeMessage = data.message.replace(/<[^>]*>/g, '').trim();
    if (!safeMessage) return;

    const message = {
      username:  socket.username,  // trust the socket, not the payload
      message:   safeMessage,
      timestamp: Date.now(),
    };

    addRecentMessage(message);
    io.emit('chat:message', message);   // broadcast to all
  }));
};

module.exports = { registerChatHandlers };
