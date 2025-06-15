// This file, Host.js, manages the host's view and game progression in a real-time multiplayer game.
// It handles:
// - Establishing a socket connection to the game server.
// - Displaying the room code for players to join.
// - Showing player updates as they join the room.
// - Orchestrating game phases (waiting, prompt, answer, story, evaluation, final results).
// - Managing timers for prompt and answer phases.
// - Displaying prompts, player answers, and the AI-generated story.
// - Announcing evaluation results and final game placements.
// - Controlling background videos and music based on the current game phase.
// - Implementing text-to-speech (TTS) for game announcements and story narration.
// - Providing controls for starting the game, advancing rounds, and restarting the game.

import { useEffect, useState, useRef } from "react";
import socket from "./socket";
import { useNavigate } from 'react-router-dom';
import { speak } from "./utils/speech";

// Define video paths for each game phase.
const videos = {
  waiting: "/videos/motion_backgrounds3/Color-geometry-1_4k_1.mp4",
  prompt: "/videos/motion_backgrounds3/Color-geometry-11_4k_1.mp4",
  answer: "/videos/motion_backgrounds3/Color-geometry-4_4k_1.mp4",
  story: "/videos/motion_backgrounds3/Color-geometry-6_4k_1.mp4",
  evaluation: "/videos/motion_backgrounds3/Color-geometry-12_4k_1.mp4",
  final: "/videos/motion_backgrounds3/Color-geometry-7_4k_1.mp4",
};

// Define music track paths for each game phase.
const musicTracks = {
  waiting: "/music/waiting.mp3",
  prompt: "/music/prompt.mp3",
  answer: "/music/answer.mp3",
  story: "/music/story.mp3",
  evaluation: "/music/waiting.mp3",
  final: "/music/waiting.mp3",
};

