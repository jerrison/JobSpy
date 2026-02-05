import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import ScraperPage from "./pages/ScraperPage";
import SavedJobsPage from "./pages/SavedJobsPage";

const navStyle = {
  display: "flex",
  gap: "1rem",
  padding: "1rem 2rem",
  background: "#fff",
  borderBottom: "1px solid #e0e0e0",
  alignItems: "center" as const,
};

export default function App() {
  return (
    <BrowserRouter>
      <nav style={navStyle}>
        <strong style={{ fontSize: "1.2rem", marginRight: "1rem" }}>JobSpy</strong>
        <NavLink to="/" style={({ isActive }) => ({ fontWeight: isActive ? 700 : 400, color: "#0066cc", textDecoration: "none" })}>
          Scraper
        </NavLink>
        <NavLink to="/saved" style={({ isActive }) => ({ fontWeight: isActive ? 700 : 400, color: "#0066cc", textDecoration: "none" })}>
          Saved Jobs
        </NavLink>
      </nav>
      <div style={{ padding: "1.5rem 2rem", maxWidth: 1400, margin: "0 auto" }}>
        <Routes>
          <Route path="/" element={<ScraperPage />} />
          <Route path="/saved" element={<SavedJobsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
