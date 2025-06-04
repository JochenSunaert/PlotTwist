
```markdown
# PlotTwist

PlotTwist is an **interactive, multi-device AI party game** where players use their smartphones to collaboratively devise creative solutions to absurd scenarios displayed on a main PC screen. An intelligent AI then evaluates the submitted answers, determining which had the most impact, was the most original, or ultimately led to victory!

It's a dynamic, real-time experience that blends collaborative storytelling with competitive AI-powered judging.

---

## 🚀 Live Demo

- **Frontend (React)** hosted on Vercel: [https://plot-twist-seven.vercel.app/](https://plot-twist-seven.vercel.app/)
- **Backend (Node.js + WebSockets)** hosted on Render: [https://plottwist-w5lc.onrender.com](https://plottwist-w5lc.onrender.com)

---

## ✨ Key Features

* **Real-Time Multiplayer:** Seamless interaction between players and the main game screen via WebSockets.
* **Multi-Device Play:** Players use their smartphones (clients) to interact, while the main game runs on a PC (host).
* **Host Controls:** The game host manages room creation, game start, and progression.
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

## 🧩 Project Structure


/PlotTwist
├── /client      - React frontend application
└── /server      - Node.js backend server with WebSocket logic


* **`client`**:
    * Developed with **React** using **Vite** for a fast development experience.
    * Connects to the backend WebSocket server using `socket.io-client` to send and receive real-time game data.
    * Contains components for joining rooms, submitting prompts and answers, and displaying various game states (prompts, answers, generated story, results).

* **`server`**:
    * An **Express.js** based server utilizing **Socket.IO** for real-time WebSocket communication.
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
    cd server
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

## 📁 Folder/File Summary

| Path                | Description                                        |
| :------------------ | :------------------------------------------------- |
| `/client`           | React frontend application with Vite build setup   |
| `/client/src`       | React components, socket client setup, CSS         |
| `/server`           | Node.js backend with Express, Socket.IO, OpenAI API|
| `/server/index.js`  | Main server entry point for Socket.IO and Express  |
| `/server/rooms.js`  | Logic for managing game rooms and player connections|
| `/server/gameEvents.js`| Core game logic, phase transitions, AI integration |

---

## 🤝 Contact

For questions or further assistance, please reach out to Jochen Sunaert.

---

## License

This project is open source and free to use.

---

**Ready to twist some plots? Enjoy playing PlotTwist! 🎉**
```
