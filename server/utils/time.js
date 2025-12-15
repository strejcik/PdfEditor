// server/utils/time.js
// Time utilities

/**
 * Get current time in seconds since epoch
 * @returns {number} Current timestamp in seconds
 */
function nowSec() {
  return Math.floor(Date.now() / 1000);
}

module.exports = {
  nowSec,
};
