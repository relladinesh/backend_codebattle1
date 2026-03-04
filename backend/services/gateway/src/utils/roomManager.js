import crypto from "crypto";
import { redis } from "../config/redis.js";
import { roomKey, roomLockKey } from "./roomKeys.js";

const ROOM_TTL = 7200; // 2 hours
const LOBBY_OPEN_MS = 2 * 60 * 1000; // 2 minutes

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function withRoomLock(roomId, fn) {
  const lock = roomLockKey(roomId);
  const token = crypto.randomUUID();

  for (let i = 0; i < 20; i++) {
    const ok = await redis.set(lock, token, "NX", "PX", 3000);
    if (ok) break;
    await sleep(100);
  }

  const current = await redis.get(lock);
  if (current !== token) throw new Error("Lock failed");

  try {
    return await fn();
  } finally {
    const lua = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await redis.eval(lua, 1, lock, token);
  }
}

/* ---------- Winner / Draw ---------- */
function computeWinner(scores = {}) {
  const entries = Object.entries(scores).map(([uid, sc]) => [uid, Number(sc || 0)]);
  if (!entries.length) return { winner: null, isDraw: true, drawReason: "NO_PLAYERS" };

  entries.sort((a, b) => b[1] - a[1]);
  const topScore = entries[0][1];

  if (topScore <= 0) return { winner: null, isDraw: true, drawReason: "ALL_ZERO" };

  const tied = entries.filter(([, sc]) => sc === topScore).length;
  if (tied > 1) return { winner: null, isDraw: true, drawReason: "TIE" };

  return { winner: entries[0][0], isDraw: false, drawReason: null };
}

export async function getRoom(roomId) {
  const data = await redis.get(roomKey(roomId));
  return data ? JSON.parse(data) : null;
}

async function saveRoom(roomId, room) {
  await redis.set(roomKey(roomId), JSON.stringify(room), "EX", ROOM_TTL);
}

/* ---------- helper inside SAME lock (no deadlock) ---------- */
function cancelMinPlayersIfNeededInLock(room) {
  if (!room) return null;
  if (room.status !== "WAITING") return null;
  if (Date.now() <= room.lobbyClosesAtMs) return null;

  const count = Number(room.players?.length || 0);
  const need = Number(room.minPlayersToStart || 2);

  if (count < need) {
    room.status = "CANCELLED";
    room.cancelledReason = `Room requires minimum ${need} players`;
    room.endTimeMs = Date.now();

    room.winner = null;
    room.isDraw = true;
    room.drawReason = "MIN_PLAYERS_NOT_MET";
    return room;
  }
  return null;
}

/* ---------- CREATE ROOM ---------- */
export async function createRoom(hostUser, config = {}) {
  const roomId = crypto.randomBytes(3).toString("hex");

  const maxPlayers = Number(config.maxPlayers ?? 2);
  if (maxPlayers < 2 || maxPlayers > 10) throw new Error("maxPlayers must be between 2 and 10");

  const room = {
    roomId,
    status: "WAITING",
    createdAt: Date.now(),
    lobbyClosesAtMs: Date.now() + LOBBY_OPEN_MS,

    hostUser,
    players: [hostUser],
    scores: { [hostUser.userId]: 0 },
    ready: { [hostUser.userId]: false },
    solved: {},

    topic: String(config.topic || "").toLowerCase(),
    questionCount: Number(config.questionCount || 0),
    timerSeconds: Number(config.timerSeconds || 0),

    maxPlayers,

    // ✅ YOUR RULE: even if maxPlayers=3/4/.. host can start with 2
    minPlayersToStart: 2,

    questions: [],
    startTimeMs: null,
    endTimeMs: null,

    winner: null,
    isDraw: false,
    drawReason: null,

    cancelledReason: null,
  };

  await saveRoom(roomId, room);
  return room;
}

/* ---------- JOIN ROOM ---------- */
export async function joinRoom(roomId, user) {
  return withRoomLock(roomId, async () => {
    const room = await getRoom(roomId);
    if (!room) return { error: "Room not found" };

    // ✅ if lobby time ended: cancel if min not met
    const cancelled = cancelMinPlayersIfNeededInLock(room);
    if (cancelled) {
      await saveRoom(roomId, cancelled);
      return { error: cancelled.cancelledReason || "Lobby time over", room: cancelled };
    }

    if (room.status !== "WAITING") return { error: "Already started" };
    if (room.players.length >= room.maxPlayers) return { error: "Room full" };

    const exists = room.players.some((p) => p.userId === user.userId);
    if (!exists) {
      room.players.push(user);
      room.scores[user.userId] = 0;
      room.ready[user.userId] = false;
    }

    await saveRoom(roomId, room);
    return { room };
  });
}

/* ---------- READY ---------- */
export async function setPlayerReady(roomId, userId, ready) {
  return withRoomLock(roomId, async () => {
    const room = await getRoom(roomId);
    if (!room) return { error: "Room not found" };

    const cancelled = cancelMinPlayersIfNeededInLock(room);
    if (cancelled) {
      await saveRoom(roomId, cancelled);
      return { error: cancelled.cancelledReason || "Lobby time over", room: cancelled };
    }

    if (room.status !== "WAITING") return { error: "Room is not in lobby" };

    const isPlayer = room.players.some((p) => p.userId === userId);
    if (!isPlayer) return { error: "User not in room" };

    room.ready[userId] = !!ready;

    await saveRoom(roomId, room);
    return { room };
  });
}

