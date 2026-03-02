import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import historyRoutes from "./routes/history.routes.js";

const app = express();

app.use(express.json());

// ✅ CORS (Frontend only)
const FRONTEND_ORIGIN = "http://localhost:5173";

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Handle preflight
app.options(/.*/, cors({ origin: FRONTEND_ORIGIN, credentials: true }));

app.use("/auth", authRoutes);
app.use("/api/history", historyRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

export default app;