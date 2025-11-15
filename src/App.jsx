import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import HomePage from "./components/HomePage";
import LivePage from "./components/LivePage";
import ProfilePage from "./components/ProfilePage";
import UploadPage from "./components/UploadPage";
import StockPredictor from "./components/StockPredictor";
import LiveDiscover from "./components/LiveDiscover";
import "./style/global.css"; // Adjust path if needed

// Auth guard for protected routes
function RequireAuth({ children }) {
    const token = localStorage.getItem("token");
    if (!token) {
        toast.error("Please log in first!");
        return <Navigate to="/login" replace />;
    }
    return children;
}

// Example loading spinner component (can be replaced with your own)
function Spinner() {
    return (
        <div className="text-center py-20 text-white/60 animate-pulse">
            <span role="img" aria-label="loading">⏳</span> Loading...
        </div>
    );
}

export default function App() {
    // Dark mode state with persistence
    const [dark, setDark] = useState(() => {
        const saved = localStorage.getItem("theme");
        if (saved) return saved === "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });

    useEffect(() => {
        if (dark) {
            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.removeAttribute("data-theme");
            localStorage.setItem("theme", "light");
        }
    }, [dark]);

    // Example: Simulate global loading state (you could connect this to your API/Redux logic)
    const [loading, setLoading] = useState(false);

    // Logout handler
    const handleLogout = () => {
        localStorage.removeItem("token");
        toast.success("Logged out!");
        setTimeout(() => window.location.href = "/login", 1000);
    };

    return (
        <Router>
            {/* Toast notifications */}
            <Toaster position="top-center" />

            {/* Top navigation bar */}
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
                <div className="flex-grow" />
                <button
                    onClick={() => setDark((v) => !v)}
                    className="bg-gray-700 hover:bg-gray-800 px-3 py-2 rounded-lg text-white font-semibold transition mr-2"
                    aria-label="Toggle dark mode"
                >
                    {dark ? "🌙" : "☀️"}
                </button>
                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-white font-semibold transition"
                >
                    Logout
                </button>
            </nav>

            {/* Main content with loading spinner */}
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
                {loading ? (
                    <Spinner />
                ) : (
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/live" element={<LivePage />} />
                        <Route path="/profile" element={
                            <RequireAuth>
                                <ProfilePage />
                            </RequireAuth>
                        } />
                        <Route path="/upload" element={
                            <RequireAuth>
                                <UploadPage />
                            </RequireAuth>
                        } />
                        <Route path="/discover" element={<LiveDiscover />} />
                        <Route path="/stocks" element={<StockPredictor />} />
                        {/* Add your /login route/component as needed */}
                    </Routes>
                )}
            </div>
        </Router>
    );
}
