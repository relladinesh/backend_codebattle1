import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import historyRoutes from "./routes/history.routes.js";

const app = express();

app.use(express.json());

const allowedOrigins = [
  process.env.FRONTEND_URL, // Vercel frontend
  "http://localhost:5173",  // Local frontend
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/auth", authRoutes);
app.use("/api/history", historyRoutes);

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

export default app;
