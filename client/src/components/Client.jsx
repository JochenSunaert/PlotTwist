// Client.js
//
import { useEffect, useState, useRef, useCallback } from "react";
import socket from "./socket";

const videos = {
  lobby: "/videos/motion_backgrounds3/Color-geometry-10_4k_1.mp4",
  prompt: "/videos/motion_backgrounds3/Color-geometry-6_4k_1.mp4",
  answer: "/videos/motion_backgrounds3/Color-geometry-12_4k_1.mp4",
  waiting: "/videos/motion_backgrounds3/Color-geometry-9_4k_1.mp4", // Or a different video for waiting
  // Add other phases as needed, or default to lobby video
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
  const [timer, setTimer] = useState(null); // Timer for prompt phase
  const [answer, setAnswer] = useState("");
  const [answerPhase, setAnswerPhase] = useState(false);
  const [answersSubmitted, setAnswersSubmitted] = useState(false);
  const [answerTimer, setAnswerTimer] = useState(null); // Timer for answer phase
  const [gamePhase, setGamePhase] = useState("lobby");

  const answerRef = useRef(answer);
  const answersSubmittedRef = useRef(answersSubmitted);
  const promptSubmittedRef = useRef(false);
  const promptRef = useRef(prompt);

  // Update refs whenever their corresponding state changes
  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    answersSubmittedRef.current = answersSubmitted;
  }, [answersSubmitted]);

  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  const predefinedPrompts = [
    "A notorious thief has stolen a valuable diamond from the city's museum and it's your job to either catch the thief or help them escape.",
    "A hacked satellite will crash into the city in 10 minutes.",
    "A high-tech bank is being robbed in the middle of the night.",
  ];

  const handleJoin = () => {
    if (name.trim() && roomCode.trim()) {
      socket.emit("join-room", { roomCode: roomCode.trim().toUpperCase(), name });
    }
  };

  const handleSubmitPrompt = useCallback(() => {
    if (promptSubmittedRef.current) {
      console.log("Client: Prompt already submitted for this round, skipping.");
      return;
    }
    const promptToSend = promptRef.current.trim();
    console.log(`Client: Manual/Auto-submitting prompt: "${promptToSend}"`);
    socket.emit("submit-prompt", { prompt: promptToSend });
    promptSubmittedRef.current = true; // Mark as manually submitted by this client
  }, []); // Depend on nothing as promptRef.current is already the latest

  const handleRandomPrompt = () => {
    const randomPrompt = predefinedPrompts[Math.floor(Math.random() * predefinedPrompts.length)];
    setPrompt(randomPrompt); // Update state, which also updates promptRef
  };

  const handleSubmitAnswer = useCallback(() => {
    if (answersSubmittedRef.current) {
      console.log("Client: Already submitted answer for this round, skipping.");
      return;
    }
    const answerToSend = answerRef.current.trim();
    console.log(`Client: Manual/Auto-submitting answer: "${answerToSend}"`);
    socket.emit("submit-answer", { playerName: name, answer: answerToSend });
    setAnswersSubmitted(true); // Mark as submitted immediately on the client
  }, [name]);

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

    const handlePromptPlayer = ({ isPromptPlayer }) => {
      setIsPromptPlayer(isPromptPlayer);
      setWaitingForPrompt(!isPromptPlayer);
      setGamePhase(isPromptPlayer ? "prompt" : "waiting");
      promptSubmittedRef.current = false; // Reset for the new prompt player
      setPrompt(""); // Clear prompt input for new prompt player
    };

    const handlePromptSelection = ({ playerName }) => {
      setPromptPlayerName(playerName);
    };

    const handlePromptSubmitted = ({ prompt }) => {
      setSubmittedPrompt(prompt || "Prompt is empty"); // Use the prompt from the server
      setWaitingForPrompt(false);
      setIsPromptPlayer(false); // No longer the prompt player
      setGamePhase("waiting");
      // Server has confirmed prompt submission, so client doesn't need to auto-submit anymore.
    };

    const handleTimerUpdate = (timeLeft) => {
      // Set the visual timer to be one second behind the backend timer.
      // Ensure it doesn't go below 0.
      setTimer(Math.max(0, timeLeft - 1));

      // ***** CRITICAL CHANGE FOR PROMPT AUTO-SUBMISSION *****
      // Trigger submission when timeLeft is 1, to get ahead of server's 0-second action.
      // This means when the server says 1, the client auto-submits, and visually shows 0.
      if (isPromptPlayer && timeLeft === 1 && !promptSubmittedRef.current) {
        console.log("Client: Prompt timer almost ended (1s left), auto-submitting current prompt.");
        handleSubmitPrompt(); // This will submit promptRef.current
      }
    };

    const handleStartAnswerPhase = () => {
      setAnswerPhase(true);
      setAnswersSubmitted(false); // Reset this for the new answer phase
      setAnswer(""); // Clear previous answer for the new round
      setGamePhase("answer");
      console.log("Client: Started answer phase.");
    };

    const handleAnswerTimerUpdate = (timeLeft) => {
      // Set the visual answer timer to be one second behind the backend timer.
      // Ensure it doesn't go below 0.
      setAnswerTimer(Math.max(0, timeLeft - 1));

      // ***** CRITICAL CHANGE FOR ANSWER AUTO-SUBMISSION *****
      // Trigger submission when timeLeft is 1, to get ahead of server's 0-second action.
      // This means when the server says 1, the client auto-submits, and visually shows 0.
      if (timeLeft === 1 && !answersSubmittedRef.current) {
        console.log("Client: Answer timer almost ended (1s left), auto-submitting current answer.");
        handleSubmitAnswer(); // This will submit the current value of answerRef.current
      }
    };

    const handleAnswerPhaseEnded = () => {
      console.log("Client: Answer phase ended (event received from server).");
      setAnswerPhase(false);
      setAnswerTimer(null);
      setAnswersSubmitted(true); // Ensure answersSubmitted is true on the client
      setGamePhase("waiting");
    };

    const handleNextRound = ({ currentRound, totalRounds, promptPlayerName }) => {
      setCurrentRound(currentRound);
      setTotalRounds(totalRounds);
      setPromptPlayerName(promptPlayerName);
      setSubmittedPrompt("");
      setAnswer(""); // Important: Clear answer for next round
      setAnswersSubmitted(false); // Important: Reset for next round
      setAnswerPhase(false);
      setIsPromptPlayer(false); // Assume not prompt player until told otherwise
      promptSubmittedRef.current = false; // Reset for new round
      setPrompt(""); // Clear prompt input
      setGamePhase("waiting");
      console.log("Client: Starting next round.");
    };

    const handleGameEnded = () => {
      setName("");
      setRoomCode("");
      setJoinedRoom(false);
      setGameStarted(false);
      setTeam(null);
      setPrompt("");
      setSubmittedPrompt("");
      setAnswer("");
      setAnswersSubmitted(false);
      setGamePhase("lobby");
    };

    const handleRoundReset = () => {
      setSubmittedPrompt("");
      setIsPromptPlayer(false); // Client is not prompt player until told otherwise
      setWaitingForPrompt(true);
      setGamePhase("waiting");
      setAnswer(""); // Ensure answer is cleared on round reset
      setAnswersSubmitted(false); // Ensure this is reset for new round
      setPrompt(""); // Clear prompt input
      promptSubmittedRef.current = false; // Reset prompt submission status for new round
      console.log("Client: Round reset.");
    };

    // Socket Event Listeners
    socket.on("joined-room", handleJoinedRoom);
    socket.on("error-message", handleErrorMessage);
    socket.on("team-assigned", handleTeamAssigned);
    socket.on("game-started", handleGameStarted);
    socket.on("prompt-player", handlePromptPlayer);
    socket.on("prompt-selection", handlePromptSelection);
    socket.on("prompt-submitted", handlePromptSubmitted);
    socket.on("timer-update", handleTimerUpdate);
    socket.on("start-answer-phase", handleStartAnswerPhase);
    socket.on("answer-timer-update", handleAnswerTimerUpdate);
    socket.on("answer-phase-ended", handleAnswerPhaseEnded);
    socket.on("next-round", handleNextRound);
    socket.on("game-ended", handleGameEnded);
    socket.on("round-reset", handleRoundReset);

    // Cleanup function for unmounting
    return () => {
      socket.off("joined-room", handleJoinedRoom);
      socket.off("error-message", handleErrorMessage);
      socket.off("team-assigned", handleTeamAssigned);
      socket.off("game-started", handleGameStarted);
      socket.off("prompt-player", handlePromptPlayer);
      socket.off("prompt-selection", handlePromptSelection);
      socket.off("prompt-submitted", handlePromptSubmitted);
      socket.off("timer-update", handleTimerUpdate);
      socket.off("start-answer-phase", handleStartAnswerPhase);
      socket.off("answer-timer-update", handleAnswerTimerUpdate);
      socket.off("answer-phase-ended", handleAnswerPhaseEnded);
      socket.off("next-round", handleNextRound);
      socket.off("game-ended", handleGameEnded);
      socket.off("round-reset", handleRoundReset);
    };
  }, [handleSubmitAnswer, handleSubmitPrompt, isPromptPlayer]); // Added handleSubmitPrompt and isPromptPlayer as dependencies

  return (
<div className="client-container"> {/* Main container for the client screen */}
      {/* Background video */}
      <video
        key={gamePhase} // Forces video reload/change when gamePhase updates
        className="background-video"
        src={videos[gamePhase] || videos.lobby} // Default to lobby video if phase not found
        autoPlay
        muted
        loop
        playsInline
      />

      {/* Overlay for UI content */}
      <div className="overlay-content">
        <img class="clientlogo" src="./photos/plottwistlogowhite.png"></img>
        <p className="team-display">{team}</p>

        {gamePhase === "lobby" && !joinedRoom && (
          <div className="lobby-form">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
            />
            <button onClick={handleJoin}>Join Room</button>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </div>
        )}

        {gamePhase === "lobby" && joinedRoom && !gameStarted && (
          <div>
            <h3 className="joined-message"> You joined room {roomCode.toUpperCase()}</h3>
            <p> please wait for the host to start the game...</p>
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
            <h3>You are selecting the prompt!</h3>
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
            {timer !== null && <p className="timer-display">⏳ Time left: {timer} seconds</p>}
          </div>
        )}

        {gamePhase === "waiting" && waitingForPrompt && (
          <p className="waiting-message">⏳ Waiting for {promptPlayerName} to submit a prompt...</p>
        )}

        {gamePhase === "waiting" && submittedPrompt && (
          <p className="submitted-prompt">📜 The prompt is: {submittedPrompt}</p>
        )}

        {gamePhase === "answer" && (
          <div className="answer-section">
            <p className="prompt-for-answer">📜 The prompt is: {submittedPrompt}</p>
            <textarea
              placeholder="Write your answer here..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={answersSubmitted}
            />
            <button onClick={handleSubmitAnswer} disabled={answersSubmitted}>
              {answersSubmitted ? "Answer Submitted" : "Submit Answer"}
            </button>
            {answerTimer !== null && <p className="timer-display">⏳ Answer Timer: {answerTimer} seconds</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default Client;