// gameEvents.js

const openai = require("./openai");
const { startTimer } = require('./timerUtils');


// ############################### STARTING GAME ###############################
// This function starts the game for a given room and initializes the game state.

function startGame(socket, io, rooms, gameStates) {
  const roomCode = socket.roomCode;
  console.log(`🚀 Starting game... RoomCode: ${roomCode}`);

  if (!roomCode || !rooms[roomCode]) {
    console.log(`❌ Start game failed: Room ${roomCode} not found.`);
    io.to(socket.id).emit("error-message", "Room not found. Please try again.");
    return;
  }

  const room = rooms[roomCode];

  // Check if there are players in the room
  if (!room.players || room.players.length === 0) {
    console.log(`❌ Start game failed: No players in room ${roomCode}.`);
    io.to(socket.id).emit("error-message", "Cannot start the game. No players in the room.");
    return;
  }
  /*speler aantal */
  if (room.players.length < 1) { // Changed from < 2, as per your code, but usually minimum 2 is required for a game. Keep your desired player count.
    console.log(`❌ Start game failed: Not enough players in room ${roomCode}. Minimum 2 required.`);
    io.to(socket.id).emit("error-message", "Cannot start the game. At least 2 players are required.");
    return;
  }

  room.locked = true;

  const shuffledPlayers = room.players.sort(() => Math.random() - 0.5);

  // Split players into teams: Hero and Villain
  const half = Math.ceil(shuffledPlayers.length / 2);
  const heroTeam = shuffledPlayers.slice(0, half);
  const villainTeam = shuffledPlayers.slice(half);

  // Assign teams to players
  heroTeam.forEach((player) => {
    player.team = "Hero";
  });
  villainTeam.forEach((player) => {
    player.team = "Villain";
  });

  // Save players into gameStates
  gameStates[roomCode] = {
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      team: player.team,
      score: 0,
    })),
    currentRound: 0, // Start with the first round
    totalRounds: room.players.length, // Total rounds equal to the number of players
    startedAt: Date.now(),
    promptSubmitted: false, // Track if a prompt has been submitted
    answers: [], // Add an empty answers array
  };
  console.log(`🛠️ Initialized game state for room ${roomCode}:`, gameStates[roomCode]);

  // Notify players about their teams
  console.log("📢 Notifying players about their teams...");
  heroTeam.forEach((player) => {
    console.log(`➡️ Hero: ${player.name}`);
    io.to(player.id).emit("team-assigned", { team: "Hero" });
  });
  villainTeam.forEach((player) => {
    console.log(`➡️ Villain: ${player.name}`);
    io.to(player.id).emit("team-assigned", { team: "Villain" });
  });

  // Emit game started event
  console.log(`📢 Game started for room ${roomCode}.`);
  io.to(roomCode).emit("game-started");

  // Start the first round
  startRound(io, roomCode, gameStates, rooms, 0); // Pass roundNumber = 0 explicitly
}

// ############################### STARTING ROUND ###############################
// This function starts a new round of the game for a given room.

