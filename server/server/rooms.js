const { generateRoomCode } = require("./utils");

// Create a new room
function createRoom(socket, rooms) {
  const existingRoom = Object.values(rooms).find((room) => room.hostId === socket.id);

  if (existingRoom) {
    socket.emit("error-message", "You already have an active room.");
    console.log(`❌ Host ${socket.id} already has an active room.`);
    return;
  }

  const code = generateRoomCode(rooms);
  rooms[code] = {
    hostId: socket.id,
    players: [],
    locked: false,
  };
  socket.roomCode = code; // Assign roomCode to the host's socket
  socket.join(code);
  socket.emit("room-created", code);
  console.log(`🏠 Room ${code} created by ${socket.id}`);
}

// Join an existing room
function joinRoom(socket, io, rooms, { roomCode, name }) {
  console.log(`📥 join-room event received from ${socket.id}`);
  console.log(`👉 name: ${name}, code: ${roomCode}`);

  const room = rooms[roomCode];

  if (!room) {
    socket.emit("error-message", "Room not found.");
    console.log(`❌ Join failed. Room ${roomCode} not found.`);
    return;
  }

  if (room.locked) {
    socket.emit("error-message", "Game already started, cannot join.");
    console.log(`❌ Join failed. Room ${roomCode} is locked.`);
    return;
  }

  if (room.players.length >= 8) {
    socket.emit("error-message", "Room is full.");
    console.log(`❌ Join failed. Room ${roomCode} is full.`);
    return;
  }

  socket.roomCode = roomCode;

  const player = { id: socket.id, name };
  room.players.push(player);
  socket.join(roomCode);

  socket.emit("joined-room", roomCode);
  io.to(roomCode).emit("players-update", room.players);

  console.log(`${name} joined room ${roomCode}`);
}

// Handle disconnects
function handleDisconnect(socket, io, rooms) {
  const code = socket.roomCode;
  if (code && rooms[code]) {
    const room = rooms[code];

    if (room.hostId === socket.id) {
      // Host left
      delete rooms[code];
      io.to(code).emit("error-message", "Host left, room closed.");
      console.log(`❌ Host left, deleting room ${code}`);
    } else {
      // Player left
      room.players = room.players.filter((p) => p.id !== socket.id);
      io.to(code).emit("players-update", room.players);
      console.log(`🔴 Player left room ${code}`);
    }
  }
}

module.exports = {
  createRoom,
  joinRoom,
  handleDisconnect, // Ensure this is exported
};