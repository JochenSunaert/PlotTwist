import { useEffect, useState } from "react";
import socket from "./socket";

const Client = () => {
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [joinedRoom, setJoinedRoom] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [team, setTeam] = useState(null);
  const [isPromptPlayer, setIsPromptPlayer] = useState(false); // Track if the client is the prompt provider
  const [prompt, setPrompt] = useState("");
  const [waitingForPrompt, setWaitingForPrompt] = useState(false); // Track if waiting for another player to submit a prompt
  const [promptPlayerName, setPromptPlayerName] = useState("");
  const [currentRound, setCurrentRound] = useState(0); // Track the current round
  const [totalRounds, setTotalRounds] = useState(0); // Track the total number of rounds
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [timer, setTimer] = useState(null); // Track the timer countdown
  const [answer, setAnswer] = useState(""); // Store the client's answer
  const [answerPhase, setAnswerPhase] = useState(false); // Track if the answer phase is active
  const [answersSubmitted, setAnswersSubmitted] = useState(false); // Track if the answer is submitted
  const [answerTimer, setAnswerTimer] = useState(null); // Track the timer for the answer phase

  const predefinedPrompts = [
    "A notorious thief has stolen a valuable diamond from the city's museum and it's your job to either catch the thief or help them escape.",
    "A hacked satellite will crash into the city in 10 minutes.",
    "A high-tech bank is being robbed in the middle of the night.",
  ];

  const handleJoin = () => {
    if (name.trim() && roomCode.trim()) {
      console.log("🚀 Emitting join-room", { roomCode, name }); // Debug log
      socket.emit("join-room", { roomCode: roomCode.trim().toUpperCase(), name }); // Emit join-room event
    }
  };

  const handleSubmitPrompt = () => {
    if (prompt.trim()) {
      console.log("📜 Submitting prompt:", prompt); // Debug log
      socket.emit("submit-prompt", { prompt });
    }
  };

  const handleRandomPrompt = () => {
    const randomPrompt = predefinedPrompts[Math.floor(Math.random() * predefinedPrompts.length)];
    setPrompt(randomPrompt);
  };

  const handleSubmitAnswer = () => {
    console.log("📝 Submitting answer:", { playerName: name, answer }); // Debug log
    socket.emit("submit-answer", { playerName: name, answer: answer.trim() || "<No answer provided>" }); // If the answer is empty, submit a placeholder
    setAnswersSubmitted(true); // Mark the answer as submitted
  };

  useEffect(() => {
    socket.on("joined-room", (room) => {
      setJoinedRoom(true);
      setErrorMessage("");
    });

    socket.on("error-message", (message) => {
      setErrorMessage(message);
    });

    socket.on("team-assigned", ({ team }) => {
      setTeam(team);
      console.log("✅ Team assigned:", team);
    });

    socket.on("game-started", () => {
      console.log("🎮 Game started event received.");
      setGameStarted(true);
    });

    socket.on("prompt-player", ({ isPromptPlayer }) => {
      console.log("🎲 Received 'prompt-player' event. isPromptPlayer:", isPromptPlayer);
      setIsPromptPlayer(isPromptPlayer); // Enable the textarea for the prompt provider
      setWaitingForPrompt(!isPromptPlayer); // Other players wait for the prompt
    });

    socket.on("prompt-selection", ({ playerName }) => {
      console.log(`⏳ Prompt selection event received. Prompt provider: ${playerName}`);
      setPromptPlayerName(playerName);
    });

    socket.on("prompt-submitted", ({ prompt }) => {
      console.log("📜 Prompt submitted:", prompt); // Debug log
      setSubmittedPrompt(prompt || "Prompt is empty");
      setWaitingForPrompt(false);
      setIsPromptPlayer(false);
    });

    // Listen for timer updates
    socket.on("timer-update", (timeLeft) => {
      console.log(`⏳ Timer update event received. Time left: ${timeLeft}s`);
      setTimer(timeLeft);
    });

    // Save the prompt automatically when the timer hits 0
    socket.on("timer-ended", () => {
      if (isPromptPlayer && prompt.trim()) {
        console.log("⏳ Timer ended, auto-submitting prompt:", prompt);
        socket.emit("submit-prompt", { prompt });
      }
    });

    socket.on("start-answer-phase", () => {
      console.log("📝 Answer phase started"); // Debug log
      setAnswerPhase(true); // Enable the answer phase
      setAnswersSubmitted(false); // Reset the submission state
    });

    // Listen for the timer updates during the answer phase
    socket.on("answer-timer-update", (timeLeft) => {
      console.log("⏳ Answer timer updated:", timeLeft);
      setAnswerTimer(timeLeft); // Update the answer timer
    });

    // Listen for the end of the answer phase
    socket.on("answer-phase-ended", () => {
      console.log("⏳ Answer phase ended");
      setAnswerPhase(false); // Disable the answer phase
      setAnswerTimer(null); // Clear the answer timer

      if (!answersSubmitted) {
        console.log("⏳ Timer ended, auto-submitting answer:", answer || "<No answer provided>");
        handleSubmitAnswer(); // Automatically submit the answer
      }
    });

    socket.on("next-round", ({ currentRound, totalRounds, promptPlayerName }) => {
      console.log(`🔄 Next round started: Round ${currentRound + 1} of ${totalRounds}`);
      setCurrentRound(currentRound);
      setPromptPlayerName(promptPlayerName);
      setSubmittedPrompt(""); // Reset the prompt for the next round
      setAnswer(""); // Reset the answer input
      setAnswersSubmitted(false); // Reset the submission state
      setAnswerPhase(false); // Reset the answer phase
    });

    socket.on("game-ended", ({ placements }) => {
      console.log("🏁 Game ended. Final placements:", placements);
      setName(""); // Reset name
      setRoomCode(""); // Reset room code
      setJoinedRoom(false); // Reset joined room state
      setGameStarted(false); // Reset game state
      setTeam(null); // Reset team
      setPrompt(""); // Reset prompt
      setSubmittedPrompt(""); // Reset submitted prompt
      setAnswer(""); // Reset answer
      setAnswersSubmitted(false); // Reset answer submission state
    });

    socket.on("round-reset", ({ roundNumber }) => {
      console.log(`🔄 Round ${roundNumber} reset received.`);
      setSubmittedPrompt(""); // Clear the prompt
      setAnswers([]); // Clear answers
      setSubmittedPlayers([]); // Reset submitted players
      setStory(""); // Clear the story
      setEvaluationResults(null); // Clear evaluation results
      setIsPromptPlayer(false); // Reset prompt provider state
      setWaitingForPrompt(true); // All players initially wait for the prompt
    });

    return () => {
      socket.off("joined-room");
      socket.off("error-message");
      socket.off("team-assigned");
      socket.off("game-started");
      socket.off("prompt-player");
      socket.off("prompt-selection");
      socket.off("prompt-submitted");
      socket.off("timer-update");
      socket.off("timer-ended");
      socket.off("start-answer-phase");
      socket.off("answer-timer-update");
      socket.off("answer-phase-ended");
      socket.off("next-round");
      socket.off("game-ended");
      socket.off("round-reset");
    };
  }, [isPromptPlayer, prompt, answer, answersSubmitted]);

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
          <h3>Round {currentRound + 1} of {totalRounds}</h3>
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
          {answerPhase && (
            <>
              <textarea
                placeholder="Write your answer here..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={answersSubmitted} // Disable if already submitted
                style={{ width: "100%", height: "100px", marginBottom: "1rem" }}
              />
              <button onClick={handleSubmitAnswer} disabled={answersSubmitted}>
                {answersSubmitted ? "Answer Submitted" : "Submit Answer"}
              </button>
              {answerTimer !== null && <p>⏳ Answer Timer: {answerTimer} seconds</p>}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Client;