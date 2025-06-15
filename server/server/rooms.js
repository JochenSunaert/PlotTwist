/**
 * This file contains core functions for managing game rooms and player connections
 * in the PlotTwist game, handling the lifecycle of rooms from creation to disconnection.
 *
 * It includes handlers for:
 * - **`createRoom`**: Allows a host to create a new game room or rejoin an existing one if they were the host.
 * - **`joinRoom`**: Enables players to join an existing game room, handling validations like room existence,
 * capacity, and unique names. It also assigns teams and determines the "game starter" role.
 * - **`handleDisconnect`**: Manages cleanup when a socket disconnects, removing players from rooms,
 * deleting rooms if the host leaves, and reassigning the "game starter" role if needed.
 *
 * These functions interact directly with the `rooms` object (representing current game states)
 * and use the `socket.io` instance (`io`) to emit events to clients.
 */

const { generateRoomCode } = require("./utils"); // Utility to generate unique room codes

/**
 * Handles the creation of a new game room by a host.
 * If the host already created a room and disconnected/reconnected, they will rejoin their existing room.
 *
 * @param {Socket} socket The Socket.IO socket object for the host.
 * @param {Object} rooms A dictionary holding all active room states (e.g., { roomCode: { hostId, players, ... } }).
 * @param {Server} io The Socket.IO server instance.
 */
function createRoom(socket, rooms, io) {
  // Check if the current socket (potential host) already has an existing room
  const existingRoomCode = Object.keys(rooms).find(
    (code) => rooms[code].hostId === socket.id
  );
  const existingRoom = existingRoomCode ? rooms[existingRoomCode] : null;

  if (existingRoom) {
    // If an existing room is found, the host rejoins it
    socket.roomCode = existingRoomCode; // Assign roomCode to socket for future reference
    socket.join(existingRoomCode); // Join the Socket.IO room

    socket.emit("room-created", existingRoomCode); // Notify host client that room exists
    io.to(existingRoomCode).emit("players-update", existingRoom.players); // Update player list for all in room
    socket.emit("is-game-starter", { isGameStarter: true }); // Confirm host's game starter status

    console.log(`[Host] Rejoined room ${existingRoomCode}. Host ${socket.id} is game starter.`);
    console.log(`🔁 Host ${socket.id} rejoined existing room ${existingRoomCode}`);
    return; // Exit function as room is rejoined
  }

  // If no existing room, generate a new unique room code
  const code = generateRoomCode(rooms);
  // Initialize the new room's state
  rooms[code] = {
    hostId: socket.id,
    players: [],
    locked: false, // Indicates if game has started (prevents new joins)
    gameStarterId: socket.id, // The host is initially the game starter
    isSpeechDone: false, // Tracks if AI story narration is complete for the round
    gamePhase: "lobby", // Current phase of the game in this room
  };
  socket.roomCode = code; // Assign the new room code to the socket
  socket.join(code); // Host joins the new Socket.IO room

  socket.emit("room-created", code); // Notify host client of the new room code
  socket.emit("is-game-starter", { isGameStarter: true }); // Confirm host's game starter status

  console.log(`🏠 Room ${code} created by ${socket.id}. Host ${socket.id} is initial game starter.`);
}

/**
 * Handles a player's request to join an existing game room.
 * It validates the room, checks for capacity and duplicate names, and adds the player.
 * It also determines and assigns the "game starter" role if a suitable candidate is found.
 *
 * @param {Socket} socket The Socket.IO socket object for the joining player.
 * @param {Server} io The Socket.IO server instance.
 * @param {Object} rooms A dictionary holding all active room states.
 * @param {Object} data The data received from the client, containing `roomCode` and `name`.
 */
