/**
 * @typedef {Object} GuestProfile
 * @property {string} id
 * @property {string} username
 * @property {'guest'|'user'} role
 * @property {string} cursorSkin
 * @property {boolean} isTemporary
 * @property {number} lastActivity
 * @property {number} createdAt
 */

/**
 * @typedef {Object} AuthPayload
 * @property {string} id
 * @property {string} username
 * @property {boolean} [isTemporary]
 */

/**
 * @typedef {Object} ClickData
 * @property {number} clickValue
 * @property {boolean} [isNaturalClick]
 */

/**
 * @typedef {Object} UpgradeData
 * @property {number} flatClickBonus
 * @property {number} percentageClickBonus
 * @property {number} flatAutoClicker
 * @property {number} percentAutoClicker
 * @property {number} bestCPS
 */

/**
 * @typedef {import('socket.io').Socket & {
 *   userId: string,
 *   username: string,
 *   isTemporary: boolean
 * }} AuthSocket
 */

module.exports = {};
