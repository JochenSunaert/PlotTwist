import { useEffect, useState } from "react";
import socket from "./socket"; // Shared socket instance
import { useNavigate } from 'react-router-dom';






const videos = {
  waiting: "/videos/motion_backgrounds2/Color-geometry-1_4k_1.mp4",
  prompt: "/videos/motion_backgrounds2/Color-geometry-2_4k_1.mp4",
  answer: "/videos/motion_backgrounds2/Color-geometry-8_4k_1.mp4",
  story: "/videos/motion_backgrounds2/Color-geometry-4_4k_1.mp4",
  evaluation: "/videos/motion_backgrounds2/Color-geometry-1_4k_1.mp4",
  final: "/videos/motion_backgrounds2/Color-geometry-1_4k_1.mp4",
};

const getTopBarText = (phase, promptPlayerName, submittedPrompt) => {
  switch (phase) {
    case "waiting":
      return "Type the secret sauce code to unlock your player powers!";

    case "prompt":
      return promptPlayerName ? (
        <>
          <strong className="playername">{promptPlayerName}</strong> is setting the scene... or setting you up!
        </>
      ) : (
        "Prompt time!"
      );

    case "answer":
      return submittedPrompt ? (
        <p class="prompt-submitted">
          <strong class="submittedprompt">{submittedPrompt}</strong>
        </p>
      ) : (
        "Answer time! Get creative and respond with your wild ideas!"
      );

    case "story":
      return "The AI is weaving your story...";

    case "evaluation":
      return "Results are in! Who impressed the AI the most?";

    case "final":
      return "Game over! Let's see how everyone did.";

    default:
      return "";
  }
};






const Host = () => {

  const navigate = useNavigate();
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
  const [story, setStory] = useState(null);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [currentRound, setCurrentRound] = useState(1);
  const [isNextRoundReady, setIsNextRoundReady] = useState(false);
  const [finalResults, setFinalResults] = useState(null);
  const [gamePhase, setGamePhase] = useState("waiting");
  const [storyAcknowledged, setStoryAcknowledged] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [isStoryLoading, setIsStoryLoading] = useState(false);

  const handleBack = () => {
    navigate('/'); // or '../app' depending on your route structure
  };




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
    if (gamePhase === "answer") {
      setShowFullPrompt(true);
      setFadeOut(false); // reset fade if needed
      const timeout = setTimeout(() => {
        setFadeOut(true); // trigger CSS fade out
        // after fade duration, hide it
        setTimeout(() => {
          setShowFullPrompt(false);
        }, 1000); // match your CSS transition duration
      }, 5000); // <- use real time, not 500000

      return () => clearTimeout(timeout);
    }
  }, [gamePhase]);


