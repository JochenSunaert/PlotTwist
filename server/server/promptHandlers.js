function handleSubmitPrompt(socket, io, rooms, gameStates, data) {
    const roomCode = socket.roomCode;
    const { prompt } = data;
  
    if (!roomCode || !rooms[roomCode]) {
      console.log(`❌ Submit prompt failed: Room ${roomCode} not found.`);
      return;
    }
  
    if (!prompt || prompt.trim() === "") {
      console.log(`❌ Submit prompt failed: Prompt is empty or invalid.`);
      io.to(socket.id).emit("error", { message: "Prompt cannot be empty. Please try again." });
      return;
    }
  
    if (!gameStates[roomCode].promptSubmitted) {
      gameStates[roomCode].promptSubmitted = true;
      console.log(`✔️ Prompt submission received. Random prompt generation disabled for room ${roomCode}.`);
  
      // Broadcast the prompt to all players and the host
      io.to(roomCode).emit("prompt-submitted", { prompt });
      console.log(`📜 Prompt submitted for room ${roomCode}: ${prompt}`);
  
      io.to(roomCode).emit("start-answer-phase");
      startAnswerPhase(io, roomCode, gameStates, rooms); // Start the timer for answers
    } else {
      console.log(`⚠️ Prompt submission ignored: Prompt already submitted for room ${roomCode}.`);
    }
  }
  
  module.exports = { handleSubmitPrompt };