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

const rooms = {}; // { ABCD: { hostId, players: [{ id, name }] } }

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
      // If host already has a room, send an error message
      socket.emit("error-message", "You already have an active room.");
      console.log(`❌ Host ${socket.id} already has an active room.`);
      return;
    }

    // If no existing room, create a new room
    const code = generateRoomCode();
    rooms[code] = { hostId: socket.id, players: [] };
    socket.join(code);
    socket.emit("room-created", code);
    console.log(`🏠 Room ${code} created by ${socket.id}`);
  });
  

  // Client joins a room
  socket.on("join-room", ({ roomCode, name }) => {
    console.log(`📨 Received join-room for ${roomCode} from ${name}`);
    const room = rooms[roomCode];

    console.log(`📥 join-room event received from ${socket.id}`);
    console.log(`👉 name: ${name}, code: ${roomCode}`);
    console.log(`📦 rooms at join time:`, rooms);


    if (room) {
      const player = { id: socket.id, name };
      room.players.push(player);
      socket.join(roomCode);
      socket.roomCode = roomCode;
      socket.emit("joined-room", roomCode);
      io.to(roomCode).emit("players-update", room.players);
      console.log(`${name} joined room ${roomCode}`);
    } else {
      socket.emit("error-message", "Room not found.");
      console.log(`❌ Join failed. Room ${roomCode} not found.`);
    }
    console.log("📦 Current rooms:", rooms);

  });

  socket.on("disconnect", () => {
    const code = socket.roomCode;
    if (code && rooms[code]) {
      const room = rooms[code];

      if (room.hostId === socket.id) {
        // Host left → delete room
        delete rooms[code];
        io.to(code).emit("error-message", "Host left, room closed.");
        console.log(`❌ Host left, deleting room ${code}`);
      }
       else {
        // Remove player
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
