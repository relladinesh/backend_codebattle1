// backend/services/gateway/src/sockets/battle.socket.js
import {
  createRoom,
  joinRoom,
  startBattle,
  cancelRoom,
  getRoom,
  checkAndFinish,
  setPlayerReady,
  leaveRoom,
  updateScore,
  markSolved,
} from "../utils/roomManager.js";

import {
  getRandomProblemsGrpc,
  getProblemDetailsGrpc,
  persistBattleResultGrpc,
  persistSubmissionGrpc,
} from "../utils/coreGrpcClient.js";

import { judgeProblemSubmission } from "../utils/judgeRunner.js";

/* ---------------- TIMER MAPS ---------------- */
const lobbyTimers = new Map();
const battleEndTimers = new Map();

/* Track socket rooms */
function ensureSocketRooms(socket) {
  if (!socket.data.joinedRooms) socket.data.joinedRooms = new Set();
  return socket.data.joinedRooms;
}
function trackJoin(socket, roomId) {
  ensureSocketRooms(socket).add(roomId);
}
function trackLeave(socket, roomId) {
  ensureSocketRooms(socket).delete(roomId);
}

function clearLobbyTimer(roomId) {
  const t = lobbyTimers.get(roomId);
  if (t) clearTimeout(t);
  lobbyTimers.delete(roomId);
}
function clearBattleEndTimer(roomId) {
  const t = battleEndTimers.get(roomId);
  if (t) clearTimeout(t);
  battleEndTimers.delete(roomId);
}

/* ---------------- Persist Dedup ---------------- */
const persistedRooms = new Set();

function toRoomSnapshot(room) {
  if (!room) return null;

  const players = Array.isArray(room.players) ? room.players : [];
  const questions = Array.isArray(room.questions) ? room.questions : [];

  const questionSnapshots = questions
    .map((q, idx) => ({
      problemId: String(q.id ?? q.problemId ?? ""),
      order: Number(q.order ?? idx + 1),
    }))
    .filter((q) => q.problemId);

  return {
    roomId: String(room.roomId),
    status: String(room.status || ""),
    topic: String(room.topic || ""),
    questionCount: Number(room.questionCount || 0),
    timerSeconds: Number(room.timerSeconds || 0),
    startTimeMs: Number(room.startTimeMs || 0),
    endTimeMs: Number(room.endTimeMs || 0),

    hostUserId: String(room.hostUser?.userId || ""),
    winnerUserId: String(room.winner || ""),

    players: players
      .map((p) => ({
        userId: String(p.userId || ""),
        email: String(p.email || ""),
      }))
      .filter((p) => p.userId),

    questions: questionSnapshots,

    scores: room.scores || {},
    ready: room.ready || {},
  };
}

async function persistOnce(room) {
  try {
    if (!room?.roomId) return;
    if (persistedRooms.has(room.roomId)) return;

    const s = String(room.status || "");
    if (s !== "FINISHED" && s !== "CANCELLED") return;

    persistedRooms.add(room.roomId);

    const snap = toRoomSnapshot(room);
    if (!snap?.roomId || !snap.hostUserId) return;

    const res = await persistBattleResultGrpc(snap);
    console.log("[gateway] PersistBattleResult ok:", res?.ok, "dbRoomId:", res?.dbRoomId);
  } catch (e) {
    console.error("[gateway] PersistBattleResult failed:", e?.message || e);
  }
}

/* ---------------- timers ---------------- */

function scheduleBattleEnd(io, roomId, timerSeconds) {
  clearBattleEndTimer(roomId);

  const seconds = Number(timerSeconds || 0);
  if (!seconds || seconds <= 0) return;

  const delay = seconds * 1000 + 200;

  const timeoutId = setTimeout(async () => {
    try {
      const finished = await checkAndFinish(roomId);
      if (finished) {
        io.to(roomId).emit("battle:ended", finished);
        io.to(roomId).emit("leaderboard:update", { roomId, scores: finished.scores });
        await persistOnce(finished);
        clearBattleEndTimer(roomId);
      }
    } catch (e) {
      console.error("battle end timer error:", e);
    } finally {
      battleEndTimers.delete(roomId);
    }
  }, delay);

  battleEndTimers.set(roomId, timeoutId);
}

function minNeed(room) {
  return Number(room?.minPlayersToStart || 2);
}

function isHost(socket, room) {
  return (
    !!socket.user?.userId &&
    String(socket.user.userId) === String(room?.hostUser?.userId || "")
  );
}

function readyCount(room) {
  const r = room?.ready || {};
  return Object.values(r).filter(Boolean).length;
}

function allPlayersReady(room) {
  const players = room?.players || [];
  if (!players.length) return false;
  const r = room?.ready || {};
  return players.every((p) => r[p.userId] === true);
}

