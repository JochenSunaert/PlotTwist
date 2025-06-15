// This file defines the Client component, which represents a player's interface in the game.
// It manages the client-side game state, handles user input (joining rooms, submitting prompts/answers),
// displays game information (timers, team assignments, prompts, answers, evaluation results),
// and communicates with the game server via WebSockets (socket.io).

// ############################### Key State Variables & Their Purpose ###############################

// - **name (string)**: Stores the player's chosen name.
// - **roomCode (string)**: Stores the room code the player wishes to join or has joined.
// - **joinedRoom (boolean)**: True if the player has successfully joined a room.
// - **errorMessage (string)**: Displays error messages received from the server.
// - **gameStarted (boolean)**: True once the game officially begins.
// - **team (string | null)**: The team assigned to the player ("Hero" or "Villain").
// - **isPromptPlayer (boolean)**: True if the current player is designated to provide the prompt for the round.
// - **prompt (string)**: The prompt text entered by the `isPromptPlayer`.
// - **waitingForPrompt (boolean)**: True if the player is waiting for the prompt player to submit a prompt.
// - **promptPlayerName (string)**: The name of the player currently providing the prompt.
// - **currentRound (number)**: The current round number (0-indexed).
// - **totalRounds (number)**: The total number of rounds in the game.
// - **submittedPrompt (string)**: The prompt that has been officially submitted for the current round.
// - **timer (number | null)**: Countdown timer for the prompt submission phase.
// - **answer (string)**: The answer text entered by the player for the current prompt.
// - **answerPhase (boolean)**: True when the game is in the answer submission phase.
// - **answersSubmitted (boolean)**: True if the player has submitted their answer for the current round.
// - **answerTimer (number | null)**: Countdown timer for the answer submission phase.
// - **gamePhase (string)**: Controls which UI elements are displayed, representing the current phase of the game (e.g., "lobby", "prompt", "answer", "waiting", "story", "evaluation"). This also dynamically changes the background video.
// - **allPlayerAnswers (Array<Object>)**: An array containing all players' submitted answers for the round, used for display after the answer phase.
// - **isGameStarter (boolean)**: True if the current player is the one who initiated the game (typically the host who created the room). This player has special controls like starting the game or continuing to the next round/phase.
// - **isSpeechDone (boolean)**: True when the host's story narration (Text-to-Speech) has finished playing, allowing the game starter to proceed.
// - **generatedStory (string)**: Stores the AI-generated story for display (primarily on the Host side, but included here for completeness).
// - **evaluationResults (Object | null)**: Stores the summary of the AI's evaluation (winning team, most impactful player, most original player).
// - **gamePlacements (Array<Object>)**: Stores the final player rankings at the end of the entire game.
// - **players (Array<Object>)**: **CRUCIAL**: This state holds the list of all players currently in the game, including their names, teams, and most importantly, their **updated scores** after each evaluation round. This is essential for displaying scores and final rankings.

// ############################### Ref Variables for Immediate Access ###############################

// - **answerRef**: A ref to `answer` state, allowing its current value to be accessed within `useCallback` without recreating the function on every `answer` change.
// - **answersSubmittedRef**: A ref to `answersSubmitted` state, for similar reasons as `answerRef`.
// - **promptSubmittedRef**: A ref to `promptSubmitted` state.
// - **promptRef**: A ref to `prompt` state.
// - **startGameButtonRef**: A ref to the "Everybody's in" button to enable scrolling it into view for the game starter.
// - **continueButtonRef**: A ref to the "Continue to Results" button to enable scrolling it into view for the game starter.

// ############################### Key Functions ###############################

// - **handleJoin()**: Emits a "join-room" event to the server with the player's name and desired room code.
// - **handleStartNextRound()**: Emits a "start-next-round" event to the server, initiated by the game starter.
// - **handleStartGame()**: Emits a "start-game" event to the server, initiated by the game starter.
// - **handleSubmitPrompt()**: Emits a "submit-prompt" event to the server with the entered prompt. Uses `useCallback` and `promptSubmittedRef` to prevent duplicate submissions and ensure the latest prompt value is used.
// - **handleRandomPrompt()**: Selects a random prompt from a predefined list and sets it as the current prompt.
// - **handleSubmitAnswer()**: Emits a "submit-answer" event to the server with the player's submitted answer. Uses `useCallback` and `answersSubmittedRef` to prevent duplicate submissions.
// - **handleContinueToResults()**: Emits a "continue-to-results" event to the server, allowing the game starter to advance to the evaluation phase.

