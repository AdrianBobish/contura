import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Screen1 from "./pages/Screen1";
import CreateProvider from "./pages/CreateProvider";
import CreateRequester from "./pages/CreateRequester";
import Screen5 from "./pages/Screen5";
import "./styles.css";

function SafeTop() {
  const location = useLocation();
  const noSafeTop = ["/", "/create-provider", "/create-requester"].includes(location.pathname); // hide on Screen1, Screen2, Screen3
  return noSafeTop ? null : <div className="safe-top"></div>;
}

function App() {
  return (
    <Router>
      <SafeTop />
      <Routes>
        <Route path="/" element={<Screen1 />} />
        <Route path="/create-provider" element={<CreateProvider />} />
        <Route path="/create-requester" element={<CreateRequester />} />
        <Route path="/Screen5" element={<Screen5 />} />
      </Routes>
    </Router>
  );
}

export default App;
