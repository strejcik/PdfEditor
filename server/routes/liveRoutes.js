// server/routes/liveRoutes.js
// Live collaboration API routes

const express = require("express");
const bcrypt = require("bcryptjs");
const { signToken } = require("../utils/jwt");
const { validateRoomPassword } = require("../utils/password");
const { nowSec } = require("../utils/time");
const { createRoom, getRoom, deleteRoom, isRoomExpired } = require("../services/roomService");

const router = express.Router();

/**
 * API: create a room & mint host/viewer tokens
 * POST /live/create
 * Body: { room?: string, maxViewers?: number, ttlMinutes?: number, password?: string }
 *
 * - password is hashed and stored in room metadata
 */
router.post("/create", (req, res) => {
  const proposed = (req.body && req.body.room) || null;
  const room =
    proposed && /^[A-Za-z0-9_-]{4,32}$/.test(proposed)
      ? proposed
      : Math.random().toString(36).slice(2, 10);

  const maxViewers = Math.max(1, Math.min(1000, Number(req.body?.maxViewers ?? 25)));
  const ttlMinutes = Math.max(1, Math.min(24 * 60, Number(req.body?.ttlMinutes ?? 120)));
  const expiresAt = nowSec() + ttlMinutes * 60;

  // Enforce strong password on backend
  const pwCheck = validateRoomPassword(req.body?.password);
  if (!pwCheck.ok) {
    return res.status(400).json({ error: pwCheck.error });
  }

  const rawPassword = pwCheck.password;
  const passwordHash = bcrypt.hashSync(rawPassword, 10);

  createRoom(room, {
    maxViewers,
    expiresAt,
    passwordHash,
  });

  const hostToken = signToken({ kind: "live", role: "host", room }, ttlMinutes * 60);
  const viewerToken = signToken({ kind: "live", role: "viewer", room }, ttlMinutes * 60);

  res.json({ room, hostToken, viewerToken, maxViewers, expiresAt });
});

/**
 * API: exchange room + password for a viewer token
 * POST /live/viewer-token
 * Body: { room: string, password: string }
 */
router.post("/viewer-token", (req, res) => {
  const room = (req.body?.room || "").toString();
  const password = (req.body?.password || "").toString();

  if (!room || !password) {
    return res.status(400).json({ error: "room and password required" });
  }

  const rinfo = getRoom(room);
  if (!rinfo) {
    return res.status(404).json({ error: "room not found" });
  }

  if (isRoomExpired(room)) {
    return res.status(410).json({ error: "room expired" });
  }

  if (!rinfo.passwordHash) {
    // Room was created without password (shouldn't happen in your flow, but safe)
    return res
      .status(403)
      .json({ error: "room is not password-protected or misconfigured" });
  }

  const ok = bcrypt.compareSync(password, rinfo.passwordHash);
  if (!ok) {
    return res.status(401).json({ error: "invalid password" });
  }

  // Password OK -> issue viewer token with limited TTL (e.g. 2h or match room ttl)
  const ttlSec = rinfo.expiresAt - nowSec();
  if (ttlSec <= 0) {
    deleteRoom(room);
    return res.status(410).json({ error: "room expired" });
  }

  const viewerToken = signToken(
    { kind: "live", role: "viewer", room },
    ttlSec
  );
  return res.json({ room, viewerToken });
});

/**
 * API: simple room health (optional)
 * GET /live/rooms/:room
 */
router.get("/rooms/:room", (req, res) => {
  const r = getRoom(req.params.room);
  if (!r) return res.status(404).json({ ok: false });
  res.json({
    ok: true,
    hasHost: !!r.hostSid,
    viewers: r.viewers.size,
    maxViewers: r.maxViewers,
    expiresAt: r.expiresAt,
  });
});

module.exports = router;
