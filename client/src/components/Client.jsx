// Client.js

import { useEffect, useState, useRef, useCallback } from "react";
import socket from "./socket";

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
  }, [name]);

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
      setTimer(timeLeft);

      // ***** CRITICAL CHANGE FOR PROMPT AUTO-SUBMISSION *****
      // Trigger submission when timeLeft is 1, to get ahead of server's 0-second action.
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
      setAnswerTimer(timeLeft);

      // ***** CRITICAL CHANGE FOR ANSWER AUTO-SUBMISSION *****
      // Trigger submission when timeLeft is 1, to get ahead of server's 0-second action.
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
    <div style={{ padding: "2rem" }}>
      <h1>Client Screen</h1>
      <p>{team}</p>

      {gamePhase === "lobby" && !joinedRoom && (
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
      )}

      {gamePhase === "lobby" && joinedRoom && !gameStarted && (
        <h2>✅ You joined room {roomCode.toUpperCase()}</h2>
      )}

      {gamePhase === "start" && (
        <>
          <h2>🎉 Game Started!</h2>
          <h3>Round {currentRound + 1} of {totalRounds}</h3>
          {team && <p>🧑‍🤝‍🧑 Your team: <strong>{team}</strong></p>}
        </>
      )}

      {gamePhase === "prompt" && isPromptPlayer && (
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
          <button onClick={handleSubmitPrompt} disabled={promptSubmittedRef.current}>
            {promptSubmittedRef.current ? "Prompt Submitted" : "Submit Prompt"}
          </button>
          {timer !== null && <p>⏳ Time left: {timer} seconds</p>}
        </>
      )}

      {gamePhase === "waiting" && waitingForPrompt && (
        <p>⏳ Waiting for {promptPlayerName} to submit a prompt...</p>
      )}

      {gamePhase === "waiting" && submittedPrompt && (
        <p>📜 The prompt is: {submittedPrompt}</p>
      )}

      {gamePhase === "answer" && (
        <>
          <p>📜 The prompt is: {submittedPrompt}</p>
          <textarea
            placeholder="Write your answer here..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            disabled={answersSubmitted}
            style={{ width: "100%", height: "100px", marginBottom: "1rem" }}
          />
          <button onClick={handleSubmitAnswer} disabled={answersSubmitted}>
            {answersSubmitted ? "Answer Submitted" : "Submit Answer"}
          </button>
          {answerTimer !== null && <p>⏳ Answer Timer: {answerTimer} seconds</p>}
        </>
      )}
    </div>
  );
};

export default Client;