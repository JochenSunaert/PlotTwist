import { useEffect, useState } from "react";
import socket from "./socket";

const Client = () => {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [gameStarted, setGameStarted] = useState(false); // NEW
  const [team, setTeam] = useState(null);


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

    socket.on("team-assigned", ({ team }) => {
      setTeam(team);
      console.log("✅ Team assigned:", team);
    });

    socket.on("game-started", () => {
      console.log("🎮 Game started (client)");
      setGameStarted(true); // switch UI
    });

    return () => {
      socket.off("joined-room");
      socket.off("error-message");
      socket.off("team-assigned");
      socket.off("game-started"); // cleanup
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
  ) : !gameStarted ? (
    <>
      <h2>✅ You joined room {roomCode.toUpperCase()}</h2>
      {team && <p>🧑‍🤝‍🧑 Your team: <strong>{team}</strong></p>}
    </>
  ) : (
    <>
      <h2>🎉 Game Started!</h2>
      {team && <p>🧑‍🚀 You are a <strong>{team}</strong>!</p>}
    </>
  )}
</div>

  );
};

export default Client;
