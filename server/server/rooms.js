const { generateRoomCode } = require("./utils");

function createRoom(socket, rooms) {
  const existingRoom = Object.values(rooms).find((room) => room.hostId === socket.id);

  if (existingRoom) {
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
  
    socket.roomCode = roomCode; // Assign the room code to the socket
    console.log(`Room code assigned to socket ${socket.id}: ${roomCode}`); // Debug log
  
    const player = { id: socket.id, name };
    room.players.push(player); // Add player to the room
    console.log(`✅ Player added to room:`, player); // Debug log
  
    socket.join(roomCode);
  
    socket.emit("joined-room", roomCode);
    io.to(roomCode).emit("players-update", room.players);
  
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
      io.to(roomCode).emit("players-update", room.players);
      console.log(`🔴 Player left room ${roomCode}`);
    }
  }
}

module.exports = {
  createRoom,
  joinRoom,
  handleDisconnect, // Ensure this is exported
};