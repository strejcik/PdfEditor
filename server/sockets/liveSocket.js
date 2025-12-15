// server/sockets/liveSocket.js
// Socket.IO event handlers for live collaboration

const { verifyToken } = require("../utils/jwt");
const { nowSec } = require("../utils/time");
const {
  getRoom,
  deleteRoom,
  isRoomExpired,
  setRoomHost,
  addViewer,
  removeViewer,
  removeHost,
  shouldDeleteRoom,
  getViewerCount,
} = require("../services/roomService");

/**
 * Broadcast viewer count to all clients in a room
 * @param {Object} io - Socket.IO server instance
 * @param {string} room - Room ID
 */
function broadcastViewerCount(io, room) {
  const viewerCount = getViewerCount(room);
  io.to(room).emit("viewer_count", { count: viewerCount });
  console.log(`Broadcasting viewer count for room ${room}: ${viewerCount}`);
}

/**
 * Initialize Socket.IO event handlers
 * @param {Object} io - Socket.IO server instance
 */
function initializeSocketHandlers(io) {
  io.on("connection", (socket) => {
    socket.data.role = "guest";
    socket.data.room = null;

    // Accept both {roomId,...} and {room,...} for backward compatibility
    socket.on("join", (payload = {}, ack) => {
      const room = payload.room || payload.roomId;
      const { asHost, token } = payload;

      if (!room || !token) {
        return ack?.({ ok: false, error: "missing room or token" });
      }

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

      const rinfo = getRoom(room);
      if (!rinfo) {
        return ack?.({ ok: false, error: "room not found" });
      }

      if (isRoomExpired(room)) {
        return ack?.({ ok: false, error: "room expired" });
      }

      if (asHost) {
        if (dec.role !== "host") {
          return ack?.({ ok: false, error: "need host token" });
        }
        if (rinfo.hostSid && rinfo.hostSid !== socket.id) {
          return ack?.({ ok: false, error: "host already connected" });
        }
        setRoomHost(room, socket.id);
        socket.data.role = "host";
      } else {
        if (dec.role !== "viewer") {
          return ack?.({ ok: false, error: "need viewer token" });
        }
        if (!addViewer(room, socket.id)) {
          return ack?.({ ok: false, error: "room full" });
        }
        socket.data.role = "viewer";
      }

      socket.join(room);
      socket.data.room = room;
      ack?.({ ok: true });
      console.log(`${socket.id} joined ${room} as ${socket.data.role}`);

      // Broadcast updated viewer count to everyone in the room
      broadcastViewerCount(io, room);
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

      const rinfo = getRoom(room);
      if (!rinfo) return;

      if (socket.data.role === "host") {
        removeHost(room);
        socket.to(room).emit("peer_left", { hostLeft: true });
      } else if (socket.data.role === "viewer") {
        removeViewer(room, socket.id);
      }

      // Broadcast updated viewer count after someone leaves
      if (getViewerCount(room) > 0 || rinfo.hostSid) {
        broadcastViewerCount(io, room);
      }

      if (shouldDeleteRoom(room)) {
        deleteRoom(room);
      }

      console.log("disconnected", socket.id);
    });
  });
}

module.exports = {
  initializeSocketHandlers,
  broadcastViewerCount,
};
