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
    currentRound: 0,
    startedAt: Date.now(),
    promptSubmitted: false, // Track if a prompt has been submitted
    answers: [], // Add an empty answers array
  };

  // Notify players about their teams
  heroTeam.forEach((player) => {
    io.to(player.id).emit("team-assigned", { team: "Hero" });
  });
  villainTeam.forEach((player) => {
    io.to(player.id).emit("team-assigned", { team: "Villain" });
  });

  // Predefined prompts
  const predefinedPrompts = [
    "A notorious thief has stolen a valuable diamond from the city's museum and it's your job to either catch the thief or help them escape.",
    "A hacked satellite will crash into the city in 10 minutes.",
    "A high-tech bank is being robbed in the middle of the night.",
  ];

  // Start a timer for prompt selection
  const timerDuration = 25; // 10 seconds
  let timeLeft = timerDuration;
  const timerInterval = setInterval(() => {
    timeLeft -= 1;
    io.to(roomCode).emit("timer-update", timeLeft);

    if (timeLeft <= 0) {
      clearInterval(timerInterval);

      // Check if a prompt was submitted
      if (!gameStates[roomCode].promptSubmitted) {
        // Pick a random predefined prompt
        const randomPrompt = predefinedPrompts[Math.floor(Math.random() * predefinedPrompts.length)];
        gameStates[roomCode].prompt = randomPrompt; // Save the random prompt
        io.to(roomCode).emit("prompt-submitted", { prompt: randomPrompt });
        console.log(`⏳ Timer ended: Random prompt selected for room ${roomCode}: ${randomPrompt}`);
      }

      io.to(roomCode).emit("timer-ended");
    }
  }, 1000);

  // Select a random player to choose the prompt (only if there are players)
  const randomPlayer = room.players[Math.floor(Math.random() * room.players.length)];
  io.to(roomCode).emit("prompt-selection", { playerId: randomPlayer.id, playerName: randomPlayer.name });

  // Notify the host and players about the game starting
  io.to(roomCode).emit("game-started");
  console.log(`🎮 Game started in room ${roomCode}`);
}

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

  // Mark the prompt as submitted in the gameStates
  gameStates[roomCode].promptSubmitted = true;

  // Save the prompt in the game state
  gameStates[roomCode].prompt = prompt;

  // Broadcast the prompt to all players and the host
  io.to(roomCode).emit("prompt-submitted", { prompt });
  console.log(`📜 Prompt submitted for room ${roomCode}: ${prompt}`);

  io.to(roomCode).emit("start-answer-phase");
  startAnswerPhase(io, roomCode, gameStates, rooms); // Start the timer for answers
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
  const timerDuration = 35; // 15 seconds for the answer phase
  let timeLeft = timerDuration;

  const timerInterval = setInterval(() => {
    timeLeft -= 1;
    io.to(roomCode).emit("answer-timer-update", timeLeft);

    if (timeLeft <= 0) {
      clearInterval(timerInterval);

      const gameState = gameStates[roomCode];
      if (gameState) {
        const hostId = rooms[roomCode].hostId;
        const answers = gameState.answers || [];

        // Log all collected answers
        answers.forEach(({ playerName, answer }) => {
          console.log(`📝 Answer received from ${playerName}: "${answer}" in room ${roomCode}`);
        });

        // Send answers to the host and end the answer phase
        io.to(hostId).emit("answers-collected", { answers });
        io.to(roomCode).emit("answer-phase-ended");
        console.log(`✅ Timer ended for answer phase in room ${roomCode}`);
      }
    }
  }, 1000);
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

module.exports = {
  startGame,
  handleSubmitPrompt,
  handleSubmitAnswer,
  startAnswerPhase,
  generateStory,
  evaluateAnswers,
};