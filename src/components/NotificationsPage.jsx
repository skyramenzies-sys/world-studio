// src/components/NotificationsPage.jsx - WORLD STUDIO LIVE EDITION 🔔
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import { io } from "socket.io-client";

/* ============================================================
   WORLD STUDIO LIVE CONFIGURATION
   ============================================================ */
const API_BASE_URL = "https://world-studio.live";
const SOCKET_URL = "https://world-studio.live";

// Create API instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("ws_token") || localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Socket connection (singleton)
let socket = null;
const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
    }
    return socket;
};

/* ============================================================
   CONSTANTS
   ============================================================ */
const NOTIFICATION_ICONS = {
    follow: "👤",
    like: "❤️",
    comment: "💬",
    gift: "🎁",
    live: "🔴",
    mention: "📢",
    system: "⚙️",
    pk: "⚔️",
    achievement: "🏆",
    welcome: "🎉",
    default: "🔔",
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function NotificationsPage() {
    const navigate = useNavigate();
    const socketRef = useRef(null);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    // Initialize socket
    useEffect(() => {
        socketRef.current = getSocket();
        return () => { };
    }, []);

    // Get user ID helper
    const getUserId = () => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (!storedUser) return null;
        try {
            const user = JSON.parse(storedUser);
            return user._id || user.id || user.userId;
        } catch {
            return null;
        }
    };

    // Fetch notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const userId = getUserId();
                if (!userId) {
                    navigate("/login");
                    return;
                }

                // Try dedicated notifications endpoint first
                try {
                    const res = await api.get("/api/users/notifications");
                    const userNotifications = Array.isArray(res.data) ? res.data : res.data.notifications || [];
                    userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    setNotifications(userNotifications);
                } catch (err) {
                    // Fallback to user profile endpoint
                    console.log("Falling back to user profile for notifications");
                    try {
                        const res = await api.get(`/api/users/${userId}`);
                        const userNotifications = res.data.notifications || [];
                        userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                        setNotifications(userNotifications);
                    } catch (profileErr) {
                        console.error("Profile fallback failed:", profileErr);
                        setNotifications([]);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch notifications:", err);
                toast.error("Failed to load notifications");
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [navigate]);

    // Socket listeners for realtime notifications
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleNewNotification = (data) => {
            const newNotification = {
                _id: Date.now().toString(),
                message: data.message,
                type: data.type || "default",
                read: false,
                createdAt: new Date().toISOString(),
                ...data,
            };
            setNotifications(prev => [newNotification, ...prev]);
            toast.success(data.message, { icon: NOTIFICATION_ICONS[data.type] || "🔔" });
        };

        socket.on("notification", handleNewNotification);

        socket.on("gift_received", (data) => {
            handleNewNotification({
                message: `${data.senderUsername} sent you ${data.icon} (${data.amount} coins)`,
                type: "gift",
                amount: data.amount,
                icon: data.icon,
            });
        });

        socket.on("followed_user_live", (data) => {
            handleNewNotification({
                message: `${data.username} is now live: ${data.title}`,
                type: "live",
                streamId: data.streamId,
            });
        });

        socket.on("new_follower", (data) => {
            handleNewNotification({
                message: `${data.username} started following you`,
                type: "follow",
                fromUser: data.userId,
            });
        });

        socket.on("pk_challenge", (data) => {
            handleNewNotification({
                message: `${data.challengerName} challenged you to a PK battle!`,
                type: "pk",
                pkId: data.pkId,
            });
        });

        return () => {
            socket.off("notification");
            socket.off("gift_received");
            socket.off("followed_user_live");
            socket.off("new_follower");
            socket.off("pk_challenge");
        };
    }, []);

    // Mark all as read
    const markAllAsRead = async () => {
        try {
            await api.post("/api/users/notifications/read-all");
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            toast.success("All notifications marked as read");
        } catch (err) {
            console.error("Failed to mark as read:", err);
            // Still update locally
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
    };

    // Handle notification click
    const handleNotificationClick = async (notification) => {
        // Mark as read locally
        setNotifications(prev =>
            prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
        );

        // Try to mark as read on server
        if (notification._id) {
            try {
                await api.post(`/api/users/notifications/${notification._id}/read`);
            } catch (err) {
                // Ignore - already marked locally
            }
        }

        // Navigate based on type
        if (notification.type === "live" && notification.streamId) {
            navigate(`/live/${notification.streamId}`);
        } else if (notification.type === "follow" && notification.fromUser) {
            navigate(`/profile/${notification.fromUser}`);
        } else if (notification.type === "like" && notification.postId) {
            navigate(`/post/${notification.postId}`);
        } else if (notification.type === "comment" && notification.postId) {
            navigate(`/post/${notification.postId}`);
        } else if (notification.type === "pk" && notification.pkId) {
            navigate(`/pk/${notification.pkId}`);
        }
    };

    // Clear all
    const clearAll = async () => {
        try {
            await api.delete("/api/users/notifications");
            setNotifications([]);
            toast.success("All notifications cleared");
        } catch (err) {
            console.error("Failed to clear:", err);
            toast.error("Failed to clear notifications");
        }
    };

    // Filter notifications
    const filteredNotifications = notifications.filter(n => {
        if (filter === "all") return true;
        if (filter === "unread") return !n.read;
        return n.type === filter;
    });

    // Format time
    const formatTimeAgo = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        if (diff < 60000) return "Just now";
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return date.toLocaleDateString();
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                    <p className="text-white/70">Loading notifications...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-white max-w-2xl mx-auto py-6 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">🔔 Notifications</h1>
                    {unreadCount > 0 && (
                        <p className="text-white/50 text-sm">{unreadCount} unread</p>
                    )}
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition"
                        >
                            Mark all read
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button
                            onClick={clearAll}
                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition"
                        >
                            Clear all
                        </button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-6">
                {[
                    { id: "all", label: "All" },
                    { id: "unread", label: "Unread" },
                    { id: "gift", label: "🎁 Gifts" },
                    { id: "live", label: "🔴 Live" },
                    { id: "follow", label: "👤 Follows" },
                    { id: "pk", label: "⚔️ PK" },
                ].map((f) => (
                    <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`px-3 py-1.5 rounded-full text-sm transition ${filter === f.id
                                ? "bg-cyan-500 text-black font-semibold"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                            }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Notifications List */}
            {filteredNotifications.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-6xl mb-4">🔔</p>
                    <p className="text-white/60">No notifications yet</p>
                    <p className="text-white/40 text-sm mt-2">
                        {filter !== "all" ? "Try a different filter" : "You're all caught up!"}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredNotifications.map((notification, index) => (
                        <div
                            key={notification._id || index}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer ${notification.read
                                    ? "bg-white/5 border-white/10 hover:bg-white/10"
                                    : "bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20"
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${notification.read ? "bg-white/10" : "bg-cyan-500/20"
                                    }`}>
                                    {NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={notification.read ? "text-white/70" : "text-white"}>
                                        {notification.message}
                                    </p>
                                    <p className="text-white/40 text-sm mt-1">
                                        {formatTimeAgo(notification.createdAt)}
                                    </p>
                                </div>
                                {!notification.read && (
                                    <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2 animate-pulse"></div>
                                )}
                            </div>
                            {notification.type === "gift" && notification.amount && (
                                <div className="mt-2 ml-13 inline-flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-xs">
                                    💰 {notification.amount} coins
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="w-full mt-6 py-3 bg-white/10 border border-white/10 rounded-xl hover:bg-white/20 transition"
            >
                ← Back
            </button>
        </div>
    );
}