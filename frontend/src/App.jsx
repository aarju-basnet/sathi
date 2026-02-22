import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Share from "./pages/Share";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/share/:token" element={<Share />} />
    </Routes>
  );
}
