// src/hooks/useLiveShare.js
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text || "(no body)"}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// Helper: exchange room + password for viewerToken
async function fetchViewerToken(room, password) {
  const payload = await apiPost("/live/viewer-token", { room, password });
  if (!payload || !payload.viewerToken) {
    throw new Error(payload?.error || "Invalid password or room");
  }
  return payload.viewerToken;
}

export function useLiveShare({ getAppState, applyFullState }) {
  const [mode, setMode] = useState("idle"); // "idle" | "host" | "viewer"
  const [roomId, setRoomId] = useState(null);
  const [hostToken, setHostToken] = useState(null);
  const [viewerToken, setViewerToken] = useState(null);

  // ----- MODAL STATE (host + viewer) -----
  const [hostPwModal, setHostPwModal] = useState({
    open: false,
    error: "",
    pending: false,
    existingRoomId: null,
  });

  const [viewerPwModal, setViewerPwModal] = useState({
    open: false,
    error: "",
    pending: false,
    room: null,
  });

  const client = useMemo(() => makeLiveClient({ serverUrl: LIVE_WS }), []);
  const clientRef = useRef(client);

  useEffect(() => {
    return () => clientRef.current?.disconnect?.();
  }, []);

  // ---------------- Host: create room and broadcast ----------------
  async function startHosting(existingRoomId, password) {
    const pw = String(password || "").trim();
    if (!pw) throw new Error("Password is required");

    // 1) Create room + tokens (backend should hash/store password)
    let createPayload;
    try {
      createPayload = await apiPost("/live/create", {
        room: existingRoomId || undefined,
        maxViewers: 25,
        ttlMinutes: 120,
        password: pw, // required
      });
    } catch (e) {
      console.error("[live] /live/create failed:", e);
      throw e;
    }

    const room = createPayload.room;
    const hTok = createPayload.hostToken;
    const vTok = createPayload.viewerToken || null;

    if (!room || !hTok) throw new Error("Server did not return room/hostToken");

    setRoomId(room);
    setHostToken(hTok);
    if (vTok) setViewerToken(vTok);
    setMode("host");

    // 2) Join via socket with host token
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

    // 4) Throttled updates
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
  async function startViewing(room, tokenFromBackendOrStored) {
    setRoomId(room);
    setMode("viewer");

    const vTok = tokenFromBackendOrStored || viewerToken;
    if (!vTok) throw new Error("viewer token missing");

    const ack = await client.join({ room, asHost: false, token: vTok });
    if (!ack?.ok) throw new Error(ack?.error || "join failed");

    let gotInitial = false;

    function once(event, handler) {
      const off = client.on(event, function wrapper(...args) {
        off && off();
        handler(...args);
      });
    }

    const onHostState = ({ schemaVersion, state }) => {
      if (schemaVersion !== 1) return;
      applyFullState(state);
    };

    const onHostPatch = ({ patch }) => {
      if (!gotInitial) return;
      // TODO: apply incremental patch later
    };

    // request full after join
    if (client.socket && client.socket.emit) {
      client.socket.emit("request_full", { room });
    }

    // initial full once
    once("host_state", ({ schemaVersion, state }) => {
      if (schemaVersion !== 1) return;
      gotInitial = true;
      applyFullState(state);
      client.on("host_state", onHostState);
      client.on("host_patch", onHostPatch);
    });

    // safety re-request
    setTimeout(() => {
      if (!gotInitial) {
        if (client.socket && client.socket.emit) {
          client.socket.emit("request_full", { room });
        }
      }
    }, 2000);

    return { stop: () => client.disconnect() };
  }

  // ---------------- Host: respond to request_full ----------------
  useEffect(() => {
    const off = client.on("request_full", (payload) => {
      if (mode !== "host") return;
      const currentRoom = roomId;
      if (!currentRoom || !payload) return;

      try {
        client.sendFull({ schemaVersion: 1, state: getAppState() });
      } catch (e) {
        console.error("[live] failed to respond to request_full:", e);
      }
    });

    return () => off && off();
  }, [client, mode, roomId, getAppState]);

  function makeViewerLink(room) {
    const url = new URL(window.location.href);
    url.searchParams.set("room", room);
    url.searchParams.set("role", "viewer");
    return url.toString();
  }

  // ---------------- Modal openers/handlers ----------------
  const openHostPasswordModal = useCallback((existingRoomId) => {
    setHostPwModal({ open: true, error: "", pending: false, existingRoomId: existingRoomId || null });
  }, []);

  const cancelHostPasswordModal = useCallback(() => {
    setHostPwModal((s) => ({ ...s, open: false, error: "", pending: false }));
  }, []);

  const submitHostPassword = useCallback(
    async (password) => {
      const pw = String(password || "").trim();
      if (!pw) {
        setHostPwModal((s) => ({ ...s, error: "Password is required." }));
        return null;
      }

      setHostPwModal((s) => ({ ...s, pending: true, error: "" }));
      try {
        const result = await startHosting(hostPwModal.existingRoomId, pw);
        setHostPwModal((s) => ({ ...s, open: false, pending: false, error: "" }));
        return result;
      } catch (e) {
        setHostPwModal((s) => ({
          ...s,
          pending: false,
          error: e?.message || "Failed to start sharing",
        }));
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hostPwModal.existingRoomId, startHosting]
  );

  const openViewerPasswordModal = useCallback((room) => {
    setViewerPwModal({ open: true, error: "", pending: false, room });
  }, []);

  const cancelViewerPasswordModal = useCallback(() => {
    setViewerPwModal((s) => ({ ...s, open: false, error: "", pending: false }));
  }, []);

  const submitViewerPassword = useCallback(
    async (password) => {
      const pw = String(password || "").trim();
      if (!pw) {
        setViewerPwModal((s) => ({ ...s, error: "Password is required." }));
        return null;
      }

      const room = viewerPwModal.room;
      if (!room) {
        setViewerPwModal((s) => ({ ...s, error: "Missing room id." }));
        return null;
      }

      setViewerPwModal((s) => ({ ...s, pending: true, error: "" }));
      try {
        const vTok = await fetchViewerToken(room, pw);
        await startViewing(room, vTok);
        setViewerPwModal((s) => ({ ...s, open: false, pending: false, error: "" }));
        return true;
      } catch (e) {
        setViewerPwModal((s) => ({
          ...s,
          pending: false,
          error: e?.message || "Wrong password / room expired",
        }));
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viewerPwModal.room, startViewing]
  );

  // Auto-detect viewer mode (NO prompts now; opens modal)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const role = sp.get("role");
    const room = sp.get("room");
    if (role === "viewer" && room) {
      openViewerPasswordModal(room);
    }
  }, [openViewerPasswordModal]);

  return {
    mode,
    roomId,
    startHosting, // still usable directly if you want (but now requires password param)
    startViewing,
    makeViewerLink,
    hostToken,
    viewerToken,

    // modal API
    hostPwModal,
    openHostPasswordModal,
    cancelHostPasswordModal,
    submitHostPassword,

    viewerPwModal,
    openViewerPasswordModal,
    cancelViewerPasswordModal,
    submitViewerPassword,
  };
}
