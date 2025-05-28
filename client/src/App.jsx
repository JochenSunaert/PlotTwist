// App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home.jsx";
import Host from "./components/Host.jsx";
import Client from "./components/Client.jsx";

function App() {
  return (
    <Router basename="/">
      <Routes>
        
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<Host />} />
        <Route path="/client" element={<Client />} />
      </Routes>
    </Router>
  );
}

export default App;
