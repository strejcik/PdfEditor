// server/utils/jwt.js
// JWT token utilities

const jwt = require("jsonwebtoken");
const { LIVE_JWT_SECRET } = require("../config");

/**
 * Sign a JWT token with the given payload and TTL
 * @param {Object} payload - Token payload
 * @param {number} ttlSec - Time to live in seconds
 * @returns {string} Signed JWT token
 */
function signToken(payload, ttlSec) {
  return jwt.sign(payload, LIVE_JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: ttlSec,
  });
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
function verifyToken(token) {
  return jwt.verify(token, LIVE_JWT_SECRET, { algorithms: ["HS256"] });
}

module.exports = {
  signToken,
  verifyToken,
};
