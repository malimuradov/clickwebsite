/**
 * Wraps an async socket handler and catches all errors,
 * emitting a standardized error event instead of crashing.
 *
 * @param {import('../types').AuthSocket} socket
 * @param {string} event - Event name for logging context
 * @param {Function} fn - Async handler function
 * @returns {Function} Wrapped handler
 */
const asyncHandler = (socket, event, fn) => async (...args) => {
  try {
    await fn(...args);
  } catch (err) {
    console.error(`[socket:${event}] Error for user ${socket.userId ?? 'unknown'}:`, err.message);
    emitError(socket, 'INTERNAL_ERROR', `Something went wrong in ${event}`);
  }
};

/**
 * Emits a standardized error event to the socket.
 *
 * @param {import('socket.io').Socket} socket
 * @param {string} code - Machine-readable error code
 * @param {string} message - Human-readable error message
 */
const emitError = (socket, code, message) => {
  socket.emit('server:error', { code, message, ts: Date.now() });
};

/**
 * Asserts a condition. Throws with a message if it fails.
 * Use inside asyncHandler-wrapped functions.
 *
 * @param {boolean} condition
 * @param {string} message
 */
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

module.exports = { asyncHandler, emitError, assert };
