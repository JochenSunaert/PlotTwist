import { useEffect, useState } from "react";
import socket from "./socket"; // Shared socket instance

  const videos = {
    waiting: "/videos/motion_backgrounds2/Color-geometry-1_4k_1.mp4",
    prompt: "/videos/motion_backgrounds2/Color-geometry-2_4k_1.mp4",
    answer: "/videos/motion_backgrounds2/Color-geometry-8_4k_1.mp4",
    story: "/videos/motion_backgrounds2/Color-geometry-4_4k_1.mp4",
    evaluation: "/videos/motion_backgrounds2/Color-geometry-5_4k_1.mp4",
    final: "/videos/motion_backgrounds2/Color-geometry-6_4k_1.mp4",
  };


const Host = () => {
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [promptPlayerName, setPromptPlayerName] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [timer, setTimer] = useState(null); // Prompt timer
  const [answerTimer, setAnswerTimer] = useState(null); // Answer phase timer
  const [answers, setAnswers] = useState([]);
  const [submittedPlayers, setSubmittedPlayers] = useState([]);
  const [story, setStory] = useState("");
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [isNextRoundReady, setIsNextRoundReady] = useState(false);
  const [finalResults, setFinalResults] = useState(null);
  const [gamePhase, setGamePhase] = useState("waiting");
  const [storyAcknowledged, setStoryAcknowledged] = useState(false);

  const handleRestartGame = () => {
    console.log("🔄 Restarting game...");
    socket.emit("restart-game");

    setEvaluationResults(null);
    setFinalResults(null);
    setPlayers([]);
    setGameStarted(false);
    setCurrentRound(1);
    setPromptPlayerName("");
    setSubmittedPrompt("");
    setAnswers([]);
    setSubmittedPlayers([]);
    setStory("");
    setTimer(null);
    setAnswerTimer(null);
    setIsNextRoundReady(false);
  };

  useEffect(() => {
    if (!roomCode) socket.emit("create-room");

    socket.on("room-created", (code) => setRoomCode(code));
    socket.on("players-update", (players) => setPlayers(players));
    socket.on("game-started", () => setGameStarted(true));
    socket.on("prompt-selection", ({ playerName }) => {
      setPromptPlayerName(playerName);
      setGamePhase("prompt");
    });
    socket.on("prompt-submitted", ({ prompt }) => {
      setSubmittedPrompt(prompt);
      setGamePhase("answer");
    });
    socket.on("error-message", (msg) => setErrorMessage(msg));

    socket.on("timer-update", setTimer);
    socket.on("timer-ended", () => {
      if (!submittedPrompt) {
        const fallbackPrompts = [
          "A hacker has taken over the city's power grid.",
          "A villain wants to reverse time to change history.",
          "A meteor is about to crash into Earth.",
        ];
        const randomPrompt = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
        socket.emit("submit-prompt", { prompt: randomPrompt });
      }
      setTimer(null);
    });

    socket.on("answer-timer-update", setAnswerTimer);
    socket.on("player-submitted", ({ playerId }) =>
      setSubmittedPlayers((prev) => [...prev, playerId])
    );

    socket.on("answers-collected", ({ answers }) => {
      setAnswers(answers);
      console.log("📨 Answers collected:", answers);
      setGamePhase("story");
    });

    socket.on("story-generated", ({ story }) => {
      console.log("📖 Story received:", story);
      setStory(story);
      setGamePhase("story"); // Show the story phase
    });

    socket.on("evaluation-results", (data) => {
      setEvaluationResults({
        winningTeam: data.winningTeam || "Tie",
        impactfulPlayer: data.impactfulPlayer || "None",
        originalPlayer: data.originalPlayer || "None",
        players: data.players || [],
      });
      setIsNextRoundReady(true);
    });

    socket.on("answer-phase-ended", ({ nextRoundAvailable }) => {
      setAnswerTimer(null);
      setIsNextRoundReady(nextRoundAvailable);
    });

    socket.on("round-reset", ({ roundNumber }) => {
      setCurrentRound(roundNumber);
      setSubmittedPrompt("");
      setAnswers([]);
      setSubmittedPlayers([]);
      setStory("");
      setEvaluationResults(null);
      setTimer(null);
      setAnswerTimer(null);
      setGamePhase("prompt");
    });

    socket.on("game-ended", ({ placements }) => {
      console.log("🏁 Game ended with results:", placements);
      setGameStarted(false);
      setFinalResults(placements);
    });

    return () => {
      socket.off("room-created");
      socket.off("players-update");
      socket.off("game-started");
      socket.off("prompt-selection");
      socket.off("prompt-submitted");
      socket.off("error-message");
      socket.off("timer-update");
      socket.off("timer-ended");
      socket.off("answer-timer-update");
      socket.off("player-submitted");
      socket.off("answers-collected");
      socket.off("story-generated");
      socket.off("evaluation-results");
      socket.off("round-reset");
      socket.off("game-ended");
    };
  }, [roomCode, submittedPrompt]);

  const handleStartGame = () => {
    console.log("🚀 Starting game in room:", roomCode);
    setErrorMessage("");
    socket.emit("start-game");
  };

  const handleNextRound = () => {
    setStoryAcknowledged(false);
    const nextRound = currentRound + 1;
    console.log(`🔁 Requesting next round (${nextRound})`);
    socket.emit("start-next-round", { round: nextRound });
    setIsNextRoundReady(false);
  };

  const renderFinalResults = () => (
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

return (
    <div className="host-container">
      {/* Top Black Bar */}
      <div className="top-bar">
        <div>
          <div>
              <h3>Join on your phone as <strong>player</strong>  {/*Room: {roomCode || "Creating..."}*/} </h3>
              <h3>Your room code is:</h3>
          </div>
        </div>
      </div>

      {/* Background video */}
      <video
        key={gamePhase} // forces reload when gamePhase changes
        className="background-video"
        src={videos[gamePhase] || videos.waiting}
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Overlay UI container */}
      <div className="overlay-ui">
        <div className="main">
        {!gameStarted && (
          <>
            <h1 class="roomcode">{roomCode || "Creating..."}</h1>
            <h3>Players in Room:</h3>
            <ul className="players-list">
              {players.map((p) => (
                <li key={p.id}>
                  {p.name}{" "}
                  {/*submittedPlayers.includes(p.id) ? (
                    <span className="submitted">✔️ Submitted</span>
                  ) : (
                    <span className="pending">⏳ Pending</span>
                  )*/}
                </li>
              ))}
            </ul>
          </>
        )}

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        {!gameStarted ? (
          finalResults ? (
            renderFinalResults()
          ) : (
            <button onClick={handleStartGame} className="button">
            Everybody's in
            </button>
          )
        ) : (
          <>
            {gamePhase === "prompt" && (
              <div className="game-phase-section">
                <h2>🧠 Round {currentRound}</h2>
                <h3>Prompt Phase</h3>
                {promptPlayerName && <p>✍️ {promptPlayerName} is choosing the prompt...</p>}
                {timer !== null && <p>⏳ Time left to submit prompt: {timer}s</p>}
              </div>
            )}
            {gamePhase === "answer" && (
              <div className="game-phase-section">
                <h2>🧠 Round {currentRound}</h2>
                <h3>📝 Answer Phase</h3>
                <p>
                  ✅ Prompt submitted: <strong>{submittedPrompt}</strong>
                </p>
                {answerTimer !== null && <p>⏳ Time left to answer: {answerTimer}s</p>}
                {answers.length > 0 && (
                  <ul>
                    {answers.map((answer, index) => (
                      <li key={index}>
                        <strong>{answer.playerName}:</strong> {answer.answer || "<No answer>"}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {gamePhase === "story" && (
              <div className="game-phase-section">
                <h2>🧠 Round {currentRound}</h2>
                <h3>📖 AI Generated Story</h3>
                <p>{story}</p>
                <button
                  onClick={() => {
                    setStoryAcknowledged(true);
                    setGamePhase("evaluation");
                  }}
                  className="button"
                  style={{ marginTop: "1rem" }}
                >
                  ✅ Continue to Results
                </button>
              </div>
            )}
            {(gamePhase === "evaluation" || gamePhase === "results") && evaluationResults && storyAcknowledged && (
              <div className="game-phase-section">
                <h2>🧠 Round {currentRound}</h2>
                <h3>🏆 Evaluation Results</h3>
                <p>
                  <strong>Winning Team:</strong> {evaluationResults.winningTeam}
                </p>
                <p>
                  <strong>Most Impactful Player:</strong> {evaluationResults.impactfulPlayer}
                </p>
                <p>
                  <strong>Most Original Player:</strong> {evaluationResults.originalPlayer}
                </p>
                <ul>
                  {evaluationResults.players.map((player, index) => (
                    <li key={index}>
                      {player.name} ({player.team}) - {player.score} points
                    </li>
                  ))}
                </ul>
                {isNextRoundReady && (
                  <button onClick={handleNextRound} className="button" style={{ marginTop: "1rem" }}>
                    🔁 Start Next Round
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default Host;