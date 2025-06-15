// This file, game.js, orchestrates the core logic and flow of the multiplayer game.
// It manages game states, handles player actions, interacts with the OpenAI API for story generation and evaluation, and emits game updates to all connected clients via Socket.IO.
// Every function is designed to handle specific game events, such as starting a game, submitting prompts and answers, processing results, and managing game rounds.
// these functions are fully explained in the comments below.

const openai = require("./openai");
const { startTimer } = require('./timerUtils');

// **startGame(socket, io, rooms, gameStates)**:
// - **Purpose**: Initializes and starts a new game for a specific room.
// - **Process**:
//   - Validates the room and ensures enough players are present (minimum 2).
//   - Assigns players to "Hero" or "Villain" teams randomly.
//   - Initializes the `gameStates` object for the room, including player scores, current round, and total rounds.
//   - Notifies individual players about their assigned teams.
//   - Emits a "game-started" event to all clients in the room.
//   - Calls `startRound` to begin the first round.


function startGame(socket, io, rooms, gameStates) {
  const roomCode = socket.roomCode;
  console.log(`🚀 Attempting to start game in room: ${roomCode} by socket ${socket.id}`);

  if (!roomCode || !rooms[roomCode]) {
    console.log(`❌ Start game failed: Room ${roomCode} not found.`);
    io.to(socket.id).emit("error-message", "Room not found. Please try again.");
    return;
  }

  const room = rooms[roomCode];

  if (socket.id !== room.gameStarterId && socket.id !== room.hostId) {
    console.log(`❌ Start game failed: Socket ${socket.id} is not the designated game starter or host for room ${roomCode}.`);
    io.to(socket.id).emit("error-message", "Only the designated game starter or host can start the game.");
    return;
  }

  if (!room.players || room.players.length < 2) {
    console.log(`❌ Start game failed: Not enough players in room ${roomCode}. Minimum 2 required.`);
    io.to(socket.id).emit("error-message", "Cannot start the game. At least 2 players are required.");
    return;
  }

  if (room.locked) {
    console.log(`❌ Start game failed: Game in room ${roomCode} is already locked/started.`);
    io.to(socket.id).emit("error-message", "Game has already started.");
    return;
  }

  room.locked = true;

  const shuffledPlayers = room.players.sort(() => Math.random() - 0.5);

  const half = Math.ceil(shuffledPlayers.length / 2);
  const heroTeam = shuffledPlayers.slice(0, half);
  const villainTeam = shuffledPlayers.slice(half);

  heroTeam.forEach((player) => {
    player.team = "Hero";
  });
  villainTeam.forEach((player) => {
    player.team = "Villain";
  });

  gameStates[roomCode] = {
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      team: player.team,
      score: 0,
    })),
    currentRound: 0,
    totalRounds: room.players.length,
    startedAt: Date.now(),
    promptSubmitted: false,
    answers: [],
  };
  console.log(`🛠️ Initialized game state for room ${roomCode}:`, gameStates[roomCode]);

  console.log("📢 Notifying players about their teams...");
  heroTeam.forEach((player) => {
    console.log(`➡️ Hero: ${player.name}`);
    io.to(player.id).emit("team-assigned", { team: "Hero" });
  });
  villainTeam.forEach((player) => {
    console.log(`➡️ Villain: ${player.name}`);
    io.to(player.id).emit("team-assigned", { team: "Villain" });
  });

  console.log(`📢 Game started for room ${roomCode}.`);
  io.to(roomCode).emit("game-started");

  startRound(io, roomCode, gameStates, rooms, 0);
}


