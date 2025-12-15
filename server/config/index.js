// server/config/index.js
// Application configuration

const PORT = process.env.PORT || 3000;
const LIVE_JWT_SECRET = process.env.LIVE_JWT_SECRET || "dev-secret-change-me";

const APP_ORIGINS = [
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
];

module.exports = {
  PORT,
  LIVE_JWT_SECRET,
  APP_ORIGINS,
};
