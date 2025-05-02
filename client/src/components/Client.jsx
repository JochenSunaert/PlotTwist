import { useEffect, useState } from "react";
import socket from "./socket";

const Client = () => {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [team, setTeam] = useState(null);
  const [isPromptPlayer, setIsPromptPlayer] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [waitingForPrompt, setWaitingForPrompt] = useState(false);
  const [promptPlayerName, setPromptPlayerName] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [timer, setTimer] = useState(null); // Track the timer countdown

  const predefinedPrompts = [
    "A notorious thief has stolen a valuable diamond from the city's museum and it's your job to either catch the thief or help them escape.",
    "A hacked satellite will crash into the city in 10 minutes.",
    "A high-tech bank is being robbed in the middle of the night.",
  ];

  const handleJoin = () => {
    if (name.trim() && roomCode.trim()) {
      console.log("🚀 Emitting join-room", { roomCode, name });
      socket.emit("join-room", { roomCode: roomCode.trim().toUpperCase(), name });
    }
  };

  const handleSubmitPrompt = () => {
    if (prompt.trim()) {
      socket.emit("submit-prompt", { prompt });
    }
  };

  const handleRandomPrompt = () => {
    const randomPrompt = predefinedPrompts[Math.floor(Math.random() * predefinedPrompts.length)];
    setPrompt(randomPrompt);
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
      setGameStarted(true);
    });

    socket.on("prompt-selection", ({ playerId, playerName }) => {
      if (socket.id === playerId) {
        setIsPromptPlayer(true);
        setWaitingForPrompt(false);
      } else {
        setIsPromptPlayer(false);
        setWaitingForPrompt(true);
        setPromptPlayerName(playerName);
      }
    });

    socket.on("prompt-submitted", ({ prompt }) => {
      setSubmittedPrompt(prompt);
      setWaitingForPrompt(false);
      setIsPromptPlayer(false);
    });

    // Listen for timer updates
    socket.on("timer-update", (timeLeft) => {
      setTimer(timeLeft);
    });

    // Save the prompt automatically when the timer hits 0
    socket.on("timer-ended", () => {
      if (isPromptPlayer && prompt.trim()) {
        console.log("⏳ Timer ended, auto-submitting prompt:", prompt);
        socket.emit("submit-prompt", { prompt });
      }
    });

    return () => {
      socket.off("joined-room");
      socket.off("error-message");
      socket.off("team-assigned");
      socket.off("game-started");
      socket.off("prompt-selection");
      socket.off("prompt-submitted");
      socket.off("timer-update");
      socket.off("timer-ended");
    };
  }, [isPromptPlayer, prompt]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Client Screen</h1>
      <p>{team}</p>
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
        </>
      ) : (
        <>
          <h2>🎉 Game Started!</h2>
          {team && <p>🧑‍🤝‍🧑 Your team: <strong>{team}</strong></p>}
          {submittedPrompt ? (
            <p>📜 The prompt is: {submittedPrompt}</p>
          ) : waitingForPrompt ? (
            <p>⏳ Waiting for {promptPlayerName} to submit a prompt...</p>
          ) : isPromptPlayer ? (
            <>
              <h3>You are selecting the prompt!</h3>
              <textarea
                placeholder="Write your own prompt or choose one."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                style={{ width: "100%", height: "100px", marginBottom: "1rem" }}
              />
              <button onClick={handleRandomPrompt} style={{ marginRight: "1rem" }}>
                Random
              </button>
              <button onClick={handleSubmitPrompt}>Submit Prompt</button>
              {timer !== null && <p>⏳ Time left: {timer} seconds</p>}
            </>
          ) : null}
        </>
      )}
    </div>
  );
};

export default Client;