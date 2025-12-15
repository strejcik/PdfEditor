// server.js
// Static frontend + Socket.IO live server with JWT-secured room policy + password-protected rooms

const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

// Import configuration and modules
const { PORT, LIVE_JWT_SECRET, APP_ORIGINS } = require("./server/config");
const liveRoutes = require("./server/routes/liveRoutes");
const { initializeSocketHandlers } = require("./server/sockets/liveSocket");

// ---------------------------- express ----------------------------
const app = express();
app.use(express.json());
app.use(cors({ origin: APP_ORIGINS, credentials: true }));

// Mount live collaboration routes
app.use("/live", liveRoutes);

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

// Initialize Socket.IO event handlers
initializeSocketHandlers(io);

// ---------------------------- start ----------------------------
server.listen(PORT, () => {
  console.log(`Server + Live Socket.IO on http://localhost:${PORT}`);
  console.log(
    `JWT secret: ${LIVE_JWT_SECRET !== "dev-secret-change-me" ? "SET" : "DEFAULT (INSECURE - change LIVE_JWT_SECRET!)"}`
  );
});
