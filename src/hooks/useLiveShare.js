// src/useLiveShare.js
import { useEffect, useMemo, useRef, useState } from "react";
import { makeLiveClient } from "../utils/liveclient/liveClient";

const LIVE_WS = import.meta?.env?.VITE_LIVE_URL || "ws://localhost:3000";
const LIVE_HTTP = import.meta?.env?.VITE_LIVE_HTTP || "http://localhost:3000";

// Simple rAF throttle
function rafThrottle(fn) {
  let queued = false;
  return (...args) => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(...args);
    });
  };
}

async function apiPost(path, body, bearer) {
  const res = await fetch(`${LIVE_HTTP}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status} ${res.statusText}: ${text || "(no body)"}`
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function useLiveShare({ getAppState, applyFullState }) {
  const [mode, setMode] = useState("idle"); // "idle" | "host" | "viewer"
  const [roomId, setRoomId] = useState(null);
  const [hostToken, setHostToken] = useState(null);
  const [viewerToken, setViewerToken] = useState(null);

  const client = useMemo(() => makeLiveClient({ serverUrl: LIVE_WS }), []);
  const clientRef = useRef(client);

  useEffect(() => {
    return () => clientRef.current?.disconnect?.();
  }, []);

  // ---------------- Host: create room and broadcast ----------------
  async function startHosting(existingRoomId) {
    // 1) Create room + tokens
    let createPayload;
    try {
      createPayload = await apiPost("/live/create", {
        room: existingRoomId || undefined,
        maxViewers: 25,
        ttlMinutes: 120,
      });
    } catch (e) {
      console.error("[live] /live/create failed:", e);
      throw e;
    }

    const room = createPayload.room;
    const hTok = createPayload.hostToken;
    const vTok = createPayload.viewerToken;

    if (!room || !hTok || !vTok) {
      throw new Error("Server did not return room/hostToken/viewerToken");
    }

    setRoomId(room);
    setHostToken(hTok);
    setViewerToken(vTok);
    setMode("host");

    // 2) Join via socket with host token (send both room and roomId to satisfy either handler)
    let ack;
    try {
      ack = await client.join({ room, roomId: room, asHost: true, token: hTok });
    } catch (e) {
      console.error("[live] join threw:", e);
      throw new Error(`join failed: ${e.message || e}`);
    }

    if (!ack || ack.ok !== true) {
      console.error("[live] join ack:", ack);
      throw new Error(`join failed: ${ack?.error || "no ack from server"}`);
    }

    // 3) Send initial snapshot
    client.sendFull({ schemaVersion: 1, state: getAppState() });

    // 4) Throttled updates (MVP full-sends; can switch to patches later)
    const sendThrottled = rafThrottle(() =>
      client.sendFull({ schemaVersion: 1, state: getAppState() })
    );

    return {
      room,
      hostToken: hTok,
      viewerToken: vTok,
      notifyChange: sendThrottled,
      stop: () => client.disconnect(),
    };
  }

  // ---------------- Viewer: subscribe & apply ----------------
  async function startViewing(room, tokenFromUrl) {
    setRoomId(room);
    setMode("viewer");

    const vTok = tokenFromUrl || viewerToken;
    if (!vTok) throw new Error("viewer token missing");

    const ack = await client.join({ room, asHost: false, token: vTok });
    if (!ack?.ok) throw new Error(ack?.error || "join failed");

    let gotInitial = false;

    // helper: one-time listener
    function once(event, handler) {
      const off = client.on(event, function wrapper(...args) {
        off && off(); // remove this wrapper
        handler(...args);
      });
    }

    // normal handlers (used after initial full)
    const onHostState = ({ schemaVersion, state }) => {
      if (schemaVersion !== 1) return;
      applyFullState(state);
    };

    const onHostPatch = ({ patch }) => {
      if (!gotInitial) return; // ignore patches until we have the base state
      // TODO: apply incremental patch here if you implement patching
    };

    // Immediately request full snapshot from host after joining
    if (client.socket && client.socket.emit) {
      client.socket.emit("request_full", { room });
    }

    // 1) Grab initial full EXACTLY ONCE
    once("host_state", ({ schemaVersion, state }) => {
      if (schemaVersion !== 1) return;
      gotInitial = true;
      console.log("[live] initial state received", state);
      applyFullState(state);

      // 2) After initial, wire the usual ongoing listeners
      client.on("host_state", onHostState);
      client.on("host_patch", onHostPatch);
    });

    // Optional: safety net if the initial full doesn't arrive soon
    setTimeout(() => {
      if (!gotInitial) {
        console.warn("[live] No initial state received from host yet. Re-requesting full.");
        if (client.socket && client.socket.emit) {
          client.socket.emit("request_full", { room });
        }
      }
    }, 2000);

    return { stop: () => client.disconnect() };
  }

  // ---------------- Host: respond to request_full ----------------
  useEffect(() => {
    // Host listens for request_full and replies with current full state
    const off = client.on("request_full", (payload) => {
      if (mode !== "host") return;        // only host should respond
      const currentRoom = roomId;
      if (!currentRoom || !payload) return;

      // Optionally check payload.room === currentRoom
      try {
        client.sendFull({ schemaVersion: 1, state: getAppState() });
      } catch (e) {
        console.error("[live] failed to respond to request_full:", e);
      }
    });

    return () => {
      off && off();
    };
  }, [client, mode, roomId, getAppState]);

  function makeViewerLink(room, token) {
    const url = new URL(window.location.href);
    url.searchParams.set("room", room);
    url.searchParams.set("role", "viewer"); // not "view"
    url.searchParams.set("t", token);       // <-- include token
    return url.toString();
  }

  // Auto-detect viewer mode if URL carries role=viewer
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const role = sp.get("role");
    const room = sp.get("room");
    const t = sp.get("t");
    if (role === "viewer" && room && t) {
      // fire and forget
      startViewing(room, t).catch((e) =>
        console.error("[live] viewer join failed", e)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    mode,
    roomId,
    startHosting,
    startViewing,
    makeViewerLink,
    hostToken,
    viewerToken,
  };
}
