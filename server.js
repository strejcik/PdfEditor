// server.js
// Static frontend + Socket.IO live server with JWT-secured room policy + password-protected rooms

const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");

// ---------------------------- config ----------------------------
const PORT = process.env.PORT || 3000;
const LIVE_JWT_SECRET = process.env.LIVE_JWT_SECRET || "dev-secret-change-me"; // <-- set in prod!

const APP_ORIGINS = [
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
];

// ---------------------------- room registry ----------------------------
// For multi-instance, put this in Redis and use socket.io-redis-adapter
// roomId -> { createdAt, hostSid, maxViewers, expiresAt, viewers:Set<string>, passwordHash?: string | null }
const rooms = new Map();
const nowSec = () => Math.floor(Date.now() / 1000);

// ---------------------------- jwt helpers ----------------------------
function signToken(payload, ttlSec) {
  return jwt.sign(payload, LIVE_JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: ttlSec,
  });
}
function verifyToken(token) {
  return jwt.verify(token, LIVE_JWT_SECRET, { algorithms: ["HS256"] });
}

// ---------------------------- express ----------------------------
const app = express();
app.use(express.json());
app.use(cors({ origin: APP_ORIGINS, credentials: true }));







function validateRoomPassword(pwRaw) {
  const pw = (pwRaw ?? "").toString().trim();

  // Required
  if (!pw) return { ok: false, error: "Password is required." };

  // Policy (adjust to match your frontend exactly if needed)
  if (pw.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (!/[A-Za-z]/.test(pw)) return { ok: false, error: "Password must include at least 1 letter." };
  if (!/[0-9]/.test(pw)) return { ok: false, error: "Password must include at least 1 number." };
  if (!/[^A-Za-z0-9]/.test(pw)) return { ok: false, error: "Password must include at least 1 special character." };

  return { ok: true, password: pw };
}




/**
 * API: create a room & mint host/viewer tokens
 * POST /live/create
 * Body: { room?: string, maxViewers?: number, ttlMinutes?: number, password?: string }
 *
 * - password is hashed and stored in room metadata
 */
app.post("/live/create", (req, res) => {
  const proposed = (req.body && req.body.room) || null;
  const room =
    proposed && /^[A-Za-z0-9_-]{4,32}$/.test(proposed)
      ? proposed
      : Math.random().toString(36).slice(2, 10);

  const maxViewers = Math.max(1, Math.min(1000, Number(req.body?.maxViewers ?? 25)));
  const ttlMinutes = Math.max(1, Math.min(24 * 60, Number(req.body?.ttlMinutes ?? 120)));
  const expiresAt = nowSec() + ttlMinutes * 60;

  // ✅ Enforce strong password on backend
  const pwCheck = validateRoomPassword(req.body?.password);
  if (!pwCheck.ok) {
    return res.status(400).json({ error: pwCheck.error });
  }

  const rawPassword = pwCheck.password;
  const passwordHash = bcrypt.hashSync(rawPassword, 10);

  rooms.set(room, {
    createdAt: nowSec(),
    hostSid: null,
    maxViewers,
    expiresAt,
    viewers: new Set(),
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
app.post("/live/viewer-token", (req, res) => {
  const room = (req.body?.room || "").toString();
  const password = (req.body?.password || "").toString();

  if (!room || !password) {
    return res.status(400).json({ error: "room and password required" });
  }

  const rinfo = rooms.get(room);
  if (!rinfo) {
    return res.status(404).json({ error: "room not found" });
  }

  if (nowSec() >= rinfo.expiresAt) {
    rooms.delete(room);
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
    rooms.delete(room);
    return res.status(410).json({ error: "room expired" });
  }

  const viewerToken = signToken(
    { kind: "live", role: "viewer", room },
    ttlSec
  );
  return res.json({ room, viewerToken });
});


// API: simple room health (optional)
app.get("/live/rooms/:room", (req, res) => {
  const r = rooms.get(req.params.room);
  if (!r) return res.status(404).json({ ok: false });
  res.json({
    ok: true,
    hasHost: !!r.hostSid,
    viewers: r.viewers.size,
    maxViewers: r.maxViewers,
    expiresAt: r.expiresAt,
  });
});

// ---------------------------- static frontend ----------------------------
app.use(express.static(path.join(__dirname, "build")));
app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// ---------------------------- socket.io ----------------------------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: APP_ORIGINS, methods: ["GET", "POST"] },
  path: "/socket.io/", // keep default
});

io.on("connection", (socket) => {
  socket.data.role = "guest";
  socket.data.room = null;

  // Accept both {roomId,...} and {room,...} for backward compatibility
  socket.on("join", (payload = {}, ack) => {
    const room = payload.room || payload.roomId;
    const { asHost, token } = payload;

    if (!room || !token)
      return ack?.({ ok: false, error: "missing room or token" });

    // Validate token
    let dec;
    try {
      dec = verifyToken(token);
    } catch (e) {
      return ack?.({ ok: false, error: "invalid token" });
    }

    if (dec.kind !== "live" || dec.room !== room) {
      return ack?.({ ok: false, error: "room mismatch" });
    }

    const rinfo = rooms.get(room);
    if (!rinfo) return ack?.({ ok: false, error: "room not found" });

    if (nowSec() >= rinfo.expiresAt) {
      rooms.delete(room);
      return ack?.({ ok: false, error: "room expired" });
    }

    if (asHost) {
      if (dec.role !== "host")
        return ack?.({ ok: false, error: "need host token" });
      if (rinfo.hostSid && rinfo.hostSid !== socket.id) {
        return ack?.({ ok: false, error: "host already connected" });
      }
      rinfo.hostSid = socket.id;
      socket.data.role = "host";
    } else {
      if (dec.role !== "viewer")
        return ack?.({ ok: false, error: "need viewer token" });
      if (rinfo.viewers.size >= rinfo.maxViewers) {
        return ack?.({ ok: false, error: "room full" });
      }
      rinfo.viewers.add(socket.id);
      socket.data.role = "viewer";
    }

    socket.join(room);
    socket.data.room = room;
    ack?.({ ok: true });
    console.log(`${socket.id} joined ${room} as ${socket.data.role}`);
  });

  socket.on("host_state", (msg) => {
    const room = socket.data.room;
    if (!room || socket.data.role !== "host") return;
    socket.to(room).emit("host_state", msg);
  });

  // Viewer → Host: request full state
  socket.on("request_full", (msg) => {
    const room = socket.data.room;
    if (!room) return;
    // Forward to host in that room
    socket.to(room).emit("request_full", msg);
  });

  socket.on("host_patch", (msg) => {
    const room = socket.data.room;
    if (!room || socket.data.role !== "host") return;
    socket.to(room).emit("host_patch", msg);
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (!room) return;
    const rinfo = rooms.get(room);
    if (!rinfo) return;

    if (socket.data.role === "host") {
      rinfo.hostSid = null;
      socket.to(room).emit("peer_left", { hostLeft: true });
    } else if (socket.data.role === "viewer") {
      rinfo.viewers.delete(socket.id);
    }

    if (!rinfo.hostSid && rinfo.viewers.size === 0) {
      rooms.delete(room);
    }
    console.log("disconnected", socket.id);
  });
});

// ---------------------------- start ----------------------------
server.listen(PORT, () => {
  console.log(`Server + Live Socket.IO on http://localhost:${PORT}`);
  console.log(
    `JWT secret: ${LIVE_JWT_SECRET ? "SET" : "DEFAULT (INSECURE - change LIVE_JWT_SECRET!)"}`
  );
});
