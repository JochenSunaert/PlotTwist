const { createRoom, joinRoom, handleDisconnect } = require("./rooms"); // Removed startGame from rooms
const { startGame } = require("./game"); // Import startGame from game.js

module.exports = (io) => {
  const rooms = {};      // Room data
  const gameStates = {}; // Game state data

  io.on("connection", (socket) => {
    console.log("🟢 New connection:", socket.id);

    // Host creates a room
    socket.on("create-room", () => createRoom(socket, rooms));

    // Client joins a room
    socket.on("join-room", (data) => joinRoom(socket, io, rooms, data));

    // Start the game
    socket.on("start-game", () => startGame(socket, io, rooms, gameStates));

    // Handle disconnects
    socket.on("disconnect", () => handleDisconnect(socket, io, rooms));
  });
};