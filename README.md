# PlotTwist
_Interactive AI Party Game_

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by OpenAI](https://img.shields.io/badge/Powered%20by-OpenAI-412991.svg?logo=openai)](https://openai.com/)

PlotTwist is an **interactive, multi-device AI party game** where players use their smartphones to collaboratively devise creative solutions for absurd scenarios displayed on a main PC screen. An intelligent AI then evaluates the submitted answers, determining which had the most impact, was the most original, or ultimately led to victory!

It's a dynamic, real-time experience that blends collaborative storytelling with competitive AI-powered judging.

---

## 📝 Table of Contents

* [Live Demo](#-live-demo)
* [Key Features](#-key-features)
* [How to Play](#-how-to-play)
* [Project Structure](#-project-structure)
* [How to Run Locally](#-how-to-run-locally)
* [Key Code Highlights](#-key-code-highlights)
* [Deployment Setup](#-deployment-setup)
* [Roadmap](#-roadmap)
* [Troubleshooting](#-troubleshooting)
* [Contributing](#-contributing)
* [Folder/File Summary](#-folderfile-summary)
* [Contact](#-contact)
* [License](#license)
* [Acknowledgements](#-acknowledgements)
* [Sources & References](#-sources-&-references)
---

## 🚀 Live Demo

You can test the game live at: [https://www.jochensunaert.be/](https://www.jochensunaert.be/)

* **Frontend (React)** hosted on Vercel
* **Backend (Node.js + WebSockets)** hosted on Render

---

## ✨ Key Features

* **Real-Time Multiplayer:** Seamless interaction between players and the main game screen via WebSockets.
* **Multi-Device Play:** Players use their smartphones (clients) to interact, while the main game runs on a PC (host).
* **Host Controls:** The game host manages room creation, game start, and the game phases.
* **Dynamic Game Phases:** Features distinct phases for:
    * **Lobby:** Joining and waiting for the game to start.
    * **Prompt Selection:** One player is chosen to submit a creative scenario (prompt).
    * **Answer Submission:** Other players devise and submit their "hero" or "villain" responses.
    * **Answer Display & Story Generation:** All submitted answers are revealed, and an AI weaves them into a cohesive story.
    * **AI Evaluation:** The AI assesses answers for impact, originality, and determines winning teams/players.
    * **Game Results:** Final scores and placements are displayed.
* **AI-Powered Storytelling:** Leverages the OpenAI API to generate dynamic narratives based on player inputs.
* **Team-Based Gameplay:** Players are assigned to teams, adding a strategic layer to submissions.
* **Scoring System:** Players earn points based on AI evaluation and game performance.

---

## 🎮 How to Play

PlotTwist is designed for **2-8 players** for the best experience. One device acts as the **"Host"** on a main screen (typically a PC connected to a large display or projector), while other players use their **smartphones** (clients) to join the game and interact.

**Objective:** Fight eachother with a original story & give creative answers to outwit the AI's judgment to score the most points for your team, and yourself!

**Game Flow:**

1.  **Room Creation & Joining:** The host creates a unique game room. Players then enter their name and the room code on their smartphones to join the game.
2.  **Prompt Selection:** In each round, one player is randomly designated as the **"Prompt Player."** This player's task is to craft an engaging and absurd scenario (the "prompt") that sets the stage for the round's story.
3.  **Answer Submission:** Once the prompt is set, all *other* players are divided into **"Hero"** and **"Villain"** teams. Heroes must devise creative solutions or advancements that *resolve* or *help* the scenario, while villains aim to *escalate*, *sabotage*, or *complicate* it. Players submit their answers via their phones.
4.  **AI Story & Evaluation:** After all answers are submitted (or a timer runs out), the main screen displays all submitted answers. An intelligent AI then takes center stage, weaving all player answers and the prompt into a cohesive, often hilarious, story. Crucially, the AI also evaluates each answer based on its impact, originality, and how well it fits its team's role (heroic or villainous).
5.  **Scoring & Next Round:** Players and teams are awarded points based on the AI's evaluation. A new prompt player is selected, and the game proceeds to the next round, building on the evolving narrative.
6.  **Final Results:** After all predetermined rounds are complete, the game concludes, and the final player and team placements, along with their scores, are displayed on the main screen.

---

## 🧩 Project Structure

```
/PlotTwist
├── /client      - React frontend application
└── /server      - Node.js backend server with WebSocket logic
```

* **`client`**:
    * Developed with **React** using **Vite** for a fast development experience.
    * Connects to the backend WebSocket server using `socket.io-client` to send and receive real-time game data.
    * Contains components for joining rooms, submitting prompts and answers, and displaying various game states (prompts, answers, generated story, results).

* **`server`**:
    * An **Express.js** based server utilizing **Socket.IO** for robust real-time WebSocket communication.
    * Manages game rooms, player connections, game states, prompt and answer collection.
    * Integrates with the **OpenAI API** for AI-powered story generation and answer evaluation.
    * Runs on port `3001` (or an environment port on hosting).

---

## 🔧 How to Run Locally

### Prerequisites

* **Node.js** (LTS version recommended)
* **npm** or **yarn** package manager
* **OpenAI API Key**: You'll need to set up an environment variable for your OpenAI API key in the server directory. Create a `.env` file in the `/server` directory with the following content:
    ```
    OPENAI_API_KEY=your_openai_api_key_here
    ```

### Steps

1.  **Clone the repository:**

    ```bash
    git clone [https://github.com/JochenSunaert/PlotTwist.git](https://github.com/JochenSunaert/PlotTwist.git)
    cd PlotTwist
    ```

2.  **Install dependencies** for both the client and server:

    ```bash
    cd client
    npm install
    cd ../server
    npm install
    ```

3.  **Start the backend server:** (In a new terminal window)

    ```bash
    cd server (You should be in server/server)
    node index.js
    ```

4.  **Start the frontend development server:** (In another new terminal window)

    ```bash
    cd client
    npm run dev
    ```

5.  **Access the application:**
    Open your web browser and navigate to `http://localhost:5173` (or the port shown by Vite in your terminal after `npm run dev`).

---

## 📝 Key Code Highlights

### Frontend (`client`)

* **Socket Setup**:
    The frontend establishes a real-time connection to the backend WebSocket server using `socket.io-client`:

    ```javascript
    import { io } from "socket.io-client";

    const socket = io("[https://plottwist-w5lc.onrender.com](https://plottwist-w5lc.onrender.com)", { // Replace with your local backend URL if not using deployed version
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });

    export default socket;
    ```

* **React Components**:
    Components manage the user interface for player joining, room interaction, prompt and answer submission, and dynamic game state updates driven by WebSocket events.

* **Vite Config**:
    A proxy is configured to forward `/socket.io` WebSocket requests to the backend during development.

### Backend (`server`)

* **Express and Socket.IO**:
    The backend uses Express.js to handle HTTP requests and Socket.IO for robust real-time WebSocket communication between the host and client devices.

* **Game State Management**:
    The server maintains the comprehensive game state for each room, including player connections, submitted prompts, collected answers, current rounds, and scores.

* **OpenAI Integration**:
    The server orchestrates calls to the OpenAI API for:
    * Generating a coherent story from player-submitted answers.
    * Evaluating individual answers based on criteria like impact and originality.

* **Environment Configuration**:
    The backend listens on the port provided by Render or defaults to `3001` and securely loads the OpenAI API key from environment variables.

---

## ⚙️ Deployment Setup

### Frontend (Vercel)

* The React application is deployed on Vercel using standard Vite build commands (`npm run build`).
* The Vercel deployment is configured to connect to the backend WebSocket server on Render by referencing its deployed URL in the socket client configuration.

### Backend (Render)

* The Node.js server is deployed on Render.
* Render automatically handles dependency installation and runs the server using `node index.js`.
* The server's URL is crucial for the frontend's socket client to establish real-time communication.

---

## 🗺️ Roadmap

We're always looking to enhance PlotTwist! Here are some potential future developments:

* Implement AI profile pictures & entertainement.
* Add more AI evaluation metrics (e.g., humor, creativity, coherence).
* Expand the library of predefined prompts for greater variety.
* Improve mobile responsiveness and overall UI/UX of the client interface.
* Introduce player voting on answers in addition to AI evaluation.
* Integrate sound effects and background music for a more immersive experience.

---

## ⚠️ Troubleshooting

Encountering issues? Here are some common problems and their solutions:

* **Connection Issues:**
    * Ensure your backend server is actively running (`node index.js` in the `/server/server` directory).
    * Verify that the `socket.io-client` URL in `client/src/socket.js` correctly points to your backend (e.g., `http://localhost:3001` for local development, or your deployed Render URL).
    * Check your browser's developer console (F12) for any WebSocket connection errors.
* **OpenAI API Errors:**
    * Confirm your `OPENAI_API_KEY` is correctly set in a `.env` file within your `/server` directory.
    * Check your OpenAI account for any rate limit issues or billing problems that might prevent API calls.
* **Slow AI Responses:**
    * AI generation can sometimes take a few seconds, especially for complex requests. This is normal. Very long delays might indicate network issues or high API traffic.

---

## 🤝 Contributing

We welcome and appreciate contributions to PlotTwist! If you have ideas for new features, bug fixes, or improvements, please consider contributing.

**How to Contribute:**

1.  **Fork the repository** on GitHub.
2.  **Clone your forked repository** to your local machine:
    ```bash
    git clone [https://github.com/your-username/PlotTwist.git](https://github.com/your-username/PlotTwist.git)
    cd PlotTwist
    ```
3.  **Create a new branch** for your feature or bug fix:
    ```bash
    git checkout -b feature/your-awesome-feature
    ```
    or
    ```bash
    git checkout -b bugfix/fix-that-bug
    ```
4.  **Make your changes**, ensuring they adhere to the existing code style.
5.  **Test your changes** thoroughly to prevent regressions.
6.  **Commit your changes** with a clear and concise message:
    ```bash
    git commit -m "feat: Add amazing new feature"
    ```
    or
    ```bash
    git commit -m "fix: Resolve critical bug in answer submission"
    ```
7.  **Push your branch** to your forked repository:
    ```bash
    git push origin feature/your-awesome-feature
    ```
8.  **Open a Pull Request** against the `main` branch of the original PlotTwist repository, describing your changes and their purpose.

* **Reporting Bugs:** If you find any bugs, please open an [issue on GitHub](https://github.com/JochenSunaert/PlotTwist/issues) with a detailed description of the problem, steps to reproduce it, and your environment.
* **Feature Requests:** Feel free to open an [issue](https://github.com/JochenSunaert/PlotTwist/issues) to suggest new features or improvements.

---

## 📁 Folder/File Summary

| Path                | Description                                        |
| :------------------ | :------------------------------------------------- |
| `/client`           | React frontend application with Vite build setup   |
| `/client/src`       | React components, socket client setup, CSS         |
| `/server`           | Node.js backend with Express, Socket.IO, OpenAI API|
| `/server/server/index.js`  | Main server entry point for Socket.IO and Express  |
| `/server/server/rooms.js`  | Logic for managing game rooms and player connections|
| `/server/server/game.js`| Core game logic, phase transitions, AI integration |

---

## 🤝 Contact

For questions or further assistance, please reach out to Jochen Sunaert.

---

## 📄 License

This project is licensed under the MIT License. You can find the full text of the license in the [LICENSE](LICENSE) file in the root of this repository.

---

## 🙏 Acknowledgements

* **Motion Background Videos:** A special thank you to the creators of the engaging background videos used in the game, sourced from various motion graphics libraries.
* **OpenAI:** For providing the powerful API that drives the game's innovative AI storytelling and evaluation features.
* Thanks to all early testers and those who provided valuable feedback!

---


## 📚 Sources & References

This section provides a detailed list of all external resources that contributed to the development of PlotTwist.

---
### Core Technologies & Libraries

* **React:** Official Documentation - [https://react.dev/](https://react.dev/)
* **Node.js:** Official Website - [https://nodejs.org/](https://nodejs.org/)
* **Express.js:** Official Website - [https://expressjs.com/](https://expressjs.com/)
* **Socket.IO:** Official Documentation - [https://socket.io/](https://socket.io/)
* **OpenAI API:** Official Documentation - [https://platform.openai.com/docs](https://platform.openai.com/docs)
* **Vite:** Official Website - [https://vitejs.dev/](https://vitejs.dev/)
* **npm (Node Package Manager):** Official Website - [https://www.npmjs.com/](https://www.npmjs.com/)

---
### Motion Background Video Assets

We utilized a selection of motion backgrounds to enhance the visual experience of each game phase. Please find their respective sources below:

* **game video's Video (`Color-geometry-1_4k_1.mp4  etc`):** Sourced from [**_storyloop_**] by [**_Dan Stevers_**].
    * [**_https://storyloop.com/downloads/color-geometry-6_alt_**]


---
### Learning Resources & Tutorials 


- Learn Socket.io In 30 Minutes **from:** [**Web Dev Simplified**](https://www.youtube.com/watch?v=ZKEqqIO7n-k)
-  How Web Sockets work | Deep Dive **from:** [**Bytemonk**](https://www.youtube.com/watch?v=G0_e02DdH7I)
-  openAI: The basics, **from:** [**net ninja**](https://www.youtube.com/watch?v=C4ve8Kjw9ZY&list=PL4cUxeGkcC9ipdXMDVcGimIVMG_Z6-Vsu)
-  Master React Router in an easy way  **from:** [**Nova Designs**](link)
-  A Beginner's Guide to The OpenAI API: **from:** [**datacamp**](https://www.datacamp.com/tutorial/guide-to-openai-api-on-tutorial-best-practices)


---
### game inspiration by:

- [Jackbox](https://jackbox.tv/)
- [death by AI](https://deathbyai.gg/)
- [ kahoot ](https://kahoot.it/)
- [gartic phone:](https://garticphone.com/)
- [scribble.io](https://skribblgame.io/)


---
### other:

- for small bug fixes, or issues: [**stackoverflow**](https://stackoverflow.com)
- for quick google searches:  [**Grepper**]( https://addons.mozilla.org/nl/firefox/addon/grepper/)
- assisting me to write this readme: [**Gemeni**]( https://gemini.google.com)
- helping me with the idea & mapping of this project [**Chatgpt**]( https://chatgpt.com/)
- assisting me with code: [**Github copilot**]( https://github.com/features/copilot)

---

**Ready to twist some plots? Enjoy playing PlotTwist! 🎉**
