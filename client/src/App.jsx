import { useState } from "react";
import Host from "./components/Host";
import Client from "./components/Client";

const App = () => {
  const [role, setRole] = useState(""); // "host" or "client"

  if (!role) {
    return (
      <div style={{ padding: "2rem" }}>
        <h1>Choose Your Role</h1>
        <button onClick={() => setRole("host")} style={{ marginRight: "1rem" }}>
          Host
        </button>
        <button onClick={() => setRole("client")}>Client</button>
      </div>
    );
  }

  return role === "host" ? <Host /> : <Client />;
};

export default App;
