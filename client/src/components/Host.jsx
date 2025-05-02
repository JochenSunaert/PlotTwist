import { useEffect, useState } from "react";
import socket from "./socket"; // Import a single socket instance

const Host = () => {
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [promptPlayerName, setPromptPlayerName] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // Track server errors
  const [timer, setTimer] = useState(null); // Track the timer countdown

  useEffect(() => {
    // Emit the create-room event only if roomCode is not set
    if (!roomCode) {
      socket.emit("create-room");
    }

    const handleRoomCreated = (code) => {
      setRoomCode(code);
    };

    const handleErrorMessage = (message) => {
      setErrorMessage(message);
    };

    // Listeners for events
    socket.on("room-created", handleRoomCreated);
    socket.on("players-update", (players) => setPlayers(players));
    socket.on("game-started", () => setGameStarted(true));
    socket.on("prompt-selection", ({ playerName }) => setPromptPlayerName(playerName));
    socket.on("prompt-submitted", ({ prompt }) => setSubmittedPrompt(prompt));
    socket.on("error-message", handleErrorMessage);
    socket.on("timer-update", (timeLeft) => setTimer(timeLeft));

    return () => {
      // Cleanup listeners on unmount
      socket.off("room-created", handleRoomCreated);
      socket.off("players-update");
      socket.off("game-started");
      socket.off("prompt-selection");
      socket.off("prompt-submitted");
      socket.off("error-message", handleErrorMessage);
      socket.off("timer-update");
    };
  }, [roomCode]);

  const handleStartGame = () => {
    console.log("Room Code before emitting:", roomCode);
    setErrorMessage(""); // Reset error message before starting the game
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

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

      {!gameStarted ? (
        <button onClick={handleStartGame} style={{ marginTop: "2rem" }}>
          🚀 Start Game
        </button>
      ) : (
        submittedPrompt ? (
          <h2>📜 The prompt is: {submittedPrompt}</h2>
        ) : (
          <div>
            <h2>⏳ Waiting for {promptPlayerName} to select a prompt...</h2>
            <p>⏳ Time left: {timer} seconds</p>
          </div>
        )
      )}
    </div>
  );
};

export default Host;