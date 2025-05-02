const { createRoom, joinRoom, handleDisconnect } = require("./rooms");
const { startGame, handleSubmitPrompt, handleSubmitAnswer } = require("./game"); // Import handleSubmitAnswer

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

    // Submit a prompt
    socket.on("submit-prompt", (data) => handleSubmitPrompt(socket, io, rooms, gameStates, data));

    // Submit an answer (Register the handler here)
    socket.on("submit-answer", (data) => handleSubmitAnswer(socket, io, rooms, gameStates, data));

    // Handle disconnects
    socket.on("disconnect", () => handleDisconnect(socket, io, rooms));
  });
};