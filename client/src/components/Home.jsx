// components/Home.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const videos = {
  client: "/videos/motion_backgrounds2/Color-geometry-5_4k_1.mp4",
  host: "/videos/motion_backgrounds2/Color-geometry-3_4k_1.mp4",
};

const roles = ["client", "host"];

const Home = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  const currentRole = roles[selectedIndex];

  const handleSwitch = (direction) => {
    const newIndex = (selectedIndex + direction + roles.length) % roles.length;
    setSelectedIndex(newIndex);
  };

  const handleConfirmRole = () => {
    navigate(`/${currentRole}`);
  };

  return (
    <div className="selection">
      <div className="selection__topbar">
        <h2>Choose Your path, meat sack!</h2>
      </div>

      <div className="selection__video-container">
        <video
          src={videos[currentRole]}
          autoPlay
          muted
          loop
          className="selection__video"
        />

        <div className="selection__content-wrapper">
          <div className="selection__arrow-row">
            <button onClick={() => handleSwitch(-1)} className="selection__arrow">
              <i className="fas fa-arrow-left"></i>
            </button>

            <div className="selection__overlay">
              <div className="role-center">
                <h1 className="selection__role">
                  {currentRole === 'host' ? 'Game Master' : 'Player'}
                </h1>
                <p className="selection__role-description">
                  {currentRole === 'client'
                    ? 'Just here for snacks and to lose gloriously!'
                    : 'Because someone has to babysit the players.'}
                </p>
              </div>
            </div>

            <button onClick={() => handleSwitch(1)} className="selection__arrow">
              <i className="fas fa-arrow-right"></i>
            </button>
          </div>

          <div className="selection__confirm-button-wrapper">
            <button
              onClick={handleConfirmRole}
              className="selection__confirm-button"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
