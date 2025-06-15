// This file sets up the backend server for the Plot Twist game.
// It uses Express to create an HTTP server and Socket.IO for real-time, bidirectional
// communication between the server and game clients.
// The server handles game logic through registered Socket.IO handlers and provides
// a basic endpoint for simulating game termination (primarily for testing/development).

require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const registerSocketHandlers = require("./socket");

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

// Register socket.io handlers
registerSocketHandlers(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

app.post("/simulate-end-game", (req, res) => {
  const { roomCode } = req.body;
  if (!gameStates[roomCode]) {
    return res.status(404).send("Room not found");
  }

  console.log(`🛠️ Simulating end game for room ${roomCode}`);
  endGame(io, roomCode, gameStates);
  res.send("Game ended");
});