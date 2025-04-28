import { useEffect, useState } from "react";
import socket from "./socket";

const Host = () => {
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false); // NEW

  useEffect(() => {
    socket.emit("create-room");

    socket.on("room-created", (code) => {
      setRoomCode(code);
    });

    socket.on("players-update", (players) => {
      setPlayers(players);
    });

    socket.on("game-started", () => {
      console.log("🎮 Game started (host)");
      setGameStarted(true); // switch UI
    });

    return () => {
      socket.off("room-created");
      socket.off("players-update");
      socket.off("game-started"); // cleanup
    };
  }, []);

  const handleStartGame = () => {
    console.log("Room Code before emitting:", roomCode);  // Log the roomCode here
    socket.emit("start-game"); // Emit start-game without roomCode
  };
  

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Host Screen</h1>
      <h2>Room Code: {roomCode}</h2>
      <h3>Players in Room:</h3>
      <ul>
        {players.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>

      {!gameStarted ? (
        <button onClick={handleStartGame} style={{ marginTop: "2rem" }}>
          🚀 Start Game
        </button>
      ) : (
        <h2>🎉 Game Started!</h2>
      )}
    </div>
  );
};

export default Host;
