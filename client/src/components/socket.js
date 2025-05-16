// socket.js
import { io } from "socket.io-client";

// Use the VITE_API_URL environment variable or fallback to localhost
const socket = io("https://plottwist-w5lc.onrender.com" || "http://localhost:3001", {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
    transports: ["websocket"], // force WebSocket transport (optional but helpful)
});

export default socket;
