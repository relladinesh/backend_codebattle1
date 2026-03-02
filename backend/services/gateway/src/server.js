import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { registerBattleSocket } from "./sockets/battle.socket.js";
import { socketAuth } from "./middlewares/socketAuth.js";

app.use(cors({ origin: true, credentials: true }));

const server = http.createServer(app);

const FRONTEND_ORIGIN = "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST"],
  },
});
socketAuth(io);
registerBattleSocket(io);

const PORT = Number(process.env.GATEWAY_PORT || 5000);
server.listen(PORT, () => console.log(`[gateway] running on ${PORT}`));
