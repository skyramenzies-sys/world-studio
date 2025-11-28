// src/components/NotificationsPage.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/api";
import socket from "../api/socket";

const NOTIFICATION_ICONS = {
    follow: "👤",
    like: "❤️",
    comment: "💬",
    gift: "🎁",
    live: "🔴",
    mention: "📢",
    system: "⚙️",
    default: "🔔",
};

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const storedUser = localStorage.getItem("ws_currentUser");
                if (!storedUser) {
                    navigate("/login");
                    return;
                }

                const user = JSON.parse(storedUser);
                const token = localStorage.getItem("token");

                const res = await api.get(`/users/${user._id || user.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const userNotifications = res.data.notifications || [];
                userNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                setNotifications(userNotifications);
            } catch (err) {
                console.error("Failed to fetch notifications:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
    }, [navigate]);

    useEffect(() => {
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
            });
        });
        socket.on("followed_user_live", (data) => {
            handleNewNotification({
                message: `${data.username} is now live: ${data.title}`,
                type: "live",
                streamId: data.streamId,
            });
        });

        return () => {
            socket.off("notification");
            socket.off("gift_received");
            socket.off("followed_user_live");
        };
    }, []);

    const markAllAsRead = async () => {
        try {
            const token = localStorage.getItem("token");
            await api.post("/users/notifications/read-all", {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            toast.success("All notifications marked as read");
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const handleNotificationClick = (notification) => {
        setNotifications(prev =>
            prev.map(n => n._id === notification._id ? { ...n, read: true } : n)
        );

        if (notification.type === "live" && notification.streamId) {
            navigate(`/live/${notification.streamId}`);
        } else if (notification.type === "follow" && notification.fromUser) {
            navigate(`/profile/${notification.fromUser}`);
        }
    };

    const clearAll = async () => {
        try {
            const token = localStorage.getItem("token");
            await api.delete("/users/notifications", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications([]);
            toast.success("All notifications cleared");
        } catch (err) {
            console.error("Failed to clear:", err);
        }
    };

    const filteredNotifications = notifications.filter(n => {
        if (filter === "all") return true;
        if (filter === "unread") return !n.read;
        return n.type === filter;
    });

    const formatTimeAgo = (dateString) => {
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
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">🔔 Notifications</h1>
                    {unreadCount > 0 && (
                        <p className="text-white/50 text-sm">{unreadCount} unread</p>
                    )}
                </div>
                <div className="flex gap-2">
                    {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition">
                            Mark all read
                        </button>
                    )}
                    {notifications.length > 0 && (
                        <button onClick={clearAll} className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition">
                            Clear all
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {[
                    { id: "all", label: "All" },
                    { id: "unread", label: "Unread" },
                    { id: "gift", label: "🎁 Gifts" },
                    { id: "live", label: "🔴 Live" },
                    { id: "follow", label: "👤 Follows" },
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

            {filteredNotifications.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-6xl mb-4">🔔</p>
                    <p className="text-white/60">No notifications yet</p>
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
                                    <div className="w-2 h-2 rounded-full bg-cyan-400 mt-2"></div>
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

            <button
                onClick={() => navigate(-1)}
                className="w-full mt-6 py-3 bg-white/10 border border-white/10 rounded-xl hover:bg-white/20 transition"
            >
                ← Back
            </button>
        </div>
    );
}