/* ---------- START BATTLE (host-only + min players) ---------- */
export async function startBattle(roomId, questions, requesterUserId) {
  return withRoomLock(roomId, async () => {
    const room = await getRoom(roomId);
    if (!room) return { error: "Room not found" };

    const cancelled = cancelMinPlayersIfNeededInLock(room);
    if (cancelled) {
      await saveRoom(roomId, cancelled);
      return { error: cancelled.cancelledReason || "Lobby time over", room: cancelled };
    }

    if (room.status !== "WAITING") return { error: "Room already active/finished" };

    if (requesterUserId !== room.hostUser?.userId) {
      return { error: "Only host can start" };
    }

    const count = Number(room.players?.length || 0);
    const need = Number(room.minPlayersToStart || 2);
    if (count < need) return { error: `Room requires minimum ${need} players` };

    room.status = "ACTIVE";
    room.startTimeMs = Date.now();
    room.endTimeMs = room.startTimeMs + room.timerSeconds * 1000;
    room.questions = questions || [];

    room.winner = null;
    room.isDraw = false;
    room.drawReason = null;

    room.solved = room.solved || {};
    for (const p of room.players) room.solved[p.userId] = room.solved[p.userId] || {};

    await saveRoom(roomId, room);
    return { room };
  });
}

/* ---------- rest unchanged ---------- */
export async function markSolved(roomId, userId, problemId) {
  return withRoomLock(roomId, async () => {
    const room = await getRoom(roomId);
    if (!room) return { error: "Room not found" };
    if (room.status !== "ACTIVE") return { error: "Room not active" };

    room.solved = room.solved || {};
    room.solved[userId] = room.solved[userId] || {};
    if (room.solved[userId][problemId] === true) return { alreadySolved: true, room };

    room.solved[userId][problemId] = true;
    await saveRoom(roomId, room);
    return { alreadySolved: false, room };
  });
}

export async function updateScore(roomId, userId, delta) {
  return withRoomLock(roomId, async () => {
    const room = await getRoom(roomId);
    if (!room) return { error: "Room not found" };
    if (room.status !== "ACTIVE") return { error: "Room not active" };

    const exists = room.players.some((p) => p.userId === userId);
    if (!exists) return { error: "User not in room" };

    room.scores[userId] = Number(room.scores[userId] ?? 0) + Number(delta || 0);

    await saveRoom(roomId, room);
    return room;
  });
}

export async function leaveRoom(roomId, userId) {
  return withRoomLock(roomId, async () => {
    const room = await getRoom(roomId);
    if (!room) return { error: "Room not found" };

    const idx = room.players.findIndex((p) => p.userId === userId);
    if (idx === -1) return { error: "User not in room" };

    const leaving = room.players[idx];
    room.players.splice(idx, 1);

    if (room.ready) delete room.ready[userId];
    if (room.scores) delete room.scores[userId];
    if (room.solved) delete room.solved[userId];

    if (room.players.length === 0) {
      room.status = "FINISHED";
      room.endTimeMs = Date.now();
      room.winner = null;
      room.isDraw = true;
      room.drawReason = "NO_PLAYERS";
      await saveRoom(roomId, room);
      return { finished: true, room };
    }

    if (leaving.userId === room.hostUser?.userId) {
      room.status = "CANCELLED";
      room.cancelledReason = "Host left the room";
      room.endTimeMs = Date.now();
      room.winner = null;
      room.isDraw = true;
      room.drawReason = "HOST_LEFT";
      await saveRoom(roomId, room);
      return { cancelled: true, room };
    }

    if (room.status === "ACTIVE") {
      room.status = "FINISHED";
      room.endTimeMs = Date.now();
      const w = computeWinner(room.scores || {});
      room.winner = w.winner;
      room.isDraw = w.isDraw;
      room.drawReason = w.drawReason;
    }

    await saveRoom(roomId, room);
    return { room };
  });
}

export async function cancelRoom(roomId, reason = "Cancelled") {
  return withRoomLock(roomId, async () => {
    const room = await getRoom(roomId);
    if (!room) return null;

    room.status = "CANCELLED";
    room.cancelledReason = reason;
    room.endTimeMs = Date.now();
    room.winner = null;
    room.isDraw = true;
    room.drawReason = "CANCELLED";

    await saveRoom(roomId, room);
    return room;
  });
}

export async function checkAndFinish(roomId) {
  return withRoomLock(roomId, async () => {
    const room = await getRoom(roomId);
    if (!room || room.status !== "ACTIVE") return null;

    if (!room.endTimeMs) {
      room.endTimeMs = (room.startTimeMs || Date.now()) + (room.timerSeconds || 0) * 1000;
    }

    if (Date.now() < room.endTimeMs) return null;

    room.status = "FINISHED";
    const w = computeWinner(room.scores || {});
    room.winner = w.winner;
    room.isDraw = w.isDraw;
    room.drawReason = w.drawReason;

    await saveRoom(roomId, room);
    return room;
  });
}