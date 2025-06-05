// rooms.js - Simplified, removing 'is-host' specific logic

const { generateRoomCode } = require("./utils");


function createRoom(socket, rooms, io) {
  const existingRoomCode = Object.keys(rooms).find(
    (code) => rooms[code].hostId === socket.id
  );
  const existingRoom = existingRoomCode ? rooms[existingRoomCode] : null;

  if (existingRoom) {
    // Rejoin existing room
    socket.roomCode = existingRoomCode;
    socket.join(existingRoomCode);

    // Notify frontend that the room exists
    socket.emit("room-created", existingRoomCode);

    // Refresh player list for host
    io.to(existingRoomCode).emit("players-update", existingRoom.players);

    // Re-send game starter status to the host (who is always the game starter if they created it)
    socket.emit("is-game-starter", { isGameStarter: true });
    console.log(`[Host] Rejoined room ${existingRoomCode}. Host ${socket.id} is game starter.`);

    console.log(`🔁 Host ${socket.id} rejoined existing room ${existingRoomCode}`);
    return;
  }


  const code = generateRoomCode(rooms);
  rooms[code] = {
    hostId: socket.id,
    players: [],
    locked: false,
    gameStarterId: socket.id, // Host is the initial game starter
    // --- ADD THESE NEW PROPERTIES ---
    isSpeechDone: false, // Initialize speech status for the room
    gamePhase: "lobby",  // Initialize the game phase for the room
    // -------------------------------
  };
  socket.roomCode = code;
  socket.join(code);
  socket.emit("room-created", code);
  socket.emit("is-game-starter", { isGameStarter: true }); // Host is always game starter initially
  console.log(`🏠 Room ${code} created by ${socket.id}. Host ${socket.id} is initial game starter.`);
}



  function joinRoom(socket, io, rooms, { roomCode, name }) {
    console.log(`📥 join-room event received from ${socket.id}`);
    console.log(`👉 name: ${name}, code: ${roomCode}`);

    const room = rooms[roomCode];

    if (!room) {
      socket.emit("error-message", "Room not found.");
      console.log(`❌ Join failed. Room ${roomCode} not found.`);
      socket.emit("is-game-starter", { isGameStarter: false }); // Ensure false if room not found
      return;
    }

    if (room.locked) {
      socket.emit("error-message", "Game already started, cannot join.");
      console.log(`❌ Join failed. Room ${roomCode} is locked.`);
      socket.emit("is-game-starter", { isGameStarter: false }); // Ensure false if locked
      return;
    }

    if (room.players.length >= 8) {
      socket.emit("error-message", "Room is full.");
      console.log(`❌ Join failed. Room ${roomCode} is full.`);
      socket.emit("is-game-starter", { isGameStarter: false }); // Ensure false if full
      return;
    }

  const nameExists = room.players.some(player => player.name.toLowerCase() === name.toLowerCase());
  if (nameExists) {
    socket.emit("error-message", "That name is already taken in this room.");
    console.log(`❌ Join failed. Name "${name}" is already taken in room ${roomCode}.`);
    socket.emit("is-game-starter", { isGameStarter: false }); // Ensure false if name taken
    return;
  }


    socket.roomCode = roomCode; // Assign the room code to the socket
    console.log(`Room code assigned to socket ${socket.id}: ${roomCode}`); // Debug log

    const player = { id: socket.id, name };

    // Logic to determine gameStarterId for the first *client* player (if host isn't already starter)
    // This part ensures that if a client joins an empty room or a room with only the host,
    // and the host *isn't* currently the game starter, the client becomes the game starter.
    // If the host is always the game starter (as per your `createRoom` logic), this block
    // will primarily handle reassignment if a starter leaves.
    if (!room.gameStarterId || (room.gameStarterId === room.hostId && room.players.length === 0 && socket.id !== room.hostId)) {
        room.gameStarterId = socket.id;
        console.log(`⭐ Player ${socket.id} (${name}) is the new game starter for room ${roomCode}`);
    }


    room.players.push(player); // Add player to the room
    console.log(`✅ Player added to room:`, player); // Debug log

    socket.join(roomCode);

    socket.emit("joined-room", roomCode);
    io.to(roomCode).emit("players-update", room.players);

    // Crucial: Tell the joining client if THEY are the game starter.
    // The game starter is either the `room.gameStarterId` OR the host.
    const isThisSocketGameStarter = (socket.id === room.gameStarterId) || (socket.id === room.hostId);
    socket.emit("is-game-starter", { isGameStarter: isThisSocketGameStarter });
    console.log(`[JoinRoom] Socket ${socket.id} (${name}) joined room ${roomCode}. isGameStarter: ${isThisSocketGameStarter} (gameStarterId: ${room.gameStarterId}, hostId: ${room.hostId})`);


    // Also update all *other* players in the room about the new game starter status,
    // in case a previous game starter left and a new one was assigned, or if roles changed.
    room.players.forEach(p => {
      const isPlayerGameStarter = (p.id === room.gameStarterId) || (p.id === room.hostId);
      io.to(p.id).emit("is-game-starter", { isGameStarter: isPlayerGameStarter });
    });


    console.log(`${name} joined room ${roomCode}`);
  }


function handleDisconnect(socket, io, rooms) {
  const roomCode = socket.roomCode;
  if (roomCode && rooms[roomCode]) {
    const room = rooms[roomCode];

    if (room.hostId === socket.id) {
      // Host left
      delete rooms[roomCode];
      io.to(roomCode).emit("error-message", "Host left, room closed.");
      console.log(`❌ Host left, deleting room ${roomCode}`);
      // When host leaves, everyone is no longer game starter
      io.to(roomCode).emit("is-game-starter", { isGameStarter: false });
    } else {
      // Player left
      room.players = room.players.filter((p) => p.id !== socket.id);
      console.log(`🔴 Player ${socket.id} left room ${roomCode}. Remaining players:`, room.players.map(p => p.name));

      // If the disconnected socket was the game starter, reassign
      if (room.gameStarterId === socket.id) {
        if (room.hostId && io.sockets.sockets.get(room.hostId)) { // If host is still connected
          room.gameStarterId = room.hostId;
          io.to(room.hostId).emit("is-game-starter", { isGameStarter: true });
          console.log(`🔄 New game starter assigned for room ${roomCode}: Host ${room.hostId}`);
        } else if (room.players.length > 0) {
          room.gameStarterId = room.players[0].id; // Assign to the next player
          io.to(room.gameStarterId).emit("is-game-starter", { isGameStarter: true });
          console.log(`🔄 New game starter assigned for room ${roomCode}: ${room.players[0].name} (${room.gameStarterId})`);
        } else {
          room.gameStarterId = null; // No one left to be game starter
          console.log(`No players or host left to be game starter in room ${roomCode}.`);
        }
      }

      io.to(roomCode).emit("players-update", room.players);

      // Re-emit game starter status to all remaining players in case someone's status changed
      room.players.forEach(p => {
          const isPlayerGameStarter = (p.id === room.gameStarterId) || (p.id === room.hostId);
          io.to(p.id).emit("is-game-starter", { isGameStarter: isPlayerGameStarter });
      });
      if (room.hostId && io.sockets.sockets.get(room.hostId)) { // Also notify host if they are still there
        const isHostGameStarter = (room.hostId === room.gameStarterId) || (room.hostId === room.hostId); // Host is always host
        io.to(room.hostId).emit("is-game-starter", { isGameStarter: isHostGameStarter });
      }

    }
  }
}


module.exports = {
  createRoom,
  joinRoom,
  handleDisconnect,
};