function startRound(io, roomCode, gameStates, rooms, roundNumber) {
  const gameState = gameStates[roomCode];
  const players = gameState.players;

  if (typeof roundNumber !== "number" || roundNumber < 0 || roundNumber >= players.length) {
    console.error(`❌ Invalid roundNumber: ${roundNumber}. Cannot start round.`);
    io.to(roomCode).emit("error-message", "Invalid round number. Please try again.");
    return;
  }

  console.log(`🔄 Starting round ${roundNumber + 1} for room ${roomCode}.`);
  gameState.currentRound = roundNumber;
  gameState.promptSubmitted = false;
  gameState.answers = [];
  gameState.prompt = ""; // Ensure prompt is reset for the new round

  io.to(roomCode).emit("round-reset", { roundNumber: roundNumber + 1 });

  const promptProvider = players[roundNumber];
  if (!promptProvider) {
    console.error(`❌ No prompt provider found for round ${roundNumber}.`);
    io.to(roomCode).emit("error-message", "Could not find a prompt provider. Please try again.");
    return;
  }

  console.log(`📢 Prompt provider for round ${roundNumber + 1}: ${promptProvider.name}`);
  io.to(promptProvider.id).emit("prompt-player", { isPromptPlayer: true });
  io.to(roomCode).emit("prompt-selection", { playerName: promptProvider.name });

  gameState.promptTimer = startTimer(
    /*timertijd*/
    20, // Prompt timer duration
    (timeLeft) => {
      console.log(`⏳ Timer: ${timeLeft}s remaining for room ${roomCode}`);
      io.to(roomCode).emit("timer-update", timeLeft);
    },
    () => {
      // This callback fires when the prompt timer ends
      if (!gameState.promptSubmitted) {
        // If the prompt wasn't submitted manually, auto-submit a random one
        const predefinedPrompts = [
          "A notorious thief has stolen a valuable diamond from the city's museum and it's your job to either catch the thief or help them escape.",
          "A hacked satellite will crash into the city in 10 minutes.",
          "A high-tech bank is being robbed in the middle of the night.",
        ];
        const randomPrompt = predefinedPrompts[Math.floor(Math.random() * predefinedPrompts.length)];
        gameState.prompt = randomPrompt; // Save the auto-selected prompt
        gameState.promptSubmitted = true; // Mark as submitted
        io.to(roomCode).emit("prompt-submitted", { prompt: randomPrompt });
        console.log(`⏳ Timer ended: Random prompt selected for room ${roomCode}: ${randomPrompt}`);
      }

      io.to(roomCode).emit("start-answer-phase");
      console.log(`⏳ Starting answer phase for room ${roomCode}...`);
      startAnswerPhase(io, roomCode, gameStates, rooms);
    }
  );
}

// ############################### ENDING GAME ###############################
// This function ends the game for a given room and emits the final results to all players.
function endGame(io, roomCode, gameStates, rooms) {
  console.log(`🏁 endGame function called for room: ${roomCode}`);
  const gameState = gameStates[roomCode];
  const players = gameState.players;

  // Sort players by score
  const placements = [...players].sort((a, b) => b.score - a.score);

  console.log(`🏁 Final placements:`, placements);

  // Emit final placements to all players
  io.to(roomCode).emit("game-ended", { placements });
  console.log(`📤 Emitted 'game-ended' event with placements:`, placements);
  console.log(`📤 Emitted 'game-ended' event for room ${roomCode}.`);

  // Unlock the room to allow new players to join
  if (rooms[roomCode]) {
    rooms[roomCode].locked = false;
    console.log(`🔓 Room ${roomCode} is now unlocked.`);
  }

  // Clean up game state
  delete gameStates[roomCode];
}


// ############################### HANDLING PROMPT SUBMISSION ###############################
// This function handles the submission of a prompt by the prompt provider.
// game.js

// ... (other functions) ...

// ############################### HANDLING PROMPT SUBMISSION ###############################
function handleSubmitPrompt(socket, io, rooms, gameStates, data) {
    const roomCode = socket.roomCode;
    const { prompt } = data;

    console.log(`📥 Received prompt submission for room ${roomCode}: "${prompt}" (raw)`);

    if (!roomCode || !rooms[roomCode]) {
        console.log(`❌ Submit prompt failed: Room ${roomCode} not found.`);
        io.to(socket.id).emit("error", { message: "Room not found. Please try again." });
        return;
    }

    try {
        const gameState = gameStates[roomCode];

        if (gameState.promptSubmitted) {
            console.log(`⚠️ Prompt already submitted for room ${roomCode}. Ignoring duplicate submission.`);
            return;
        }

        const trimmedPrompt = prompt.trim(); // Trim whitespace from the client's prompt

        if (trimmedPrompt === "") {
            // If the submitted prompt is empty or just whitespace,
            // DO NOT mark it as submitted, and let the timer handle the fallback.
            console.log(`⚠️ Received empty prompt from player ${socket.id}. Timer will auto-select if no valid prompt arrives.`);
            // Optionally, you might want to give feedback to the player.
            io.to(socket.id).emit("error-message", "Prompt cannot be empty. A random one will be chosen if time runs out.");
            return; // Exit here, let the timer handle the actual prompt setting
        }

        // If a valid (non-empty) prompt is submitted:
        if (gameState.promptTimer) {
            clearInterval(gameState.promptTimer);
            gameState.promptTimer = null;
            console.log(`🛑 Cleared prompt timer for room ${roomCode}`);
        }

        gameState.prompt = trimmedPrompt; // Save the valid, trimmed prompt
        gameState.promptSubmitted = true; // Mark as submitted only for valid prompts

        io.to(roomCode).emit("prompt-submitted", { prompt: gameState.prompt });
        console.log(`📜 Prompt submitted successfully for room ${roomCode}: "${gameState.prompt}" (trimmed)`);

        io.to(roomCode).emit("start-answer-phase");
        console.log(`⏳ Starting answer phase for room ${roomCode}...`);
        startAnswerPhase(io, roomCode, gameStates, rooms);
    } catch (error) {
        console.error(`❌ An error occurred while handling prompt submission for room ${roomCode}:`, error);
        io.to(socket.id).emit("error", { message: "An unexpected error occurred. Please try again." });
    }
}

