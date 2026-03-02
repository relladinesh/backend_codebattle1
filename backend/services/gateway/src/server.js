import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { registerBattleSocket } from "./sockets/battle.socket.js";
import { socketAuth } from "./middlewares/socketAuth.js";

// ✅ Use ENV in production, fallback to localhost in dev
const FRONTEND_ORIGIN = process.env.FRONTEND_URL || "http://localhost:5173";

const server = http.createServer(app);

// ✅ Socket.io CORS
const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

socketAuth(io);
registerBattleSocket(io);

// ✅ Render sets PORT automatically (DO NOT use GATEWAY_PORT there)
const PORT = Number(process.env.PORT || process.env.GATEWAY_PORT || 5000);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[gateway] running on ${PORT}`);
  console.log(`[gateway] allowed origin: ${FRONTEND_ORIGIN}`);
});