// Helper function to determine the top bar text based on the current game phase.
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
  // State variables to manage game data and UI.
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

  // State and ref for music playback.
  const [musicStarted, setMusicStarted] = useState(false);
  const audioRef = useRef(null);

  // Handles navigation back to the home screen, pausing and clearing any speech or music.
  const handleBack = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    speechSynthesis.cancel();
    navigate('/');
  };

  // Handles proceeding from the story phase to the evaluation phase.
  const handleContinueToResults = () => {
    speechSynthesis.cancel(); // Stop any ongoing speech.
    setStoryAcknowledged(true); // Mark story as acknowledged on the host's end.
    socket.emit("continue-to-results"); // Emit event to server to advance all clients to results.
    setGamePhase("evaluation"); // Update host's own view immediately to evaluation phase.
  };

  // Effect hook for displaying the story text word by word and playing it via TTS.
  useEffect(() => {
    let typeWordTimeout;
    let sentenceDelayTimeout;
    let currentUtterance;

    // Cleanup function to clear timeouts and speech synthesis.
    const cleanup = () => {
      if (typeWordTimeout) clearTimeout(typeWordTimeout);
      if (sentenceDelayTimeout) clearTimeout(sentenceDelayTimeout);
      if (currentUtterance) {
        speechSynthesis.cancel();
      }
      setDisplayedText("");
    };

    // If not in the story phase or no story content, perform cleanup and return.
    if (gamePhase !== "story" || !story) {
      cleanup();
      return;
    }

    setDisplayedText(""); // Clear displayed text when entering story phase.
    setIsSpeechDone(false); // Reset speech status.
    speechSynthesis.cancel(); // Ensure no leftover speech from previous phases.

    // Configure speech synthesis.
    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith("en")) || voices[0];
    // Split story into sentences for better pacing during TTS.
    const sentences = story.match(/[^.!?]+[.!?]+/g) || [story];

    let sentenceIndex = 0;

    // Function to speak and display the next sentence.
    const speakAndDisplayNextSentence = () => {
      // If all sentences have been processed, mark speech as done and notify server.
      if (sentenceIndex >= sentences.length) {
        setIsSpeechDone(true);
        socket.emit("speech-done"); // HOST EMITS SPEECH DONE TO SERVER.
        return;
      }

      const currentSentence = sentences[sentenceIndex].trim();
      if (currentSentence.length === 0) {
        sentenceIndex++;
        speakAndDisplayNextSentence();
        return;
      }

      // Split sentence into words for word-by-word display effect.
      const words = currentSentence.split(/\s+/).filter(word => word.length > 0);

      // Create and configure the speech utterance.
      currentUtterance = new SpeechSynthesisUtterance(currentSentence);
      currentUtterance.voice = voice;
      currentUtterance.rate = 0.95;
      currentUtterance.pitch = 1.05;
      currentUtterance.volume = 1.0;

      // Callback when a sentence finishes speaking.
      currentUtterance.onend = () => {
        sentenceIndex++;
        sentenceDelayTimeout = setTimeout(speakAndDisplayNextSentence, 500); // Small delay for pacing.
      };

      // Error handling for speech synthesis.
      currentUtterance.onerror = (e) => {
        console.error("SpeechSynthesis error:", e.error);
        setIsSpeechDone(true);
        socket.emit("speech-done"); // Emit even on error to unblock the game.
      };

      speechSynthesis.speak(currentUtterance);

      let wordIndex = 0;
      // Clear any previous typing interval before starting a new one.
      if (typeWordTimeout) clearTimeout(typeWordTimeout);

      // Function to type the next word.
      const typeNextWord = () => {
        if (wordIndex >= words.length) {
          // Add double newline for paragraph breaks after a sentence.
          setDisplayedText(prev => prev + '\n\n');
          return;
        }

        const wordToAdd = words[wordIndex];
        // Add a space before the word unless it's the very first word or after a new paragraph.
        setDisplayedText(prev => {
          const needsSpace = prev !== "" && !prev.endsWith('\n\n');
          return prev + (needsSpace ? ' ' : '') + wordToAdd;
        });

        wordIndex++;
        typeWordTimeout = setTimeout(typeNextWord, 100); // Adjust typing speed here.
      };
      typeNextWord(); // Start typing words for the current sentence.
    };

    speakAndDisplayNextSentence();

    return cleanup; // Return cleanup function for useEffect.
  }, [gamePhase, story]); // Dependencies: Re-run when gamePhase or story content changes.

  // Handles restarting the game, resetting all relevant state variables.
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
    setIsSpeechDone(false); // Reset speech status.
    setDisplayedText(""); // Reset displayed text.

    // Pause and reset audio if playing.
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setMusicStarted(false);
  };

  // Effect hook to manage the full prompt display and fade-out animation during the "answer" phase.
  useEffect(() => {
    if (gamePhase === "answer") {
      setShowFullPrompt(true);
      setFadeOut(false);
      const timeout = setTimeout(() => {
        setFadeOut(true);
        setTimeout(() => {
          setShowFullPrompt(false);
        }, 1000); // Duration of the fade-out animation.
      }, 5000); // How long the full prompt is displayed before fading out.
      return () => clearTimeout(timeout);
    }
  }, [gamePhase]);

  // Main effect hook for handling all socket event listeners.
  useEffect(() => {
    socket.emit("create-room"); // Request to create a room when the component mounts.

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
      setTimer(Math.max(0, timeLeft - 1)); // Display adjusted timer for user experience.
    });
    socket.on("answer-timer-update", (timeLeft) => {
      setAnswerTimer(Math.max(0, timeLeft - 1)); // Display adjusted timer for user experience.
    });
    socket.on("player-submitted", ({ playerId }) =>
      setSubmittedPlayers((prev) => [...prev, playerId])
    );
    socket.on("answers-collected", ({ answers }) => {
      setAnswers(answers);
      console.log("📨 Answers collected:", answers);
    });

    socket.on("story-loading", () => {
      setIsStoryLoading(true); // Indicate that the story is being generated.
    });

    socket.on("story-generated", ({ story }) => {
      console.log("📖 Story received:", story);
      setIsStoryLoading(false); // Turn off loading indicator.
      setStory(story);
      setGamePhase("story"); // Transition to story phase.
    });

    socket.on("evaluation-results", (data) => {
      setEvaluationResults({
        winningTeam: data.winningTeam || "Tie",
        impactfulPlayer: data.impactfulPlayer || "None",
        originalPlayer: data.originalPlayer || "None",
        players: data.players || [],
      });
      setIsNextRoundReady(true); // Enable next round button.
    });

    socket.on("answer-phase-ended", ({ nextRoundAvailable }) => {
      setAnswerTimer(null);
      setIsNextRoundReady(nextRoundAvailable);
    });

    // Event listener for round reset.
    socket.on("round-reset", ({ roundNumber }) => {
      setCurrentRound(roundNumber);
      setSubmittedPrompt("");
      setAnswers([]);
      setSubmittedPlayers([]);
      setStory("");
      setEvaluationResults(null);
      setTimer(null);
      setAnswerTimer(null);
      setGamePhase("prompt"); // Reset to prompt phase for the new round.
      setDisplayedText("");
      setIsSpeechDone(false); // Reset speech status.
      speechSynthesis.cancel(); // Cancel any ongoing speech.
    });