// ... (rest of gameEvents.js remains the same, especially handleSubmitAnswer and startAnswerPhase) ...

// ############################### HANDLING GAME RESTART ###############################
// This function handles the restart of a game for a given room.
function handleRestartGame(socket, io, rooms, gameStates) {
  const roomCode = socket.roomCode;

  if (!roomCode || !rooms[roomCode]) {
    console.log(`❌ Restart game failed: Room ${roomCode} not found.`);
    io.to(socket.id).emit("error-message", "Room not found. Please try again.");
    return;
  }

  console.log(`🔄 Restarting game for room ${roomCode}.`);

  // Reset the room's state
  delete gameStates[roomCode]; // Clear the game state
  rooms[roomCode].locked = false; // Unlock the room to allow new players to join
  rooms[roomCode].players = []; // Clear the list of players

  io.to(roomCode).emit("game-restarted"); // Notify clients that the game has been restarted
  console.log(`✅ Room ${roomCode} has been reset and is open for new players.`);
}


// ############################### HANDLING ANSWER SUBMISSION ###############################
// This function handles the submission of answers by players during the answer phase.
async function handleSubmitAnswer(socket, io, rooms, gameStates, data) {
  // roomCode can come from socket.roomCode (for manual submissions) or data.roomCode (for auto-submissions)
  const roomCode = socket.roomCode || data.roomCode;
  const { playerName, answer } = data; // 'answer' can be the actual text, empty string, or '<No answer provided>'

  console.log(`Data received on server for answer from ${playerName} in room ${roomCode}:`, data);

  if (!roomCode || !rooms[roomCode]) {
    console.log(`❌ Submit answer failed: Room ${roomCode} not found.`);
    // Only emit error if it's a client-initiated submission (socket exists)
    if (socket && socket.id) io.to(socket.id).emit("error-message", "Room not found.");
    return;
  }

  const gameState = gameStates[roomCode];
  if (!gameState) {
    console.log(`❌ Submit answer failed: Game state for room ${roomCode} not found.`);
    return;
  }

  if (!gameState.answers) {
    gameState.answers = [];
  }

  // Check if the player has already submitted to avoid duplicates
  // This is crucial to prevent the auto-submission from overwriting a manual one.
  const existingAnswer = gameState.answers.find((ans) => ans.playerName === playerName);
  if (existingAnswer) {
    console.log(`🛑 Duplicate submission detected for player ${playerName}. Ignoring.`);
    return; // Ignore duplicate submissions
  }

  // Find the player's team from the gameState
  const player = gameState.players.find((p) => p.name === playerName);
  if (!player) {
    console.log(`❌ Submit answer failed: Player ${playerName} not found in game state.`);
    // This could happen if a player leaves right before auto-submission, handle gracefully.
    return;
  }

  // --- Crucial Logic for Handling the 'answer' Value ---
  // If the client sends an empty string (meaning they typed nothing or deleted everything),
  // we want to store that as an empty string ("").
  // Only if the server is *auto-submitting* for a player who didn't send anything
  // will it send "<No answer provided>".
  let answerToStore = answer;
  if (typeof answer === 'string') {
      answerToStore = answer.trim(); // Trim whitespace from the client's answer

      // If, after trimming, it's an empty string, and it wasn't explicitly
      // sent by the server as "<No answer provided>", then store it as an empty string.
      // This handles cases where the user types spaces, or deletes their text.
      if (answerToStore === "" && data.answer !== "<No answer provided>") {
          answerToStore = ""; // Player sent an empty or whitespace-only answer
      }
      // If data.answer was "<No answer provided>", then answerToStore remains "<No answer provided>"
  } else {
      // Fallback for non-string answers, although typically 'answer' will be a string.
      answerToStore = "<No answer provided>";
  }


  gameState.answers.push({ playerName, answer: answerToStore, team: player.team });

  console.log(`📝 Answer received from ${playerName} (Team: ${player.team}): "${answerToStore}" in room ${roomCode}`);

  // Emit to the host that a player has submitted (e.g., to update UI)
  // Use playerName for auto-submissions, as socket.id might not be available or relevant.
  io.to(roomCode).emit("player-submitted", { playerName: playerName });

  const allPlayersAnswered = gameState.answers.length === rooms[roomCode].players.length;
  console.log(`All players answered: ${allPlayersAnswered} (Current answers: ${gameState.answers.length} / Total players: ${rooms[roomCode].players.length})`);


  // IMPORTANT: Trigger AI processing only when ALL players have submitted OR the timer ends.
  // The 'startAnswerPhase' function will handle this when the timer expires.
  // If all players answer *before* the timer, we need to stop the timer and trigger AI.
  if (allPlayersAnswered && gameState.answerPhaseTimer) {
      clearInterval(gameState.answerPhaseTimer); // Stop the timer if all answers are in early
      gameState.answerPhaseTimer = null;
      console.log(`✅ All players submitted manually. Cleared answer phase timer for room ${roomCode}. Processing answers.`);
      // Call the function that processes answers and generates story/evaluation
      processAllAnswers(io, roomCode, gameStates, rooms);
  }
}

