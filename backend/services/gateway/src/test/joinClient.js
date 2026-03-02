import { io } from "socket.io-client";

const TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MDk0YmI5Yi1iMDkzLTQwNjEtODljZS0yNmU3YWZhZTdhMGYiLCJlbWFpbCI6ImRpbmVzaEBnbWFpbDEyLmNvbSIsImlhdCI6MTc3MTY1MjExOCwiZXhwIjoxNzcyMjU2OTE4fQ.i_Cesps6zVpxYyt8MtzruW5S-CoyIHoCLYlvfvNCIbs"; // joiner token
const ROOM_ID = "c7d080"; // host prints this

if (!TOKEN) throw new Error("Missing TOKEN");
if (!ROOM_ID) throw new Error("Missing ROOM_ID");

const socket = io("http://localhost:5000", {
  auth: { token: TOKEN },
  transports: ["websocket"],
});

let readySent = false;

socket.on("connect", () => {
  console.log("✅ JOINER connected:", socket.id);
  socket.emit("room:join", { roomId: ROOM_ID });
});

socket.on("room:update", (room) => {
  console.log("📌 JOINER room status:", room?.status, "players:", room?.players?.length);

  // ✅ Send ready only ONCE and only if still WAITING
  if (!readySent && room?.status === "WAITING") {
    readySent = true;
    socket.emit("player:ready", { roomId: ROOM_ID, ready: true });
    console.log("✅ JOINER sent READY");
  }
});

socket.on("battle:started", (room) => {
  console.log("✅ JOINER battle started");
  console.log("Questions:", (room.questions || []).map((q) => q.title));
});

socket.on("room:cancelled", (room) => {
  console.log("🟠 JOINER cancelled:", room?.cancelledReason);
  socket.disconnect();
  process.exit(0);
});

socket.on("battle:ended", (room) => {
  console.log("🏁 JOINER battle ended. winner:", room?.winner);
  socket.disconnect();
  process.exit(0);
});

socket.on("room:error", (msg) => console.log("❌ JOINER room error:", msg));
socket.on("disconnect", () => console.log("🔌 JOINER disconnected"));