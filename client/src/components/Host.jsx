import { useEffect, useState, useRef } from "react";
import socket from "./socket"; // Shared socket instance
import { useNavigate } from 'react-router-dom';
import { speak } from "./utils/speech";

//




const videos = {
  waiting: "/videos/motion_backgrounds3/Color-geometry-1_4k_1.mp4",
  prompt: "/videos/motion_backgrounds3/Color-geometry-2_4k_1.mp4",
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

  navigate('/');
};

const handleContinueToResults = () => {
  speechSynthesis.cancel(); // Stop any ongoing speech

  setStoryAcknowledged(true); // or whatever state transition you're using
  setGamePhase("evaluation"); // or whatever phase comes next
};



  const [backgroundAudio, setBackgroundAudio] = useState(null);

useEffect(() => {
  const speakStory = (voices) => {
    if (gamePhase === "story" && story) {
      const voice = voices.find(v => v.name === "Google US English") || voices[0];
      const sentences = story.match(/[^.!?]+[.!?]+/g) || [story];

      let index = 0;
      setIsSpeechDone(false);
      speechSynthesis.cancel(); // Cancel any queued speech

      const speakNext = () => {
        if (index >= sentences.length) {
          setIsSpeechDone(true);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(sentences[index].trim());
        utterance.voice = voice;
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;  // <- Add this line to increase TTS volume

        utterance.onend = () => {
          index++;
          speakNext();
        };

        utterance.onerror = (e) => {
          console.error("SpeechSynthesis error:", e.error);
          setIsSpeechDone(true);
        };

        speechSynthesis.speak(utterance);
      };

      speakNext();
    }
  };

  const loadVoices = () => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      speakStory(voices);
    } else {
      speechSynthesis.onvoiceschanged = () => {
        const loadedVoices = speechSynthesis.getVoices();
        speakStory(loadedVoices);
      };
    }
  };

  loadVoices();
}, [gamePhase, story]);


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
    useEffect(() => {
  if (gamePhase === "story" && story) {
    const words = story.split(" ");
    let index = 0;

    setDisplayedText(""); // Clear old text first

    const interval = setInterval(() => {
      if (index >= words.length) {
        clearInterval(interval);
        return;
      }

      setDisplayedText(prev => prev + (index === 0 ? "" : " ") + words[index]);
      index++;
    }, 300); // Adjust speed (milliseconds per word)

    return () => clearInterval(interval);
  }
}, [gamePhase, story]);

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

    socket.on("timer-update", (timeLeft) => {
  setTimer(Math.max(0, timeLeft - 1));
});
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

    socket.on("answer-timer-update", (timeLeft) => {
  setAnswerTimer(Math.max(0, timeLeft - 1));
});
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
  }, []);

const handleStartMusic = () => {
  if (!audioRef.current) {
    const audio = new Audio(musicTracks[gamePhase]);
    audio.volume = 0.1;  // Use a sensible default volume, not 0 or 0.01
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
  };

  
useEffect(() => {
  switch (gamePhase) {
    case "waiting":
      speak("Welcome! Once all players are in, press the button to begin.");
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
      // Already handled by your existing TTS logic
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
}, [gamePhase]);

useEffect(() => {
  if (!musicStarted || !audioRef.current) return;

  // Pause current audio before changing
  audioRef.current.pause();
  audioRef.current.currentTime = 0;
  audioRef.current.src = musicTracks[gamePhase];

  audioRef.current.volume = 0.1;
  // Play the new track
  audioRef.current.play().catch((err) => {
    console.warn("Autoplay failed on phase change:", err);
  });

  // No cleanup needed here, since audioRef persists
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

 // New useEffect specifically for scrolling when displayedText updates
  useEffect(() => {
    if (storyTextareaRef.current) {
      storyTextareaRef.current.scrollTo({
        top: storyTextareaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [displayedText]); // This dependency correctly triggers scroll on each update

  // ************ MODIFIED USE EFFECT FOR WORD-BY-WORD DISPLAY ************
  useEffect(() => {
    if (gamePhase !== "story" || !story) {
      setDisplayedText("");
      setIsSpeechDone(false); // Reset speech done state
      return;
    }

    const voices = speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === "Google US English") || voices[0];
    const sentences = story.match(/[^.!?]+[.!?]+/g) || [story];

    let sentenceIndex = 0;
    setDisplayedText(""); // Start empty
    setIsSpeechDone(false);
    speechSynthesis.cancel(); // Cancel any previous speech

    const typeWord = (words, wordIndex, currentTypedText, resolve) => {
      if (wordIndex >= words.length) {
        resolve(); // All words in the sentence typed
        return;
      }

      // Add a space before the word if it's not the very first word of the story
      const prefix = (currentTypedText === "" && sentenceIndex === 0 && wordIndex === 0) ? "" : " ";

      setDisplayedText(prev => prev + prefix + words[wordIndex]);

      const delay = 100; // Adjust this delay for word typing speed (in milliseconds)
      setTimeout(() => {
        typeWord(words, wordIndex + 1, currentTypedText + prefix + words[wordIndex], resolve);
      }, delay);
    };

    const speakAndDisplayNextSentence = () => {
      if (sentenceIndex >= sentences.length) {
        setIsSpeechDone(true); // All sentences spoken and displayed
        return;
      }

      const currentSentence = sentences[sentenceIndex].trim();
      const words = currentSentence.split(/\s+/).filter(word => word.length > 0); // Split by spaces and filter empty strings

      // Speak the entire sentence
      const utterance = new SpeechSynthesisUtterance(currentSentence);
      utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      utterance.onend = () => {
        sentenceIndex++;
        // Wait a small moment before starting the next sentence's display/speech
        setTimeout(speakAndDisplayNextSentence, 500); // Delay between sentences
      };

      utterance.onerror = (e) => {
        console.error("SpeechSynthesis error:", e.error);
        setIsSpeechDone(true);
      };

      speechSynthesis.speak(utterance);

      // Display words one by one for the current sentence
      new Promise(resolve => {
        typeWord(words, 0, displayedText, resolve);
      }).then(() => {
        // After all words in a sentence are displayed, add a sentence break (e.g., a space)
        // This is handled by the initial `setDisplayedText(prev => prev + prefix + words[wordIndex]);`
        // if you want line breaks, you'd add <br /> or \n here
      });
    };

    // Initial call to start the process
    speakAndDisplayNextSentence();

    // Cleanup on unmount or story/gamePhase change
    return () => {
      speechSynthesis.cancel();
      clearTimeout(); // Clear any pending timeouts for typing
    };
  }, [gamePhase, story]); // Keep these dependencies for initial story setup
  // ************ END MODIFIED USE EFFECT ************

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
     Restart Game
  </button>
</div>

  );
};


  return (
    
    <div className="host-container">
      <audio ref={audioRef} src={musicTracks.waiting} loop />
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
    <img className="logo" src='photos/plottwistlogowhite.png'></img>
    <h1>The plot thickens</h1>
    <img></img>
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
<div className="aistory"  ref={storyTextareaRef} // your existing ref for the displayed text div
  style={{ overflowY: "auto", maxHeight: "300px" }} // or whatever styling fits your UI
  >
  <p className="displayed-story">{displayedText}</p>
</div>

    <button
      onClick={() => {
        setStoryAcknowledged(true);
        setGamePhase("evaluation");
        {handleContinueToResults}
      }}
      className="continue-button"
      disabled={!isSpeechDone} // Disable until story is acknowledged
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