// **startRound(io, roomCode, gameStates, rooms, roundNumber)**:
// - **Purpose**: Initiates a new round of the game.
// - **Process**:
//   - Resets round-specific game state (e.g., prompt, answers).
//   - Determines the current "prompt provider" player based on the `roundNumber`.
//   - Notifies the prompt player and all other players about whose turn it is to provide a prompt.
//   - Starts a timer for the prompt submission phase using `startTimer`.
//   - If the prompt provider doesn't submit a prompt within the time limit, a random predefined prompt is automatically selected.
//   - Transitions to the answer phase by calling `startAnswerPhase`.

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
  gameState.prompt = "";

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
    60,
    (timeLeft) => {
      console.log(`⏳ Timer: ${timeLeft}s remaining for room ${roomCode}`);
      io.to(roomCode).emit("timer-update", timeLeft);
    },
    () => {
      if (!gameState.promptSubmitted) {
        const predefinedPrompts = [
          "A notorious thief has stolen a valuable diamond from the city's museum and it's your job to either catch the thief or help them escape.",
          "A hacked satellite will crash into the city in 10 minutes.",
          "A high-tech bank is being robbed in the middle of the night.",
        ];
        const randomPrompt = predefinedPrompts[Math.floor(Math.random() * predefinedPrompts.length)];
        gameState.prompt = randomPrompt;
        gameState.promptSubmitted = true;
        io.to(roomCode).emit("prompt-submitted", { prompt: randomPrompt });
        console.log(`⏳ Timer ended: Random prompt selected for room ${roomCode}: ${randomPrompt}`);
      }

      io.to(roomCode).emit("start-answer-phase");
      console.log(`⏳ Starting answer phase for room ${roomCode}...`);
      startAnswerPhase(io, roomCode, gameStates, rooms);
    }
  );
}


// **endGame(io, roomCode, gameStates, rooms)**:
// - **Purpose**: Concludes the game and announces final results.
// - **Process**:
//   - Calculates final player placements based on their accumulated scores.
//   - Emits a "game-ended" event with the final placements to all clients.
//   - Unlocks the room to allow new games to be started.
//   - Cleans up the game state for the room.
function endGame(io, roomCode, gameStates, rooms) {
  console.log(`[SERVER-DEBUG] === endGame function called for room: ${roomCode} ===`);
  console.log(`🏁 endGame function called for room: ${roomCode}`);
  const gameState = gameStates[roomCode];
  const players = gameState.players;

  const placements = [...players].sort((a, b) => b.score - a.score);

  console.log(`🏁 Final placements:`, placements);

  io.to(roomCode).emit("game-ended", { placements });
  console.log(`📤 Emitted 'game-ended' event with placements:`, placements);
  console.log(`📤 Emitted 'game-ended' event for room ${roomCode}.`);
    console.log(`[SERVER-DEBUG] Emitted 'game-ended' for room ${roomCode}.`);
  if (rooms[roomCode]) {
    rooms[roomCode].locked = false;
    console.log(`🔓 Room ${roomCode} is now unlocked.`);
  }

  delete gameStates[roomCode];
}


// **handleSubmitPrompt(socket, io, rooms, gameStates, data)**:
// - **Purpose**: Handles a player's submission of a game prompt.
// - **Process**:
//   - Validates the submitted prompt (e.g., checks for empty strings).
//   - Clears the prompt timer if a valid prompt is submitted manually before the timer runs out.
//   - Stores the submitted prompt in the game state.
//   - Emits a "prompt-submitted" event to all clients.
//   - Calls `startAnswerPhase` to move to the next game phase.

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

    const trimmedPrompt = prompt.trim();

    if (trimmedPrompt === "") {
      console.log(`⚠️ Received empty prompt from player ${socket.id}. Timer will auto-select if no valid prompt arrives.`);
      io.to(socket.id).emit("error-message", "Prompt cannot be empty. A random one will be chosen if time runs out.");
      return;
    }

    if (gameState.promptTimer) {
      clearInterval(gameState.promptTimer);
      gameState.promptTimer = null;
      console.log(`🛑 Cleared prompt timer for room ${roomCode}`);
    }

    gameState.prompt = trimmedPrompt;
    gameState.promptSubmitted = true;

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

// **handleRestartGame(socket, io, rooms, gameStates)**:
// - **Purpose**: Resets the game for a given room, allowing a new game to begin from the lobby.
// - **Process**:
//   - Deletes the existing game state for the room.
//   - Unlocks the room and clears its player list.
//   - Emits a "game-restarted" event to notify clients.

