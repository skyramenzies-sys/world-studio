// src/App.jsx
import React, { useState, useEffect } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Link,
    Navigate,
    useLocation,
} from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";

// Components
import HomePage from "./components/HomePage";
import LivePage from "./components/LivePage";
import ProfilePage from "./components/ProfilePage";
import UploadPage from "./components/UploadPage";
import StockPredictor from "./components/StockPredictor";
import LiveDiscover from "./components/LiveDiscover";
import LoginPage from "./components/LoginPage";

// Styles
import "./styles/global.css";

// 🔐 Protected Route
const RequireAuth = ({ children }) => {
    const token = localStorage.getItem("token");
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
};

// 🔓 Guest Route
const GuestOnly = ({ children }) => {
    const token = localStorage.getItem("token");
    if (token) {
        return <Navigate to="/" replace />;
    }
    return children;
};

// Navigation Component
const Navigation = ({ currentUser, onLogout, dark, setDark }) => {
    const location = useLocation();

    // Hide nav on login page
    if (location.pathname === "/login") return null;

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="flex flex-wrap gap-2 md:gap-4 p-3 md:p-4 bg-gradient-to-r from-purple-900 via-blue-800 to-black text-white items-center shadow-lg sticky top-0 z-50">
            <Link to="/" className="font-bold text-cyan-400 hover:text-white transition text-lg">
                🌍 World-Studio
            </Link>

            <div className="flex flex-wrap gap-1 md:gap-3 text-sm md:text-base">
                <Link to="/" className={`px-2 py-1 rounded ${isActive("/") ? "text-cyan-400" : "hover:text-cyan-300"}`}>
                    🏠 Feed
                </Link>
                <Link to="/discover" className={`px-2 py-1 rounded ${isActive("/discover") ? "text-cyan-400" : "hover:text-cyan-300"}`}>
                    🌎 Discover
                </Link>
                <Link to="/stocks" className={`px-2 py-1 rounded ${isActive("/stocks") ? "text-cyan-400" : "hover:text-cyan-300"}`}>
                    📈 Stocks
                </Link>
                <Link to="/live" className={`px-2 py-1 rounded ${isActive("/live") ? "text-cyan-400" : "hover:text-cyan-300"}`}>
                    🎥 Live
                </Link>
                <Link to="/upload" className={`px-2 py-1 rounded ${isActive("/upload") ? "text-cyan-400" : "hover:text-cyan-300"}`}>
                    📤 Upload
                </Link>
                <Link to="/profile" className={`px-2 py-1 rounded ${isActive("/profile") ? "text-cyan-400" : "hover:text-cyan-300"}`}>
                    👤 Profile
                </Link>
            </div>

            <div className="flex-grow" />

            <div className="flex items-center gap-2">
                <button
                    onClick={() => setDark((v) => !v)}
                    className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition"
                >
                    {dark ? "🌙" : "☀️"}
                </button>

                {currentUser ? (
                    <div className="flex items-center gap-2">
                        <span className="text-white/60 text-sm hidden md:block">{currentUser.username}</span>
                        <button
                            onClick={onLogout}
                            className="bg-red-500/80 hover:bg-red-500 px-3 md:px-4 py-2 rounded-lg text-white text-sm font-semibold transition"
                        >
                            Logout
                        </button>
                    </div>
                ) : (
                    <Link
                        to="/login"
                        className="bg-cyan-500 hover:bg-cyan-400 px-4 py-2 rounded-lg text-white font-semibold transition"
                    >
                        Login
                    </Link>
                )}
            </div>
        </nav>
    );
};

export default function App() {
    const [currentUser, setCurrentUser] = useState(null);

    const [dark, setDark] = useState(() => {
        const saved = localStorage.getItem("theme");
        if (saved) return saved === "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });

    // Load user from localStorage
    useEffect(() => {
        const loadUser = () => {
            const storedUser = localStorage.getItem("ws_currentUser");
            if (storedUser) {
                try {
                    setCurrentUser(JSON.parse(storedUser));
                } catch (e) {
                    setCurrentUser(null);
                }
            } else {
                setCurrentUser(null);
            }
        };

        loadUser();
        window.addEventListener("storage", loadUser);
        window.addEventListener("auth-change", loadUser);

        return () => {
            window.removeEventListener("storage", loadUser);
            window.removeEventListener("auth-change", loadUser);
        };
    }, []);

    // Apply dark mode
    useEffect(() => {
        if (dark) {
            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.removeAttribute("data-theme");
            localStorage.setItem("theme", "light");
        }
    }, [dark]);

    // Logout handler
    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("ws_currentUser");
        setCurrentUser(null);
        window.dispatchEvent(new Event("auth-change"));
        toast.success("Logged out!");
        window.location.href = "/login";
    };

    return (
        <Router>
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: "#1f2937",
                        color: "#fff",
                        border: "1px solid rgba(255,255,255,0.1)",
                    },
                }}
            />

            <h1 className="sr-only">World-Studio</h1>

            <Navigation
                currentUser={currentUser}
                onLogout={handleLogout}
                dark={dark}
                setDark={setDark}
            />

            <main className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
                <Routes>
                    {/* Public */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/discover" element={<LiveDiscover />} />
                    <Route path="/stocks" element={<StockPredictor />} />
                    <Route path="/live" element={<LivePage />} />
                    <Route path="/live/:streamId" element={<LivePage />} />

                    {/* Auth */}
                    <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />

                    {/* Protected */}
                    <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                    <Route path="/profile/:userId" element={<ProfilePage />} />
                    <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />

                    {/* 404 */}
                    <Route
                        path="*"
                        element={
                            <div className="min-h-screen flex items-center justify-center">
                                <div className="text-center p-8">
                                    <h2 className="text-6xl font-bold text-white mb-4">404</h2>
                                    <p className="text-white/60 mb-6">Page not found</p>
                                    <Link to="/" className="px-6 py-3 bg-cyan-500 rounded-xl text-white font-semibold">
                                        Go Home
                                    </Link>
                                </div>
                            </div>
                        }
                    />
                </Routes>
            </main>
        </Router>
    );
}