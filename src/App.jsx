// src/App.jsx
// World-Studio.live - Main Application Router
// UNIVERSUM EDITION 👑🌌

import React, { useState, useEffect, useCallback } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Link,
    Navigate,
    useLocation,
} from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";


// ===========================================
// API + SOCKET CONFIG (Universe Editions)
// ===========================================
import { API_BASE_URL } from "./api/api";
import socket, { joinUserRoom, leaveUserRoom } from "./api/socket";

// ✅ Make socket globally available for ProfilePage
if (typeof window !== "undefined") {
    window.socket = socket;
}

// ===========================================
// COMPONENT IMPORTS
// ===========================================
import HomePage from "./components/HomePage";
import GoLiveForm from "./components/GoLiveForm";
import LivePage from "./components/LivePage";
import ProfilePage from "./components/ProfilePage";
import UploadPage from "./components/UploadPage";
import LiveDiscover from "./components/LiveDiscover";
import LoginPage from "./components/LoginPage";
import NotificationsPage from "./components/NotificationsPage";
import WalletPage from "./components/WalletPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import AdminDashboard from "./components/AdminDashboard";
import StockPredictor from "./components/StockPredictor";
import Giftshop from "./components/Giftshop";
import PostDetail from "./pages/PostDetail";

import "./styles/global.css";

// ===========================================
// HELPER FUNCTIONS
// ===========================================

const getToken = () => {
    if (typeof window === "undefined") return null;
    try {
        return (
            window.localStorage.getItem("ws_token") ||
            window.localStorage.getItem("token")
        );
    } catch {
        return null;
    }
};

const getCurrentUser = () => {
    if (typeof window === "undefined") return null;
    try {
        const stored = window.localStorage.getItem("ws_currentUser");
        return stored ? JSON.parse(stored) : null;
    } catch {
        return null;
    }
};

const getUserId = (user) => {
    if (!user) return null;
    return user._id || user.id || user.userId || null;
};

// Backend root voor assets (API_BASE_URL bevat /api)
const API_ROOT = API_BASE_URL.replace(/\/api\/?$/, "");

// ===========================================
// ROUTE GUARDS
// ===========================================

const RequireAuth = ({ children }) => {
    const token = getToken();
    const location = useLocation();
    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
};


const RequireAdmin = ({ children }) => {
    const token = getToken();
    const currentUser = getCurrentUser();
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (
        !currentUser ||
        (currentUser.email !== "menziesalm@gmail.com" &&
            currentUser.role !== "admin")
    ) {
        toast.error("Admin access only!");
        return <Navigate to="/" replace />;
    }

    return children;
};

