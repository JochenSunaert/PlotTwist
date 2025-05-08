import { useEffect, useState } from "react";
import socket from "./socket"; // Import a single socket instance

const Host = () => {
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [promptPlayerName, setPromptPlayerName] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); // Track server errors
  const [timer, setTimer] = useState(null); // Timer for the prompt phase
  const [answerTimer, setAnswerTimer] = useState(null); // Timer for the answer phase
  const [answers, setAnswers] = useState([]);
  const [submittedPlayers, setSubmittedPlayers] = useState([]); // Track players who have submitted answers
  const [story, setStory] = useState(""); // Store the generated story
  const [evaluationResults, setEvaluationResults] = useState(null); // Store the evaluation results
  const [currentRound, setCurrentRound] = useState(1); // Track the current round
  const [isNextRoundReady, setIsNextRoundReady] = useState(false); // Track if ready for the next round
  const [finalResults, setFinalResults] = useState(null); // Track the final results for the game

  // Restart game logic
  const handleRestartGame = () => {
    console.log("🔄 Restarting game...");
    socket.emit("restart-game"); // Notify the server to restart the game
    setEvaluationResults(null); // Reset evaluation results
    setFinalResults(null); // Reset final results
    setPlayers([]); // Clear players
    setGameStarted(false); // Reset game state
    setCurrentRound(1); // Reset current round
    setPromptPlayerName(""); // Clear the prompt player
    setSubmittedPrompt(""); // Clear the submitted prompt
    setAnswers([]); // Clear answers
    setSubmittedPlayers([]); // Reset submitted players
    setStory(""); // Clear the story
    setTimer(null); // Clear the prompt timer
    setAnswerTimer(null); // Clear the answer timer
    setIsNextRoundReady(false); // Reset next round readiness
  };

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

    // Timer updates for the prompt phase
    socket.on("timer-update", (timeLeft) => {
      console.log("⏳ Timer updated for prompt phase:", timeLeft);
      setTimer(timeLeft);
    });

    // Automatically pick a predefined prompt if no prompt is submitted
    socket.on("timer-ended", () => {
      if (!submittedPrompt) {
        console.log("⏳ Timer ended, auto-selecting a predefined prompt...");
        const predefinedPrompts = [
          "A notorious thief has stolen a valuable diamond from the city's museum and it's your job to either catch the thief or help them escape.",
          "A hacked satellite will crash into the city in 10 minutes.",
          "A high-tech bank is being robbed in the middle of the night.",
        ];
        const randomPrompt = predefinedPrompts[Math.floor(Math.random() * predefinedPrompts.length)];
        socket.emit("submit-prompt", { prompt: randomPrompt });
      }
      setTimer(null); // Clear the timer after the prompt phase ends
    });

    // Reset state for a new round
    socket.on("round-reset", ({ roundNumber }) => {
      console.log(`🔄 Round ${roundNumber} reset received.`);
      setCurrentRound(roundNumber); // Reset the current round
      setSubmittedPrompt(""); // Clear the prompt
      setAnswers([]); // Clear answers
      setSubmittedPlayers([]); // Reset submitted players
      setStory(""); // Clear the story
      setEvaluationResults(null); // Clear evaluation results
      setTimer(null); // Clear the prompt timer
      setAnswerTimer(null); // Clear the answer timer
    });

    // Timer updates for the answer phase
    socket.on("answer-timer-update", (timeLeft) => {
      console.log("⏳ Timer updated for answer phase:", timeLeft);
      setAnswerTimer(timeLeft);
    });

    // Track players who submitted answers
    socket.on("player-submitted", ({ playerId }) => {
      console.log(`Player ${playerId} has submitted their answer.`);
      setSubmittedPlayers((prev) => [...prev, playerId]);
    });

    socket.on("answer-phase-ended", ({ nextRoundAvailable }) => {
      console.log("✅ Answer phase ended.");
      setAnswerTimer(null); // Clear the answer timer
      setIsNextRoundReady(nextRoundAvailable); // Mark as ready for the next round
    });

    socket.on("answers-collected", ({ answers }) => {
      setAnswers(answers);
      console.log("📨 Answers received on host:", answers);
    });

    // Listen for the generated story
    socket.on("story-generated", (data) => {
      console.log("📖 Story received:", data.story);
      setStory(data.story); // Update the story state
    });

    // Listen for evaluation results
    socket.on("evaluation-results", (data) => {
      console.log("🏆 Evaluation Results Received:", data);

      setEvaluationResults({
        winningTeam: data.winningTeam || "Tie",
        impactfulPlayer: data.impactfulPlayer || "None",
        originalPlayer: data.originalPlayer || "None",
        players: data.players || [],
      });

      // Mark as ready for the next round
      setIsNextRoundReady(true);
    });

    // Listen for the game-ended event
    socket.on("game-ended", ({ placements }) => {
      console.log("🏁 Game ended. Final placements:", placements);
      setGameStarted(false); // Stop the game
      setFinalResults(placements); // Set the final scores for display
    });

    // Cleanup listeners on unmount
    return () => {
      socket.off("room-created", handleRoomCreated);
      socket.off("players-update");
      socket.off("game-started");
      socket.off("prompt-selection");
      socket.off("prompt-submitted");
      socket.off("error-message", handleErrorMessage);
      socket.off("timer-update");
      socket.off("timer-ended");
      socket.off("player-submitted");
      socket.off("answer-timer-update");
      socket.off("answer-phase-ended");
      socket.off("answers-collected");
      socket.off("story-generated");
      socket.off("evaluation-results");
      socket.off("round-reset");
      socket.off("game-ended");
    };
  }, [roomCode, submittedPrompt]);

  const handleStartGame = () => {
    console.log("Room Code before emitting:", roomCode);
    setErrorMessage(""); // Reset error message before starting the game
    socket.emit("start-game");
  };

  const handleNextRound = () => {
    const nextRound = currentRound + 1;

    console.log(`🔄 Requesting to start round ${nextRound}...`);
    socket.emit("start-next-round", { round: nextRound });
    setIsNextRoundReady(false); // Reset readiness for the next round
  };

  const renderFinalResults = () => {
    if (!finalResults) return null;

    return (
      <div style={{ marginTop: "1rem" }}>
        <h3>🏆 Final Results:</h3>
        <ul>
          {finalResults.map((player, index) => (
            <li key={index}>
              {player.name} (Team: {player.team}) - {player.score} points
            </li>
          ))}
        </ul>
        <button onClick={handleRestartGame} style={{ marginTop: "1rem" }}>
          🔄 Restart Game
        </button>
      </div>
    );
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Host Screen</h1>
      <h2>Room Code: {roomCode}</h2>
      <h3>Players in Room:</h3>
      <ul>
        {players.map((p) => (
          <li key={p.id}>
            {p.name}{" "}
            {submittedPlayers.includes(p.id) ? (
              <span style={{ color: "green" }}>✔️ Submitted</span>
            ) : (
              <span style={{ color: "orange" }}>⏳ Pending</span>
            )}
          </li>
        ))}
      </ul>

      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}

      {!gameStarted ? (
        finalResults ? (
          renderFinalResults()
        ) : (
          <button onClick={handleStartGame} style={{ marginTop: "2rem" }}>
            🚀 Start Game
          </button>
        )
      ) : (
        <>
          <h2>Round {currentRound}</h2>
          {answerTimer !== null && (
            <div>
              <h3>⏳ Time left for answer phase: {answerTimer} seconds</h3>
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

          {submittedPrompt ? (
            <>
              <h2>📜 The prompt is: {submittedPrompt}</h2>
              {story && (
                <div>
                  <h3>📖 Generated Story:</h3>
                  <p>{story}</p>
                </div>
              )}
              {evaluationResults && (
                <div style={{ marginTop: "1rem" }}>
                  <h3>🏆 Points and Evaluation:</h3>
                  <p>
                    <strong>Winning Team:</strong> {evaluationResults.winningTeam || "Tie"}
                  </p>
                  <p>
                    <strong>Most Impactful Player:</strong> {evaluationResults.impactfulPlayer || "None"}
                  </p>
                  <p>
                    <strong>Most Original Player:</strong> {evaluationResults.originalPlayer || "None"}
                  </p>
                  <h4>Player Scores:</h4>
                  <ul>
                    {evaluationResults.players.map((player) => (
                      <li key={player.id}>
                        {player.name} (Team: {player.team}): {player.score} points
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {isNextRoundReady && (
                <button onClick={handleNextRound} style={{ marginTop: "1rem" }}>
                  🔄 Start Next Round
                </button>
              )}
            </>
          ) : (
            <div>
              <h2>⏳ Waiting for {promptPlayerName} to select a prompt...</h2>
              {timer !== null && <p>⏳ Time left for prompt phase: {timer} seconds</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Host;