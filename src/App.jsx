import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import HomePage from "./components/HomePage";
import LivePage from "./components/LivePage";
import ProfilePage from "./components/ProfilePage";
import UploadPage from "./components/UploadPage";
import StockPredictor from "./components/StockPredictor";
import LiveDiscover from "./components/LiveDiscover";

export default function App() {
    // ✅ Logout handler
    const handleLogout = () => {
        localStorage.removeItem("token");
        window.location.href = "/login";
    };

    return (
        <Router>
            {/* ✅ Top navigation bar */}
            <nav className="flex flex-wrap gap-4 p-4 bg-gradient-to-r from-purple-900 via-blue-800 to-black text-white items-center shadow-lg">
                <Link to="/" className="font-bold text-cyan-400 hover:text-white transition">
                    🌍 World-Studio LIVE
                </Link>
                <Link to="/" className="hover:text-cyan-300 transition">🏠 Feed</Link>
                <Link to="/discover" className="hover:text-cyan-300 transition">🌎 Discover</Link>
                <Link to="/stocks" className="hover:text-cyan-300 transition">📈 Stocks</Link>
                <Link to="/live" className="hover:text-cyan-300 transition">🎥 Go Live</Link>
                <Link to="/upload" className="hover:text-cyan-300 transition">📤 Upload</Link>
                <Link to="/profile" className="hover:text-cyan-300 transition">👤 Profile</Link>
                {/* Spacer to push logout to right */}
                <div className="flex-grow" />
                <button
                    onClick={handleLogout}
                    className="ml-auto bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-white font-semibold transition"
                >
                    Logout
                </button>
            </nav>

            {/* ✅ All routes */}
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/live" element={<LivePage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/upload" element={<UploadPage />} />
                    <Route path="/discover" element={<LiveDiscover />} />
                    <Route path="/stocks" element={<StockPredictor />} />
                </Routes>
            </div>
        </Router>
    );
}