/**
 * ✅ AUTO START RULE (FIXED):
 * Auto-start ONLY when:
 * 1) players === maxPlayers
 * 2) ALL players are READY
 */
async function tryAutoStart(io, roomId) {
  const room = await getRoom(roomId);
  if (!room) return;
  if (String(room.status || "").toUpperCase() !== "WAITING") return;

  const playersNow = Number(room.players?.length || 0);
  const maxPlayers = Number(room.maxPlayers || 0);

  if (playersNow !== maxPlayers) return;
  if (!allPlayersReady(room)) return;

  const questions = await getRandomProblemsGrpc({
    topic: room.topic,
    count: room.questionCount,
  });

  if (!questions.length) {
    const cancelled = await cancelRoom(roomId, `No questions found for topic '${room.topic}'`);
    io.to(roomId).emit("room:update", cancelled);
    io.to(roomId).emit("room:cancelled", cancelled?.cancelledReason || "No questions found");
    await persistOnce(cancelled);
    clearLobbyTimer(roomId);
    return;
  }

  const started = await startBattle(roomId, questions, room.hostUser?.userId);
  if (started?.error) {
    io.to(roomId).emit("room:error", started.error);
    return;
  }

  clearLobbyTimer(roomId);

  io.to(roomId).emit("room:update", started.room);
  io.to(roomId).emit("battle:started", started.room);
  io.to(roomId).emit("leaderboard:update", { roomId, scores: started.room.scores });

  scheduleBattleEnd(io, roomId, started.room.timerSeconds);
}

/**
 * ✅ LOBBY TIMER END RULE (as you asked now):
 * If still WAITING when timer ends -> CANCEL room + redirect clients (room:cancelled)
 */
async function finalizeLobby(io, roomId) {
  const room = await getRoom(roomId);
  if (!room) return;

  if (String(room.status || "").toUpperCase() !== "WAITING") {
    clearLobbyTimer(roomId);
    return;
  }

  const cancelled = await cancelRoom(roomId, "Lobby timed out");
  io.to(roomId).emit("room:update", cancelled);
  io.to(roomId).emit("room:cancelled", cancelled?.cancelledReason || "Lobby timed out");
  await persistOnce(cancelled);
  clearLobbyTimer(roomId);
}