// Function to centralize AI processing after answers are collected
async function processAllAnswers(io, roomCode, gameStates, rooms) {
  const gameState = gameStates[roomCode];
  if (!gameState) {
      console.error(`❌ Game state not found for room ${roomCode} during AI processing.`);
      return;
  }

  const hostId = rooms[roomCode].hostId; // Assuming hostId is stored in rooms object
  const prompt = gameState.prompt;
  const answers = gameState.answers;
  const players = gameState.players;

  try {
      const story = await generateStory(prompt, answers);
      console.log(`📖 Generated Story for room ${roomCode}: ${story}`);
      io.to(hostId).emit("story-generated", { story });

      const evaluation = await evaluateAnswers(prompt, answers, story, players);
      console.log("🏆 Evaluation Results:", evaluation);

      // Update game state with evaluated players' scores
      gameState.players = evaluation.players;

      // Broadcast evaluation results to all clients
      io.to(roomCode).emit("evaluation-results", evaluation);

      // Notify clients that the answer phase has ended
      io.to(roomCode).emit("answer-phase-ended", { nextRoundAvailable: true });
      console.log(`✅ Answers processed, story generated, and points assigned for room ${roomCode}`);
  } catch (error) {
      console.error("❌ Error during AI processing (generateStory/evaluateAnswers):", error);
      io.to(hostId).emit("error-message", "Failed to process the round. Please try again.");
  }
}


