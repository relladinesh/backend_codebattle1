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

/* ---------------- TIMER MAPS (dedupe) ---------------- */
const lobbyTimers = new Map();
const battleEndTimers = new Map();

/* Track which roomIds this socket joined (so we can leave on disconnect) */
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
    winnerUserId: String(room.winner || ""), // empty => draw

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

/** helper: everyone ready */
function allReady(room) {
  if (!room?.players?.length) return false;
  return room.players.every((p) => room.ready?.[p.userId] === true);
}

function minNeed(room) {
  // ✅ if you store minPlayersToStart in room, use it
  // else default 2
  return Number(room?.minPlayersToStart || 2);
}

function isHost(socket, room) {
  return !!socket.user?.userId && String(socket.user.userId) === String(room?.hostUser?.userId || "");
}

/** AUTO START when FULL + READY (optional) */
async function tryAutoStart(io, roomId) {
  const room = await getRoom(roomId);
  if (!room) return;
  if (room.status !== "WAITING") return;

  // keep your premium rule: only auto start when FULL + ALL READY
  if (room.players.length !== room.maxPlayers) return;
  if (!allReady(room)) return;

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

  const started = await startBattle(roomId, questions);
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
 * ✅ LOBBY END RULE (UPDATED):
 * - if players < minPlayersToStart => CANCELLED with message "Room requires minimum X players"
 * - else do NOT cancel (host can still start manually)
 */
async function finalizeLobby(io, roomId) {
  const room = await getRoom(roomId);
  if (!room) return;
  if (room.status !== "WAITING") return;

  const count = Number(room.players?.length || 0);
  const need = minNeed(room);

  // ✅ DON'T CANCEL when only host is waiting
  // Just keep the room in WAITING state.
  if (count < need) {
    io.to(roomId).emit("room:update", room);

    // Optional: tell host why it didn't start
    io.to(roomId).emit(
      "room:info",
      `Waiting for more players (${count}/${need}). Share the room code.`
    );

    // ✅ Optional: extend lobby timer so UI doesn't go negative
    // room.lobbyClosesAtMs = Date.now() + 2 * 60 * 1000; // +2 mins
    // await saveRoom(roomId, room); // if you expose saveRoom
    // io.to(roomId).emit("lobby:timer", { lobbyClosesAtMs: room.lobbyClosesAtMs });

    clearLobbyTimer(roomId);
    return;
  }

  // ✅ lobby ended but min players met -> keep waiting
  io.to(roomId).emit("room:update", room);

  // optional: if it's already full+ready, auto start
  await tryAutoStart(io, roomId);
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

        // if full, auto-start check
        if (res.room.players.length === res.room.maxPlayers) {
          io.to(roomId).emit("room:full", res.room);
          await tryAutoStart(io, roomId);
        }
      } catch (e) {
        cb?.({ ok: false, message: e?.message || "Join failed" });
        socket.emit("room:error", e?.message || "Join failed");
      }
    });

    /* ---------------- GET ROOM STATE (refresh/new tab) ---------------- */
    socket.on("room:get", async ({ roomId }, cb) => {
  try {
    if (!socket.user?.userId)
      return cb?.({ ok: false, message: "Unauthorized" });

    const room = await getRoom(roomId);
    if (!room) return cb?.({ ok: false, message: "Room not found" });

    socket.join(roomId);
    trackJoin(socket, roomId);

    cb?.({ ok: true, room });

    // 🔥 update everyone
    io.to(roomId).emit("room:update", room);

    socket.emit("lobby:timer", {
      lobbyClosesAtMs: room.lobbyClosesAtMs,
    });

    if (String(room.status || "").toUpperCase() === "ACTIVE") {
      socket.emit("battle:started", room);
    }
  } catch (e) {
    cb?.({ ok: false, message: e?.message || "Failed to load room" });
  }
});

    /* ---------------- HOST MANUAL START (NEW) ---------------- */
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

        const count = Number(room.players?.length || 0);
        const need = minNeed(room);

        if (count < need) {
          return cb?.({ ok: false, message: `Room requires minimum ${need} players` });
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

        const started = await startBattle(roomId, questions);
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

        const details = await getProblemDetailsGrpc({
          problemId,
          includeHidden: false,
        });

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

    /* ---------------- READY ---------------- */
    socket.on("player:ready", async ({ roomId, ready = true }) => {
      try {
        if (!socket.user?.userId) return socket.emit("room:error", "Unauthorized");

        const userId = socket.user.userId;

        const updated = await setPlayerReady(roomId, userId, !!ready);
        if (updated?.error) return socket.emit("room:error", updated.error);

        io.to(roomId).emit("room:update", updated.room);

        // ✅ still allow auto-start if full+ready (premium)
        if (updated.room.players.length === updated.room.maxPlayers && allReady(updated.room)) {
          await tryAutoStart(io, roomId);
        }
      } catch (e) {
        socket.emit("room:error", e?.message || "Ready failed");
      }
    });

    /* ---------------- LEAVE (Exit button) ---------------- */
    socket.on("room:leave", async ({ roomId }) => {
      try {
        if (!socket.user?.userId) return socket.emit("room:error", "Unauthorized");

        const userId = socket.user.userId;

        const out = await leaveRoom(roomId, userId);
        if (out?.error) return socket.emit("room:error", out.error);

        // stop timers if ended
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

        const allowed = room.questions?.some((q) => String(q.id ?? q.problemId) === String(problemId));
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

        // persist submission
        try {
          const first = Array.isArray(result.results) && result.results.length ? result.results[0] : null;

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

    /* ---------------- DISCONNECT => auto leave all joined rooms ---------------- */
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