require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const rooms = {};      // { ABCD: { hostId, players: [{ id, name }], locked: false } }
const gameStates = {}; // { ABCD: { players: [{ id, name, team, score }], currentRound, startedAt } }

function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
  } while (rooms[code]); // ensure unique
  return code;
}

io.on("connection", (socket) => {
  console.log("🟢 New connection:", socket.id);

  // Host creates a room
  socket.on("create-room", () => {
    const existingRoom = Object.values(rooms).find((room) => room.hostId === socket.id);
  
    if (existingRoom) {
      socket.emit("error-message", "You already have an active room.");
      console.log(`❌ Host ${socket.id} already has an active room.`);
      return;
    }
  
    const code = generateRoomCode();
    rooms[code] = {
      hostId: socket.id,
      players: [],
      locked: false,
    };
    socket.roomCode = code; // 🔥 Assign roomCode to the host's socket
    socket.join(code);
    socket.emit("room-created", code);
    console.log(`🏠 Room ${code} created by ${socket.id}`);
  });

  // Client joins a room
  socket.on("join-room", ({ roomCode, name }) => {
    console.log(`📥 join-room event received from ${socket.id}`);
    console.log(`👉 name: ${name}, code: ${roomCode}`);
  
    const room = rooms[roomCode];
  
    console.log(`📦 rooms at join time:`, rooms);
  
    if (!room) {
      socket.emit("error-message", "Room not found.");
      console.log(`❌ Join failed. Room ${roomCode} not found.`);
      return;
    }
  
    if (room.locked) {
      socket.emit("error-message", "Game already started, cannot join.");
      console.log(`❌ Join failed. Room ${roomCode} is locked.`);
      return;
    }
  
    if (room.players.length >= 8) {
      socket.emit("error-message", "Room is full.");
      console.log(`❌ Join failed. Room ${roomCode} is full.`);
      return;
    }
  
    socket.roomCode = roomCode;
    console.log(`Assigned roomCode ${roomCode} to socket ${socket.id}`);
  
    const player = { id: socket.id, name };
    room.players.push(player);
    socket.join(roomCode);
  
    socket.emit("joined-room", roomCode);
    io.to(roomCode).emit("players-update", room.players);
    console.log(`${name} joined room ${roomCode}`);
    console.log("📦 Current rooms:", rooms);
  });
  
  socket.on("start-game", () => {
    const roomCode = socket.roomCode; // Use socket.roomCode directly
    console.log(`🚀 Starting game... RoomCode: ${roomCode}`);
  
    if (!roomCode || !rooms[roomCode]) {
      console.log(`❌ Start game failed: Room ${roomCode} not found.`);
      return;
    }
  
    const room = rooms[roomCode];
    room.locked = true;
  
    // Save players into gameStates
    gameStates[roomCode] = {
      players: room.players.map((player) => ({
        id: player.id,
        name: player.name,
        team: null, // assign later
        score: 0,
      })),
      currentRound: 0,
      startedAt: Date.now(),
    };
  
    io.to(roomCode).emit("game-started");
    console.log(`🎮 Game started in room ${roomCode}`);
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    const code = socket.roomCode;
    if (code && rooms[code]) {
      const room = rooms[code];

      if (room.hostId === socket.id) {
        // Host left
        delete rooms[code];
        io.to(code).emit("error-message", "Host left, room closed.");
        console.log(`❌ Host left, deleting room ${code}`);
      } else {
        // Player left
        room.players = room.players.filter((p) => p.id !== socket.id);
        io.to(code).emit("players-update", room.players);
        console.log(`🔴 Player left room ${code}`);
      }
      console.log("📦 Current rooms:", rooms);
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