// Timer for the answer phase (to be triggered after prompt is submitted)
// This function starts the answer phase timer and checks for player submissions.
// It emits updates to the clients and handles the end of the phase.
function startAnswerPhase(io, roomCode, gameStates, rooms) {
  /*timertijd */
  const timerDuration = 20;
  let timeLeft = timerDuration;

  const gameState = gameStates[roomCode];
  if (!gameState) {
    console.error(`❌ Game state not found for room ${roomCode}`);
    return;
  }

  // Clear any existing timer to prevent multiple timers running
  if (gameState.answerPhaseTimer) {
    clearInterval(gameState.answerPhaseTimer);
  }
  // Initialize answers array if it doesn't exist (though it should from startGame)
  if (!gameState.answers) {
    gameState.answers = [];
  }

  io.to(roomCode).emit("answer-timer-update", timeLeft); // Send initial time immediately

  // Timer logic
  gameState.answerPhaseTimer = setInterval(() => {
    timeLeft -= 1;
    io.to(roomCode).emit("answer-timer-update", timeLeft);

    if (timeLeft <= 0) {
      clearInterval(gameState.answerPhaseTimer);
      gameState.answerPhaseTimer = null;

      console.log(`✅ Timer ended for answer phase in room ${roomCode}`);

      if (!rooms[roomCode] || !rooms[roomCode].players) {
        console.log(`⚠️ Room ${roomCode} no longer exists when checking for unanswered players.`);
        return;
      }

      // Identify players who have NOT submitted an answer yet
      const playersWithoutAnswers = rooms[roomCode].players.filter(
        (player) => !gameState.answers.some((answer) => answer.playerName === player.name)
      );

      // Auto-submit "<No answer provided>" for players who haven't submitted
      // This will only happen if the client genuinely didn't send anything (even an empty string).
      playersWithoutAnswers.forEach((player) => {
        // Ensure we don't double-submit if there was a race condition
        if (!gameState.answers.some(a => a.playerName === player.name)) {
          const autoSubmission = { playerName: player.name, answer: "<No answer provided>", roomCode: roomCode };
          // Pass roomCode in data for server-side lookup in handleSubmitAnswer
          handleSubmitAnswer(
            { roomCode, id: 'server_auto_submission' }, // Mock socket for server-initiated call
            io,
            rooms,
            gameStates,
            autoSubmission
          );
        }
      });

      // After giving a brief moment for any final client-side submissions to land
      // and for the server's auto-submissions to be processed,
      // we check again if all players have answers. This ensures AI runs after all fallbacks.
      // A small timeout here can help if handleSubmitAnswer is asynchronous or if there's minor network lag.
      setTimeout(() => {
        const allPlayersAnsweredAfterFallback = gameState.answers.length === rooms[roomCode].players.length;
        console.log(`All players answered (after timer auto-submission check): ${allPlayersAnsweredAfterFallback}`);

        // If all players have answers (either manual or auto-submitted), proceed with AI processing
        if (allPlayersAnsweredAfterFallback) {
          processAllAnswers(io, roomCode, gameStates, rooms);
        } else {
          // This else block should ideally not be hit if all players are handled.
          // It's a safety net.
          console.error(`🔴 Critical: Not all players have answers even after timer and auto-submission. Remaining: ${rooms[roomCode].players.length - gameState.answers.length}`);
          io.to(roomCode).emit("answer-phase-ended", { nextRoundAvailable: true });
        }
      }, 50); // Small delay to let all handleSubmitAnswer calls finish.
    }
  }, 1000);
}

// ############################### GENERATING STORY ###############################
// This function generates a story based on the prompt and player responses using OpenAI's API.
async function generateStory(prompt, responses) {
  try {
    console.log("📤 Sending to OpenAI:");
    console.log("Responses with Teams:", responses);

    const heroes = responses.filter((r) => r.team === "Hero").map((r) => r.playerName).join(", ");
    const villains = responses.filter((r) => r.team === "Villain").map((r) => r.playerName).join(", ");

    const input = `
The game prompt is: "${prompt}"
The players responded as follows:
${responses.map((r, i) => `${i + 1}. ${r.playerName} (${r.team}): ${r.answer}`).join("\n")}

The players belong to the following teams:
- Heroes: ${heroes}
- Villains: ${villains}

Write a funny and entertaining story about what happened. Make sure:
1. Player actions strictly align with their roles as Heroes or Villains.
2. Heroes should act heroically, trying to stop Villains and protect others.
3. Villains should act villainously, trying to cause chaos or achieve their evil goals.
4. Do not contradict the player roles or assign actions that conflict with their team alignment.

Additionally:
- Include a plot twist where possible, but do not explicitly mention that there is a plot twist.
- Talk about the actions of every player, and make it interesting to read.
- Do not include magical elements or supernatural interventions. Keep it realistic.
- If a player did not provide an answer, reflect that in the story by showing them failing or dying.
- Ensure there is always a winning team by the end of the story.

Important:
- If a player's role is Hero, they must not act as a Villain.
- If a player's role is Villain, they must not act as a Hero.
- The story must end with either the Heroes or Villains winning clearly.
`;

    console.log("📜 Generated Input:", input);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: input }],
      temperature: 0.7,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("❌ Error generating story:", error);
    return "Oops! The AI assistant encountered an error while trying to create a story.";
  }
}

