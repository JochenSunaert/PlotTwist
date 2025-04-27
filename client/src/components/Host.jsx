import { useEffect, useState } from "react";
import socket from "./socket";

const Host = () => {
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    socket.emit("create-room");

    socket.on("room-created", (code) => {
      setRoomCode(code);
    });

    socket.on("players-update", (players) => {
      setPlayers(players);
    });

    return () => {
        socket.off("room-created");
        socket.off("players-update");
      };
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Host Screen</h1>
      <h2>Room Code: {roomCode}</h2>
      <h3>Players in Room:</h3>
      <ul>
        {players.map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default Host;
