const openai = require("./openai");

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
  startRound(io, roomCode, gameStates, 0); // Pass the round number (0 for the first round)
}

function startRound(io, roomCode, gameStates, roundNumber) {
  const gameState = gameStates[roomCode];
  const players = gameState.players;

  console.log(`🔄 Entering startRound: roundNumber=${roundNumber}, totalRounds=${players.length}`);

  if (roundNumber >= players.length) {
    console.log(`🏁 All rounds complete for room ${roomCode}. Calling endGame.`);
    endGame(io, roomCode, gameStates);
    return;
  }

  console.log(`🔄 Starting round ${roundNumber + 1} for room ${roomCode}.`);
  gameState.currentRound = roundNumber;
  gameState.promptSubmitted = false; // Reset prompt submitted state
  gameState.answers = []; // Clear answers for the new round
  gameState.prompt = ""; // Clear the current prompt

  // Notify all clients to reset UI and prepare for the new round
  io.to(roomCode).emit("round-reset", { roundNumber: roundNumber + 1 });

  // Select the prompt provider (rotate based on round number)
  const promptProvider = players[roundNumber];
  console.log(`📢 Prompt provider for round ${roundNumber + 1}: ${promptProvider.name}`);
  io.to(promptProvider.id).emit("prompt-player", { isPromptPlayer: true });
  io.to(roomCode).emit("prompt-selection", { playerName: promptProvider.name });

  // Start a timer for prompt selection
  const timerDuration = 25; // 25 seconds for prompt selection
  let timeLeft = timerDuration;

  const timerInterval = setInterval(() => {
    timeLeft -= 1;
    console.log(`⏳ Timer: ${timeLeft}s remaining for room ${roomCode}`);
    io.to(roomCode).emit("timer-update", timeLeft);

    if (timeLeft <= 0) {
      clearInterval(timerInterval);

      const gameState = gameStates[roomCode];
      if (!gameState.promptSubmitted) {
        // Assign a random prompt and emit it
        const predefinedPrompts = [
          "A notorious thief has stolen a valuable diamond from the city's museum and it's your job to either catch the thief or help them escape.",
          "A hacked satellite will crash into the city in 10 minutes.",
          "A high-tech bank is being robbed in the middle of the night.",
        ];

        const randomPrompt = predefinedPrompts[Math.floor(Math.random() * predefinedPrompts.length)];
        gameState.prompt = randomPrompt; // Save the random prompt
        io.to(roomCode).emit("prompt-submitted", { prompt: randomPrompt });
        console.log(`⏳ Timer ended: Random prompt selected for room ${roomCode}: ${randomPrompt}`);
      }

      // Clear the prompt timer before transitioning to the answer phase
      if (gameState.promptTimer) {
        clearInterval(gameState.promptTimer);
        gameState.promptTimer = null;
      }

      // Notify all clients that the prompt timer has ended
      io.to(roomCode).emit("timer-ended");

      // Transition to the answer phase
      console.log(`⏳ Starting answer phase for room ${roomCode}...`);
      startAnswerPhase(io, roomCode, gameStates, rooms);
    }
  }, 1000);

  // Store the timer reference in the game state
  gameState.promptTimer = timerInterval;
}

function endGame(io, roomCode, gameStates) {
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

  // Clean up game state
  delete gameStates[roomCode];
}