function joinRoom(socket, io, rooms, { roomCode, name }) {
  console.log(`📥 join-room event received from ${socket.id}`);
  console.log(`👉 name: ${name}, code: ${roomCode}`);

  const room = rooms[roomCode];

  // --- Validation Checks ---
  if (!room) {
    socket.emit("error-message", "Room not found.");
    console.log(`❌ Join failed. Room ${roomCode} not found.`);
    socket.emit("is-game-starter", { isGameStarter: false });
    return;
  }
  if (room.locked) {
    socket.emit("error-message", "Game already started, cannot join.");
    console.log(`❌ Join failed. Room ${roomCode} is locked.`);
    socket.emit("is-game-starter", { isGameStarter: false });
    return;
  }
  if (room.players.length >= 8) { // Assuming a max of 8 players
    socket.emit("error-message", "Room is full.");
    console.log(`❌ Join failed. Room ${roomCode} is full.`);
    socket.emit("is-game-starter", { isGameStarter: false });
    return;
  }
  const nameExists = room.players.some(player => player.name.toLowerCase() === name.toLowerCase());
  if (nameExists) {
    socket.emit("error-message", "That name is already taken in this room.");
    console.log(`❌ Join failed. Name "${name}" is already taken in room ${roomCode}.`);
    socket.emit("is-game-starter", { isGameStarter: false });
    return;
  }
  // --- End Validation Checks ---

  socket.roomCode = roomCode; // Assign the room code to the socket
  console.log(`Room code assigned to socket ${socket.id}: ${roomCode}`);

  const player = { id: socket.id, name }; // Create player object

  // Logic to determine gameStarterId:
  // If no gameStarterId is set, or if the current game starter is the host AND no other players exist,
  // AND this joining socket is not the host, then this new player becomes the game starter.
  // This aims to ensure a client can take over if the host isn't playing or has left.
  if (!room.gameStarterId || (room.gameStarterId === room.hostId && room.players.length === 0 && socket.id !== room.hostId)) {
      room.gameStarterId = socket.id;
      console.log(`⭐ Player ${socket.id} (${name}) is the new game starter for room ${roomCode}`);
  }

  room.players.push(player); // Add player to the room's player list
  console.log(`✅ Player added to room:`, player);

  socket.join(roomCode); // Player joins the Socket.IO room

  socket.emit("joined-room", roomCode); // Notify the joining client they've successfully joined
  io.to(roomCode).emit("players-update", room.players); // Broadcast updated player list to everyone in the room

  // Crucial: Determine and tell the joining client if THEY are the game starter.
  // A player is a game starter if their ID matches `room.gameStarterId` OR if they are the host.
  const isThisSocketGameStarter = (socket.id === room.gameStarterId) || (socket.id === room.hostId);
  socket.emit("is-game-starter", { isGameStarter: isThisSocketGameStarter });
  console.log(`[JoinRoom] Socket ${socket.id} (${name}) joined room ${roomCode}. isGameStarter: ${isThisSocketGameStarter} (gameStarterId: ${room.gameStarterId}, hostId: ${room.hostId})`);

  // Also update all *other* players in the room about their game starter status.
  // This is important in case the game starter role shifted due to this new join.
  room.players.forEach(p => {
    const isPlayerGameStarter = (p.id === room.gameStarterId) || (p.id === room.hostId);
    io.to(p.id).emit("is-game-starter", { isGameStarter: isPlayerGameStarter });
  });

  console.log(`${name} joined room ${roomCode}`);
}

/**
 * Handles a Socket.IO client disconnection.
 * It checks if the disconnected client was a host or a player and performs appropriate cleanup.
 * If the host leaves, the room is deleted. If a player leaves, they are removed,
 * and the "game starter" role might be reassigned.
 *
 * @param {Socket} socket The disconnected Socket.IO socket object.
 * @param {Server} io The Socket.IO server instance.
 * @param {Object} rooms A dictionary holding all active room states.
 */
function handleDisconnect(socket, io, rooms) {
  const roomCode = socket.roomCode; // Get the room the disconnected socket was in
  if (roomCode && rooms[roomCode]) {
    const room = rooms[roomCode];

    if (room.hostId === socket.id) {
      // If the host disconnected
      delete rooms[roomCode]; // Remove the room entirely
      io.to(roomCode).emit("error-message", "Host left, room closed."); // Notify all remaining players
      console.log(`❌ Host left, deleting room ${roomCode}`);
      // Inform all clients in the room that they are no longer game starters (as the room is closing)
      io.to(roomCode).emit("is-game-starter", { isGameStarter: false });
    } else {
      // If a player disconnected
      room.players = room.players.filter((p) => p.id !== socket.id); // Remove player from room's list
      console.log(`🔴 Player ${socket.id} left room ${roomCode}. Remaining players:`, room.players.map(p => p.name));

      // Reassign game starter if the disconnected socket was the game starter
      if (room.gameStarterId === socket.id) {
        if (room.hostId && io.sockets.sockets.get(room.hostId)) { // Prioritize host if still connected
          room.gameStarterId = room.hostId;
          io.to(room.hostId).emit("is-game-starter", { isGameStarter: true });
          console.log(`🔄 New game starter assigned for room ${roomCode}: Host ${room.hostId}`);
        } else if (room.players.length > 0) { // Otherwise, assign to the next available player
          room.gameStarterId = room.players[0].id;
          io.to(room.gameStarterId).emit("is-game-starter", { isGameStarter: true });
          console.log(`🔄 New game starter assigned for room ${roomCode}: ${room.players[0].name} (${room.gameStarterId})`);
        } else {
          room.gameStarterId = null; // No one left to be game starter
          console.log(`No players or host left to be game starter in room ${roomCode}.`);
        }
      }

      io.to(roomCode).emit("players-update", room.players); // Update player list for remaining clients

      // Re-emit game starter status to all remaining players in case someone's status changed
      room.players.forEach(p => {
          const isPlayerGameStarter = (p.id === room.gameStarterId) || (p.id === room.hostId);
          io.to(p.id).emit("is-game-starter", { isGameStarter: isPlayerGameStarter });
      });
      // Also notify the host if they are still connected about their game starter status
      if (room.hostId && io.sockets.sockets.get(room.hostId)) {
        const isHostGameStarter = (room.hostId === room.gameStarterId) || (room.hostId === room.hostId);
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