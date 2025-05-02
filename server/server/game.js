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
    const timerDuration = 10; // 10 seconds
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

  // Broadcast the prompt to all players and the host
  io.to(roomCode).emit("prompt-submitted", { prompt });
  console.log(`📜 Prompt submitted for room ${roomCode}: ${prompt}`);
}
  
  module.exports = {
    startGame,
    handleSubmitPrompt,
  };