function handleSubmitPrompt(socket, io, rooms, gameStates, data) {
  const roomCode = socket.roomCode;
  const { prompt } = data;

  console.log(`📥 Received prompt submission for room ${roomCode}: "${prompt}"`);

  // Validate room existence
  if (!roomCode || !rooms[roomCode]) {
    console.log(`❌ Submit prompt failed: Room ${roomCode} not found.`);
    io.to(socket.id).emit("error", { message: "Room not found. Please try again." });
    return;
  }

  // Validate the prompt
  if (!prompt || prompt.trim() === "") {
    console.log(`❌ Submit prompt failed: Prompt is empty or invalid.`);
    io.to(socket.id).emit("error", { message: "Prompt cannot be empty. Please try again." });
    return;
  }

  try {
    const gameState = gameStates[roomCode];

    // Clear the prompt timer (if it exists)
    if (gameState.promptTimer) {
      clearInterval(gameState.promptTimer);
      gameState.promptTimer = null;
      console.log(`🛑 Cleared prompt timer for room ${roomCode}`);
    }

    // Mark the prompt as submitted in the game state
    gameState.promptSubmitted = true;

    // Save the prompt in the game state
    gameState.prompt = prompt;

    // Broadcast the prompt to all players and the host
    io.to(roomCode).emit("prompt-submitted", { prompt });
    console.log(`📜 Prompt submitted successfully for room ${roomCode}: "${prompt}"`);

    // Start the answer phase
    console.log(`⏳ Starting answer phase for room ${roomCode}...`);
    io.to(roomCode).emit("start-answer-phase");
    startAnswerPhase(io, roomCode, gameStates, rooms); // Start the timer for answers
  } catch (error) {
    console.error(`❌ An error occurred while handling prompt submission for room ${roomCode}:`, error);
    io.to(socket.id).emit("error", { message: "An unexpected error occurred. Please try again." });
  }
}

function handleRestartGame(socket, io, rooms, gameStates) {
  const roomCode = socket.roomCode;

  if (!roomCode || !rooms[roomCode]) {
    console.log(`❌ Restart game failed: Room ${roomCode} not found.`);
    io.to(socket.id).emit("error-message", "Room not found. Please try again.");
    return;
  }

  console.log(`🔄 Restarting game for room ${roomCode}.`);
  delete gameStates[roomCode]; // Clear the game state
  io.to(roomCode).emit("game-restarted"); // Notify clients that the game has been restarted
}


