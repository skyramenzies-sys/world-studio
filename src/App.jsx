import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { socket } from "./api/socket";
import HomePage from "./components/HomePage";
import UploadPage from "./components/UploadPage";
import LoginPage from "./components/LoginPage";
import ProfilePage from "./components/ProfilePage";
import AdminDashboard from "./components/AdminDashboard";
import StockPredictor from "./components/StockPredictor";
import NotificationCenter from "./components/NotificationCenter";
import { postsAPI, authAPI } from "./api/api";

export default function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [posts, setPosts] = useState([]);

    // 🔐 Auto-login
    useEffect(() => {
        const saved = localStorage.getItem("ws_user");
        if (saved) setCurrentUser(JSON.parse(saved));
    }, []);

    // 📡 Load posts
    useEffect(() => {
        const load = async () => {
            const data = await postsAPI.getAll();
            setPosts(data);
        };
        load();
    }, []);

    // 🔔 Realtime updates
    useEffect(() => {
        socket.on("postLiked", (data) =>
            setPosts((prev) =>
                prev.map((p) => (p._id === data.postId ? { ...p, likes: data.likes } : p))
            )
        );
        socket.on("commentAdded", (data) =>
            setPosts((prev) =>
                prev.map((p) =>
                    p._id === data.postId
                        ? { ...p, comments: [...p.comments, data.comment] }
                        : p
                )
            )
        );
        socket.on("viewIncremented", (data) =>
            setPosts((prev) =>
                prev.map((p) => (p._id === data.postId ? { ...p, views: data.views } : p))
            )
        );
        return () => {
            socket.off("postLiked");
            socket.off("commentAdded");
            socket.off("viewIncremented");
        };
    }, []);

    // 🔑 Auth handlers
    const handleLogin = async (email, password) => {
        const res = await authAPI.login(email, password);
        setCurrentUser(res);
        localStorage.setItem("ws_user", JSON.stringify(res));
    };

    const handleLogout = () => {
        localStorage.removeItem("ws_user");
        setCurrentUser(null);
    };

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black text-white">
                <nav className="flex justify-between items-center p-4 bg-black/40 backdrop-blur-md border-b border-white/10">
                    <h1 className="text-xl font-bold">🌐 World-Studio</h1>
                    <div className="flex items-center gap-4">
                        <NotificationCenter />
                        {currentUser && (
                            <button
                                onClick={handleLogout}
                                className="bg-red-500/30 px-3 py-1 rounded-md hover:bg-red-500/40"
                            >
                                Logout
                            </button>
                        )}
                    </div>
                </nav>

                <Routes>
                    <Route
                        path="/"
                        element={
                            currentUser ? (
                                <HomePage currentUser={currentUser} posts={posts} />
                            ) : (
                                <LoginPage onLogin={handleLogin} />
                            )
                        }
                    />
                    <Route
                        path="/upload"
                        element={<UploadPage currentUser={currentUser} />}
                    />
                    <Route
                        path="/profile"
                        element={<ProfilePage currentUser={currentUser} />}
                    />
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/stocks" element={<StockPredictor />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}