function handleRestartGame(socket, io, rooms, gameStates) {
  const roomCode = socket.roomCode;

  if (!roomCode || !rooms[roomCode]) {
    console.log(`❌ Restart game failed: Room ${roomCode} not found.`);
    io.to(socket.id).emit("error-message", "Room not found. Please try again.");
    return;
  }

  console.log(`🔄 Restarting game for room ${roomCode}.`);

  delete gameStates[roomCode];
  rooms[roomCode].locked = false;
  rooms[roomCode].players = [];

  io.to(roomCode).emit("game-restarted");
  console.log(`✅ Room ${roomCode} has been reset and is open for new players.`);
}

// **handleSubmitAnswer(socket, io, rooms, gameStates, data)**:
// - **Purpose**: Processes a player's answer submission.
// - **Process**:
//   - Stores the player's answer, trimming whitespace and handling empty submissions.
//   - Updates the game state with the received answer, including the player's team.
//   - Emits a "player-submitted" event to the host to update UI.
//   - Checks if all players have submitted their answers. If so, it stops the answer phase timer and calls `processAllAnswers`.

async function handleSubmitAnswer(socket, io, rooms, gameStates, data) {
  const roomCode = socket?.roomCode || data.roomCode;
  const { playerName, answer } = data;

  console.log(`Data received on server for answer from ${playerName} in room ${roomCode}:`, data);

  if (!roomCode || !rooms[roomCode]) {
    console.log(`❌ Submit answer failed: Room ${roomCode} not found.`);
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

  const existingAnswerIndex = gameState.answers.findIndex((ans) => ans.playerName === playerName);

  let answerToStore = answer;
  if (typeof answer === 'string') {
    answerToStore = answer.trim();

    if (answerToStore === "" && data.answer !== "<No answer provided>") {
      answerToStore = "";
    }
  } else {
    answerToStore = "<No answer provided>";
  }

  if (existingAnswerIndex !== -1) {
    gameState.answers[existingAnswerIndex].answer = answerToStore;
    console.log(`📝 Answer updated for ${playerName} (Team: ${gameState.answers[existingAnswerIndex].team}): "${answerToStore}" in room ${roomCode}`);
  } else {
    const player = gameState.players.find((p) => p.name === playerName);
    if (!player) {
      console.log(`❌ Submit answer failed: Player ${playerName} not found in game state.`);
      return;
    }
    gameState.answers.push({ playerName, answer: answerToStore, team: player.team });
    console.log(`📝 Answer received from ${playerName} (Team: ${player.team}): "${answerToStore}" in room ${roomCode}`);
  }

  io.to(roomCode).emit("player-submitted", { playerName: playerName });

  const allPlayersAnswered = gameState.answers.length === rooms[roomCode].players.length;
  console.log(`All players answered: ${allPlayersAnswered} (Current answers: ${gameState.answers.length} / Total players: ${rooms[roomCode].players.length})`);

  if (allPlayersAnswered && gameState.answerPhaseTimer) {
    clearInterval(gameState.answerPhaseTimer);
    gameState.answerPhaseTimer = null;
    console.log(`✅ All players submitted manually. Cleared answer phase timer for room ${roomCode}. Processing answers.`);
    io.to(roomCode).emit("answer-phase-ended", { allPlayerAnswers: gameState.answers });
    processAllAnswers(io, roomCode, gameStates, rooms);
  }
}

// **processAllAnswers(io, roomCode, gameStates, rooms)**:
// - **Purpose**: Centralized function to trigger AI processing (story generation and evaluation) after all answers are collected.
// - **Process**:
//   - Calls `generateStory` to create a narrative based on the prompt and answers.
//   - Emits the generated story to the host.
//   - Calls `evaluateAnswers` to assign points and determine winners.
//   - Updates player scores in the game state.
//   - Broadcasts the evaluation results to all clients.
async function processAllAnswers(io, roomCode, gameStates, rooms) {
  const gameState = gameStates[roomCode];
  if (!gameState) {
    console.error(`❌ Game state not found for room ${roomCode} during AI processing.`);
    return;
  }

  const hostId = rooms[roomCode].hostId;
  const prompt = gameState.prompt;
  const answers = gameState.answers;
  const players = gameState.players;

  try {
    const story = await generateStory(prompt, answers);
    console.log(`📖 Generated Story for room ${roomCode}: ${story}`);
    io.to(hostId).emit("story-generated", { story });

    const evaluation = await evaluateAnswers(prompt, answers, story, players);
    console.log("🏆 Evaluation Results:", evaluation);

    gameState.players = evaluation.players;

    io.to(roomCode).emit("evaluation-results", evaluation);

    console.log(`✅ Answers processed, story generated, and points assigned for room ${roomCode}`);
  } catch (error) {
    console.error("❌ Error during AI processing (generateStory/evaluateAnswers):", error);
    io.to(hostId).emit("error-message", "Failed to process the round. Please try again.");
  }
}


// **startAnswerPhase(io, roomCode, gameStates, rooms)**:
// - **Purpose**: Initiates the timer for the answer submission phase.
// - **Process**:
//   - Sets up a countdown timer for players to submit their answers.
//   - Emits "answer-timer-update" events to clients.
//   - When the timer ends, it identifies players who haven't submitted answers and auto-submits a default "<No answer provided>" for them.
//   - Calls `processAllAnswers` after all answers (manual or auto-submitted) are recorded.
function startAnswerPhase(io, roomCode, gameStates, rooms) {
  const timerDuration = 95;
  let timeLeft = timerDuration;

  const gameState = gameStates[roomCode];
  if (!gameState) {
    console.error(`❌ Game state not found for room ${roomCode}`);
    return;
  }

  if (gameState.answerPhaseTimer) {
    clearInterval(gameState.answerPhaseTimer);
  }
  if (!gameState.answers) {
    gameState.answers = [];
  }

  io.to(roomCode).emit("answer-timer-update", timeLeft);

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

      const playersWithoutAnswers = rooms[roomCode].players.filter(
        (player) => !gameState.answers.some((answer) => answer.playerName === player.name)
      );

      playersWithoutAnswers.forEach((player) => {
        if (!gameState.answers.some(a => a.playerName === player.name)) {
          const autoSubmission = { playerName: player.name, answer: "<No answer provided>", roomCode: roomCode };
          handleSubmitAnswer(
            { roomCode, id: 'server_auto_submission' },
            io,
            rooms,
            gameStates,
            autoSubmission
          );
        }
      });

      setTimeout(() => {
        const allPlayersAnsweredAfterFallback = gameState.answers.length === rooms[roomCode].players.length;
        console.log(`All players answered (after timer auto-submission check): ${allPlayersAnsweredAfterFallback}`);

        io.to(roomCode).emit("answer-phase-ended", { allPlayerAnswers: gameState.answers });

        if (allPlayersAnsweredAfterFallback) {
          processAllAnswers(io, roomCode, gameStates, rooms);
        } else {
          console.error(`🔴 Critical: Not all players have answers even after timer and auto-submission. Remaining: ${rooms[roomCode].players.length - gameState.answers.length}`);
        }
      }, 50);
    }
  }, 1000);
}