useEffect(() => {
  socket.on("story-loading", () => {
    setIsStoryLoading(true);
  });

  socket.on("story-phase", ({ story }) => {
    setIsStoryLoading(false);
    setStory(story);
    // navigate to story screen or trigger phase
  });

  return () => {
    socket.off("story-loading");
    socket.off("story-phase");
  };
}, []);



  useEffect(() => {

    socket.emit("create-room");

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
      socket.off("answer-phase-ended");
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

const renderFinalResults = () => {
  const sortedResults = [...finalResults].sort((a, b) => b.score - a.score);

  return (
<div className="final-results">
  <h3>🏆 Final Results:</h3>
  <ul className="results-list">
    {sortedResults.map((player, index) => {
      let placeClass = "";
      if (index === 0) placeClass = "first-place";
      else if (index === 1) placeClass = "second-place";
      else if (index === 2) placeClass = "third-place";
      else placeClass = "other-place";

      return (
        <li key={index} className={`result-item ${placeClass}`}>
          <span className="player-name">{player.name}</span>
          {/* <span className="player-team"> (Team: {player.team})</span> */}
          <span className="player-score"> - {player.score} points</span>
        </li>
      );
    })}
  </ul>
  <button onClick={handleRestartGame} className="restart-button">
    🔄 Restart Game
  </button>
</div>

  );
};


  return (
    <div className="host-container">
      {/* Top Black Bar */}
      <div className="top-bar">
        <button onClick={handleBack} className="flex items-center gap-2 text-white hover:text-gray-300 backbutton">  <i className="fas fa-arrow-left"></i></button>
        <div>

          <div className="roomcode-text">
            <h3 class="topbar-text">{getTopBarText(gamePhase, promptPlayerName, submittedPrompt)}</h3>
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
      {showFullPrompt && submittedPrompt && (
        <div className={`fullscreen-prompt-overlay ${fadeOut ? "fade-out" : ""}`}>
          <div className="prompt-text">{submittedPrompt}</div>
        </div>
      )}
      {isStoryLoading && (
  <div className="story-loading-overlay">
    <div className="loading-spinner" />
    <p>Crafting your story...</p>
  </div>
)}


      <div className="overlay-ui">
        <div className="main">
          {!gameStarted && !finalResults && (
            <>
              <h1 class="roomcode">{roomCode || "Creating..."}</h1>
              <h3>Players in Room:</h3>
              <ul className="players-list" >
                {[...Array(8)].map((_, index) => {
                  const player = players[index]; // get player by index
                  return (
                    <li
                      key={index}
                      className={`player-box ${player ? 'joined' : 'empty'}`}
                    >
                      {player ? player.name : 'Join'}
                    </li>
                  );
                })}
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
                  <div>
                    {timer !== null && <h1 class="prompt-timer">{timer}s</h1>}
                    {/* <p class="bottomtimer">time left</p> */}
                  </div>


                </div>

              )}
              {gamePhase === "answer" && (
                <div className="game-phase-section">
                  <h2>Round {currentRound}/{players.length}</h2>


                  <div>
                    {timer !== null && <h1 class="prompt-timer">{answerTimer}s</h1>}
                    {/* <p class="bottomtimer">time left</p> */}
                  </div>
                  {answers.length > 0 && (
                    <ul>
                      {answers.map((answer, index) => (
                        <li key={index}>
                          <strong>{answer.playerName}:</strong> {answer.answer || "<No answer>"}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div class="playerdiv">
                    <h2 class="player-announcement">players:</h2>
                    <ul class="submitted-players">
                      {players.map((p) => (
                        <li key={p.id}>
                          <span className={submittedPlayers.includes(p.id) ? "submitted" : "pending"}>
                            {p.name}
                          </span>
                        </li>
                      ))}
                    </ul>

                  </div>

                </div>

              )}
{gamePhase === "story" && (
  <div className="game-phase-section aistory-section">
    <h2 className="round-header">Round {currentRound}/{players.length}</h2>
    <h1 className="story-title">This is how your story ended...</h1>
    <div className="aistory">
      <p>{story}</p>
    </div>
    <button
      onClick={() => {
        setStoryAcknowledged(true);
        setGamePhase("evaluation");
      }}
      className="continue-button"
    >
      Continue to Results
    </button>
  </div>
)}

              {(gamePhase === "evaluation" || gamePhase === "results") && evaluationResults && storyAcknowledged && (
  <div className="game-phase-section evaluation-section">
    <h2 className="round-header">Round {currentRound}/{players.length}</h2>
    <h1 className="evaluation-title"> Judgement Day: Who Thrived, Who Cried?</h1>

    <div className="evaluation-results">
      <p><strong>🏆 Winning Team:</strong> {evaluationResults.winningTeam}</p>
      <p><strong>🌟 Most Impactful Player:</strong> {evaluationResults.impactfulPlayer}</p>
      <p><strong>🎨 Most Original Player:</strong> {evaluationResults.originalPlayer}</p>
    </div>

    <h2 className="points-header">🎯 Points</h2>
    <ul className="evaluation-players">
      {evaluationResults.players.map((player, index) => (
        <li key={index}>
          <p>{player.name}: {player.score}</p>
        </li>
      ))}
    </ul>

    {isNextRoundReady && (
      <button onClick={handleNextRound} className="next-round-button">
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