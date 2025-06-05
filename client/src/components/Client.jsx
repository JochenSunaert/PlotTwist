// Client.js
import { useEffect, useState, useRef, useCallback } from "react";
import socket from "./socket";

const videos = {
  lobby: "/videos/motion_backgrounds3/Color-geometry-10_4k_1.mp4",
  prompt: "/videos/motion_backgrounds3/Color-geometry-6_4k_1.mp4",
  answer: "/videos/motion_backgrounds3/Color-geometry-12_4k_1.mp4",
  waiting: "/videos/motion_backgrounds3/Color-geometry-9_4k_1.mp4",
  displayAnswers: "/videos/motion_backgrounds3/Color-geometry-11_4k_1.mp4", // Or where story/answers are shown
  story: "/videos/motion_backgrounds3/Color-geometry-4_4k_1.mp4", // Explicit story video
  evaluation: "/videos/motion_backgrounds3/Color-geometry-7_4k_1.mp4", // For AI evaluation results
  final: "/videos/motion_backgrounds3/Color-geometry-1.mp4", // For final game-over screen
};

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
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [timer, setTimer] = useState(null);
  const [answer, setAnswer] = useState("");
  const [answerPhase, setAnswerPhase] = useState(false);
  const [answersSubmitted, setAnswersSubmitted] = useState(false);
  const [answerTimer, setAnswerTimer] = useState(null);
  const [gamePhase, setGamePhase] = useState("lobby");
  const [allPlayerAnswers, setAllPlayerAnswers] = useState([]);
  const [isGameStarter, setIsGameStarter] = useState(false); // State for game starter privilege
  const [isSpeechDone, setIsSpeechDone] = useState(false); // State for speech completion

  const [generatedStory, setGeneratedStory] = useState(""); // To display the AI-generated story (optional for this phase, but good to have)