const GuestOnly = ({ children }) => {
    const token = getToken();
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

    const userId = getUserId(currentUser);
    const isAdmin =
        currentUser?.email === "menziesalm@gmail.com" ||
        currentUser?.role === "admin";

    // Fetch initial notification count
    useEffect(() => {
        if (!currentUser || !userId) return;

        const fetchNotifications = async () => {
            try {
                const token = getToken();
                if (!token) return;

                const res = await fetch(`${API_BASE_URL}/notifications/unread-count`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                if (res.ok) {
                    const data = await res.json();
                    setUnreadCount(data.unreadCount || 0);
                }
            } catch (err) {
                console.error("Failed to fetch notifications:", err);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [currentUser, userId]);

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!currentUser || !userId) return;

        // New notification received
        const handleNewNotification = (data) => {
            setUnreadCount((prev) => prev + 1);

            if (data?.message) {
                toast(data.message, {
                    icon: data.icon || "🔔",
                    duration: 4000,
                });
            }
        };

        // Someone followed you
        const handleNewFollower = (data) => {
            if (data?.username) {
                toast.success(`${data.username} started following you! 🎉`, {
                    duration: 4000,
                });
            }
        };

        // Someone you follow went live
        const handleUserWentLive = (data) => {
            if (data?.username) {
                toast.success(`🔴 ${data.username} is now live!`, {
                    duration: 5000,
                    icon: "📺",
                });
            }
        };

        // Gift received (only show if it's for this user)
        const handleGiftReceived = (data) => {
            const isForMe = data?.toUserId === userId || data?.streamerId === userId;
            if (isForMe && data?.fromUsername) {
                toast.success(`🎁 ${data.fromUsername} sent you a ${data.giftName || "gift"}!`, {
                    duration: 4000,
                });
            }
        };

        // Register event listeners
        socket.on("new_notification", handleNewNotification);
        socket.on("new_follower", handleNewFollower);
        socket.on("user_went_live", handleUserWentLive);
        socket.on("followed_user_live", handleUserWentLive);
        socket.on("gift_received", handleGiftReceived);

        return () => {
            socket.off("new_notification", handleNewNotification);
            socket.off("new_follower", handleNewFollower);
            socket.off("user_went_live", handleUserWentLive);
            socket.off("followed_user_live", handleUserWentLive);
            socket.off("gift_received", handleGiftReceived);
        };
    }, [currentUser, userId]);

    // Hide nav on login/reset pages
    if (
        location.pathname === "/login" ||
        location.pathname === "/reset-password"
    ) {
        return null;
    }

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
                    <Link
                        to="/"
                        className="font-bold text-cyan-400 hover:text-white transition text-lg flex items-center gap-2"
                    >
                        <span className="text-2xl">🌍</span>
                        <span className="hidden sm:inline">World-Studio</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
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
                                className={`px-3 py-2 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 font-bold text-sm ${isActive("/admin")
                                        ? "opacity-100"
                                        : "opacity-80 hover:opacity-100"
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
                                💰{" "}
                                <span className="hidden lg:inline">
                                    {currentUser.wallet?.balance || 0}
                                </span>
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
                            aria-label="Toggle dark mode"
                        >
                            {dark ? "🌙" : "☀️"}
                        </button>

                        {currentUser ? (
                            <div className="flex items-center gap-2">
                                <Link
                                    to="/profile"
                                    className="hidden lg:flex items-center gap-2 hover:opacity-80 transition"
                                >
                                    <img
                                        src={
                                            currentUser.avatar ||
                                            `${API_ROOT}/defaults/default-avatar.png`
                                        }
                                        alt="avatar"
                                        className="w-8 h-8 rounded-full object-cover border border-white/20"
                                        onError={(e) => {
                                            e.target.src = `${API_ROOT}/defaults/default-avatar.png`;
                                        }}
                                    />
                                    <span className="text-white/60 text-sm max-w-[100px] truncate">
                                        {currentUser.username}
                                    </span>
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
                            aria-label="Toggle mobile menu"
                        >
                            {mobileMenuOpen ? "✕" : "☰"}
                        </button>
                    </div>
                </div>

                {mobileMenuOpen && (
                    <div className="md:hidden py-4 border-t border-white/10">
                        <div className="flex flex-wrap gap-2">
                            {navLinks.map((link) => (
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
        if (typeof window === "undefined") return true;
        try {
            const saved = window.localStorage.getItem("theme");
            if (saved) return saved === "dark";
            return (
                window.matchMedia &&
                window.matchMedia("(prefers-color-scheme: dark)").matches
            );
        } catch {
            return true;
        }
    });

    // Load user from localStorage
    useEffect(() => {
        const loadUser = () => {
            const user = getCurrentUser();
            setCurrentUser(user);
        };

        loadUser();

        if (typeof window !== "undefined") {
            window.addEventListener("storage", loadUser);
            window.addEventListener("auth-change", loadUser);
            window.addEventListener("authChange", loadUser);

            return () => {
                window.removeEventListener("storage", loadUser);
                window.removeEventListener("auth-change", loadUser);
                window.removeEventListener("authChange", loadUser);
            };
        }
    }, []);

    // Join user's notification room when logged in
    useEffect(() => {
        const userId = getUserId(currentUser);
        if (!userId) return;

        // Join user's personal room for notifications
        joinUserRoom(userId);
        console.log("🔔 Joined notification room for user:", userId);

        // Cleanup on unmount or user change
        return () => {
            leaveUserRoom(userId);
            console.log("🔕 Left notification room for user:", userId);
        };
    }, [currentUser]);

    // Dark mode handling
    useEffect(() => {
        if (typeof document === "undefined" || typeof window === "undefined") return;

        if (dark) {
            document.documentElement.setAttribute("data-theme", "dark");
            window.localStorage.setItem("theme", "dark");
        } else {
            document.documentElement.removeAttribute("data-theme");
            window.localStorage.setItem("theme", "light");
        }
    }, [dark]);

    // Logout handler
    const handleLogout = useCallback(() => {
        // Leave user room before logout
        const userId = getUserId(currentUser);
        if (userId) {
            leaveUserRoom(userId);
        }

        if (typeof window !== "undefined") {
            window.localStorage.removeItem("token");
            window.localStorage.removeItem("ws_token");
            window.localStorage.removeItem("ws_currentUser");
            window.localStorage.removeItem("user");
        }

        setCurrentUser(null);

        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("auth-change"));
            window.dispatchEvent(new Event("authChange"));
            toast.success("Logged out!");
            window.location.href = "/login";
        }
    }, [currentUser]);

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
                    <Route path="/go-live" element={<GoLiveForm />} />
                    <Route path="/live" element={<LivePage />} />
                    <Route path="/live/:streamId" element={<LivePage />} />
                    <Route path="/shop" element={<Giftshop />} />
                    <Route path="/stocks" element={<StockPredictor />} />
                    <Route path="/posts/:id" element={<PostDetail />} />

                    {/* Guest Only Routes */}
                    <Route
                        path="/login"
                        element={
                            <GuestOnly>
                                <LoginPage />
                            </GuestOnly>
                        }
                    />
                    <Route
                        path="/reset-password"
                        element={
                            <GuestOnly>
                                <ResetPasswordPage />
                            </GuestOnly>
                        }
                    />

                    {/* Protected Routes */}
                    <Route
                        path="/profile"
                        element={
                            <RequireAuth>
                                <ProfilePage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/profile/:userId"
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
                    <Route
                        path="/notifications"
                        element={
                            <RequireAuth>
                                <NotificationsPage />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/wallet"
                        element={
                            <RequireAuth>
                                <WalletPage />
                            </RequireAuth>
                        }
                    />

                    {/* 👑 Admin Routes */}
                    <Route
                        path="/admin"
                        element={
                            <RequireAdmin>
                                <AdminDashboard />
                            </RequireAdmin>
                        }
                    />
                    <Route
                        path="/admin/*"
                        element={
                            <RequireAdmin>
                                <AdminDashboard />
                            </RequireAdmin>
                        }
                    />

                    {/* 404 Page */}
                    <Route
                        path="*"
                        element={
                            <div className="min-h-screen flex items-center justify-center">
                                <div className="text-center p-8">
                                    <h2 className="text-6xl font-bold text-white mb-4">
                                        404
                                    </h2>
                                    <p className="text-white/60 mb-6">
                                        Page not found
                                    </p>
                                    <Link
                                        to="/"
                                        className="px-6 py-3 bg-cyan-500 rounded-xl text-white font-semibold hover:bg-cyan-400 transition"
                                    >
                                        Go Home
                                    </Link>
                                </div>
                            </div>
                        }
                    />
                </Routes>
            </main>

            <footer className="bg-black/50 border-t border-white/10 py-6 text-center text-white/30 text-sm">
                <p>🌍 World-Studio.live © {new Date().getFullYear()}</p>
                <p className="mt-1">Create • Share • Earn</p>
            </footer>
        </Router>
    );
}
