function startGame(socket, io, rooms, gameStates) {
    const roomCode = socket.roomCode;
    console.log(`🚀 Starting game... RoomCode: ${roomCode}`);
  
    if (!roomCode || !rooms[roomCode]) {
      console.log(`❌ Start game failed: Room ${roomCode} not found.`);
      return;
    }
  
    const room = rooms[roomCode];
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
    };
  
    // Notify players about their teams
    heroTeam.forEach((player) => {
      io.to(player.id).emit("team-assigned", { team: "Hero" });
    });
    villainTeam.forEach((player) => {
      io.to(player.id).emit("team-assigned", { team: "Villain" });
    });
  
    // Select a random player to choose the prompt
    const randomPlayer = room.players[Math.floor(Math.random() * room.players.length)];
    io.to(roomCode).emit("prompt-selection", { playerId: randomPlayer.id, playerName: randomPlayer.name });
  
    // Notify the host and players about the game starting
    io.to(roomCode).emit("game-started");
    console.log(`🎮 Game started in room ${roomCode}`);
  }
  
  function handleSubmitPrompt(socket, io, rooms, data) {
    const roomCode = socket.roomCode;
    const { prompt } = data;
  
    if (!roomCode || !rooms[roomCode]) {
      console.log(`❌ Submit prompt failed: Room ${roomCode} not found.`);
      return;
    }
  
    // Broadcast the prompt to all players and the host
    io.to(roomCode).emit("prompt-submitted", { prompt });
    console.log(`📜 Prompt submitted for room ${roomCode}: ${prompt}`);
  }
  
  module.exports = {
    startGame,
    handleSubmitPrompt,
  };