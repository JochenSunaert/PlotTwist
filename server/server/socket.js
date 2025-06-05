const { createRoom, joinRoom, handleDisconnect } = require("./rooms");
const { startGame, handleSubmitPrompt, handleSubmitAnswer, handleStartNextRound, handleRestartGame, handleContinueToResults, handleSpeechDone } = require("./game"); // Import new game functions

module.exports = (io) => {
  const rooms = {};      // Room data
  const gameStates = {}; // Game state data

  io.on("connection", (socket) => {
    console.log("🟢 New connection:", socket.id);

    // Host creates a room
    socket.on("create-room", () => createRoom(socket, rooms, io));

    // Client joins a room
    socket.on("join-room", (data) => joinRoom(socket, io, rooms, data));

    // Start the game
    socket.on("start-game", () => startGame(socket, io, rooms, gameStates));

    // Submit a prompt
    socket.on("submit-prompt", (data) => handleSubmitPrompt(socket, io, rooms, gameStates, data));

    // Restart the game
    socket.on("restart-game", () => {
      handleRestartGame(socket, io, rooms, gameStates);
    });

    // Start the next round
    socket.on("start-next-round", (data) => {
      handleStartNextRound(socket, io, rooms, gameStates, data);
    });

    // Submit an answer
    socket.on("submit-answer", (data) => {
      handleSubmitAnswer(socket, io, rooms, gameStates, data);

      // Notify the host about the player's submission
      const roomCode = socket.roomCode;
      if (roomCode && rooms[roomCode]) {
        io.to(rooms[roomCode].hostId).emit("player-submitted", { playerId: socket.id });
        console.log(`📝 Player ${socket.id} submitted their answer in room ${roomCode}`);
      }
    });

    // --- NEW EVENT LISTENERS FOR CONTINUE TO RESULTS ---

    // Host signals that speech/story narration is done
    socket.on("speech-done", () => {
      handleSpeechDone(socket, io, rooms);
    });

    // Host signals to continue to results/evaluation phase
    socket.on("continue-to-results", () => {
      handleContinueToResults(socket, io, rooms);
    });

    // --- END NEW EVENT LISTENERS ---

    // Handle disconnects
    socket.on("disconnect", () => handleDisconnect(socket, io, rooms));
  });
};