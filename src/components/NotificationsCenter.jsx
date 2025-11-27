// src/components/NotificationsPage.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, EyeOff, Trash2, RefreshCw, Bell } from "lucide-react";
import { toast } from "react-hot-toast";
import socket from "../api/socket";
import api from "../api/api";

const PAGE_SIZE = 20;

export default function NotificationsPage() {
    const navigate = useNavigate();

    // Get current user from localStorage
    const [currentUser, setCurrentUser] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); // "all" | "read" | "unread" | <type>
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        } else {
            // Not logged in
            setLoading(false);
        }
    }, []);

    // Fetch paginated notifications
    async function loadNotifications() {
        if (!currentUser) return;
        setLoading(true);

        try {
            const res = await api.get(`/notifications?page=${page}&filter=${filter}`);
            setItems(res.data.notifications || res.data.items || res.data || []);
            setPages(res.data.totalPages || res.data.pages || 1);
        } catch (err) {
            console.error("Failed to load notifications:", err);
            // If endpoint doesn't exist, use user's notifications from profile
            if (currentUser?.notifications) {
                setItems(currentUser.notifications);
            }
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (currentUser) {
            loadNotifications();
        }
    }, [currentUser, page, filter]);

    // Socket: Live new notifications
    useEffect(() => {
        const handler = (notif) => {
            setItems((prev) => [notif, ...prev.slice(0, PAGE_SIZE - 1)]);
            toast.success(notif.message || "New notification!");
        };

        socket.on("notification", handler);
        return () => socket.off("notification", handler);
    }, []);

    // Mark as read
    async function markAsRead(id) {
        try {
            await api.post(`/notifications/read/${id}`);
            setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
        } catch (err) {
            // Fallback: just update locally
            setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
        }
    }

    // Mark as unread
    async function markAsUnread(id) {
        try {
            await api.post(`/notifications/unread/${id}`);
            setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: false } : n)));
        } catch (err) {
            setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: false } : n)));
        }
    }

    // Delete notification
    async function deleteNotif(id) {
        try {
            await api.delete(`/notifications/${id}`);
            setItems((prev) => prev.filter((n) => n._id !== id));
            toast.success("Notification deleted");
        } catch (err) {
            setItems((prev) => prev.filter((n) => n._id !== id));
        }
    }

    // Mark all as read
    async function markAllRead() {
        try {
            await api.post(`/notifications/readall`);
            setItems((prev) => prev.map((n) => ({ ...n, read: true })));
            toast.success("All notifications marked as read");
        } catch (err) {
            setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        }
    }

    // Delete all notifications
    async function deleteAll() {
        if (!window.confirm("Delete all notifications?")) return;

        try {
            await api.delete(`/notifications/all`);
            setItems([]);
            toast.success("All notifications deleted");
        } catch (err) {
            setItems([]);
        }
    }

    // Get notification icon based on type
    const getNotificationIcon = (type) => {
        switch (type) {
            case "like": return "❤️";
            case "comment": return "💬";
            case "follow": return "👤";
            case "gift": return "🎁";
            case "support": return "💰";
            default: return "🔔";
        }
    };

    // Filter options (generated from existing types)
    const types = Array.from(new Set(items.map((n) => n.type).filter(Boolean)));

    const visible = items.filter((n) => {
        if (filter === "all") return true;
        if (filter === "unread") return !n.read;
        if (filter === "read") return n.read;
        return n.type === filter;
    });

    const unreadCount = items.filter((n) => !n.read).length;

    // Not logged in
    if (!currentUser && !loading) {
        return (
            <div className="max-w-2xl mx-auto p-6 text-center">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
                    <Bell className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-4">Notifications</h2>
                    <p className="text-white/60 mb-6">Please log in to view your notifications</p>
                    <button
                        onClick={() => navigate("/login")}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-semibold"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-6 text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Bell className="w-8 h-8 text-yellow-400" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </div>
                    <h1 className="text-2xl font-bold">Notifications</h1>
                </div>

                <button
                    onClick={() => navigate("/")}
                    className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                >
                    ← Back
                </button>
            </div>

            {/* Filter bar */}
            <div className="flex flex-wrap gap-2 mb-6">
                {["all", "unread", "read"].map((f) => (
                    <button
                        key={f}
                        onClick={() => { setFilter(f); setPage(1); }}
                        className={`px-4 py-2 rounded-lg capitalize text-sm font-medium transition ${filter === f
                                ? "bg-cyan-500 text-black"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                            }`}
                    >
                        {f}
                        {f === "unread" && unreadCount > 0 && (
                            <span className="ml-1 bg-red-500 text-white px-1.5 rounded-full text-xs">
                                {unreadCount}
                            </span>
                        )}
                    </button>
                ))}

                {/* Dynamic type filters */}
                {types.map((t) => (
                    <button
                        key={t}
                        onClick={() => { setFilter(t); setPage(1); }}
                        className={`px-4 py-2 rounded-lg capitalize text-sm font-medium transition ${filter === t
                                ? "bg-yellow-400 text-black"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                            }`}
                    >
                        {getNotificationIcon(t)} {t}
                    </button>
                ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={markAllRead}
                    disabled={unreadCount === 0}
                    className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition disabled:opacity-50 flex items-center gap-1"
                >
                    <Check className="w-4 h-4" /> Mark All Read
                </button>

                <button
                    onClick={deleteAll}
                    disabled={items.length === 0}
                    className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition disabled:opacity-50 flex items-center gap-1"
                >
                    <Trash2 className="w-4 h-4" /> Delete All
                </button>

                <button
                    onClick={loadNotifications}
                    className="ml-auto px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition flex items-center gap-1"
                    title="Refresh"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </button>
            </div>

            {/* Notifications list */}
            <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mb-4"></div>
                        <p className="text-white/60">Loading notifications...</p>
                    </div>
                ) : visible.length === 0 ? (
                    <div className="p-8 text-center">
                        <Bell className="w-12 h-12 text-white/20 mx-auto mb-4" />
                        <p className="text-white/50">No notifications</p>
                        {filter !== "all" && (
                            <button
                                onClick={() => setFilter("all")}
                                className="mt-2 text-cyan-400 text-sm hover:underline"
                            >
                                View all notifications
                            </button>
                        )}
                    </div>
                ) : (
                    <ul className="divide-y divide-white/10">
                        {visible.map((n) => (
                            <li
                                key={n._id}
                                className={`p-4 flex items-start gap-4 transition ${n.read
                                        ? "bg-transparent"
                                        : "bg-cyan-500/5"
                                    }`}
                            >
                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${n.read ? "bg-white/10" : "bg-cyan-500/20"
                                    }`}>
                                    {getNotificationIcon(n.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className={`${n.read ? "text-white/60" : "text-white"}`}>
                                        {n.message}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-white/40">
                                        {n.type && (
                                            <span className="capitalize bg-white/10 px-2 py-0.5 rounded">
                                                {n.type}
                                            </span>
                                        )}
                                        <span>
                                            {n.timestamp
                                                ? new Date(n.timestamp).toLocaleString()
                                                : ""}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-1">
                                    {!n.read ? (
                                        <button
                                            onClick={() => markAsRead(n._id)}
                                            className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg transition"
                                            title="Mark as read"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => markAsUnread(n._id)}
                                            className="p-2 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition"
                                            title="Mark as unread"
                                        >
                                            <EyeOff className="w-4 h-4" />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => deleteNotif(n._id)}
                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Pagination */}
            {pages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                    <button
                        onClick={() => setPage((p) => Math.max(p - 1, 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-white/10 rounded-lg disabled:opacity-40 hover:bg-white/20 transition"
                    >
                        ← Prev
                    </button>

                    <span className="text-white/60">
                        Page {page} of {pages}
                    </span>

                    <button
                        onClick={() => setPage((p) => Math.min(p + 1, pages))}
                        disabled={page === pages}
                        className="px-4 py-2 bg-white/10 rounded-lg disabled:opacity-40 hover:bg-white/20 transition"
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
}