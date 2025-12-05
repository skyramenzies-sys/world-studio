// src/App.jsx
// World-Studio.live - Main Application Router
// WITH ADMIN ROUTE 👑

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
import { io } from "socket.io-client";

// ===========================================
// API CONFIGURATION - RAILWAY BACKEND
// ===========================================
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://world-studio-production.up.railway.app";
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "https://world-studio-production.up.railway.app";

// Socket singleton
let socket = null;
const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });
    }
    return socket;
};

// ===========================================
// COMPONENT IMPORTS
// ===========================================
import HomePage from "./components/HomePage";
import LivePage from "./components/LivePage";
import ProfilePage from "./components/ProfilePage";
import UploadPage from "./components/UploadPage";
import StockPredictor from "./components/StockPredictor";
import LiveDiscover from "./components/LiveDiscover";
import LoginPage from "./components/LoginPage";
import NotificationsPage from "./components/NotificationsPage";
import WalletPage from "./components/WalletPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import AdminDashboard from "./components/AdminDashboard";
import Giftshop from "./components/Giftshop";

import "./styles/global.css";

// ===========================================
// ROUTE GUARDS
// ===========================================

const RequireAuth = ({ children }) => {
    const token = localStorage.getItem("ws_token") || localStorage.getItem("token");
    const location = useLocation();
    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
};

// 👑 ADMIN ROUTE
const RequireAdmin = ({ children }) => {
    const token = localStorage.getItem("ws_token") || localStorage.getItem("token");
    const currentUser = JSON.parse(localStorage.getItem("ws_currentUser") || "{}");
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (currentUser.email !== "menziesalm@gmail.com" && currentUser.role !== "admin") {
        toast.error("Admin access only!");
        return <Navigate to="/" replace />;
    }

    return children;
};

const GuestOnly = ({ children }) => {
    const token = localStorage.getItem("ws_token") || localStorage.getItem("token");
    if (token) {
        return <Navigate to="/" replace />;
    }
    return children;
};

// ===========================================
// NAVIGATION COMPONENT
// ===========================================

