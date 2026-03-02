import { io } from "socket.io-client";

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NGUzYWZkZi04MWMzLTRmMWUtYWNiOS03MmQwMGY4NTFhMTgiLCJlbWFpbCI6ImRpbmVzaEBnbWFpbC5jb20iLCJpYXQiOjE3NzE1OTM0NDgsImV4cCI6MTc3MjE5ODI0OH0.43ugguZVxL1rQkOt_ufgn61T3xpDqC1ZkOxkm7aag80";

const socket = io("http://localhost:5000", {
  auth: { token },
  transports: ["websocket"],
});

socket.on("connect", () => {
  console.log("✅ connected:", socket.id);

  // 1) Create room
  socket.emit("room:create", {
    topic: "arrays",
    questionCount: 3,
    timerSeconds: 120,
    maxPlayers: 2,
  });
});

socket.on("room:created", (room) => {
  console.log("✅ room created:", room.roomId);

  const roomId = room.roomId;

  // 2) Mark ready
  socket.emit("player:ready", { roomId, ready: true });

  // 3) Manual start (instead of waiting 2 mins)
  setTimeout(() => {
    socket.emit("battle:start", { roomId });
  }, 1000);
});

socket.on("battle:started", async (room) => {
  console.log("✅ battle started");
  console.log("Questions:", room.questions.map((q) => q.title));

  const roomId = room.roomId;
  const first = room.questions[0];

  // ✅ submit correct code depending on which problem came first
  // For testing quickly: force first question to be Two Sum OR just test one known problemId.

  // Example Two Sum JS solution (works with your input format)
  const twoSumJS = `
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

  console.log("Submitting for:", first.id, first.title);

  socket.emit("submit:code", {
    roomId,
    problemId: first.id,
    language_id: 63, // JS
    source_code: twoSumJS, // if first problem isn't Two Sum, it will fail (expected)
  });
});

socket.on("submit:result", (data) => {
  console.log("✅ submit result:");
  console.log(JSON.stringify(data, null, 2));
});

socket.on("room:update", (room) => {
  console.log("📌 room update scores:", room.scores);
});

socket.on("leaderboard:update", (data) => {
  console.log("📌 leaderboard update:", data);
});

socket.on("room:error", (msg) => {
  console.log("❌ room error:", msg);
});

socket.on("disconnect", () => {
  console.log("🔌 disconnected");
});