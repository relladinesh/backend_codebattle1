import express from "express";
import {
  registerGrpc,
  loginGrpc,
  googleLoginGrpc,
  getMeGrpc,
  logoutGrpc,
} from "../utils/authGrpcClient.js";

const router = express.Router();

function getBearerToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
}

router.post("/register", async (req, res) => {
  try {
    const data = await registerGrpc(req.body);
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message || "Register failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const data = await loginGrpc(req.body);
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message || "Login failed" });
  }
});

router.post("/google/callback", async (req, res) => {
  try {
    const data = await googleLoginGrpc({ idToken: req.body.idToken });
    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message || "Google login failed" });
  }
});

// ✅ NEW: persistent login check


router.get("/me", async (req, res) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    if (!token) {
      return res.status(401).json({ ok: false, message: "No token" });
    }

    const data = await getMeGrpc({ token });

    res.json({ ok: true, ...data });
  } catch (e) {
    res.status(401).json({ ok: false, message: e.message || "Unauthorized" });
  }
});

// ✅ server-side logout
router.post("/logout", async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ ok: false, message: "No token" });

    const data = await logoutGrpc({ token });
    res.json({ ok: true, ...data }); // { ok:true, ok:true, message:"Logged out" }
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message || "Logout failed" });
  }
});

export default router;