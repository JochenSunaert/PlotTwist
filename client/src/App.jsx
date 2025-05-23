import { useState } from "react";
import Host from "./components/Host";
import Client from "./components/Client";

const videos = {
  client: "/videos/motion_backgrounds2/Color-geometry-5_4k_1.mp4",
  host: "/videos/motion_backgrounds2/Color-geometry-3_4k_1.mp4",
};

const roles = ["client", "host"];

const App = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [role, setRole] = useState(""); // chosen role, empty means no role selected yet

  const currentRole = roles[selectedIndex];

  const handleSwitch = (direction) => {
    const newIndex = (selectedIndex + direction + roles.length) % roles.length;
    setSelectedIndex(newIndex);
  };

  // When clicking the role name, we set the chosen role and show that screen
  const handleSelectRole = (role) => {
    setRole(role);
  };

  // If role selected, show corresponding component
  if (role === "host") return <Host />;
  if (role === "client") return <Client />;

  // Otherwise show the role selection screen
  return (
    <div className="selection">
      <div className="selection__topbar">
        <h2>Choose Your Role</h2>
      </div>

      <div className="selection__video-container">
        <video
          src={videos[currentRole]}
          autoPlay
          muted
          loop
          className="selection__video"
        />

        <div className="selection__overlay">
          <button onClick={() => handleSwitch(-1)} className="selection__arrow">
            ←
          </button>
          <h1
            className="selection__role"
            onClick={() => handleSelectRole(currentRole)}
          >
            {currentRole.charAt(0).toUpperCase() + currentRole.slice(1)}
          </h1>
          <button onClick={() => handleSwitch(1)} className="selection__arrow">
            →
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
