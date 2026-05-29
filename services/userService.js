const crypto = require('crypto');
const jwt    = require('jsonwebtoken');

const { TEMP_JWT_SECRET } = process.env;

// ─── In-process stores ────────────────────────────────────────────────────────
// On horizontal scale: replace with Redis (ioredis).
// Key: userId → GuestProfile

/** @type {Map<string, import('../types').GuestProfile>} */
const onlineUsers = new Map();

/** @type {Map<string, { x: number, y: number }>} cursor positions by username */
const cursors = {};

// ─── Username generation ──────────────────────────────────────────────────────

const ADJECTIVES = ['Silent', 'Swift', 'Bold', 'Calm', 'Dark', 'Bright', 'Frosty', 'Lone'];
const NOUNS      = ['Fox', 'Moth', 'Wolf', 'Hawk', 'Bear', 'Raven', 'Tiger', 'Lynx'];
const BLOCKLIST  = new Set(['admin', 'moderator', 'system', 'bot']);

/**
 * Generates a random readable username not already in use.
 * @returns {string}
 */
const generateUniqueUsername = () => {
  let username;
  let attempts = 0;
  do {
    const adj    = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const noun   = NOUNS[Math.floor(Math.random() * NOUNS.length)];
    const suffix = Math.floor(1000 + Math.random() * 9000);
    username = `${adj}${noun}${suffix}`;
    attempts++;
    if (attempts > 50) username = `Guest${crypto.randomBytes(4).toString('hex')}`;
  } while (isUsernameTaken(username) || BLOCKLIST.has(username.toLowerCase()));

  return username;
};

/**
 * @param {string} username
 * @returns {boolean}
 */
const isUsernameTaken = (username) => {
  const lower = username.toLowerCase();
  for (const user of onlineUsers.values()) {
    if (user.username.toLowerCase() === lower) return true;
  }
  return false;
};

// ─── Guest lifecycle ──────────────────────────────────────────────────────────

/**
 * Builds a fresh guest profile with all default values.
 *
 * @param {string} userId
 * @param {string} username
 * @param {string} socketId
 * @returns {import('../types').GuestProfile}
 */
const buildGuestProfile = (userId, username, socketId) => ({
  id:          userId,
  username,
  role:        'guest',
  cursorSkin:  'default',
  isTemporary: true,
  createdAt:   Date.now(),
  lastActivity: Date.now(),
  socketId,
});

/**
 * Creates a new temporary user: generates identity, signs a temp JWT,
 * registers in the online map, and returns everything the socket needs.
 *
 * @param {string} socketId
 * @param {string} [preferredUsername] - Optional; auto-generated if omitted
 * @param {string} [equippedCursor]
 * @returns {{ userId: string, username: string, tempToken: string, profile: import('../types').GuestProfile }}
 */
const createGuestUser = (socketId, preferredUsername, equippedCursor) => {
  const userId   = crypto.randomBytes(16).toString('hex');
  const username = preferredUsername && !isUsernameTaken(preferredUsername)
    ? preferredUsername
    : generateUniqueUsername();

  const tempToken = jwt.sign(
    { id: userId, username, isTemporary: true },
    TEMP_JWT_SECRET,
    { expiresIn: '14d' }
  );

  const profile = buildGuestProfile(userId, username, socketId);
  if (equippedCursor) profile.cursorSkin = equippedCursor;

  onlineUsers.set(userId, profile);

  return { userId, username, tempToken, profile };
};

/**
 * Updates a specific field on an online user.
 *
 * @param {string} userId
 * @param {Partial<import('../types').GuestProfile>} patch
 */
const patchUser = (userId, patch) => {
  const user = onlineUsers.get(userId);
  if (!user) return;
  onlineUsers.set(userId, { ...user, ...patch, lastActivity: Date.now() });
};

/**
 * Returns current skins map for all online users.
 * Used by multiple handlers so centralized here.
 *
 * @returns {Record<string, { cursorSkin: string }>}
 */
const getUserSkinsMap = () =>
  Object.fromEntries(
    Array.from(onlineUsers.values()).map(u => [u.username, { cursorSkin: u.cursorSkin }])
  );

/**
 * Removes a user from the online map and their cursor.
 * @param {string} userId
 * @param {string} username
 */
const removeUser = (userId, username) => {
  onlineUsers.delete(userId);
  delete cursors[username];
};

module.exports = {
  onlineUsers,
  cursors,
  generateUniqueUsername,
  isUsernameTaken,
  createGuestUser,
  buildGuestProfile,
  patchUser,
  getUserSkinsMap,
  removeUser,
};