const [evaluationResults, setEvaluationResults] = useState(null); // To store AI evaluation summary (winning team, impactful player, etc.)
const [gamePlacements, setGamePlacements] = useState([]); // Used for the final game results screen, but good to have declared
const [players, setPlayers] = useState([]); // CRUCIAL: To store the list of players with their updated scores

  const answerRef = useRef(answer);
  const answersSubmittedRef = useRef(answersSubmitted);
  const promptSubmittedRef = useRef(false);
  const promptRef = useRef(prompt);
  const startGameButtonRef = useRef(null);
  const continueButtonRef = useRef(null);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    answersSubmittedRef.current = answersSubmitted;
  }, [answersSubmitted]);

  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  useEffect(() => {
    if (isGameStarter && joinedRoom && !gameStarted && startGameButtonRef.current) {
      startGameButtonRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isGameStarter, joinedRoom, gameStarted]);

  useEffect(() => {
    // CONDITION: Use isGameStarter
    if (isGameStarter && gamePhase === "waiting" && submittedPrompt && allPlayerAnswers.length > 0 && isSpeechDone && continueButtonRef.current) {
      continueButtonRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [isGameStarter, gamePhase, submittedPrompt, allPlayerAnswers.length, isSpeechDone]);


  const predefinedPrompts = [
    "A notorious thief has stolen a valuable diamond from the city's museum and it's your job to either catch the thief or help them escape.",
    "A hacked satellite will crash into the city in 10 minutes.",
    "A high-tech bank is being robbed in the middle of the night.",
    "A mad scientist has unleashed a swarm of robotic insects downtown.",
    "A powerful AI has taken over the city’s power grid and threatens to plunge it into darkness.",
    "A mysterious fog has turned citizens into zombies—stop or spread the infection!",
    "A magical portal has opened in the sky and mythical beasts are coming through.",
    "A celebrity has been kidnapped during a live awards show—save or sabotage the rescue.",
    "A luxury space cruise is malfunctioning and headed straight for the sun.",
    "Time is breaking—past and future versions of people are appearing everywhere.",
    "A haunted amusement park is trapping visitors inside creepy creepy attractions.",
    "The mayor has been replaced by a shapeshifter—expose or protect the impostor.",
    "Aliens have landed and demand Earth's rarest resource: chocolate.",
    "A massive volcano under the city is about to erupt—cause panic or prevent disaster.",
    "A magical artifact has gone missing from a secret underground temple.",
    "The city’s dreams are becoming real overnight—turn them into nightmares or sweet dreams.",
    "A talking dog has become the only one who knows a dangerous secret.",
    "An ancient curse causes everyone to speak only in rhymes—lift it or make it worse.",
    "A rogue amusement drone army is terrorizing the city with confetti bombs.",
    "Everyone’s internet history has been made public—save reputations or stir chaos.",
    "The moon is slowly falling toward Earth. Someone messed up big time."
  ];

  const handleJoin = () => {
    setIsGameStarter(false); // Reset before emitting join-room
    if (name.trim() && roomCode.trim()) {
      socket.emit("join-room", { roomCode: roomCode.trim().toUpperCase(), name });
    }
  };

  const handleStartNextRound = () => {
  console.log("Client: Host requesting to start next round.");
  socket.emit("start-next-round");
};

  const handleStartGame = () => {
    console.log("Attempting to start game from client in room:", roomCode);
    setErrorMessage("");
    socket.emit("start-game");
  };

  const handleSubmitPrompt = useCallback(() => {
    if (promptSubmittedRef.current) {
      console.log("Client: Prompt already submitted for this round, skipping.");
      return;
    }
    const promptToSend = promptRef.current.trim();
    console.log(`Client: Manual/Auto-submitting prompt: "${promptToSend}"`);
    socket.emit("submit-prompt", { prompt: promptToSend });
    promptSubmittedRef.current = true;
  }, []);
  
  const handleRandomPrompt = () => {
    const randomPrompt = predefinedPrompts[Math.floor(Math.random() * predefinedPrompts.length)];
    setPrompt(randomPrompt);
  };

  const handleSubmitAnswer = useCallback(() => {
    if (answersSubmittedRef.current) {
      console.log("Client: Already submitted answer for this round, skipping.");
      return;
    }
    const answerToSend = answerRef.current.trim();
    console.log(`Client: Manual/Auto-submitting answer: "${answerToSend}"`);
    socket.emit("submit-answer", { playerName: name, answer: answerToSend });
    setAnswersSubmitted(true);
  }, [name]);

  const handleContinueToResults = () => {
    // Only the game starter (host) can click this. It emits to the server.
    socket.emit("continue-to-results");
  };

  useEffect(() => {
    const handleJoinedRoom = () => {
      setJoinedRoom(true);
      setErrorMessage("");
      setGamePhase("lobby");
    };

    const handleErrorMessage = (message) => setErrorMessage(message);

    const handleTeamAssigned = ({ team }) => {
      setTeam(team);
    };

    const handleGameStarted = () => {
      setGameStarted(true);
      setGamePhase("waiting");
    };

    const handleIsGameStarter = ({ isGameStarter }) => {
      setIsGameStarter(isGameStarter);
      console.log(`Client ${name}: Am I game starter? ${isGameStarter}`);
    };

    const handlePromptPlayer = ({ isPromptPlayer }) => {
      setIsPromptPlayer(isPromptPlayer);
      setWaitingForPrompt(!isPromptPlayer);
      setGamePhase(isPromptPlayer ? "prompt" : "waiting");
      promptSubmittedRef.current = false;
      setPrompt("");
    };

    const handlePromptSelection = ({ playerName }) => {
      setPromptPlayerName(playerName);
    };

    const handlePromptSubmitted = ({ prompt }) => {
      setSubmittedPrompt(prompt || "Prompt is empty");
      setWaitingForPrompt(false);
      setIsPromptPlayer(false);
      setGamePhase("waiting");
    };

    const handleTimerUpdate = (timeLeft) => {
      setTimer(Math.max(0, timeLeft - 1));
      if (isPromptPlayer && timeLeft === 1 && !promptSubmittedRef.current) {
        console.log("Client: Prompt timer almost ended (1s left), auto-submitting current prompt.");
        handleSubmitPrompt();
      }
    };

    const handleStartAnswerPhase = () => {
      setAnswerPhase(true);
      setAnswersSubmitted(false);
      setAnswer("");
      setGamePhase("answer");
      setAllPlayerAnswers([]);
      console.log("Client: Started answer phase.");
    };

    const handleAnswerTimerUpdate = (timeLeft) => {
      setAnswerTimer(Math.max(0, timeLeft - 1));
      if (timeLeft === 1 && !answersSubmittedRef.current) {
        console.log("Client: Answer timer almost ended (1s left), auto-submitting current answer.");
        handleSubmitAnswer();
      }
    };

    const handleAnswerPhaseEnded = ({ allPlayerAnswers }) => {
      console.log("Client: Answer phase ended (event received from server). All answers:", allPlayerAnswers);
      setAnswerPhase(false);
      setAnswerTimer(null);
      setAnswersSubmitted(true);
      setAllPlayerAnswers(allPlayerAnswers);
      setGamePhase("waiting"); // Transition to waiting phase after answers are received
      // Server will then signal 'speech-done' once the host finishes narration
    };

    const handleSpeechDone = () => {
      // This listener handles the server's broadcast of 'speech-done'
      setIsSpeechDone(true);
      console.log("Client: Received 'speech-done' from server. Speech is done.");
    };

    const handleNextRound = ({ currentRound, totalRounds, promptPlayerName }) => {
      setCurrentRound(currentRound);
      setTotalRounds(totalRounds);
      setPromptPlayerName(promptPlayerName);
      setSubmittedPrompt("");
      setAnswer("");
      setAnswersSubmitted(false);
      setAnswerPhase(false);
      setIsPromptPlayer(false);
      promptSubmittedRef.current = false;
      setPrompt("");
      setAllPlayerAnswers([]);
      setGamePhase("waiting");
      setIsSpeechDone(false); // Reset for new round
      console.log("Client: Starting next round.");
    };

   const handleGameEnded = ({ placements }) => {
      console.log("🏁 Client: Game ended with results:", placements);
      setGameStarted(false); // Game is officially over
      setGamePlacements(placements); // Store final placements
      // Reset all other relevant game states here to ensure a clean slate
      setName("");
      setRoomCode("");
      setJoinedRoom(false);
      setTeam(null);
      setIsPromptPlayer(false);
      setPrompt("");
      setSubmittedPrompt("");
      setAnswer("");
      setAnswersSubmitted(false);
      setAllPlayerAnswers([]);
      setGeneratedStory("");
      setEvaluationResults(null);
      setIsGameStarter(false);
      setIsSpeechDone(false);
      setGamePhase("final"); // Set to a dedicated "final" phase to render final results
    };

    const handleRoundReset = () => {
      setSubmittedPrompt("");
      setIsPromptPlayer(false);
      setWaitingForPrompt(true);
      setGamePhase("waiting");
      setAnswer("");
      setAnswersSubmitted(false);
      setPrompt("");
      promptSubmittedRef.current = false;
      setAllPlayerAnswers([]);
      setIsSpeechDone(false); // Reset for new round
      console.log("Client: Round reset.");
    };

   const handleProceedToEvaluation = () => {
      setGamePhase("evaluation");
      console.log("Client: Received proceed-to-evaluation from server, moving to evaluation.");
      // Clear story/evaluation results if they were previously displayed in a different phase
      setGeneratedStory("");
      setEvaluationResults(null);
    };

    const handleEvaluationResults = (data) => {
  console.log("Client: Received evaluation results:", data);
  setEvaluationResults(data); // Set the summary evaluation results (winning team, etc.)

  // IMPORTANT: Update the players state with their new scores
  if (data && data.players) {
    setPlayers(data.players);
  }
  // If your server also sends the generated story with evaluation results, update it:
  if (data && data.generatedStory) {
    setGeneratedStory(data.generatedStory);
  }
};



    // Socket Event Listeners
    socket.on("joined-room", handleJoinedRoom);
    socket.on("error-message", handleErrorMessage);
    socket.on("team-assigned", handleTeamAssigned);
    socket.on("game-started", handleGameStarted);
    socket.on("is-game-starter", handleIsGameStarter);
    socket.on("prompt-player", handlePromptPlayer);
    socket.on("prompt-selection", handlePromptSelection);
    socket.on("prompt-submitted", handlePromptSubmitted);
    socket.on("timer-update", handleTimerUpdate);
    socket.on("start-answer-phase", handleStartAnswerPhase);
    socket.on("answer-timer-update", handleAnswerTimerUpdate);
    socket.on("answer-phase-ended", handleAnswerPhaseEnded);
    socket.on("speech-done", handleSpeechDone); // <--- Client listens for this from the server
    socket.on("next-round", handleNextRound);
    socket.on("game-ended", handleGameEnded);
    socket.on("round-reset", handleRoundReset);
    socket.on("proceed-to-evaluation", handleProceedToEvaluation);
    socket.on("evaluation-results", handleEvaluationResults);

    // Cleanup function for unmounting
    return () => {
      socket.off("joined-room", handleJoinedRoom);
      socket.off("error-message", handleErrorMessage);
      socket.off("team-assigned", handleTeamAssigned);
      socket.off("game-started", handleGameStarted);
      socket.off("is-game-starter", handleIsGameStarter);
      socket.off("prompt-player", handlePromptPlayer);
      socket.off("prompt-selection", handlePromptSelection);
      socket.off("prompt-submitted", handlePromptSubmitted);
      socket.off("timer-update", handleTimerUpdate);
      socket.off("start-answer-phase", handleStartAnswerPhase);
      socket.off("answer-timer-update", handleAnswerTimerUpdate);
      socket.off("answer-phase-ended", handleAnswerPhaseEnded);
      socket.off("speech-done", handleSpeechDone); // <--- Cleanup
      socket.off("next-round", handleNextRound);
      socket.off("game-ended", handleGameEnded);
      socket.off("round-reset", handleRoundReset);
      socket.off("proceed-to-evaluation", handleProceedToEvaluation);
      socket.off("evaluation-results", handleEvaluationResults);
    };
  }, [handleSubmitAnswer, handleSubmitPrompt, isPromptPlayer, name]);

  return (
    <div className="client-container">
      <video
        key={gamePhase}
        className="background-video"
        src={videos[gamePhase] || videos.lobby}
        autoPlay
        muted
        loop
        playsInline
      />

      <div className="overlay-content">
        <img className="clientlogo" src="./photos/plottwistlogowhite.png"></img>

        {gamePhase === "lobby" && !joinedRoom && (
          <div className="lobby-form">
            <h4>Your name</h4>
            <input
              type="text"
              placeholder="What should we call you?"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <h4>Room code</h4>
            <input
              type="text"
              placeholder="for example: BEEF, ZANY, LOLZ"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <button onClick={handleJoin}>Join Room</button>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </div>
        )}

        {gamePhase === "lobby" && joinedRoom && !gameStarted && (
          <div className="lobby-message">
            <h3 className="joined-message"> You joined room {roomCode.toUpperCase()}</h3>
            <p>Please wait for the host to start the game...</p>
            {isGameStarter && (
              <button onClick={handleStartGame} className="button startbutton" ref={startGameButtonRef}>
                Everybody's in
              </button>
            )}
            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </div>
        )}

        {gamePhase === "start" && (
          <div className="game-start-message">
            <h2>🎉 Game Started!</h2>
            <h3>
              Round {currentRound + 1} of {totalRounds}
            </h3>
            {team && (
              <p className="player-team">
                🧑‍🤝‍🧑 Your team: <strong>{team}</strong>
              </p>
            )}
          </div>
        )}

        {gamePhase === "prompt" && isPromptPlayer && (
          <div className="prompt-section">
            <p className="team-display">You are in team: <h3>{team}</h3></p>
            <h3>You are selecting the prompt!</h3>

            <p className="textleft">Write an exciting scenario where heroes must save the day and villains try to sabotage. Make it clear what’s at stake so everyone knows what to do.</p>
            <div className="block-ruby">
              <h4>hint: </h4>
              <p> press random to get some idea's</p>
            </div>
            <textarea
              placeholder="Write your own prompt or choose one."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="prompt-buttons">
              <button onClick={handleRandomPrompt}>Random</button>
              <button onClick={handleSubmitPrompt} disabled={promptSubmittedRef.current}>
                {promptSubmittedRef.current ? "Prompt Submitted" : "Submit Prompt"}
              </button>
            </div>
            {timer !== null && <p className="timer-display"> Time left: {timer} seconds</p>}
          </div>
        )}

        {gamePhase === "waiting" && waitingForPrompt && (
          <div>
            <p className="waiting-message">
              <p className="team-display">You are in team: <h3>{team}</h3></p>
              Prepare your {team} thoughts while waiting for {promptPlayerName} to submit a prompt...
            </p>
            <h4>Time left: {timer}s</h4>
          </div>
        )}

        {gamePhase === "waiting" && submittedPrompt && (
          <div>

            {allPlayerAnswers.length > 0 && (
              <div className="player-answers">
                <h5>All Player Answers:</h5>
                <ul className="answers-list">
                  {allPlayerAnswers.map((ans, index) => (
                    <li key={index}>
                      <strong>{ans.playerName} ({ans.team}):</strong> {ans.answer === "" ? "No answer provided" : ans.answer}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* Display "Continue to Results" button only for the game starter (host) */}
            {isGameStarter && gamePhase === "waiting" && submittedPrompt && allPlayerAnswers.length > 0 && (
              <button
                onClick={handleContinueToResults}
                className="continue-button"
                 disabled={!isSpeechDone}
                ref={continueButtonRef}
              >
                Continue to Results
              </button>
            )}
          </div>
        )}

        {gamePhase === "answer" && (
          <div className="answer-section">
            <p className="team-display">You are in team: <h3>{team}</h3></p>
            <h4 className="prompt-for-answer">{submittedPrompt}</h4>
            <p className="textleft bottomtext">
              Describe what you would do in this scenario. Heroes try to fix it, villains try to break it. The story continues based on your answer!
            </p>

            <textarea
              placeholder="Write your answer here..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={answersSubmitted || isPromptPlayer}
            />
            <button onClick={handleSubmitAnswer} disabled={answersSubmitted || isPromptPlayer}>
              {answersSubmitted ? "Answer Submitted" : "Submit Answer"}
            </button>
            {answerTimer !== null && <p className="timer-display">⏳ Answer Timer: {answerTimer} seconds</p>}
          </div>
        )}
        {gamePhase === "evaluation" && (
  <div className="evaluation-phase-container">
    <h2>Evaluation Results</h2>
    {/* Display winning team, impactful player, original player from server */}
    {evaluationResults && ( // Assuming evaluationResults is a state variable passed from server
      <div className="results-summary">
        <p>Winning Team: <strong>{evaluationResults.winningTeam}</strong></p>
        <p>Most Impactful Player: <strong>{evaluationResults.impactfulPlayer}</strong></p>
        <p>Most Original Player: <strong>{evaluationResults.originalPlayer}</strong></p>
      </div>
    )}

    {/* Display individual player scores and contributions */}
    {players && players.length > 0 && ( // Assuming 'players' state includes scores from server
      <div className="player-scores">
        <h3>Player Scores:</h3>
        <ul>
          {players.map((player) => (
            <li key={player.id}>
              {player.name} ({player.team}): {player.score} points
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Host-only button to start the next round or end the game */}
    {isGameStarter && ( // Or isHost if you created that state
      <button
        onClick={handleStartNextRound} // Function to emit 'start-next-round' to server
        className="next-round-button"
      >
        {currentRound < totalRounds - 1 ? "Start Next Round" : "End Game"}
      </button>
    )}

    {/* Optionally, show a "Waiting for Host" message for non-hosts */}
    {!isGameStarter && (
      <p className="waiting-message">Waiting for the host to start the next round...</p>
    )}
  </div>
)}
      </div>
    </div>
    
  );
};

export default Client;