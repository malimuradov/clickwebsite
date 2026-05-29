const { asyncHandler, emitError } = require('../utils/asyncHandler');
const { validate, schemas }       = require('../utils/validate');
const { limiters }                = require('../utils/rateLimiter');
const { requireAuth }             = require('../middleware/auth');
const { onlineUsers, cursors, patchUser, getUserSkinsMap } = require('../services/userService');

/** @type {Map<string, { totalClicks: number, clickValue: number, lastSync: number }>} */
const userClicks = new Map();

/**
 * Registers game-related socket events.
 *
 * Events handled:
 *   game:click          → increment global count, share team bonus
 *   game:updateClickVal → update stored click value for the user
 *   game:upgrades       → persist upgrade state to DB
 *   game:cursorMove     → broadcast cursor position
 *   game:cursorSkin     → change + broadcast cursor skin
 *
 * @param {import('../types').AuthSocket} socket
 * @param {import('socket.io').Server} io
 * @param {{ clickCount: number, teams: Map, db: any, isDevelopment: boolean }} sharedState
 */
const registerGameHandlers = (socket, io, sharedState) => {
  const { teams, db, isDevelopment } = sharedState;

  // ── game:click ──────────────────────────────────────────────────────────────
  socket.on('game:click', asyncHandler(socket, 'game:click', async (clickData) => {
    if (!requireAuth(socket)) return;

    if (!limiters.click.allow(socket.userId, 'game:click')) return; // silent drop; clicks are high freq

    const payload = typeof clickData === 'object' ? clickData : { clickValue: clickData };
    const { valid, errors } = validate(payload, schemas.clickData);
    if (!valid) return emitError(socket, 'VALIDATION_ERROR', errors.join(', '));

    const { clickValue } = payload;

    // Increment global count
    sharedState.clickCount += 1;

    // Track per-user
    const userData = userClicks.get(socket.userId) ?? { totalClicks: 0, clickValue: 1, lastSync: Date.now() };
    userData.totalClicks += clickValue;
    userClicks.set(socket.userId, userData);

    // Team click bonus: 10% of click value shared to teammates
    for (const [, team] of teams) {
      if (!team.members.includes(socket.userId)) continue;
      const bonus = clickValue * 0.1;
      team.members.forEach(memberId => {
        if (memberId !== socket.userId) {
          io.to(memberId).emit('game:teamBonus', bonus);
        }
      });
      break;
    }

    io.emit('state:count', sharedState.clickCount);
    io.emit('users:online', Array.from(onlineUsers.values()));
  }));

  // ── game:updateClickVal ─────────────────────────────────────────────────────
  socket.on('game:updateClickVal', (newClickValue) => {
    if (!requireAuth(socket)) return;
    if (typeof newClickValue !== 'number' || newClickValue < 0) return;

    const userData = userClicks.get(socket.userId);
    if (userData) {
      userData.clickValue = newClickValue;
      userClicks.set(socket.userId, userData);
    }
  });

  // ── game:upgrades ───────────────────────────────────────────────────────────
  socket.on('game:upgrades', asyncHandler(socket, 'game:upgrades', async (upgrades) => {
    if (!requireAuth(socket)) return;

    if (!limiters.upgrade.allow(socket.userId, 'game:upgrades')) {
      return emitError(socket, 'RATE_LIMITED', 'Upgrade sync too frequent');
    }

    const { valid, errors } = validate(upgrades, schemas.upgrades);
    if (!valid) return emitError(socket, 'VALIDATION_ERROR', errors.join(', '));

    if (!isDevelopment && db) {
      const idField = socket.isTemporary ? 'temp_user_id' : 'user_id';
      await db.query(
        `UPDATE progress
         SET flat_click_bonus       = $1,
             percentage_click_bonus = $2,
             flat_auto_clicker      = $3,
             percent_auto_clicker   = $4,
             best_cps               = GREATEST(best_cps, $5),
             last_updated           = CURRENT_TIMESTAMP
         WHERE ${idField} = $6`,
        [
          upgrades.flatClickBonus,
          upgrades.percentageClickBonus,
          upgrades.flatAutoClicker,
          upgrades.percentAutoClicker,
          upgrades.bestCPS,
          socket.userId,
        ]
      );
    }
  }));

  // ── game:cursorMove ─────────────────────────────────────────────────────────
  // High-frequency: rate limited to ~20fps, validated minimally
  socket.on('game:cursorMove', ({ x, y }) => {
    if (!socket.userId) return;
    if (!limiters.cursor.allow(socket.userId, 'game:cursorMove')) return;
    if (typeof x !== 'number' || typeof y !== 'number') return;

    patchUser(socket.userId, { lastActivity: Date.now() });
    cursors[socket.username] = { x, y };
    io.emit('game:cursors', cursors);
  });

  // ── game:cursorSkin ─────────────────────────────────────────────────────────
  socket.on('game:cursorSkin', (newSkin) => {
    if (!requireAuth(socket)) return;
    if (typeof newSkin !== 'string' || newSkin.length > 32) return;

    patchUser(socket.userId, { cursorSkin: newSkin });
    io.emit('state:userSkins', getUserSkinsMap());
  });
};

module.exports = { registerGameHandlers, userClicks };
