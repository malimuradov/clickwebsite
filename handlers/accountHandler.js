const bcrypt             = require('bcrypt');
const jwt                = require('jsonwebtoken');
const { asyncHandler, emitError } = require('../utils/asyncHandler');
const { validate, schemas }       = require('../utils/validate');
const { requireAuth }             = require('../middleware/auth');
const { onlineUsers, isUsernameTaken, patchUser } = require('../services/userService');

const { JWT_SECRET } = process.env;

/**
 * Registers account management events.
 *
 * Events handled:
 *   account:setUsername   → rename the current user (in-session)
 *   account:create        → create a permanent account (guest → registered)
 *   account:upgrade       → upgrade temp token to permanent account + transfer progress
 *
 * @param {import('../types').AuthSocket} socket
 * @param {import('socket.io').Server} io
 * @param {{ db: any, isDevelopment: boolean }} sharedState
 */
const registerAccountHandlers = (socket, io, sharedState) => {
  const { db, isDevelopment } = sharedState;

  // ── account:setUsername ─────────────────────────────────────────────────────
  socket.on('account:setUsername', asyncHandler(socket, 'account:setUsername', async ({ newUsername }) => {
    if (!requireAuth(socket)) return;

    const { valid, errors } = validate({ newUsername }, schemas.setUsername);
    if (!valid) return emitError(socket, 'VALIDATION_ERROR', errors.join(', '));

    if (isUsernameTaken(newUsername)) {
      return emitError(socket, 'USERNAME_TAKEN', 'That username is already in use');
    }

    patchUser(socket.userId, { username: newUsername });
    socket.username = newUsername;

    const newToken = jwt.sign(
      { id: socket.userId, username: newUsername },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    socket.emit('account:usernameUpdated', { token: newToken, username: newUsername });
    io.emit('users:online', Array.from(onlineUsers.values()));
  }));

  // ── account:create ──────────────────────────────────────────────────────────
  socket.on('account:create', asyncHandler(socket, 'account:create', async (data) => {
    if (!requireAuth(socket)) return;

    const { valid, errors } = validate(data, schemas.createAccount);
    if (!valid) return emitError(socket, 'VALIDATION_ERROR', errors.join(', '));

    const { username, email, password } = data;
    const hashedPassword = await bcrypt.hash(password, 12);

    if (isDevelopment || !db) {
      // Dev: simulate success
      const token = jwt.sign({ id: socket.userId, username }, JWT_SECRET, { expiresIn: '30d' });
      patchUser(socket.userId, { username, isTemporary: false });
      socket.isTemporary = false;
      socket.emit('account:created', { token, userId: socket.userId, username, userData: { id: socket.userId, username, email } });
      io.emit('users:online', Array.from(onlineUsers.values()));
      return;
    }

    const existing = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    if (existing.rows.length > 0) {
      return emitError(socket, 'CONFLICT', 'Username or email already exists');
    }

    const result = await db.query(
      'INSERT INTO users (id, username, email, password) VALUES ($1, $2, $3, $4) RETURNING *',
      [socket.userId, username, email, hashedPassword]
    );

    const token = jwt.sign({ id: socket.userId, username }, JWT_SECRET, { expiresIn: '30d' });
    patchUser(socket.userId, { username, isTemporary: false });
    socket.isTemporary = false;

    socket.emit('account:created', { token, userId: socket.userId, username, userData: result.rows[0] });
    io.emit('users:online', Array.from(onlineUsers.values()));
  }));

  // ── account:upgrade ─────────────────────────────────────────────────────────
  // Converts a temporary account to permanent, preserving all progress.
  socket.on('account:upgrade', asyncHandler(socket, 'account:upgrade', async ({ email, password, username: newUsername }) => {
    if (!requireAuth(socket)) return;
    if (!socket.isTemporary) return emitError(socket, 'INVALID_OP', 'Account is already permanent');

    const finalUsername  = newUsername || socket.username;
    const hashedPassword = await bcrypt.hash(password, 12);
    let newUserId        = socket.userId;

    if (!isDevelopment && db) {
      const client = await db.connect();
      try {
        await client.query('BEGIN');

        const userResult = await client.query(
          'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
          [finalUsername, email, hashedPassword]
        );
        newUserId = userResult.rows[0].id;

        // Transfer progress
        await client.query(
          'UPDATE progress SET user_id = $1, temp_user_id = NULL WHERE temp_user_id = $2',
          [newUserId, socket.userId]
        );

        await client.query('DELETE FROM temp_users WHERE id = $1', [socket.userId]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    }

    const token = jwt.sign({ id: newUserId, username: finalUsername }, JWT_SECRET, { expiresIn: '30d' });

    // Migrate in-memory entry
    const existingProfile = onlineUsers.get(socket.userId);
    onlineUsers.delete(socket.userId);
    onlineUsers.set(newUserId, {
      ...existingProfile,
      id:          newUserId,
      username:    finalUsername,
      isTemporary: false,
    });

    socket.userId      = newUserId;
    socket.username    = finalUsername;
    socket.isTemporary = false;

    socket.emit('account:upgraded', { token, userId: newUserId, username: finalUsername });
    io.emit('users:online', Array.from(onlineUsers.values()));
  }));
};

module.exports = { registerAccountHandlers };