async function handleSubmitAnswer(socket, io, rooms, gameStates, data) {
  console.log("Data received on server:", data);

  const roomCode = socket.roomCode;
  console.log(`Room code from socket: ${roomCode}`);

  if (!roomCode || !rooms[roomCode]) {
    console.log(`❌ Submit answer failed: Room ${roomCode} not found.`);
    socket.emit("error-message", "Room not found.");
    return;
  }

  const { playerName, answer } = data;

  if (!playerName) {
    console.log("❌ Submit answer failed: playerName is not provided.");
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

  // Find the player's team from the gameState
  const player = gameState.players.find((p) => p.name === playerName);
  if (!player) {
    console.log(`❌ Submit answer failed: Player ${playerName} not found in game state.`);
    return;
  }

  const sanitizedAnswer = answer.trim() || "<No answer provided>";
  gameState.answers.push({ playerName, answer: sanitizedAnswer, team: player.team });

  console.log(`📝 Answer received from ${playerName} (Team: ${player.team}): "${sanitizedAnswer}" in room ${roomCode}`);

  io.to(roomCode).emit("player-submitted", { playerId: socket.id });

  const allPlayersAnswered = gameState.answers.length === rooms[roomCode].players.length;
  console.log(`All players answered: ${allPlayersAnswered}`);

  if (allPlayersAnswered) {
    const hostId = rooms[roomCode].hostId;
    const prompt = gameState.prompt; // Retrieve the prompt from gameState
    console.log("📜 Prompt used for story generation:", prompt);

    try {
      const story = await generateStory(prompt, gameState.answers);

      // Send the generated story to the host
      io.to(hostId).emit("story-generated", { story });
      console.log(`📖 Generated Story for room ${roomCode}: ${story}`);

      io.to(roomCode).emit("answer-phase-ended");
      console.log(`✅ All players submitted answers, story generated for room ${roomCode}`);
    } catch (error) {
      console.error("❌ Error generating or sending story:", error);
      io.to(hostId).emit("error-message", "Failed to generate story. Please try again.");
    }
  }
}

// Timer for the answer phase (to be triggered after prompt is submitted)
function startAnswerPhase(io, roomCode, gameStates, rooms) {
  const timerDuration = 35; // 35 seconds for the answer phase
  let timeLeft = timerDuration;

  const timerInterval = setInterval(() => {
    timeLeft -= 1;
    io.to(roomCode).emit("answer-timer-update", timeLeft);

    if (timeLeft <= 0) {
      clearInterval(timerInterval);

      const gameState = gameStates[roomCode];
      if (!gameState) return;

      // Notify all clients that the timer has ended
      io.to(roomCode).emit("timer-ended");
      console.log(`✅ Timer ended for answer phase in room ${roomCode}`);
    }
  }, 1000);

  // Store the timer reference in the game state (optional for cleanup or debugging)
  const gameState = gameStates[roomCode];
  if (gameState) {
    gameState.answerPhaseTimer = timerInterval;
  }
}

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
async function handleSubmitAnswer(socket, io, rooms, gameStates, data) {
  console.log("Data received on server:", data);

  const roomCode = socket.roomCode;
  console.log(`Room code from socket: ${roomCode}`);

  if (!roomCode || !rooms[roomCode]) {
    console.log(`❌ Submit answer failed: Room ${roomCode} not found.`);
    socket.emit("error-message", "Room not found.");
    return;
  }

  const { playerName, answer } = data;

  const gameState = gameStates[roomCode];
  if (!gameState) {
    console.log(`❌ Submit answer failed: Game state for room ${roomCode} not found.`);
    return;
  }

  if (!gameState.answers) {
    gameState.answers = [];
  }

  // Attempt to find the player by playerName or socket ID
  let player = gameState.players.find((p) => p.name === playerName);

  if (!player && playerName === '') {
    // If playerName is empty, find the player based on socket ID
    player = gameState.players.find((p) => p.id === socket.id);
  }

  if (!player) {
    console.log(`❌ Submit answer failed: Player not found in game state.`);
    return;
  }

  const sanitizedAnswer = answer.trim() || "<No answer provided>";
  gameState.answers.push({ playerName: player.name, answer: sanitizedAnswer, team: player.team });

  console.log(`📝 Answer received from ${player.name} (Team: ${player.team}): "${sanitizedAnswer}" in room ${roomCode}`);

  io.to(roomCode).emit("player-submitted", { playerId: socket.id });

  const allPlayersAnswered = gameState.answers.length === rooms[roomCode].players.length;
  console.log(`All players answered: ${allPlayersAnswered}`);

  if (allPlayersAnswered) {
    const hostId = rooms[roomCode].hostId;
    const prompt = gameState.prompt; // Retrieve the prompt from gameState
    console.log("📜 Prompt used for story generation:", prompt);

    try {
      const story = await generateStory(prompt, gameState.answers);
      console.log(`📖 Generated Story for room ${roomCode}: ${story}`);

      // Evaluate answers and assign points
      const evaluation = await evaluateAnswers(prompt, gameState.answers, story, gameState.players);
      console.log("🏆 Evaluation Results with Points:", evaluation);

      // Update game state with evaluated players
      gameState.players = evaluation.players;

      // Send story and evaluation results to the host
      io.to(hostId).emit("story-generated", { story });
      io.to(roomCode).emit("evaluation-results", evaluation);

      io.to(roomCode).emit("answer-phase-ended");
      console.log(`✅ All players submitted answers, story generated, and points assigned for room ${roomCode}`);
    } catch (error) {
      console.error("❌ Error generating or evaluating story:", error);
      io.to(hostId).emit("error-message", "Failed to process the round. Please try again.");
    }
  }
}
function handleStartNextRound(socket, io, rooms, gameStates, data) {
  const roomCode = socket.roomCode;
  const { round } = data;

  console.log(`📢 Received request to start round ${round} for room ${roomCode}.`);

  // Validate room existence
  if (!roomCode || !rooms[roomCode]) {
    console.log(`❌ Start next round failed: Room ${roomCode} not found.`);
    io.to(socket.id).emit("error-message", "Room not found.");
    return;
  }

  const gameState = gameStates[roomCode];

  console.log(`🛠️ Current game state for room ${roomCode}:`, {
    currentRound: gameState.currentRound,
    totalRounds: gameState.totalRounds,
    players: gameState.players.length,
  });

  // Check if the game has ended
  if (round > gameState.totalRounds) {
    console.log(`🏁 All rounds complete for room ${roomCode}. Ending game.`);
    endGame(io, roomCode, gameStates); // Trigger end game logic
    return;
  }

  // Convert 1-based round number to 0-based index for `startRound`
  const roundIndex = round - 1;

  console.log(`🔄 Starting round ${round} (index ${roundIndex}) for room ${roomCode}.`);
  startRound(io, roomCode, gameStates, roundIndex);
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