// ############################### useEffect for Socket Listeners and UI Effects ###############################

// The main `useEffect` hook sets up all the Socket.IO event listeners. These listeners are responsible for:
// - Updating local state based on events from the server (e.g., room joined, errors, game started, team assigned, prompt player designated, timers, etc.).
// - Handling the flow of the game phases (lobby -> prompt -> answer -> waiting -> evaluation -> lobby/game over).
// - Triggering auto-submission of prompts/answers if timers run out.
// - Cleaning up listeners when the component unmounts to prevent memory leaks.

// Additional `useEffect` hooks handle:
// - Keeping `useRef` values synchronized with their corresponding `useState` values.
// - Scrolling the "Everybody's in" and "Continue to Results" buttons into view for the game starter when relevant.

import { useEffect, useState, useRef, useCallback } from "react";
import socket from "./socket";

const videos = {
  lobby: "/videos/motion_backgrounds3/Color-geometry-10_4k_1.mp4",
  prompt: "/videos/motion_backgrounds3/Color-geometry-6_4k_1.mp4",
  answer: "/videos/motion_backgrounds3/Color-geometry-12_4k_1.mp4",
  waiting: "/videos/motion_backgrounds3/Color-geometry-9_4k_1.mp4",
  displayAnswers: "/videos/motion_backgrounds3/Color-geometry-11_4k_1.mp4",
  story: "/videos/motion_backgrounds3/Color-geometry-4_4k_1.mp4",
  evaluation: "/videos/motion_backgrounds3/Color-geometry-7_4k_1.mp4",
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
  const [isGameStarter, setIsGameStarter] = useState(false);
  const [isSpeechDone, setIsSpeechDone] = useState(false);

  const [generatedStory, setGeneratedStory] = useState("");
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [gamePlacements, setGamePlacements] = useState([]);
  const [players, setPlayers] = useState([]);

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
    setIsGameStarter(false);
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
      setGamePhase("waiting");
    };

    const handleSpeechDone = () => {
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
      setIsSpeechDone(false);
      console.log("Client: Starting next round.");
    };

    const handleGameEnded = ({ placements }) => {
      console.log("🏁 Client: Game ended with results:", placements);
      setGameStarted(false);
      setGamePlacements(placements);
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
      setGamePhase("lobby");
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
      setIsSpeechDone(false);
      console.log("Client: Round reset.");
    };

    const handleProceedToEvaluation = () => {
      setGamePhase("evaluation");
      console.log("Client: Received proceed-to-evaluation from server, moving to evaluation.");
      setGeneratedStory("");
      setEvaluationResults(null);
    };

    const handleEvaluationResults = (data) => {
      console.log("Client: Received evaluation results:", data);
      setEvaluationResults(data);

      if (data && data.players) {
        setPlayers(data.players);
      }
      if (data && data.generatedStory) {
        setGeneratedStory(data.generatedStory);
      }
    };

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
    socket.on("speech-done", handleSpeechDone);
    socket.on("next-round", handleNextRound);
    socket.on("game-ended", handleGameEnded);
    socket.on("round-reset", handleRoundReset);
    socket.on("proceed-to-evaluation", handleProceedToEvaluation);
    socket.on("evaluation-results", handleEvaluationResults);

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
      socket.off("speech-done", handleSpeechDone);
      socket.off("next-round", handleNextRound);
      socket.off("game-ended", handleGameEnded);
      socket.off("round-reset", handleRoundReset);
      socket.off("proceed-to-evaluation", handleProceedToEvaluation);
      socket.off("evaluation-results", handleEvaluationResults);
    };
  }, [handleSubmitAnswer, handleSubmitPrompt, isPromptPlayer, name]);

  return (
    <div className="client-container">
      {/* The background video changes dynamically based on the current gamePhase */}
      <video
        key={gamePhase}
        className="background-video"
        src={videos[gamePhase] || videos.lobby} // Defaults to 'lobby' video if gamePhase is not found
        autoPlay
        muted
        loop
        playsInline
      />

      <div className="overlay-content">
        <img className="clientlogo" src="./photos/plottwistlogowhite.png"></img>

        {/* Phase: Lobby - Before joining a room */}
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
        {/* Phase: Lobby - After joining a room, waiting for game to start */}
        {gamePhase === "lobby" && joinedRoom && !gameStarted && (
          <div className="lobby-message">
            <h3 className="joined-message"> You joined room {roomCode.toUpperCase()}</h3>
            <p>Please wait for the host to start the game...</p>
            {/* Only visible to the player designated as the game starter */}
            {isGameStarter && (
              <button onClick={handleStartGame} className="button startbutton" ref={startGameButtonRef}>
                Everybody's in
              </button>
            )}
            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </div>
        )}

        {/* Phase: Start - Brief transition when game first begins */}
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

        {/* Phase: Prompt - Visible only to the prompt player */}
        {gamePhase === "prompt" && isPromptPlayer && (
          <div className="prompt-section">
            <p className="team-display">You are in team: <h3>{team}</h3></p>
            <h3>You are selecting the prompt!</h3>

            <p className="textleft">Write an exciting scenario where heroes must save the day and villains try to sabotage. Make it clear what’s at stake so everyone knows what to do.</p>
            <div className="block-ruby">
            </div>
            <textarea
              placeholder="Press random to get some idea's!"
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

        {/* Phase: Waiting - For players waiting for the prompt to be submitted */}
        {gamePhase === "waiting" && waitingForPrompt && (
          <div>
            <p className="waiting-message">
              <p className="team-display">You are in team: <h3>{team}</h3></p>
              Prepare your {team} thoughts while waiting for {promptPlayerName} to submit a prompt...
            </p>
            <h4 class="time-left">Time left: {timer}s</h4>
          </div>
        )}

        {/* Phase: Waiting - After prompt and answers are submitted, waiting for host to continue */}
        {gamePhase === "waiting" && submittedPrompt && (
          <div>
            {allPlayerAnswers.length > 0 && (
              <div className="player-answers">
                <h5>All Player Answers:</h5>
                <ul className="answers-list">
                  {allPlayerAnswers.map((ans, index) => (
                    <li key={index}>
                      <strong>{ans.playerName} ({ans.team}):</strong><br/> {ans.answer === "" ? "No answer provided" : ans.answer}
          
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/* "Continue to Results" button is only visible to the game starter, and only after speech is done */}
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

        {/* Phase: Answer - When players submit their answers */}
        {gamePhase === "answer" && (
          <div className="answer-section">
            <p className="team-display">You are in team: <h3>{team}</h3></p>
            <h4 className="prompt-for-answer">{submittedPrompt}</h4>
            <textarea
              placeholder="Describe what you would do in this scenario. Heroes try to fix it, villains try to break it."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={answersSubmitted || isPromptPlayer} // Disable if already submitted or is prompt player
            />
            <button onClick={handleSubmitAnswer} disabled={answersSubmitted || isPromptPlayer}>
              {answersSubmitted ? "Answer Submitted" : "Submit Answer"}
            </button>
            {answerTimer !== null && <p className="timer-display">Time left: {answerTimer} seconds</p>}
          </div>
        )}

        {/* Phase: Evaluation - Displaying round results and scores */}
        {gamePhase === "evaluation" && (
          <div className="evaluation-phase-container">
            <h2>Evaluation Results</h2>
            {evaluationResults && (
              <div className="results-summary">
                <p>Winning Team: <strong>{evaluationResults.winningTeam}</strong></p>
                <p>Most Impactful Player: <strong>{evaluationResults.impactfulPlayer}</strong></p>
                <p>Most Original Player: <strong>{evaluationResults.originalPlayer}</strong></p>
              </div>
            )}

            {players && players.length > 0 && (
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

            {/* "Start Next Round" button is only visible to the game starter */}
            {isGameStarter && (
              <button
                onClick={handleStartNextRound}
                className="next-round-button"
              >
                {currentRound < totalRounds - 1 ? "Start Next Round" : "Start Next Round"}
              </button>
            )}

            {/* Message for non-game starters waiting for the next round */}
            {!isGameStarter && (
              <h4 className="waiting-message">Waiting for the host to start the next round...</h4>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Client;