// ############################### EVALUATING ANSWERS ###############################
// This function evaluates the players' answers and assigns points based on their contributions to the story.

async function evaluateAnswers(prompt, responses, story, players) {
  try {
    const evaluationInput = `
    The game prompt is: "${prompt}"
    The players responded as follows:
    ${responses.map((r, i) => `${i + 1}. ${r.playerName} (${r.team}): ${r.answer}`).join("\n")}

    The players belong to the following teams:
    - Heroes: ${responses.filter(r => r.team === "Hero").map(r => r.playerName).join(", ")}
    - Villains: ${responses.filter(r => r.team === "Villain").map(r => r.playerName).join(", ")}

    The generated story is as follows:
    "${story}"

    Based on the story and responses, decide:
    1. Which TEAM (Heroes or Villains) contributed the most to the story? State the winning team.
    2. Which PLAYER had the most impactful answer, ensuring their actions align with their assigned role? State the player's name.
    3. Which PLAYER had the most original answer, ensuring their actions align with their assigned role? State the player's name.

    Provide your response in the following JSON format:
    {
      "winningTeam": "Hero" or "Villain" or "Tie",
      "impactfulPlayer": "PlayerName",
      "originalPlayer": "PlayerName"
    }
`;

    const evaluation = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: evaluationInput }],
      temperature: 0,
    });

    const result = JSON.parse(evaluation.choices[0].message.content);
    console.log("🏆 Evaluation Results:", result);

    // Assign points based on evaluation
    players.forEach((player) => {
      // Winning team points
      if (player.team === result.winningTeam) {
        player.score += 1;
      }
      // Most impactful answer
      if (player.name === result.impactfulPlayer) {
        player.score += 1;
      }
      // Most original answer
      if (player.name === result.originalPlayer) {
        player.score += 1;
      }
    });

    return {
      ...result,
      players, // Return updated players with scores
    };
  } catch (error) {
    console.error("❌ Error evaluating answers:", error);
    return {
      winningTeam: "Tie",
      impactfulPlayer: null,
      originalPlayer: null,
      players,
    };
  }
}


// ############################### HANDLING START NEXT ROUND ###############################
// This function handles the transition to the next round of the game.
function handleStartNextRound(socket, io, rooms, gameStates, data) {
  const roomCode = socket.roomCode;

  const gameState = gameStates[roomCode];

  if (!gameStates[roomCode]) {
    console.log(`⚠️ Game state for room ${roomCode} no longer exists.`);
    return;
  }

  if (!gameState) {
    console.error(`❌ No game state found for room ${roomCode}.`);
    io.to(socket.id).emit("error-message", "Game state not found. Cannot start the next round.");
    return;
  }

  const nextRound = gameState.currentRound + 1; // Increment the current round

  console.log(`📢 Received request to start round ${nextRound + 1} for room ${roomCode}.`);

  // Validate room existence
  if (!roomCode || !rooms[roomCode]) {
    console.log(`❌ Start next round failed: Room ${roomCode} not found.`);
    io.to(socket.id).emit("error-message", "Room not found.");
    return;
  }

  console.log(`🛠️ Current game state for room ${roomCode}:`, {
    currentRound: gameState.currentRound,
    totalRounds: gameState.totalRounds,
    players: gameState.players.length,
  });

  // Validate if the game has ended
  if (nextRound >= gameState.totalRounds) {
    console.log(`🏁 All rounds complete for room ${roomCode}. Ending game.`);
    endGame(io, roomCode, gameStates, rooms); // Pass `rooms` here
    return;
  }

  console.log(`🔄 Starting round ${nextRound + 1} (index ${nextRound}) for room ${roomCode}.`);
  startRound(io, roomCode, gameStates, rooms, nextRound); // Properly pass `nextRound`
}

module.exports = {
  startGame,
  handleSubmitPrompt,
  handleSubmitAnswer,
  startAnswerPhase,
  generateStory,
  evaluateAnswers,
  handleStartNextRound,
  handleRestartGame,
  endGame
};