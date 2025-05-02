// socket.js
import { io } from "socket.io-client";

const socket = io("http://localhost:3001", {
  autoConnect: true, // Automatically connect when the client loads
  reconnection: true, // Enable reconnection
  reconnectionAttempts: 5, // Limit reconnection attempts
});

export default socket;