const Navigation = ({ currentUser, onLogout, dark, setDark }) => {
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const isAdmin = currentUser?.email === "menziesalm@gmail.com" || currentUser?.role === "admin";

    useEffect(() => {
        if (currentUser) {
            const fetchNotifications = async () => {
                try {
                    const token = localStorage.getItem("ws_token") || localStorage.getItem("token");
                    if (!token) return;

                    const res = await fetch(
                        `${API_BASE_URL}/api/users/${currentUser._id || currentUser.id || currentUser.userId}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (res.ok) {
                        const data = await res.json();
                        const unread = (data.notifications || []).filter(n => !n.read).length;
                        setUnreadCount(unread);
                    }
                } catch (err) {
                    console.error("Failed to fetch notifications:", err);
                }
            };

            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) {
            const socket = getSocket();

            socket.on("notification", () => {
                setUnreadCount(prev => prev + 1);
            });

            socket.on("followed_user_live", (data) => {
                toast.success(`🔴 ${data.username} is now live: ${data.title}`, {
                    duration: 5000,
                    icon: "📺",
                });
            });

            return () => {
                socket.off("notification");
                socket.off("followed_user_live");
            };
        }
    }, [currentUser]);

    if (location.pathname === "/login" || location.pathname === "/reset-password") return null;

    const isActive = (path) => location.pathname === path;

    const navLinks = [
        { path: "/", label: "Feed", emoji: "🏠" },
        { path: "/discover", label: "Discover", emoji: "🌎" },
        { path: "/stocks", label: "Stocks", emoji: "📈" },
        { path: "/live", label: "Live", emoji: "🎥" },
        { path: "/upload", label: "Upload", emoji: "📤" },
        { path: "/shop", label: "Shop", emoji: "🛒" },
        { path: "/profile", label: "Profile", emoji: "👤" },
    ];

    return (
        <nav className="bg-gradient-to-r from-purple-900 via-blue-800 to-black text-white shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="font-bold text-cyan-400 hover:text-white transition text-lg flex items-center gap-2">
                        <span className="text-2xl">🌍</span>
                        <span className="hidden sm:inline">World-Studio</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map(link => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`px-3 py-2 rounded-lg transition text-sm ${isActive(link.path)
                                    ? "text-cyan-400 bg-white/10"
                                    : "hover:text-cyan-300 hover:bg-white/5"
                                    }`}
                            >
                                {link.emoji} {link.label}
                            </Link>
                        ))}

                        {isAdmin && (
                            <Link
                                to="/admin"
                                className={`px-3 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 font-bold text-sm ${isActive("/admin") ? "opacity-100" : "opacity-80 hover:opacity-100"
                                    }`}
                            >
                                👑 Admin
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {currentUser && (
                            <Link
                                to="/wallet"
                                className={`flex items-center gap-1 bg-yellow-500/20 hover:bg-yellow-500/30 px-3 py-2 rounded-lg transition text-yellow-400 font-semibold text-sm ${isActive("/wallet") ? "bg-yellow-500/30" : ""
                                    }`}
                            >
                                💰 <span className="hidden lg:inline">{currentUser.wallet?.balance || 0}</span>
                            </Link>
                        )}

                        {currentUser && (
                            <Link
                                to="/notifications"
                                className={`relative bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition ${isActive("/notifications") ? "bg-white/20" : ""
                                    }`}
                            >
                                🔔
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </Link>
                        )}

                        <button
                            onClick={() => setDark((v) => !v)}
                            className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg transition"
                        >
                            {dark ? "🌙" : "☀️"}
                        </button>

                        {currentUser ? (
                            <div className="flex items-center gap-2">
                                <Link to="/profile" className="hidden lg:flex items-center gap-2 hover:opacity-80 transition">
                                    <img
                                        src={currentUser.avatar || "/defaults/default-avatar.png"}
                                        alt="avatar"
                                        className="w-8 h-8 rounded-full object-cover border border-white/20"
                                        onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                                    />
                                    <span className="text-white/60 text-sm max-w-[100px] truncate">{currentUser.username}</span>
                                </Link>
                                <button
                                    onClick={onLogout}
                                    className="bg-red-500/80 hover:bg-red-500 px-3 py-2 rounded-lg text-white text-sm font-semibold transition"
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

                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="md:hidden bg-white/10 hover:bg-white/20 p-2 rounded-lg"
                        >
                            {mobileMenuOpen ? "✕" : "☰"}
                        </button>
                    </div>
                </div>

                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-white/10">
                        <div className="flex flex-wrap gap-2">
                            {navLinks.map(link => (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`px-3 py-2 rounded-lg transition text-sm ${isActive(link.path)
                                        ? "text-cyan-400 bg-white/10"
                                        : "hover:text-cyan-300 hover:bg-white/5"
                                        }`}
                                >
                                    {link.emoji} {link.label}
                                </Link>
                            ))}
                            {isAdmin && (
                                <Link
                                    to="/admin"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="px-3 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 font-bold text-sm"
                                >
                                    👑 Admin
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

// ===========================================
// MAIN APP COMPONENT
// ===========================================

export default function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [dark, setDark] = useState(() => {
        const saved = localStorage.getItem("theme");
        if (saved) return saved === "dark";
        return window.matchMedia("(prefers-color-scheme: dark)").matches;
    });

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
        window.addEventListener("authChange", loadUser);

        return () => {
            window.removeEventListener("storage", loadUser);
            window.removeEventListener("auth-change", loadUser);
            window.removeEventListener("authChange", loadUser);
        };
    }, []);

    useEffect(() => {
        if (currentUser) {
            const socket = getSocket();
            const userId = currentUser._id || currentUser.id || currentUser.userId;
            if (userId) {
                socket.emit("join_user_room", userId);
            }
        }
    }, [currentUser]);

    useEffect(() => {
        if (dark) {
            document.documentElement.setAttribute("data-theme", "dark");
            localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.removeAttribute("data-theme");
            localStorage.setItem("theme", "light");
        }
    }, [dark]);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("ws_token");
        localStorage.removeItem("ws_currentUser");
        setCurrentUser(null);
        window.dispatchEvent(new Event("auth-change"));
        window.dispatchEvent(new Event("authChange"));
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
                    {/* Public Routes */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/discover" element={<LiveDiscover />} />
                    <Route path="/stocks" element={<StockPredictor />} />
                    <Route path="/live" element={<LivePage />} />
                    <Route path="/live/:streamId" element={<LivePage />} />
                    <Route path="/shop" element={<Giftshop />} />

                    {/* Guest Only Routes */}
                    <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
                    <Route path="/reset-password" element={<GuestOnly><ResetPasswordPage /></GuestOnly>} />

                    {/* Protected Routes */}
                    <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
                    <Route path="/profile/:userId" element={<ProfilePage />} />
                    <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
                    <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
                    <Route path="/wallet" element={<RequireAuth><WalletPage /></RequireAuth>} />

                    {/* 👑 Admin Route */}
                    <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
                    <Route path="/admin/*" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />

                    {/* 404 Page */}
                    <Route path="*" element={
                        <div className="min-h-screen flex items-center justify-center">
                            <div className="text-center p-8">
                                <h2 className="text-6xl font-bold text-white mb-4">404</h2>
                                <p className="text-white/60 mb-6">Page not found</p>
                                <Link to="/" className="px-6 py-3 bg-cyan-500 rounded-xl text-white font-semibold hover:bg-cyan-400 transition">
                                    Go Home
                                </Link>
                            </div>
                        </div>
                    } />
                </Routes>
            </main>

            <footer className="bg-black/50 border-t border-white/10 py-6 text-center text-white/30 text-sm">
                <p>🌍 World-Studio.live © {new Date().getFullYear()}</p>
                <p className="mt-1">Create • Share • Earn</p>
            </footer>
        </Router>
    );
}
