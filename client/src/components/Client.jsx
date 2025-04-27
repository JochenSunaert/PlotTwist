import { useEffect, useState } from "react";
import socket from "./socket";

const Client = () => {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleJoin = () => {
    if (name.trim() && roomCode.trim()) {
        console.log("🚀 Emitting join-room", { roomCode, name });
        socket.emit("join-room", { roomCode: roomCode.trim().toUpperCase(), name });
    }
  };

  useEffect(() => {
    socket.on("joined-room", (room) => {
      setJoinedRoom(true);
      setErrorMessage("");
    });

    socket.on("error-message", (msg) => {
      setErrorMessage(msg);
    });

    return () => {
        socket.off("joined-room");
        socket.off("error-message");
      };
      
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Client Screen</h1>
      {!joinedRoom ? (
        <>
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginRight: "1rem" }}
          />
          <input
            type="text"
            placeholder="Room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            style={{ marginRight: "1rem" }}
          />
          <button onClick={handleJoin}>Join Room</button>
          {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
        </>
      ) : (
        <h2>✅ You joined room {roomCode.toUpperCase()}</h2>
      )}
    </div>
  );
};

export default Client;
