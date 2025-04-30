function generateRoomCode(rooms) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code;
    do {
      code = Array.from({ length: 4 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join("");
    } while (rooms[code]); // ensure unique
    return code;
  }
  
  module.exports = {
    generateRoomCode,
  };