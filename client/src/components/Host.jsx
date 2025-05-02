import { useEffect, useState } from "react";
import socket from "./socket"; // Import a single socket instance

const Host = () => {
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [promptPlayerName, setPromptPlayerName] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // Track server errors
  const [promptTimer, setPromptTimer] = useState(null); // Timer for the prompt phase
  const [answerTimer, setAnswerTimer] = useState(null); // Timer for the answer phase
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
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

    // Timers
    socket.on("prompt-timer-update", (timeLeft) => setPromptTimer(timeLeft));
    socket.on("prompt-phase-ended", () => setPromptTimer(null));

    socket.on("answer-timer-update", (timeLeft) => setAnswerTimer(timeLeft));
    socket.on("answers-collected", ({ answers }) => {
      setAnswers(answers);
      console.log("📨 Answers received on host:", answers);
    });

    return () => {
      socket.off("room-created", handleRoomCreated);
      socket.off("players-update");
      socket.off("game-started");
      socket.off("prompt-selection");
      socket.off("prompt-submitted");
      socket.off("error-message", handleErrorMessage);
      socket.off("prompt-timer-update");
      socket.off("prompt-phase-ended");
      socket.off("answer-timer-update");
      socket.off("answers-collected");
    };
  }, [roomCode]);

  const handleStartGame = () => {
    console.log("Room Code before emitting:", roomCode);
    setErrorMessage("");
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
        <>
          {submittedPrompt ? (
            <h2>📜 The prompt is: {submittedPrompt}</h2>
          ) : (
            <div>
              <h2>⏳ Waiting for {promptPlayerName} to select a prompt...</h2>
              {promptTimer !== null && <p>⏳ Prompt Timer: {promptTimer} seconds</p>}
            </div>
          )}

          {answers.length > 0 && (
            <div>
              <h3>📨 Collected Answers:</h3>
              <ul>
                {answers.map((answer, index) => (
                  <li key={index}>
                    <strong>{answer.playerName}:</strong> {answer.answer || "<No answer provided>"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Host;