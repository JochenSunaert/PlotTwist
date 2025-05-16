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
  const [timer, setTimer] = useState(null);
  const [answer, setAnswer] = useState("");
  const [answerPhase, setAnswerPhase] = useState(false);
  const [answersSubmitted, setAnswersSubmitted] = useState(false);
  const [answerTimer, setAnswerTimer] = useState(null);

  const answerRef = useRef(answer);
  const answersSubmittedRef = useRef(answersSubmitted);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  useEffect(() => {
    answersSubmittedRef.current = answersSubmitted;
  }, [answersSubmitted]);

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

  const handleSubmitPrompt = () => {
    if (prompt.trim()) {
      socket.emit("submit-prompt", { prompt });
    }
  };

  const handleRandomPrompt = () => {
    const randomPrompt = predefinedPrompts[Math.floor(Math.random() * predefinedPrompts.length)];
    setPrompt(randomPrompt);
  };

  const handleSubmitAnswer = useCallback(() => {
    if (answersSubmittedRef.current) {
      return;
    }
    const cleanAnswer = answerRef.current.trim() || "<No answer provided>";
    socket.emit("submit-answer", { playerName: name, answer: cleanAnswer });
    setAnswersSubmitted(true);
  }, [name]);

  useEffect(() => {
    const handleJoinedRoom = () => {
      setJoinedRoom(true);
      setErrorMessage("");
    };

    const handleErrorMessage = (message) => setErrorMessage(message);

    const handleTeamAssigned = ({ team }) => {
      setTeam(team);
    };

    const handleGameStarted = () => setGameStarted(true);

    const handlePromptPlayer = ({ isPromptPlayer }) => {
      setIsPromptPlayer(isPromptPlayer);
      setWaitingForPrompt(!isPromptPlayer);
    };

    const handlePromptSelection = ({ playerName }) => {
      setPromptPlayerName(playerName);
    };

    const handlePromptSubmitted = ({ prompt }) => {
      setSubmittedPrompt(prompt || "Prompt is empty");
      setWaitingForPrompt(false);
      setIsPromptPlayer(false);
    };

    const handleTimerUpdate = (timeLeft) => setTimer(timeLeft);

    const handleTimerEnded = () => {
      if (!answersSubmittedRef.current) {
        handleSubmitAnswer();
      }
    };

    const handleStartAnswerPhase = () => {
        console.log("Starting answer phase.");
      setAnswerPhase(true);
      setAnswersSubmitted(false);
        setAnswer(""); 
    };

    const handleAnswerTimerUpdate = (timeLeft) => setAnswerTimer(timeLeft);

    const handleAnswerPhaseEnded = () => {
      setAnswerPhase(false);
      setAnswerTimer(null);
      if (!answersSubmittedRef.current) {
        handleSubmitAnswer();
      }
    };

    const handleNextRound = ({ currentRound, totalRounds, promptPlayerName }) => {
        console.log("Next round event received. Clearing answer.");
      setCurrentRound(currentRound);
      setTotalRounds(totalRounds);
      setPromptPlayerName(promptPlayerName);
      setSubmittedPrompt("");
      setAnswer("");
      setAnswersSubmitted(false);
      setAnswerPhase(false);
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
    };

    const handleRoundReset = () => {
      setSubmittedPrompt("");
      setIsPromptPlayer(false);
      setWaitingForPrompt(true);
    };

    // Register socket listeners
    socket.on("joined-room", handleJoinedRoom);
    socket.on("error-message", handleErrorMessage);
    socket.on("team-assigned", handleTeamAssigned);
    socket.on("game-started", handleGameStarted);
    socket.on("prompt-player", handlePromptPlayer);
    socket.on("prompt-selection", handlePromptSelection);
    socket.on("prompt-submitted", handlePromptSubmitted);
    socket.on("timer-update", handleTimerUpdate);
    socket.on("timer-ended", handleTimerEnded);
    socket.on("start-answer-phase", handleStartAnswerPhase);
    socket.on("answer-timer-update", handleAnswerTimerUpdate);
    socket.on("answer-phase-ended", handleAnswerPhaseEnded);
    socket.on("next-round", handleNextRound);
    socket.on("game-ended", handleGameEnded);
    socket.on("round-reset", handleRoundReset);

    return () => {
      socket.off("joined-room", handleJoinedRoom);
      socket.off("error-message", handleErrorMessage);
      socket.off("team-assigned", handleTeamAssigned);
      socket.off("game-started", handleGameStarted);
      socket.off("prompt-player", handlePromptPlayer);
      socket.off("prompt-selection", handlePromptSelection);
      socket.off("prompt-submitted", handlePromptSubmitted);
      socket.off("timer-update", handleTimerUpdate);
      socket.off("timer-ended", handleTimerEnded);
      socket.off("start-answer-phase", handleStartAnswerPhase);
      socket.off("answer-timer-update", handleAnswerTimerUpdate);
      socket.off("answer-phase-ended", handleAnswerPhaseEnded);
      socket.off("next-round", handleNextRound);
      socket.off("game-ended", handleGameEnded);
      socket.off("round-reset", handleRoundReset);
    };
  }, [handleSubmitAnswer]);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Client Screen</h1>
      <p>{team}</p>
      {!joinedRoom ? (
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
      ) : !gameStarted ? (
        <h2>✅ You joined room {roomCode.toUpperCase()}</h2>
      ) : (
        <>
          <h2>🎉 Game Started!</h2>
          <h3>Round {currentRound + 1} of {totalRounds}</h3>
          {team && <p>🧑‍🤝‍🧑 Your team: <strong>{team}</strong></p>}
          {submittedPrompt ? (
            <p>📜 The prompt is: {submittedPrompt}</p>
          ) : waitingForPrompt ? (
            <p>⏳ Waiting for {promptPlayerName} to submit a prompt...</p>
          ) : isPromptPlayer ? (
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
              <button onClick={handleSubmitPrompt}>Submit Prompt</button>
              {timer !== null && <p>⏳ Time left: {timer} seconds</p>}
            </>
          ) : null}
          {answerPhase && (
            <>
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
        </>
      )}
    </div>
  );
};

export default Client;
