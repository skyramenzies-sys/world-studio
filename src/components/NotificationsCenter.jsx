import React, { useEffect, useState } from "react";
import { Check, EyeOff, Trash2, RefreshCw, Bell } from "lucide-react";
import socket from "../api/socket";
import axios from "axios";

const PAGE_SIZE = 20;

export default function NotificationsPage({ token }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); // "all" | "read" | "unread" | <type>
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [info, setInfo] = useState("");

    // -------------------------------
    // FETCH PAGINATED NOTIFICATIONS
    // -------------------------------
    async function loadNotifications() {
        if (!token) return;
        setLoading(true);

        try {
            const res = await axios.get(
                `/api/notifications?page=${page}&filter=${filter}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setItems(res.data.notifications || res.data.items || []);
            setPages(res.data.totalPages || res.data.pages || 1);
        } catch (err) {
            setInfo("Failed to load notifications.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadNotifications();
    }, [token, page, filter]);

    // -------------------------------
    // SOCKET: LIVE NEW NOTIFS
    // -------------------------------
    useEffect(() => {
        const handler = (notif) => {
            setItems((prev) => [notif, ...prev.slice(0, PAGE_SIZE - 1)]);
        };
        socket.on("notification", handler);
        return () => socket.off("notification", handler);
    }, []);

    // -------------------------------
    // ACTIONS — READ / UNREAD / DELETE
    // -------------------------------
    async function markAsRead(id) {
        await axios.post(`/api/notifications/read/${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    }

    async function markAsUnread(id) {
        await axios.post(`/api/notifications/unread/${id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
        setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: false } : n)));
    }

    async function deleteNotif(id) {
        await axios.delete(`/api/notifications/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setItems((prev) => prev.filter((n) => n._id !== id));
    }

    async function markAllRead() {
        await axios.post(`/api/notifications/readall`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setItems((prev) => prev.map((n) => ({ ...n, read: true })));
        setInfo("All notifications marked as read.");
    }

    async function deleteAll() {
        await axios.delete(`/api/notifications/all`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setItems([]);
        setInfo("All notifications deleted.");
    }

    // -------------------------------
    // FILTER OPTIONS (GENERATED TYPES)
    // -------------------------------
    const types = Array.from(new Set(items.map((n) => n.type).filter(Boolean)));

    const visible = items.filter((n) => {
        if (filter === "all") return true;
        if (filter === "unread") return !n.read;
        if (filter === "read") return n.read;
        return n.type === filter; // type filter
    });

    // -------------------------------
    // UI
    // -------------------------------
    return (
        <div className="max-w-2xl mx-auto p-6 text-white">
            <div className="flex items-center gap-2 mb-4">
                <Bell className="text-yellow-400" />
                <h1 className="text-2xl font-bold">Notifications Center</h1>
            </div>

            {info && <div className="mb-2 text-yellow-400">{info}</div>}

            {/* FILTER BAR */}
            <div className="flex flex-wrap gap-2 mb-4">
                {["all", "unread", "read"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-3 py-1 rounded capitalize ${filter === f ? "bg-blue-700" : "bg-gray-700"
                            }`}
                    >
                        {f}
                    </button>
                ))}

                {/* Dynamic type filters */}
                {types.map((t) => (
                    <button
                        key={t}
                        onClick={() => setFilter(t)}
                        className={`px-3 py-1 rounded capitalize ${filter === t ? "bg-yellow-400 text-black" : "bg-gray-700"
                            }`}
                    >
                        {t}
                    </button>
                ))}

                <button
                    onClick={markAllRead}
                    className="ml-auto px-2 py-1 rounded bg-green-600 text-white text-xs"
                >
                    <Check className="inline mr-1" /> Mark All Read
                </button>

                <button
                    onClick={deleteAll}
                    className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                >
                    <Trash2 className="inline mr-1" /> Delete All
                </button>
            </div>

            {/* LIST */}
            <div className="bg-black/60 rounded-xl p-3 border border-white/10">
                {loading ? (
                    <p className="text-center text-gray-400 py-6">Loading…</p>
                ) : visible.length === 0 ? (
                    <p className="text-center text-gray-500 py-6">No notifications.</p>
                ) : (
                    <ul>
                        {visible.map((n) => (
                            <li
                                key={n._id}
                                className={`p-3 mb-2 rounded-lg flex items-center justify-between border ${n.read
                                        ? "bg-gray-800 text-gray-400 border-gray-700"
                                        : "bg-yellow-900/40 border-yellow-400 text-white"
                                    }`}
                            >
                                <div>
                                    <div className="font-medium">{n.message}</div>
                                    <div className="text-xs text-gray-400">
                                        {n.type && <span className="capitalize">{n.type} • </span>}
                                        {new Date(n.timestamp).toLocaleString()}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1 items-end">
                                    {!n.read ? (
                                        <button
                                            onClick={() => markAsRead(n._id)}
                                            className="text-green-400 hover:text-green-200"
                                            title="Mark as read"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => markAsUnread(n._id)}
                                            className="text-yellow-400 hover:text-yellow-200"
                                            title="Mark as unread"
                                        >
                                            <EyeOff className="w-4 h-4" />
                                        </button>
                                    )}

                                    <button
                                        onClick={() => deleteNotif(n._id)}
                                        className="text-red-400 hover:text-red-200"
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

            {/* PAGINATION */}
            <div className="flex justify-center items-center gap-3 mt-6">
                <button
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                    className="px-3 py-1 bg-gray-700 rounded disabled:opacity-40"
                >
                    Prev
                </button>

                <span className="text-gray-300">
                    Page {page} / {pages}
                </span>

                <button
                    onClick={() => setPage((p) => Math.min(p + 1, pages))}
                    disabled={page === pages}
                    className="px-3 py-1 bg-gray-700 rounded disabled:opacity-40"
                >
                    Next
                </button>

                <button
                    onClick={() => loadNotifications()}
                    title="Refresh"
                    className="px-2 py-1 hover:bg-gray-600 rounded"
                >
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
            </div>
        </div>
    );
}
