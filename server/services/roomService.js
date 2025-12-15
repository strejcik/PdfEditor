// server/services/roomService.js
// Room management service

const { nowSec } = require("../utils/time");

// Room registry
// For multi-instance, put this in Redis and use socket.io-redis-adapter
// roomId -> { createdAt, hostSid, maxViewers, expiresAt, viewers:Set<string>, passwordHash?: string | null }
const rooms = new Map();

/**
 * Create a new room
 * @param {string} room - Room ID
 * @param {Object} options - Room options
 * @param {number} options.maxViewers - Maximum number of viewers
 * @param {number} options.expiresAt - Expiration timestamp in seconds
 * @param {string} options.passwordHash - Hashed password
 * @returns {Object} Room info
 */
function createRoom(room, { maxViewers, expiresAt, passwordHash }) {
  const roomInfo = {
    createdAt: nowSec(),
    hostSid: null,
    maxViewers,
    expiresAt,
    viewers: new Set(),
    passwordHash,
  };

  rooms.set(room, roomInfo);
  return roomInfo;
}

/**
 * Get room information
 * @param {string} room - Room ID
 * @returns {Object|undefined} Room info or undefined if not found
 */
function getRoom(room) {
  return rooms.get(room);
}

/**
 * Delete a room
 * @param {string} room - Room ID
 */
function deleteRoom(room) {
  rooms.delete(room);
}

/**
 * Check if room is expired and delete if so
 * @param {string} room - Room ID
 * @returns {boolean} True if room is expired
 */
function isRoomExpired(room) {
  const rinfo = rooms.get(room);
  if (!rinfo) return true;

  if (nowSec() >= rinfo.expiresAt) {
    rooms.delete(room);
    return true;
  }

  return false;
}

/**
 * Set host socket ID for a room
 * @param {string} room - Room ID
 * @param {string} socketId - Socket ID
 */
function setRoomHost(room, socketId) {
  const rinfo = rooms.get(room);
  if (rinfo) {
    rinfo.hostSid = socketId;
  }
}

/**
 * Add viewer to a room
 * @param {string} room - Room ID
 * @param {string} socketId - Socket ID
 * @returns {boolean} True if viewer was added successfully
 */
function addViewer(room, socketId) {
  const rinfo = rooms.get(room);
  if (!rinfo) return false;

  if (rinfo.viewers.size >= rinfo.maxViewers) {
    return false;
  }

  rinfo.viewers.add(socketId);
  return true;
}

/**
 * Remove viewer from a room
 * @param {string} room - Room ID
 * @param {string} socketId - Socket ID
 */
function removeViewer(room, socketId) {
  const rinfo = rooms.get(room);
  if (rinfo) {
    rinfo.viewers.delete(socketId);
  }
}

/**
 * Remove host from a room
 * @param {string} room - Room ID
 */
function removeHost(room) {
  const rinfo = rooms.get(room);
  if (rinfo) {
    rinfo.hostSid = null;
  }
}

/**
 * Check if room should be deleted (no host and no viewers)
 * @param {string} room - Room ID
 * @returns {boolean} True if room should be deleted
 */
function shouldDeleteRoom(room) {
  const rinfo = rooms.get(room);
  if (!rinfo) return false;

  return !rinfo.hostSid && rinfo.viewers.size === 0;
}

/**
 * Get viewer count for a room
 * @param {string} room - Room ID
 * @returns {number} Number of viewers
 */
function getViewerCount(room) {
  const rinfo = rooms.get(room);
  return rinfo ? rinfo.viewers.size : 0;
}

module.exports = {
  createRoom,
  getRoom,
  deleteRoom,
  isRoomExpired,
  setRoomHost,
  addViewer,
  removeViewer,
  removeHost,
  shouldDeleteRoom,
  getViewerCount,
};