// **handleSpeechDone(socket, io, rooms)**:
// - **Purpose**: Notifies the server that the host's story narration (TTS) is complete.
// - **Process**:
//   - Validates that the event is emitted by the designated host.
//   - Updates the server-side `room.isSpeechDone` state to true.
//   - Broadcasts a "speech-done" event to all clients in the room.
function handleSpeechDone(socket, io, rooms) {
  const roomCode = socket.roomCode;
  const room = rooms[roomCode];

  if (!room) {
    console.warn(`Room ${roomCode} not found for speech-done signal from ${socket.id}`);
    return;
  }

  if (room && socket.id === room.hostId) {
    room.isSpeechDone = true;

    console.log(`Host ${socket.id} in room ${roomCode} reports speech is done. Broadcasting to all clients.`);
    io.to(roomCode).emit("speech-done");
  } else {
    console.warn(`Non-host ${socket.id} tried to emit 'speech-done' in room ${roomCode}. Ignoring.`);
  }
}


// **handleContinueToResults(socket, io, rooms)**:
// - **Purpose**: Allows the host to manually advance the game from the story phase to the evaluation phase once narration is complete.
// - **Process**:
//   - Validates that the request comes from the host and that story narration is indeed marked as complete (`room.isSpeechDone`).
//   - Updates the server's `room.gamePhase` and resets `isSpeechDone` for future use.
//   - Broadcasts a "proceed-to-evaluation" event to all clients, prompting them to transition their UI.

