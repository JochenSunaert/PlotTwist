/**
 * This file defines the `handleSubmitPrompt` function, which is a Socket.IO handler
 * responsible for processing a player's submitted prompt.
 *
 * It performs the following actions:
 * 1. Validates that the room exists and the prompt is not empty.
 * 2. Ensures that only one prompt is submitted per round.
 * 3. Updates the game state to mark the prompt as submitted.
 * 4. Broadcasts the submitted prompt to all players and the host in the room.
 * 5. Initiates the answer submission phase for the current round, including starting the answer timer.
 *
 * This function is designed to be called when the 'submit-prompt' event is received from a client.
 */
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
      // Note: `startAnswerPhase` is expected to be defined and available in the scope where this function is used.
      // It's likely imported or defined within the `socket.js` file.
      startAnswerPhase(io, roomCode, gameStates, rooms); // Start the timer for answers
    } else {
      console.log(`⚠️ Prompt submission ignored: Prompt already submitted for room ${roomCode}.`);
    }
}

module.exports = { handleSubmitPrompt };