// Inside useEffect for socket listeners
    socket.on("game-ended", ({ placements }) => {
        console.log("[CLIENT-DEBUG] 🏁 Game ended event RECEIVED! Final placements:", placements);
        setGameStarted(false);
        setFinalResults(placements);
        setGamePhase("final"); // This is the key state update for your UI
        speak("The game has ended. Let's reveal the final scores.");
    });

    // Listener for proceeding to evaluation, triggered by the Host's `continue-to-results` emit.
    socket.on("proceed-to-evaluation", () => {
      setGamePhase("evaluation");
      setStoryAcknowledged(true); // Host's own state for acknowledgment.
      console.log("Host: Received proceed-to-evaluation, moving to evaluation.");
    });

    // Cleanup function for socket listeners when the component unmounts.
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
      socket.off("proceed-to-evaluation"); // Clean up new listener.
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount.

  // Handles starting the background music.
  const handleStartMusic = () => {
    if (!audioRef.current) {
      const audio = new Audio(musicTracks[gamePhase]);
      audio.volume = 0.1; // Set initial volume.
      audio.loop = true; // Loop the music.
      audioRef.current = audio;
    }
    audioRef.current.play().catch((err) => {
      console.warn("Autoplay failed:", err); // Log autoplay errors.
    });
    setMusicStarted(true);
  };

  // Handles starting the game.
  const handleStartGame = () => {
    console.log("🚀 Starting game in room:", roomCode);
    setErrorMessage(""); // Clear any previous error messages.
    socket.emit("start-game"); // Emit event to server to start the game.
  };

  // Handles advancing to the next round.
  const handleNextRound = () => {
    setStoryAcknowledged(false); // Reset story acknowledgment for the new round.
    const nextRound = currentRound + 1;
    console.log(`[CLIENT-DEBUG] Requesting next round. Client currentRound: ${currentRound}. Emitting 'start-next-round'.`);
    console.log(`🔁 Requesting next round (${nextRound})`);
    socket.emit("start-next-round", { round: nextRound }); // Emit event to server.
    setIsNextRoundReady(false); // Disable next round button until ready again.
    setIsSpeechDone(false); // Reset speech status for the new round.
  };

  // Effect hook to trigger text-to-speech announcements based on game phase.
  useEffect(() => {
    switch (gamePhase) {
      case "waiting":
        // Only speak if music hasn't started, preventing duplicate announcements.
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
        // Story narration is handled by the dedicated story useEffect.
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
  }, [gamePhase, musicStarted]); // Added musicStarted as dependency to prevent re-speaking on music start.

  // Effect hook to change background music when the game phase changes.
  useEffect(() => {
    if (!musicStarted || !audioRef.current) return; // Only change music if it's already started and audioRef exists.

    audioRef.current.pause(); // Pause current track.
    audioRef.current.currentTime = 0; // Reset playback to beginning.
    audioRef.current.src = musicTracks[gamePhase]; // Set new source based on game phase.

    audioRef.current.volume = 0.1; // Maintain volume.
    audioRef.current.play().catch((err) => {
      console.warn("Autoplay failed on phase change:", err); // Log autoplay errors.
    });
  }, [gamePhase, musicStarted]); // Depend on gamePhase and musicStarted.

  // Effect hook for cleaning up audio on component unmount.
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this runs once on mount and once on unmount.

  // Effect hook specifically for auto-scrolling the story text area as new text appears.
  useEffect(() => {
    if (storyTextareaRef.current) {
      storyTextareaRef.current.scrollTo({
        top: storyTextareaRef.current.scrollHeight, // Scroll to the bottom.
        behavior: 'smooth', // Smooth scroll animation.
      });
    }
  }, [displayedText]); // Re-run whenever displayedText updates.

  // Renders the final game results, sorted by score.
  const renderFinalResults = () => {
    const sortedResults = [...finalResults].sort((a, b) => b.score - a.score); // Sort players by score in descending order.

    return (
      <div className="final-results">
        <h3>🏆 Final Results:</h3>
        <ul className="results-list">
          {sortedResults.map((player, index) => {
            let placeClass = "";
            // Assign CSS classes for different places.
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
      {/* Audio element for background music. */}
      <audio ref={audioRef} src={musicTracks.waiting} loop />
      <div className="top-bar">
        {/* Button to navigate back. */}
        <button onClick={handleBack} className="flex items-center gap-2 text-white hover:text-gray-300 backbutton">
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          {/* Display dynamic top bar text. */}
          <div className="roomcode-text">
            <h3 className="topbar-text">{getTopBarText(gamePhase, promptPlayerName, submittedPrompt)}</h3>
          </div>
        </div>
      </div>

      {/* Background video that changes with game phase. */}
      <video
        key={gamePhase} // Key ensures video reloads when gamePhase changes.
        className="background-video"
        src={videos[gamePhase] || videos.waiting} // Fallback to waiting video.
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Full-screen prompt overlay during the answer phase. */}
      {showFullPrompt && submittedPrompt && (
        <div className={`fullscreen-prompt-overlay ${fadeOut ? "fade-out" : ""}`}>
          {/* Background video for the prompt overlay. */}
          <video
            autoPlay
            muted
            loop
            playsInline
            className="background-video"
          >
            <source src="/videos/motion_backgrounds3/Color-geometry-3_4k_1.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          {/* The submitted prompt text. */}
          <div className="prompt-text">{submittedPrompt}</div>
        </div>
      )}
      {/* Loading overlay when story is being generated. */}
      {isStoryLoading && (
        <div className="story-loading-overlay">
          <div className="loading-spinner" />
          <p>Crafting your story...</p>
        </div>
      )}

      {/* Initial waiting screen for music start prompt. */}
      {gamePhase === "waiting" && !musicStarted && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          {/* Background video for the initial waiting screen. */}
          <video
            autoPlay
            muted
            loop
            playsInline
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: -1, // Put behind text/content.
            }}
          >
            <source src="/videos/motion_backgrounds3/Color-geometry-6_4k_1.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          {/* Corner decoration (currently hidden by 'display: none'). */}
          <img
            src="/photos/cornerlogo.png"
            alt="Corner Decoration"
            style={{
              position: 'fixed',
              bottom: '0px',
              right: '0px',
              width: '150px',
              height: 'auto',
              zIndex: 10000,
              display: 'none',
            }}
            className="corner-photo"
          />
          {/* Game logo. */}
          <div class ="circle-logo">
                      <img class="logocircle" src="photos/circle.png" alt="cirkel achter logo"></img>
                <img className="logo" src='photos/plottwistlogowhite.png' alt="Plot Twist Logo"></img>
          </div>
          {/* Button to start music and proceed to the lobby. */}
          <button className="start-music"
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

      {/* Main overlay UI for game content. */}
      <div className="overlay-ui">
        {/* Corner decoration (currently hidden by 'display: none'). */}
        <img
          src="/photos/cornerlogo.png"
          alt="Corner Decoration"
          style={{
            position: 'fixed',
            bottom: '0px',
            right: '0px',
            width: '150px',
            height: 'auto',
            zIndex: 10000,
            display: 'none',
          }}
          className="corner-photo"
        />
        <div className="main">
          {/* Lobby screen: displays room code, QR code, and joined players. */}
          {!gameStarted && !finalResults && (
            <>
              <div className="roomcode-container">
                <h1 className="roomcode">{roomCode || "Creating..."}</h1>
                <img src="./photos/qr-code.png" alt="QR Code" />
              </div>
              <h3>Players in Room:</h3>
              <ul className="players-list" >
                {[...Array(8)].map((_, index) => { // Render up to 8 player slots.
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

          {/* Displays error messages. */}
          {errorMessage && <p className="error-message">{errorMessage}</p>}

          {/* Renders content based on game state (not started, game ended, or active game). */}
          {!gameStarted ? (
            finalResults ? (
              renderFinalResults() // Show final results if game ended.
            ) : (
              // Button to start the game when in waiting phase.
              <button onClick={handleStartGame} className="button">
                Everybody's in
              </button>
            )
          ) : (
            <>
              {/* Prompt phase UI. */}
              {gamePhase === "prompt" && (
                <div className="game-phase-section">
                  <div className="cicle-timer">
                    <img src="/photos/circle.png" alt="Circle Decoration" />
                    {timer !== null && <h1 className="prompt-timer">{timer}s</h1>}
                  </div>
                </div>
              )}
              {/* Answer phase UI. */}
              {gamePhase === "answer" && (
                <div className="game-phase-section">
                  <h2>Round {currentRound}/{players.length}</h2>
                  <div className="cicle-timer">
                    <img src="/photos/circle.png" alt="Circle Decoration" />
                    {timer !== null && <h1 className="prompt-timer">{answerTimer}s</h1>}
                  </div>
                  {/* Display collected answers if available. */}
                  {answers.length > 0 && (
                    <ul>
                      {answers.map((answer, index) => (
                        <li key={index}>
                          <strong>{answer.playerName}:</strong> {answer.answer || "<No answer>"}
                        </li>
                      ))}
                    </ul>
                  )}
                  {/* List of players and their submission status. */}
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
              {/* Story phase UI. */}
              {gamePhase === "story" && (
                <div className="game-phase-section aistory-section">
                  <h2 className="round-header">Round {currentRound}/{players.length}</h2>
                  <h1 className="story-title">This is how your story ended...</h1>
                  {/* Textarea for displaying the AI-generated story with auto-scrolling. */}
                  <div className="aistory" ref={storyTextareaRef}
                    style={{ overflowY: "auto", maxHeight: "300px" }}
                  >
                    <p className="displayed-story">{displayedText}</p>
                  </div>
                  {/* Button to continue to results, disabled until speech is done. */}
                  <button
                    onClick={handleContinueToResults}
                    className="continue-button"
                    disabled={!isSpeechDone}
                  >
                    Continue to Results
                  </button>
                </div>
              )}

              {/* Evaluation results phase UI. */}
              {(gamePhase === "evaluation" || gamePhase === "results") && evaluationResults && storyAcknowledged && (
                <div className="game-phase-section evaluation-section">
                  <h2 className="round-header">Round {currentRound}/{players.length}</h2>
                  <h1 className="evaluation-title"> Judgement Day: Who Thrived, Who Cried?</h1>

                  <div className="evaluation-results">
                    <p><strong>🏆 Winning Team:</strong> {evaluationResults.winningTeam}</p>
                    <p><strong>🌟 Most Impactful Player:</strong> {evaluationResults.impactfulPlayer}</p>
                    <p><strong>🎨 Most Original Player:</strong> {evaluationResults.originalPlayer}</p>
                  </div>

                  <h2 className="points-header"> Points</h2>
                  <ul className="evaluation-players">
                    {evaluationResults.players.map((player, index) => (
                      <li key={index}>
                        <p>{player.name}: {player.score}</p>
                      </li>
                    ))}
                  </ul>

                  {/* Button to start the next round, enabled when ready. */}
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