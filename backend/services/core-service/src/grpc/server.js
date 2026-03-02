// backend/services/core-service/src/grpc/grpcServer.js
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { OAuth2Client } from "google-auth-library";

const prisma = new PrismaClient();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CORE_PROTO_PATH = path.resolve(__dirname, "../../../../proto/core.proto");
const AUTH_PROTO_PATH = path.resolve(__dirname, "../../../../proto/auth.proto");

function loadProto(protoPath) {
  const def = protoLoader.loadSync(protoPath, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  return grpc.loadPackageDefinition(def);
}

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

async function createSession(userId, token) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, token, expiresAt } });
}

function ms(d) {
  return d ? String(d.getTime()) : "0";
}

export function startGrpcAll(port = 50051) {
  const corePkg = loadProto(CORE_PROTO_PATH);
  const authPkg = loadProto(AUTH_PROTO_PATH);

  const core = corePkg.core;
  const auth = authPkg.auth;

  if (!core?.ProblemService) throw new Error("ProblemService not found in core.proto");
  if (!core?.BattleService) throw new Error("BattleService not found in core.proto");
  if (!core?.HistoryService) throw new Error("HistoryService not found in core.proto");
  if (!auth?.AuthService) throw new Error("AuthService not found in auth.proto");

  const server = new grpc.Server();

  /* =========================
     ✅ ProblemService
     ========================= */
  server.addService(core.ProblemService.service, {
    GetRandomProblems: async (call, cb) => {
      try {
        const topic = String(call.request.topic || "").toLowerCase().trim();
        const count = Math.max(1, Math.min(10, Number(call.request.count || 1)));
        if (!topic) return cb(null, { problems: [] });

        const problems = await prisma.$queryRaw`
          SELECT
            id, title, statement, topic, difficulty,
            "fnName", "inputFormat", "outputFormat",
            "starterJava", "starterPython", "starterCpp", "starterJs"
          FROM "Problem"
          WHERE lower(topic) = ${topic}
          ORDER BY random()
          LIMIT ${count}
        `;

        cb(null, { problems });
      } catch (e) {
        console.error("GetRandomProblems error:", e);
        cb(e);
      }
    },

    GetProblemDetails: async (call, cb) => {
      try {
        const problemId = String(call.request.problemId || "").trim();
        const includeHidden = !!call.request.includeHidden;
        if (!problemId) return cb(new Error("problemId is required"));

        const problem = await prisma.problem.findUnique({
          where: { id: problemId },
          select: {
            id: true,
            title: true,
            statement: true,
            topic: true,
            difficulty: true,
            fnName: true,
            inputFormat: true,
            outputFormat: true,
            starterJava: true,
            starterPython: true,
            starterCpp: true,
            starterJs: true,
          },
        });
        if (!problem) return cb(new Error("Problem not found"));

        const testcases = await prisma.testcase.findMany({
          where: includeHidden ? { problemId } : { problemId, isSample: true },
          select: { input: true, expected: true, isSample: true },
          orderBy: { createdAt: "asc" },
        });

        cb(null, { problem, testcases });
      } catch (e) {
        console.error("GetProblemDetails error:", e);
        cb(e);
      }
    },
  });

  /* =========================
     ✅ BattleService
     ========================= */
  server.addService(core.BattleService.service, {
    PersistBattleResult: async (call, cb) => {
      try {
        const r = call.request?.room;
        if (!r?.roomId) return cb(new Error("room.roomId is required"));
        if (!r?.hostUserId) return cb(new Error("room.hostUserId is required"));

        const roomCode = String(r.roomId);
        const startTime = r.startTimeMs ? new Date(Number(r.startTimeMs)) : null;
        const endTime = r.endTimeMs ? new Date(Number(r.endTimeMs)) : null;

        const dbRoom = await prisma.room.upsert({
          where: { roomCode },
          update: {
            status: r.status || "FINISHED",
            topic: r.topic || null,
            questionCount: r.questionCount ?? null,
            timerSeconds: r.timerSeconds ?? null,
            startTime,
            endTime,
            hostUserId: r.hostUserId,
          },
          create: {
            roomCode,
            status: r.status || "FINISHED",
            topic: r.topic || null,
            questionCount: r.questionCount ?? null,
            timerSeconds: r.timerSeconds ?? null,
            startTime,
            endTime,
            hostUserId: r.hostUserId,
          },
          select: { id: true },
        });

        const dbRoomId = dbRoom.id;

        const players = Array.isArray(r.players) ? r.players : [];
        const scores = r.scores || {};
        const readyMap = r.ready || {};

        const roomPlayerRows = players
          .filter((p) => p?.userId)
          .map((p) => {
            const userId = String(p.userId);
            return {
              roomId: dbRoomId,
              userId,
              score: Number(scores[userId] ?? 0),
              isReady: !!readyMap[userId],
            };
          });

        const questions = Array.isArray(r.questions) ? r.questions : [];
        const roomProblemRows = questions
          .filter((q) => q?.problemId)
          .map((q) => ({
            roomId: dbRoomId,
            problemId: String(q.problemId),
            order: Number(q.order ?? 1),
          }));

        await prisma.$transaction([
          prisma.roomPlayer.deleteMany({ where: { roomId: dbRoomId } }),
          prisma.roomProblem.deleteMany({ where: { roomId: dbRoomId } }),
          ...(roomPlayerRows.length ? [prisma.roomPlayer.createMany({ data: roomPlayerRows })] : []),
          ...(roomProblemRows.length ? [prisma.roomProblem.createMany({ data: roomProblemRows })] : []),
        ]);

        cb(null, { ok: true, dbRoomId, message: "Battle saved successfully" });
      } catch (e) {
        console.error("PersistBattleResult error:", e);
        cb(e);
      }
    },

    PersistSubmission: async (call, cb) => {
      try {
        const s = call.request;
        if (!s?.roomId) return cb(new Error("roomId is required"));
        if (!s?.userId) return cb(new Error("userId is required"));
        if (!s?.problemId) return cb(new Error("problemId is required"));

        const roomCode = String(s.roomId);

        const room = await prisma.room.upsert({
          where: { roomCode },
          update: {},
          create: { roomCode, status: "ACTIVE", hostUserId: String(s.userId) },
          select: { id: true },
        });

        const created = await prisma.submission.create({
          data: {
            roomId: room.id,
            userId: String(s.userId),
            problemId: String(s.problemId),
            language: String(s.language || "unknown"),
            sourceCode: String(s.sourceCode || ""),
            verdict: String(s.verdict || "PENDING"),
            scoreDelta: Number(s.scoreDelta || 0),
            timeMs: s.timeMs ? Number(s.timeMs) : null,
            memoryKb: s.memoryKb ? Number(s.memoryKb) : null,
            errorMessage: s.errorMessage ? String(s.errorMessage) : null,
          },
          select: { id: true },
        });

        cb(null, { ok: true, submissionId: created.id, message: "Submission saved" });
      } catch (e) {
        console.error("PersistSubmission error:", e);
        cb(e);
      }
    },
  });

  /* =========================
     ✅ HistoryService
     ========================= */
  server.addService(core.HistoryService.service, {
    GetRecentBattles: async (call, cb) => {
      try {
        const limit = Math.max(1, Math.min(100, Number(call.request?.limit || 20)));

        const rooms = await prisma.room.findMany({
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            roomCode: true,
            status: true,
            topic: true,
            questionCount: true,
            timerSeconds: true,
            createdAt: true,
            startTime: true,
            endTime: true,
            hostUserId: true,
          },
        });

        if (!rooms.length) return cb(null, { battles: [] });

        const roomIds = rooms.map((r) => r.id);

        const roomPlayers = await prisma.roomPlayer.findMany({
          where: { roomId: { in: roomIds } },
          select: { roomId: true, userId: true, score: true },
        });

        const rpByRoom = new Map();
        for (const rp of roomPlayers) {
          if (!rpByRoom.has(rp.roomId)) rpByRoom.set(rp.roomId, []);
          rpByRoom.get(rp.roomId).push(rp);
        }

        const winnerIds = [];
        const winnerByRoomId = new Map();

        for (const r of rooms) {
          const arr = rpByRoom.get(r.id) || [];
          arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          const winner = arr[0] || null;
          winnerByRoomId.set(r.id, winner);
          if (winner?.userId) winnerIds.push(winner.userId);
        }

        const uniqWinnerIds = [...new Set(winnerIds)];

        const users = uniqWinnerIds.length
          ? await prisma.user.findMany({
              where: { id: { in: uniqWinnerIds } },
              select: { id: true, username: true, email: true },
            })
          : [];

        const userMap = new Map(users.map((u) => [u.id, u]));

        const battles = rooms.map((r) => {
          const arr = rpByRoom.get(r.id) || [];
          const winner = winnerByRoomId.get(r.id);
          const u = winner?.userId ? userMap.get(winner.userId) : null;

          return {
            roomCode: r.roomCode,
            status: r.status,
            topic: r.topic || "",
            questionCount: r.questionCount ?? 0,
            timerSeconds: r.timerSeconds ?? 0,
            createdAtMs: ms(r.createdAt),
            startTimeMs: ms(r.startTime),
            endTimeMs: ms(r.endTime),
            hostUserId: r.hostUserId || "",
            winnerUserId: winner?.userId || "",
            winnerUsername: u?.username || u?.email || "",
            playerCount: arr.length,
          };
        });

        cb(null, { battles });
      } catch (e) {
        console.error("GetRecentBattles error:", e);
        cb(e);
      }
    },
  });

  /* =========================
     ✅ AuthService (MERGED)
     ========================= */
  server.addService(auth.AuthService.service, {
    Register: async (call, cb) => {
      try {
        const { username, email, password } = call.request;
        if (!username || !email || !password) return cb(new Error("username, email, password required"));

        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return cb(new Error("Email already registered"));

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({ data: { username, email, passwordHash } });

        const token = signToken({ userId: user.id, email: user.email });
        await createSession(user.id, token);

        cb(null, {
          token,
          user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl || "" },
        });
      } catch (e) {
        cb(e);
      }
    },

    Login: async (call, cb) => {
      try {
        const { email, password } = call.request;
        if (!email || !password) return cb(new Error("email, password required"));

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return cb(new Error("Invalid credentials"));

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return cb(new Error("Invalid credentials"));

        const token = signToken({ userId: user.id, email: user.email });
        await createSession(user.id, token);

        cb(null, {
          token,
          user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl || "" },
        });
      } catch (e) {
        cb(e);
      }
    },

    GoogleLogin: async (call, cb) => {
      try {
        const { idToken } = call.request;
        if (!idToken) return cb(new Error("idToken required"));

        const ticket = await googleClient.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const googleId = payload.sub;
        const email = payload.email;
        const username = payload.name || email.split("@")[0];
        const avatarUrl = payload.picture || "";

        let user = await prisma.user.findFirst({ where: { OR: [{ googleId }, { email }] } });

        if (!user) {
          user = await prisma.user.create({ data: { username, email, googleId, avatarUrl } });
        } else {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { googleId: user.googleId || googleId, avatarUrl: user.avatarUrl || avatarUrl },
          });
        }

        const token = signToken({ userId: user.id, email: user.email });
        await createSession(user.id, token);

        cb(null, {
          token,
          user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl || "" },
        });
      } catch (e) {
        cb(e);
      }
    },

    GetMe: async (call, cb) => {
      try {
        const { token } = call.request;
        if (!token) return cb(new Error("token required"));

        const decoded = verifyToken(token);

        const session = await prisma.session.findUnique({ where: { token } });
        if (!session) return cb(new Error("Session not found (logged out)"));
        if (session.expiresAt < new Date()) return cb(new Error("Session expired"));

        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) return cb(new Error("User not found"));

        cb(null, { user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl || "" } });
      } catch (e) {
        cb(e);
      }
    },

    Logout: async (call, cb) => {
      try {
        const { token } = call.request;
        if (!token) return cb(new Error("token required"));
        await prisma.session.deleteMany({ where: { token } });
        cb(null, { ok: true, message: "Logged out" });
      } catch (e) {
        cb(e);
      }
    },
  });

  server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (err) => {
    if (err) throw err;
    console.log(`[core] gRPC (core+auth) running on :${port}`);
    server.start();
  });
}