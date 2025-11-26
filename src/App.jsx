import React, { useState, useEffect } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Link,
    Navigate,
} from "react-router-dom";

import { Toaster, toast } from "react-hot-toast";

import HomePage from "./components/HomePage";
import LivePage from "./components/LivePage";
import ProfilePage from "./components/ProfilePage";
import UploadPage from "./components/UploadPage";
import StockPredictor from "./components/StockPredictor";
import LiveDiscover from "./components/LiveDiscover";
import LoginPage from "./components/LoginPage"; // ✅ Toegevoegd!

import "./styles/global.css";

// 🔐 Protected Route Wrapper
const RequireAuth = ({ children }) => {
    const token = localStorage.getItem("token");
    if (!token) {
        toast.error("Please log in first!");
        return <Navigate to="/login" replace />;
    }
    return children;
};

// 🔓 Guest Route (redirect to home if already logged in)
const GuestOnly = ({ children }) => {
    const token = localStorage.getItem("token");
    if (token) {
        return <Navigate to="/" replace />;
    }
    return children;
};

// ⏳ Loading Component
const Spinner = () => (
    <div className="text-center py-20 text-white/60 animate-pulse">
        ⏳ Loading...
    </div>
);

export default function App() {
    // 🌙 Dark Mode
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

    const [loading] = useState(false);

    // Check if user is logged in
    const isLoggedIn = !!localStorage.getItem("token");

    // 🚪 Logout
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("ws_currentUser");
        toast.success("Logged out!");
        setTimeout(() => (window.location.href = "/login"), 600);
    };

    return (
        <Router>
            <Toaster position="top-center" />

            {/* Invisible heading for tests & SEO */}
            <h1 style={{ position: "absolute", left: "-9999px" }}>
                World-Studio
            </h1>

            {/* Navigation */}
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
                >
                    {dark ? "🌙" : "☀️"}
                </button>

                {isLoggedIn ? (
                    <button
                        onClick={handleLogout}
                        className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-white font-semibold transition"
                    >
                        Logout
                    </button>
                ) : (
                    <Link
                        to="/login"
                        className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-lg text-white font-semibold transition"
                    >
                        Login
                    </Link>
                )}
            </nav>

            {/* Main Content */}
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
                {loading ? (
                    <Spinner />
                ) : (
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/discover" element={<LiveDiscover />} />
                        <Route path="/stocks" element={<StockPredictor data-testid="predictor-card" />} />
                        <Route path="/live" element={<LivePage />} />

                        {/* ✅ Login Route toegevoegd! */}
                        <Route
                            path="/login"
                            element={
                                <GuestOnly>
                                    <LoginPage />
                                </GuestOnly>
                            }
                        />

                        <Route
                            path="/profile"
                            element={
                                <RequireAuth>
                                    <ProfilePage />
                                </RequireAuth>
                            }
                        />

                        <Route
                            path="/upload"
                            element={
                                <RequireAuth>
                                    <UploadPage />
                                </RequireAuth>
                            }
                        />

                        {/* ✅ 404 Catch-all route */}
                        <Route
                            path="*"
                            element={
                                <div className="text-center py-20">
                                    <h2 className="text-3xl font-bold text-white mb-4">404</h2>
                                    <p className="text-white/60 mb-6">Page not found</p>
                                    <Link
                                        to="/"
                                        className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-white font-semibold transition"
                                    >
                                        Go Home
                                    </Link>
                                </div>
                            }
                        />
                    </Routes>
                )}
            </div>
        </Router>
    );
}