// rooms.js

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

    // Re-send game starter status to the host if they are still the game starter
    if (existingRoom.gameStarterId === socket.id) {
      socket.emit("is-game-starter", { isGameStarter: true });
      console.log(`[Host] Rejoined room ${existingRoomCode}. Host ${socket.id} is game starter.`);
    } else {
      socket.emit("is-game-starter", { isGameStarter: false });
      console.log(`[Host] Rejoined room ${existingRoomCode}. Host ${socket.id} is NOT game starter.`);
    }

    console.log(`🔁 Host ${socket.id} rejoined existing room ${existingRoomCode}`);
    return;
  }

  // Otherwise create new room
  const code = generateRoomCode(rooms);
  rooms[code] = {
    hostId: socket.id,
    players: [],
    locked: false,
    gameStarterId: socket.id, // Host is the initial game starter
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

    // Check if this is the first player joining the room (after host)
    // or if the previous game starter left and no one else is assigned.
    // If room.gameStarterId is the host, and this is the first *client* player,
    // we might want to make this client the game starter, or keep the host.
    // For "first player to having joined the room to be able to start the lobby",
    // this implies the *first client* to join, not necessarily the host.
    // Let's refine this to: if the room has players, the first player in `room.players` array
    // is the game starter among players. If no players, the host is the game starter.

    // If there are no players yet AND the host is *not* already the game starter
    // or if we explicitly want the first *client* player to be game starter:
    // For your request "the first player to having joined the room to be able to start the lobby"
    // implies a client, not necessarily the host.
    if (room.players.length === 0 && room.hostId !== socket.id) { // This means this is the first client player
      room.gameStarterId = socket.id;
      console.log(`⭐ Player ${socket.id} (${name}) is the new game starter for room ${roomCode}`);
    } else if (room.gameStarterId === room.hostId && room.players.length === 0) {
      // If host is the game starter, and this is the first player,
      // decide if you want the host to remain the starter or switch to this player.
      // For this scenario, let's keep host as starter, and first player can be starter too.
      // This is a design decision. For simplicity, let's keep the host as primary,
      // and if the host starts, it uses hostId. If a player starts, it uses gameStarterId.
      // Let's ensure 'gameStarterId' is always *some* player or host.
      // The current logic in createRoom sets hostId.
      // The logic in handleDisconnect re-assigns it.
      // Let's simplify: the gameStarterId is assigned at creation, and if the starter leaves, it's reassigned.
      // For this `joinRoom` scenario: if the *joining player* is the new host (rejoining a room), they become game starter.
      // Or, if no current 'gameStarterId' is set, assign the first player.
      if (!room.gameStarterId) {
          room.gameStarterId = socket.id;
          console.log(`⭐ No game starter found, new player ${socket.id} (${name}) is the game starter for room ${roomCode}`);
      }
    }


    room.players.push(player); // Add player to the room
    console.log(`✅ Player added to room:`, player); // Debug log

    socket.join(roomCode);

    socket.emit("joined-room", roomCode);
    io.to(roomCode).emit("players-update", room.players);

    // Crucial: Tell the joining client if THEY are the game starter.
    const isThisSocketGameStarter = (socket.id === room.gameStarterId) || (socket.id === room.hostId);
    socket.emit("is-game-starter", { isGameStarter: isThisSocketGameStarter });
    console.log(`[JoinRoom] Socket ${socket.id} (${name}) joined room ${roomCode}. isGameStarter: ${isThisSocketGameStarter} (gameStarterId: ${room.gameStarterId}, hostId: ${room.hostId})`);

    // Also update all *other* players in the room about the new game starter status,
    // in case a previous game starter left and a new one was assigned, or if roles changed.
    // This is especially important for the previous game starter if they are no longer.
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
      // (e.g., if the former game starter left and someone else became the new one)
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
  handleDisconnect, // Ensure this is exported
};