function handleContinueToResults(socket, io, rooms) {
  const roomCode = socket.roomCode;
  const room = rooms[roomCode];

  if (!roomCode || !room) {
    console.warn(`❌ Continue to results failed: Room ${roomCode} not found for socket ${socket.id}.`);
    socket.emit("error-message", "Room not found.");
    return;
  }

  if (!room.isSpeechDone) {
    console.warn(`❌ Continue to results failed: Speech is not done in room ${roomCode}.`);
    socket.emit("error-message", "Story narration must be complete before continuing.");
    return;
  }

  room.gamePhase = "evaluation";

  room.isSpeechDone = false;

  console.log(`Host ${socket.id} in room ${roomCode} clicked "Continue to Results". Broadcasting proceed to evaluation.`);
  io.to(roomCode).emit("proceed-to-evaluation");
}

// **generateStory(prompt, responses)**:
// - **Purpose**: Communicates with the OpenAI API to generate a creative story.
// - **Process**:
//   - Constructs a detailed prompt for OpenAI, including the game's main prompt, all player responses, and their assigned teams (Hero/Villain).
//   - Specifies rules for the AI, such as strict adherence to player roles, inclusion of a plot twist (without explicit mention), character actions, and handling of missing answers.
//   - Ensures the story concludes with a clear winning team.
//   - Returns the AI-generated story text.
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


// **evaluateAnswers(prompt, responses, story, players)**:
// - **Purpose**: Uses the OpenAI API to evaluate player contributions and assign points.
// - **Process**:
//   - Creates a prompt for OpenAI, providing the original game prompt, player responses, the generated story, and team information.
//   - Asks OpenAI to determine the winning team, most impactful player, and most original player based on the story and roles.
//   - Parses the JSON response from OpenAI.
//   - Assigns points to players based on the evaluation results (e.g., points for winning team, impactful answer, original answer).
//   - Returns the evaluation results along with the updated player scores.
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

    players.forEach((player) => {
      if (player.team === result.winningTeam) {
        player.score += 1;
      }
      if (player.name === result.impactfulPlayer) {
        player.score += 1;
      }
      if (player.name === result.originalPlayer) {
        player.score += 1;
      }
    });

    return {
      ...result,
      players,
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


function handleStartNextRound(socket, io, rooms, gameStates, data) {
    const roomCode = socket.roomCode;
    const gameState = gameStates[roomCode];

    if (!gameState) {
        console.error(`❌ handleStartNextRound: No game state found for room ${roomCode}.`);
        io.to(socket.id).emit("error-message", "Game state not found. Cannot start the next round.");
        return;
    }

    const nextRound = gameState.currentRound + 1;

    console.log(`[SERVER-DEBUG] Received 'start-next-round' for room: ${roomCode}`);
    console.log(`[SERVER-DEBUG] Current Round: ${gameState.currentRound}, Next Round calculated: ${nextRound}, Total Rounds: ${gameState.totalRounds}`);


    if (nextRound >= gameState.totalRounds) {
        console.log(`[SERVER-DEBUG] Condition met: nextRound (<span class="math-inline">\{nextRound\}\) \>\= totalRounds \(</span>{gameState.totalRounds}). Ending game.`);
        endGame(io, roomCode, gameStates, rooms);
        return;
    }

    console.log(`[SERVER-DEBUG] Condition NOT met. Starting round ${nextRound + 1} (index ${nextRound}) for room ${roomCode}.`);
    startRound(io, roomCode, gameStates, rooms, nextRound);
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
  endGame,
  handleSpeechDone,
  handleContinueToResults,
};