
```markdown
# PlotTwist

PlotTwist is a multiplayer quiz/party game built with React (frontend) and Node.js (backend) using WebSockets for real-time communication. The game supports multiple players joining rooms, answering live questions, and interacting in real time.

---

## 🚀 Live Demo

- Frontend (React) hosted on Vercel: [https://plot-twist-seven.vercel.app/](https://plot-twist-seven.vercel.app/)  
- Backend (Node.js + WebSockets) hosted on Render: [https://plottwist-w5lc.onrender.com](https://plottwist-w5lc.onrender.com)

---

## 🧩 Project Structure

```

/client    - React frontend application
/server    - Node.js backend server with WebSocket logic

````

- **client**:  
  - Uses React with Vite as the build tool.  
  - Connects to backend WebSocket server to send/receive live game data.  
  - Contains components for joining rooms, answering questions, and viewing game state.

- **server**:  
  - Express.js based server with socket.io for WebSocket real-time communication.  
  - Manages game rooms, players, questions, and score tracking.  
  - Runs on port 3001 (or environment port on hosting).

---

## 🔧 How to Run Locally

### Prerequisites

- Node.js installed  
- npm or yarn package manager

### Steps

1. Clone the repo:

```bash
git clone https://github.com/JochenSunaert/PlotTwist.git
cd PlotTwist
````

2. Install dependencies for both client and server:

```bash
cd client
npm install
cd ../server
npm install
```

3. Start the backend server:

```bash
cd server
npm start
```

4. Start the frontend development server (in another terminal):

```bash
cd client
npm run dev
```

5. Open your browser at `http://localhost:5173` (or the port shown by Vite) to use the app.

---

## 📝 Key Code Highlights

### Frontend (`client`)

* **Socket Setup**:
  The frontend connects to the backend WebSocket server using `socket.io-client`:

  ```js
  import { io } from "socket.io-client";

  const socket = io("https://plottwist-w5lc.onrender.com", {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
  });

  export default socket;
  ```

* **React Components**:
  Components handle UI for player login, room joining, question answering, and live updates via WebSocket events.

* **Vite Config**:
  Proxy is set up to forward `/socket.io` WebSocket requests to the backend during development.

### Backend (`server`)

* **Express and Socket.IO**:
  Backend uses Express.js to serve API endpoints and Socket.IO for real-time WebSocket communication.

* **Room and Player Management**:
  Server manages player connections, rooms identified by codes, question distribution, and score tracking.

* **Environment Config**:
  Backend listens on the port provided by Render or defaults to `3001`.

---

## ⚙️ Deployment Setup

### Frontend (Vercel)

* The React app is deployed on Vercel using default Vite build commands (`npm run build`).
* The Vercel deployment connects to the backend WebSocket server on Render by using the deployed URL in the socket client config.

### Backend (Render)

* The Node.js server is deployed on Render.
* Render automatically installs dependencies and runs the server with `node index.js` (or your start command).
* The server URL is used in the frontend’s socket client to enable real-time communication.

---

## 📁 Folder/File Summary

| Path               | Description                                |
| ------------------ | ------------------------------------------ |
| `/client`          | React frontend app with Vite build setup   |
| `/client/src`      | React components, socket client setup      |
| `/server`          | Node.js backend with Express and Socket.IO |
| `/server/index.js` | Main server file                           |

---

## 🤝 Contact

For questions or help, please reach out to Jochen Sunaert.

---

## License

This project is open source and free to use.

---

**Enjoy playing PlotTwist! 🎉**

```

```