export function registerBattleSocket(io) {
  io.on("connection", (socket) => {
    console.log("[gateway] socket connected:", socket.id, "user:", socket.user?.userId);

    /* ---------------- CREATE ROOM ---------------- */
    socket.on("room:create", async ({ topic, questionCount, timerSeconds, maxPlayers }, cb) => {
      try {
        if (!socket.user?.userId) return cb?.({ ok: false, message: "Unauthorized" });

        const user = { userId: socket.user.userId, email: socket.user.email };
        const room = await createRoom(user, { topic, questionCount, timerSeconds, maxPlayers });

        socket.join(room.roomId);
        trackJoin(socket, room.roomId);

        cb?.({ ok: true, room });
        socket.emit("room:created", room);

        io.to(room.roomId).emit("lobby:timer", { lobbyClosesAtMs: room.lobbyClosesAtMs });
        io.to(room.roomId).emit("room:update", room);

        clearLobbyTimer(room.roomId);

        const timeoutId = setTimeout(() => {
          finalizeLobby(io, room.roomId).catch((e) => console.error("finalizeLobby error:", e));
        }, Math.max(0, room.lobbyClosesAtMs - Date.now()) + 50);

        lobbyTimers.set(room.roomId, timeoutId);
      } catch (e) {
        cb?.({ ok: false, message: e?.message || "Create failed" });
        socket.emit("room:error", e?.message || "Create failed");
      }
    });

    /* ---------------- JOIN ROOM ---------------- */
    socket.on("room:join", async ({ roomId }, cb) => {
      try {
        if (!socket.user?.userId) return cb?.({ ok: false, message: "Unauthorized" });

        const user = { userId: socket.user.userId, email: socket.user.email };
        const res = await joinRoom(roomId, user);

        if (res.error) {
          cb?.({ ok: false, message: res.error });
          return socket.emit("room:error", res.error);
        }

        socket.join(roomId);
        trackJoin(socket, roomId);

        cb?.({ ok: true, room: res.room });

        io.to(roomId).emit("room:update", res.room);
        socket.emit("lobby:timer", { lobbyClosesAtMs: res.room.lobbyClosesAtMs });

        // ✅ if full, still do NOT start unless all ready
        await tryAutoStart(io, roomId);
      } catch (e) {
        cb?.({ ok: false, message: e?.message || "Join failed" });
        socket.emit("room:error", e?.message || "Join failed");
      }
    });

    /* ---------------- GET ROOM STATE ---------------- */
    socket.on("room:get", async ({ roomId }, cb) => {
      try {
        if (!socket.user?.userId) return cb?.({ ok: false, message: "Unauthorized" });

        const room = await getRoom(roomId);
        if (!room) return cb?.({ ok: false, message: "Room not found" });

        socket.join(roomId);
        trackJoin(socket, roomId);

        cb?.({ ok: true, room });

        io.to(roomId).emit("room:update", room);
        socket.emit("lobby:timer", { lobbyClosesAtMs: room.lobbyClosesAtMs });

        if (String(room.status || "").toUpperCase() === "ACTIVE") {
          socket.emit("battle:started", room);
          return;
        }

        // If full+ready already, auto start
        await tryAutoStart(io, roomId);
      } catch (e) {
        cb?.({ ok: false, message: e?.message || "Failed to load room" });
      }
    });

    /* ---------------- HOST MANUAL START ----------------
       ✅ Allowed ONLY when:
       - WAITING
       - host
       - minPlayers <= players < maxPlayers
       - ALL CURRENT PLAYERS READY
    ----------------------------------------------- */
    socket.on("battle:start", async ({ roomId }, cb) => {
      try {
        if (!socket.user?.userId) return cb?.({ ok: false, message: "Unauthorized" });

        const room = await getRoom(roomId);
        if (!room) return cb?.({ ok: false, message: "Room not found" });

        if (String(room.status || "").toUpperCase() !== "WAITING") {
          return cb?.({ ok: false, message: "Room already started/finished" });
        }

        if (!isHost(socket, room)) {
          return cb?.({ ok: false, message: "Only host can start" });
        }

        const playersNow = Number(room.players?.length || 0);
        const need = minNeed(room);
        const maxPlayers = Number(room.maxPlayers || 0);

        if (playersNow < need) {
          return cb?.({ ok: false, message: `Need minimum ${need} players` });
        }

        if (playersNow >= maxPlayers) {
          // full case handled by auto-start rule (full + all ready)
          await tryAutoStart(io, roomId);
          return cb?.({ ok: true, message: "Checking auto-start..." });
        }

        // ✅ IMPORTANT: require everyone currently inside to be READY
        if (!allPlayersReady(room)) {
          return cb?.({ ok: false, message: "All joined players must be READY to start" });
        }

        const questions = await getRandomProblemsGrpc({
          topic: room.topic,
          count: room.questionCount,
        });

        if (!questions.length) {
          const cancelled = await cancelRoom(roomId, `No questions found for topic '${room.topic}'`);
          io.to(roomId).emit("room:update", cancelled);
          io.to(roomId).emit("room:cancelled", cancelled?.cancelledReason || "No questions found");
          await persistOnce(cancelled);
          clearLobbyTimer(roomId);
          return cb?.({ ok: false, message: cancelled?.cancelledReason || "No questions found" });
        }

        const started = await startBattle(roomId, questions, socket.user.userId);
        if (started?.error) return cb?.({ ok: false, message: started.error });

        clearLobbyTimer(roomId);

        io.to(roomId).emit("room:update", started.room);
        io.to(roomId).emit("battle:started", started.room);
        io.to(roomId).emit("leaderboard:update", { roomId, scores: started.room.scores });

        scheduleBattleEnd(io, roomId, started.room.timerSeconds);

        cb?.({ ok: true, room: started.room });
      } catch (e) {
        cb?.({ ok: false, message: e?.message || "Start failed" });
      }
    });

    /* ---------------- PROBLEM DETAILS ---------------- */
    socket.on("problem:details", async ({ problemId }, cb) => {
      try {
        if (!problemId) return cb?.({ ok: false, message: "problemId required" });

        const details = await getProblemDetailsGrpc({ problemId, includeHidden: false });

        return cb?.({
          ok: true,
          problem: details.problem,
          testcases: details.testcases || [],
        });
      } catch (e) {
        console.error("[gateway] problem:details error:", e?.message || e);
        return cb?.({ ok: false, message: e?.message || "GetProblemDetails failed" });
      }
    });

    /* ---------------- READY ----------------
       ✅ On every ready toggle:
       - update room
       - if FULL + ALL READY => auto start
    ---------------------------------------- */
    socket.on("player:ready", async ({ roomId, ready = true }) => {
      try {
        if (!socket.user?.userId) return socket.emit("room:error", "Unauthorized");

        const userId = socket.user.userId;

        const updated = await setPlayerReady(roomId, userId, !!ready);
        if (updated?.error) return socket.emit("room:error", updated.error);

        io.to(roomId).emit("room:update", updated.room);

        // ✅ only auto start when full + ALL READY
        await tryAutoStart(io, roomId);
      } catch (e) {
        socket.emit("room:error", e?.message || "Ready failed");
      }
    });

    /* ---------------- LEAVE ---------------- */
    socket.on("room:leave", async ({ roomId }) => {
      try {
        if (!socket.user?.userId) return socket.emit("room:error", "Unauthorized");

        const userId = socket.user.userId;

        const out = await leaveRoom(roomId, userId);
        if (out?.error) return socket.emit("room:error", out.error);

        if (out.cancelled || out.finished || out.room?.status === "FINISHED") {
          clearLobbyTimer(roomId);
          clearBattleEndTimer(roomId);
        }

        if (out.cancelled) {
          io.to(roomId).emit("room:update", out.room);
          io.to(roomId).emit("room:cancelled", out.room?.cancelledReason || "Room cancelled");
          await persistOnce(out.room);
        } else {
          io.to(roomId).emit("room:update", out.room);

          if (out.room?.status === "FINISHED") {
            io.to(roomId).emit("battle:ended", out.room);
            io.to(roomId).emit("leaderboard:update", { roomId, scores: out.room.scores });
            await persistOnce(out.room);
          }
        }

        socket.leave(roomId);
        trackLeave(socket, roomId);
      } catch (e) {
        socket.emit("room:error", e?.message || "Leave failed");
      }
    });

    /* ---------------- SUBMIT CODE ---------------- */
    socket.on("submit:code", async ({ roomId, problemId, language_id, source_code }) => {
      try {
        if (!socket.user?.userId) {
          return socket.emit("submit:result", {
            problemId,
            verdict: "ERROR",
            message: "Unauthorized",
            results: [],
          });
        }

        const userId = socket.user.userId;

        const room = await getRoom(roomId);
        if (!room) return socket.emit("room:error", "Room not found");
        if (room.status !== "ACTIVE") return socket.emit("room:error", "Battle not active");

        const allowed = room.questions?.some(
          (q) => String(q.id ?? q.problemId) === String(problemId)
        );
        if (!allowed) return socket.emit("room:error", "Invalid problem for this room");

        const result = await judgeProblemSubmission({ problemId, language_id, source_code });

        let updatedRoom = room;
        let scoreDelta = 0;

        if (result.verdict === "AC") {
          const marked = await markSolved(roomId, userId, problemId);
          if (!marked?.alreadySolved) {
            scoreDelta = 10;
            const upd = await updateScore(roomId, userId, scoreDelta);
            if (upd && !upd.error) updatedRoom = upd;
          } else {
            updatedRoom = marked.room || updatedRoom;
          }
        }

        try {
          const first =
            Array.isArray(result.results) && result.results.length ? result.results[0] : null;

          await persistSubmissionGrpc({
            roomId,
            userId,
            problemId,
            language: String(language_id),
            sourceCode: String(source_code || ""),
            verdict: String(result.verdict || "ERROR"),
            scoreDelta: Number(scoreDelta || 0),
            timeMs: first?.time ? Math.round(Number(first.time) * 1000) : 0,
            memoryKb: first?.memory ? Number(first.memory) : 0,
            errorMessage: String(result.message || ""),
          });
        } catch (e) {
          console.log("⚠️ PersistSubmission failed:", e?.message || e);
        }

        socket.emit("submit:result", { problemId, ...result });
        io.to(roomId).emit("room:update", updatedRoom);
        io.to(roomId).emit("leaderboard:update", { roomId, scores: updatedRoom.scores });
      } catch (e) {
        socket.emit("submit:result", {
          problemId,
          verdict: "ERROR",
          message: e?.message || "Judge error",
          results: [],
        });
      }
    });

    /* ---------------- DISCONNECT ---------------- */
    socket.on("disconnect", async () => {
      console.log("[gateway] socket disconnected:", socket.id);

      const userId = socket.user?.userId;
      if (!userId) return;

      const rooms = Array.from(ensureSocketRooms(socket));
      for (const roomId of rooms) {
        try {
          const out = await leaveRoom(roomId, userId);

          if (out?.cancelled || out?.finished || out?.room?.status === "FINISHED") {
            clearLobbyTimer(roomId);
            clearBattleEndTimer(roomId);
          }

          if (out?.cancelled) {
            io.to(roomId).emit("room:update", out.room);
            io.to(roomId).emit("room:cancelled", out.room?.cancelledReason || "Room cancelled");
            await persistOnce(out.room);
          } else if (out?.room) {
            io.to(roomId).emit("room:update", out.room);
            if (out.room.status === "FINISHED") {
              io.to(roomId).emit("battle:ended", out.room);
              io.to(roomId).emit("leaderboard:update", { roomId, scores: out.room.scores });
              await persistOnce(out.room);
            }
          }
        } catch (e) {
          console.log("[gateway] disconnect leave failed:", roomId, e?.message || e);
        } finally {
          trackLeave(socket, roomId);
        }
      }
    });
  });
}