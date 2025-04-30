import { useEffect, useState } from "react";
import socket from "./socket";

const Host = () => {
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [promptPlayerName, setPromptPlayerName] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");

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
      setGameStarted(true);
    });

    socket.on("prompt-selection", ({ playerName }) => {
      setPromptPlayerName(playerName);
    });

    socket.on("prompt-submitted", ({ prompt }) => {
      setSubmittedPrompt(prompt);
    });

    return () => {
      socket.off("room-created");
      socket.off("players-update");
      socket.off("game-started");
      socket.off("prompt-selection");
      socket.off("prompt-submitted");
    };
  }, []);

  const handleStartGame = () => {
    console.log("Room Code before emitting:", roomCode);
    socket.emit("start-game");
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
        submittedPrompt ? (
          <h2>📜 The prompt is: {submittedPrompt}</h2>
        ) : (
          <h2>⏳ Waiting for {promptPlayerName} to select a prompt...</h2>
        )
      )}
    </div>
  );
};

export default Host;