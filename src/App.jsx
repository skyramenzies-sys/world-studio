// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import socket from "./api/socket";
import { postsAPI, authAPI, adminAPI } from "./api/api";

import HomePage from "./components/HomePage";
import UploadPage from "./components/UploadPage";
import ProfilePage from "./components/ProfilePage";
import AdminDashboard from "./components/AdminDashboard";
import LivePage from "./components/LivePage";
import StockPredictor from "./components/StockPredictor";
import NotificationsCenter from "./components/NotificationsCenter";

function App() {
    // ======= STATE =======
    const [currentPage, setCurrentPage] = useState("home"); // 'home' | 'upload' | 'profile' | 'admin' | 'live' | 'stocks' | 'notifications'
    const [currentUser, setCurrentUser] = useState(null);

    const [posts, setPosts] = useState([]);
    const [users, setUsers] = useState([]); // optioneel, als je backend users endpoint gebruikt
    const [messages, setMessages] = useState([]);
    const [stories, setStories] = useState([]);

    // ======= INIT USER + POSTS =======
    useEffect(() => {
        // user laden
        try {
            const saved = JSON.parse(localStorage.getItem("ws_currentUser") || "null");
            if (saved) setCurrentUser(saved);
        } catch { }

        // posts laden
        (async () => {
            try {
                const data = await postsAPI.getAll();
                setPosts(data);
            } catch (e) {
                console.error("Failed to load posts:", e);
            }
        })();
    }, []);

    // ======= SOCKET REALTIME FEED =======
    useEffect(() => {
        // Nieuwe post binnen
        socket.on("post_created", (post) => {
            setPosts((prev) => [post, ...prev]);
        });

        // Likes live bijwerken
        socket.on("post_liked", ({ postId, likes, likedBy }) => {
            setPosts((prev) =>
                prev.map((p) =>
                    (p._id || p.id) === postId ? { ...p, likes, likedBy } : p
                )
            );
        });

        // Nieuwe comment live bijwerken
        socket.on("post_commented", ({ postId, comments }) => {
            setPosts((prev) =>
                prev.map((p) =>
                    (p._id || p.id) === postId ? { ...p, comments } : p
                )
            );
        });

        return () => {
            socket.off("post_created");
            socket.off("post_liked");
            socket.off("post_commented");
        };
    }, []);

    // ======= AUTH (simpele handlers; jij hebt al LoginPage/etc) =======
    const handleLogin = async (email, password) => {
        const res = await authAPI.login(email, password);
        const user = {
            id: res.userId,
            username: res.username,
            email: res.email,
            role: res.role || "user",
            avatar: res.avatar || "/default-avatar.png",
            token: res.token,
        };
        setCurrentUser(user);
        localStorage.setItem("ws_currentUser", JSON.stringify(user));
        setCurrentPage("home");
        return true;
    };

    const handleRegister = async (payload) => {
        const res = await authAPI.register(payload);
        const user = {
            id: res.userId,
            username: res.username,
            email: res.email,
            role: res.role || "user",
            avatar: res.avatar || "/default-avatar.png",
            token: res.token,
        };
        setCurrentUser(user);
        localStorage.setItem("ws_currentUser", JSON.stringify(user));
        setCurrentPage("home");
        return true;
    };

    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem("ws_currentUser");
        setCurrentPage("home");
    };

    // ======= POSTS ACTIONS (API + realtime socket fallback) =======
    const handleUpload = async (formData) => {
        // formData is een FormData (title, description, type, file)
        const newPost = await postsAPI.create(formData);
        // server emit al 'post_created'; maar lokaal updaten voor snappy UX:
        setPosts((prev) => [newPost, ...prev]);
        setCurrentPage("home");
    };

    const handleLike = async (postId) => {
        try {
            const data = await postsAPI.like(postId);
            setPosts((prev) =>
                prev.map((p) =>
                    (p._id || p.id) === postId ? { ...p, likes: data.likes, likedBy: data.likedBy } : p
                )
            );
        } catch (e) {
            console.error("like failed", e);
        }
    };

    const handleComment = async (postId, text) => {
        if (!text?.trim()) return;
        try {
            const data = await postsAPI.comment(postId, text);
            setPosts((prev) =>
                prev.map((p) =>
                    (p._id || p.id) === postId ? { ...p, comments: data.comments } : p
                )
            );
        } catch (e) {
            console.error("comment failed", e);
        }
    };

    const incrementViews = async (postId) => {
        try {
            const d = await postsAPI.view(postId);
            setPosts((prev) =>
                prev.map((p) =>
                    (p._id || p.id) === postId ? { ...p, views: d.views } : p
                )
            );
        } catch (e) {
            // non-blocking
        }
    };

    // ======= PAGE ROUTING (zonder NavBar) =======
    if (!currentUser && currentPage !== "home") {
        // je kunt hier een eigen LoginPage renderen; ik houd het simpel:
        // return <LoginPage onLogin={handleLogin} onRegister={handleRegister} />
    }

    if (currentPage === "upload") {
        return (
            <UploadPage
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                onUpload={handleUpload}
                onLogout={handleLogout}
            />
        );
    }

    if (currentPage === "profile") {
        return (
            <ProfilePage
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
                posts={posts.filter((p) => (p.userId?._id || p.userId || p.authorId) === currentUser?.id)}
                onLogout={handleLogout}
            />
        );
    }

    if (currentPage === "admin") {
        return (
            <AdminDashboard
                onLogout={handleLogout}
                users={users}
                posts={posts}
            />
        );
    }

    if (currentPage === "live") {
        return <LivePage currentUser={currentUser} setCurrentPage={setCurrentPage} />;
    }

    if (currentPage === "stocks") {
        return (
            <div className="min-h-screen bg-slate-900 text-white">
                <div className="p-4">
                    <button
                        onClick={() => setCurrentPage("home")}
                        className="px-4 py-2 rounded-lg bg-white/10 border border-white/20"
                    >
                        ← Back
                    </button>
                </div>
                <StockPredictor />
            </div>
        );
    }

    if (currentPage === "notifications") {
        return (
            <NotificationsCenter
                currentUser={currentUser}
                setCurrentPage={setCurrentPage}
            />
        );
    }

    // HOME
    return (
        <HomePage
            currentUser={currentUser}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            posts={posts}
            users={users}
            onLike={handleLike}
            onComment={handleComment}
            onView={incrementViews}
            onLogout={handleLogout}
            // optioneel kun je props voor stories/messages blijven doorgeven:
            messages={messages}
            stories={stories}
        />
    );
}

export default App;
