// Host.js
import { useEffect, useState, useRef } from "react";
import socket from "./socket";
import { useNavigate } from 'react-router-dom';
import { speak } from "./utils/speech";

const videos = {
  waiting: "/videos/motion_backgrounds3/Color-geometry-1_4k_1.mp4",
  prompt: "/videos/motion_backgrounds3/Color-geometry-11_4k_1.mp4",
  answer: "/videos/motion_backgrounds3/Color-geometry-8_4k_1.mp4",
  story: "/videos/motion_backgrounds3/Color-geometry-4_4k_1.mp4",
  evaluation: "/videos/motion_backgrounds3/Color-geometry-1_4k_1.mp4",
  final: "/videos/motion_backgrounds3/Color-geometry-1_4k_1.mp4",
};

const musicTracks = {
  waiting: "/music/waiting.mp3",
  prompt: "/music/prompt.mp3",
  answer: "/music/answer.mp3",
  story: "/music/story.mp3",
  evaluation: "/music/waiting.mp3",
  final: "/music/waiting.mp3",
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
        <p className="prompt-submitted">
          <strong className="submittedprompt">{submittedPrompt}</strong>
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
  const [timer, setTimer] = useState(null);
  const [answerTimer, setAnswerTimer] = useState(null);
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
  const [isSpeechDone, setIsSpeechDone] = useState(false);
  const [displayedText, setDisplayedText] = useState("");
  const storyTextareaRef = useRef(null);

  const [musicStarted, setMusicStarted] = useState(false);
  const audioRef = useRef(null);

  const handleBack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    speechSynthesis.cancel();
    navigate('/');
  };

  const handleContinueToResults = () => {
    speechSynthesis.cancel();
    setStoryAcknowledged(true);
    // Emit to server to advance all clients
    socket.emit("continue-to-results"); // <--- Host emits this
    setGamePhase("evaluation"); // Host's own view updates immediately
  };

  // NEW CONSOLIDATED useEffect for Story display and TTS
  useEffect(() => {
    let typeWordTimeout;
    let sentenceDelayTimeout;
    let currentUtterance;

    const cleanup = () => {
      if (typeWordTimeout) clearTimeout(typeWordTimeout);
      if (sentenceDelayTimeout) clearTimeout(sentenceDelayTimeout);
      if (currentUtterance) {
        speechSynthesis.cancel();
      }
      setDisplayedText("");
      // No longer setting setIsSpeechDone(false) here, as it's reset by server's next-round/round-reset
    };

    if (gamePhase !== "story" || !story) {
      cleanup();
      return;
    }

    setDisplayedText(""); // Crucially clear text when entering the story phase
    setIsSpeechDone(false); // Reset speech status at the start of story phase
    speechSynthesis.cancel(); // Ensure no leftover speech

    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith("en")) || voices[0];
    const sentences = story.match(/[^.!?]+[.!?]+/g) || [story];

    let sentenceIndex = 0;

    const speakAndDisplayNextSentence = () => {
      if (sentenceIndex >= sentences.length) {
        setIsSpeechDone(true);
        socket.emit("speech-done"); // <--- HOST EMITS SPEECH DONE TO SERVER
        return;
      }

      const currentSentence = sentences[sentenceIndex].trim();
      if (currentSentence.length === 0) {
        sentenceIndex++;
        speakAndDisplayNextSentence();
        return;
      }

      const words = currentSentence.split(/\s+/).filter(word => word.length > 0);

      currentUtterance = new SpeechSynthesisUtterance(currentSentence);
      currentUtterance.voice = voice;
      currentUtterance.rate = 0.95;
      currentUtterance.pitch = 1.05;
      currentUtterance.volume = 1.0;

      currentUtterance.onend = () => {
        sentenceIndex++;
        // Small delay before starting the next sentence for better pacing
        sentenceDelayTimeout = setTimeout(speakAndDisplayNextSentence, 500);
      };

      currentUtterance.onerror = (e) => {
        console.error("SpeechSynthesis error:", e.error);
        setIsSpeechDone(true);
        socket.emit("speech-done"); // <--- EMIT even on error to unblock
      };

      speechSynthesis.speak(currentUtterance);

      let wordIndex = 0;
      // Clear any previous typing interval before starting a new one for this sentence
      if (typeWordTimeout) clearTimeout(typeWordTimeout);

      const typeNextWord = () => {
        if (wordIndex >= words.length) {
          // All words in this sentence are typed, add a newline for paragraph breaks
          setDisplayedText(prev => prev + '\n\n');
          return;
        }

        const wordToAdd = words[wordIndex];
        // Only add a space if it's not the very first word being displayed,
        // and not immediately after a double newline (which implies a new paragraph).
        setDisplayedText(prev => {
          const needsSpace = prev !== "" && !prev.endsWith('\n\n');
          return prev + (needsSpace ? ' ' : '') + wordToAdd;
        });

        wordIndex++;
        typeWordTimeout = setTimeout(typeNextWord, 100);
      };
      typeNextWord(); // Start typing words for the current sentence
    };

    speakAndDisplayNextSentence();

    return cleanup;
  }, [gamePhase, story]); // Dependencies: Re-run when phase or story content changes


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
    setGamePhase("waiting");
    setStoryAcknowledged(false);
    setShowFullPrompt(false);
    setFadeOut(false);
    setIsStoryLoading(false);
    setIsSpeechDone(false); // Reset on restart
    setDisplayedText(""); // Reset

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setMusicStarted(false);
  };

  useEffect(() => {
    if (gamePhase === "answer") {
      setShowFullPrompt(true);
      setFadeOut(false);
      const timeout = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setShowFullPrompt(false);
        }, 1000);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [gamePhase]);

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
    socket.on("timer-update", (timeLeft) => {
      setTimer(Math.max(0, timeLeft - 1));
    });
    socket.on("answer-timer-update", (timeLeft) => {
      setAnswerTimer(Math.max(0, timeLeft - 1));
    });
    socket.on("player-submitted", ({ playerId }) =>
      setSubmittedPlayers((prev) => [...prev, playerId])
    );
    socket.on("answers-collected", ({ answers }) => {
      setAnswers(answers);
      console.log("📨 Answers collected:", answers);
    });

    socket.on("story-loading", () => {
      setIsStoryLoading(true);
    });

    socket.on("story-generated", ({ story }) => {
      console.log("📖 Story received:", story);
      setIsStoryLoading(false); // Make sure to turn off loading when story arrives
      setStory(story);
      setGamePhase("story");
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
      setDisplayedText("");
      setIsSpeechDone(false); // Reset on round reset
      speechSynthesis.cancel();
    });

    socket.on("game-ended", ({ placements }) => {
      console.log("🏁 Game ended with results:", placements);
      setGameStarted(false);
      setFinalResults(placements);
    });

    // New listener for proceeding to evaluation (from server, triggered by Host)
    socket.on("proceed-to-evaluation", () => {
      setGamePhase("evaluation");
      setStoryAcknowledged(true); // Host's own state for acknowledgment
      console.log("Host: Received proceed-to-evaluation, moving to evaluation.");
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
      socket.off("story-loading");
      socket.off("story-generated");
      socket.off("evaluation-results");
      socket.off("round-reset");
      socket.off("game-ended");
      socket.off("answer-phase-ended");
      socket.off("proceed-to-evaluation"); // Clean up new listener
    };
  }, []);

  const handleStartMusic = () => {
    if (!audioRef.current) {
      const audio = new Audio(musicTracks[gamePhase]);
      audio.volume = 0.1;
      audio.loop = true;
      audioRef.current = audio;
    }
    audioRef.current.play().catch((err) => {
      console.warn("Autoplay failed:", err);
    });
    setMusicStarted(true);
  };

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
    setIsSpeechDone(false); // Reset for next round
  };

  useEffect(() => {
    switch (gamePhase) {
      case "waiting":
        // Only speak if music hasn't started, preventing duplicate announcements
        if (!musicStarted) {
           speak("Welcome! Once all players are in, press the button to begin.");
        }
        break;
      case "prompt":
        speak(
          "It's your turn to set the stage! " +
          "Write a scenario where something bad is happening that the heroes must save, " +
          "and the villains will try to sabotage. " +
          "Make it exciting and clear so everyone knows what’s at stake. " +
          "Remember, the heroes will try to save the day, and the villains will try to stop them."
        );
        break;
      case "answer":
        speak(
          "Listen up, heroes and villains! The city is in danger—something unexpected has just happened. " +
          "Heroes, your mission is to save the day and stop the disaster from unfolding. " +
          "Villains, your job is to sabotage their plans and make sure they fail. " +
          "Remember, everyone already knows their role, so get ready to play your part. " +
          "Choose your actions wisely, because your choices will decide the fate of the city!"
        );
        break;
      case "story":
        // This is handled by the dedicated story useEffect
        break;
      case "evaluation":
        speak("The AI has judged your answers. Let's see the results.");
        break;
      case "final":
        speak("The game has ended. Let's reveal the final scores.");
        break;
      default:
        break;
    }
  }, [gamePhase, musicStarted]); // Added musicStarted as dependency

  useEffect(() => {
    if (!musicStarted || !audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    audioRef.current.src = musicTracks[gamePhase];

    audioRef.current.volume = 0.1;
    audioRef.current.play().catch((err) => {
      console.warn("Autoplay failed on phase change:", err);
    });
  }, [gamePhase, musicStarted]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  // useEffect specifically for scrolling when displayedText updates (Keep this separate)
  useEffect(() => {
    if (storyTextareaRef.current) {
      storyTextareaRef.current.scrollTo({
        top: storyTextareaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [displayedText]);

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
                <span className="player-score"> - {player.score} points</span>
              </li>
            );
          })}
        </ul>
        <button onClick={handleRestartGame} className="restart-button">
          Restart Game
        </button>
      </div>
    );
  };

  return (
    <div className="host-container">
      <audio ref={audioRef} src={musicTracks.waiting} loop />
      <div className="top-bar">
        <button onClick={handleBack} className="flex items-center gap-2 text-white hover:text-gray-300 backbutton">
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <div className="roomcode-text">
            <h3 className="topbar-text">{getTopBarText(gamePhase, promptPlayerName, submittedPrompt)}</h3>
          </div>
        </div>
      </div>

      <video
        key={gamePhase}
        className="background-video"
        src={videos[gamePhase] || videos.waiting}
        autoPlay
        muted
        loop
        playsInline
      />

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

      {gamePhase === "waiting" && !musicStarted && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0,
          width: '100vw', height: '100vh',
          backgroundColor: 'black',
          color: 'white',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img className="logo" src='photos/plottwistlogowhite.png' alt="Plot Twist Logo"></img>
          <h1>The plot thickens</h1>
          <button
            style={{
              padding: '1rem 2rem',
              fontSize: '1.25rem',
              backgroundColor: '#a21c26',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
            onClick={handleStartMusic}
          >
            Start the lobby
          </button>
        </div>
      )}

      <div className="overlay-ui">
        <div className="main">
          {!gameStarted && !finalResults && (
            <>
            <div class="roomcode-container">
              <h1 className="roomcode">{roomCode || "Creating..."}</h1>
              <img src="./photos/qr-code.png"></img>
            </div>
              <h3>Players in Room:</h3>
              <ul className="players-list" >
                {[...Array(8)].map((_, index) => {
                  const player = players[index];
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
                    {timer !== null && <h1 className="prompt-timer">{timer}s</h1>}
                  </div>
                </div>
              )}
              {gamePhase === "answer" && (
                <div className="game-phase-section">
                  <h2>Round {currentRound}/{players.length}</h2>
                  <div>
                    {timer !== null && <h1 className="prompt-timer">{answerTimer}s</h1>}
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
                  <div className="playerdiv">
                    <h2 className="player-announcement">players:</h2>
                    <ul className="submitted-players">
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
                  <div className="aistory" ref={storyTextareaRef}
                    style={{ overflowY: "auto", maxHeight: "300px" }}
                  >
                    <p className="displayed-story">{displayedText}</p>
                  </div>
                  <button
                    onClick={handleContinueToResults}
                    className="continue-button"
                    disabled={!isSpeechDone} // This button is for the Host only
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
                      Start Next Round
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