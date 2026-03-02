import express from "express";
import { getRecentBattlesGrpc, getBattleDetailsGrpc } from "../utils/historyGrpcClient.js";

const router = express.Router();

// GET /api/history?limit=20
router.get("/", async (req, res) => {
  try {
    const limit = Number(req.query.limit || 20);
    const battles = await getRecentBattlesGrpc(limit);
    res.json({ ok: true, battles });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message || "History error" });
  }
});

// GET /api/history/:roomCode
router.get("/:roomCode", async (req, res) => {
  try {
    const roomCode = req.params.roomCode;
    const data = await getBattleDetailsGrpc(roomCode);

    if (!data?.ok) return res.status(404).json(data);
    res.json(data);
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message || "History details error" });
  }
});

export default router;