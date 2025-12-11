// src/liveClient.js
import { io } from "socket.io-client";

export function makeLiveClient({ serverUrl }) {
  // IMPORTANT: serverUrl should be http(s)://host:port, not ws://
  // e.g. "http://localhost:3000"
  const socket = io(serverUrl, {
    path: "/socket.io/",              // must match server
    transports: ["websocket", "polling"],
    autoConnect: false,
    withCredentials: false,
  });

  let isHost = false;
  let roomId = null;

  function connect() {
    return new Promise((resolve, reject) => {
      if (socket.connected) return resolve();
      const onConnect = () => {
        socket.off("connect_error", onError);
        resolve();
      };
      const onError = (err) => {
        socket.off("connect", onConnect);
        reject(err);
      };
      socket.once("connect", onConnect);
      socket.once("connect_error", onError);
      socket.connect();
    });
  }

  async function join({ room, asHost, token }) {
    if (!room || !token) {
      throw new Error("join: missing room or token");
    }
    await connect();

    isHost = !!asHost;
    roomId  = room;

    // Use an ack so the server can accept/reject and we can surface the reason
    return new Promise((resolve, reject) => {
      try {
        socket.emit(
          "join",
          { room, roomId: room, asHost, token }, // send both keys for compatibility
          (ack) => {
            if (ack && ack.ok) {
              resolve(ack);
            } else {
              reject(new Error(ack?.error || "join failed (no ack)"));
            }
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  }

  function on(evt, cb) {
    socket.on(evt, cb);
    return () => socket.off(evt, cb);
  }

  function sendFull(state) {
    if (!isHost || !roomId) return;
    socket.emit("host_state", {
      schemaVersion: 1,
      ts: Date.now(),
      state,
    });
  }

  function sendPatch(patch) {
    if (!isHost || !roomId) return;
    socket.emit("host_patch", {
      ts: Date.now(),
      patch,
    });
  }

  function disconnect() {
    try {
      socket.disconnect();
    } catch (_) {}
  }

  // Optional: expose the raw socket for debugging
  return { join, on, sendFull, sendPatch, disconnect, socket };
}
