import { io } from "socket.io-client";

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NGUzYWZkZi04MWMzLTRmMWUtYWNiOS03MmQwMGY4NTFhMTgiLCJlbWFpbCI6ImRpbmVzaEBnbWFpbC5jb20iLCJpYXQiOjE3NzE2NzY3MDAsImV4cCI6MTc3MjI4MTUwMH0.HqnJudfr2SZXsDePZ3BRnHqiQa1dyD1eXAGOC5lrNIY";

if (!TOKEN) throw new Error("Missing TOKEN");

const socket = io("http://localhost:5000", {
  auth: { token: TOKEN },
  transports: ["websocket"],
});

let roomId = null;
let readySent = false;
let startSent = false;
let submitted = false;

socket.on("connect", () => {
  console.log("✅ HOST connected:", socket.id);

  socket.emit("room:create", {
    topic: "arrays",
    questionCount: 3,
    timerSeconds: 30,
    maxPlayers: 2,
  });
});

socket.on("room:created", (room) => {
  roomId = room.roomId;
  console.log("✅ HOST room created:", roomId);

  if (!readySent) {
    readySent = true;
    socket.emit("player:ready", { roomId, ready: true });
    console.log("✅ HOST sent READY");
  }

  setTimeout(() => {
    if (startSent) return;
    startSent = true;
    console.log("🚀 HOST battle:start");
    socket.emit("battle:start", { roomId });
  }, 2500);
});

socket.on("room:update", (room) => {
  console.log("📌 HOST room status:", room?.status, "players:", room?.players?.length);
});

socket.on("battle:started", (room) => {
  console.log("✅ HOST battle started");
  console.log("RoomId:", room.roomId);
  console.log("Questions:", (room.questions || []).map((q) => `${q.id} | ${q.title}`));

  if (submitted) return;
  submitted = true;

  const first = room.questions?.[0];
  if (!first) {
    console.log("❌ No questions received");
    return;
  }

  // ⚠️ This code may be correct ONLY for some problems (like Two Sum).
  // If the first problem isn't Two Sum, you'll likely get WA (which is okay for testing).
  const jsCode = `
const fs = require("fs");
const data = fs.readFileSync(0,"utf8").trim().split(/\\s+/);
let idx=0;
const n = parseInt(data[idx++]);
const a = [];
for(let i=0;i<n;i++) a.push(parseInt(data[idx++]));
const target = parseInt(data[idx++]);

const map = new Map();
for(let i=0;i<n;i++){
  const need = target - a[i];
  if(map.has(need)){
    console.log(map.get(need), i);
    process.exit(0);
  }
  map.set(a[i], i);
}
console.log("-1 -1");
`;

  console.log("📤 HOST submitting code for:", first.title, "problemId:", first.id);

  socket.emit("submit:code", {
    roomId,
    problemId: first.id,
    language_id: 63, // JavaScript in Judge0
    source_code: jsCode,
  });
});

socket.on("submit:result", (data) => {
  console.log("✅ HOST submit result:");
  console.log(JSON.stringify(data, null, 2));
});

socket.on("leaderboard:update", (data) => {
  console.log("🏆 leaderboard:", data);
});

socket.on("battle:ended", (room) => {
  console.log("🏁 HOST battle ended. winner:", room?.winner);
  console.log("✅ Now check Neon DB: Room, RoomPlayer, RoomProblem, Submission");
  socket.disconnect();
  process.exit(0);
});

socket.on("room:cancelled", (room) => {
  console.log("🟠 HOST room cancelled:", room?.cancelledReason);
  socket.disconnect();
  process.exit(0);
});

socket.on("connect_error", (err) => {
  console.log("❌ connect_error:", err.message);
});

socket.on("error", (err) => {
  console.log("❌ socket error:", err);
});

socket.on("room:error", (msg) => console.log("❌ HOST room error:", msg));
socket.on("disconnect", () => console.log("🔌 HOST disconnected"));