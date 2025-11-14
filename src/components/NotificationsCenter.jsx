import React, { useEffect, useState } from "react";
import { Check, EyeOff, Trash2, RefreshCw, Bell } from "lucide-react";
import socket from "../api/socket";
import axios from "axios";

const PAGE_SIZE = 20;

export default function NotificationsPage({ token }) {
    const [notifs, setNotifs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all"); // all, unread, read
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [info, setInfo] = useState("");

    // Fetch notifications (paginated)
    useEffect(() => {
        if (!token) return;
        setLoading(true);
        axios
            .get(`/api/notifications?page=${page}&filter=${filter}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => {
                setNotifs(res.data.notifications || res.data.items || []);
                setTotalPages(res.data.totalPages || res.data.pages || 1);
            })
            .catch(() => setInfo("Failed to load notifications."))
            .finally(() => setLoading(false));
    }, [token, page, filter]);

    // Real-time updates via socket
    useEffect(() => {
        const handler = (n) => setNotifs((prev) => [n, ...prev.slice(0, PAGE_SIZE - 1)]);
        socket.on("notification", handler);
        return () => socket.off("notification", handler);
    }, []);

    // Mark single as read
    async function markAsRead(id) {
        await axios.post(`/api/notifications/read/${id}`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setNotifs(list => list.map(n => n._id === id ? { ...n, read: true } : n));
    }

    // Mark single as unread
    async function markAsUnread(id) {
        await axios.post(`/api/notifications/unread/${id}`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setNotifs(list => list.map(n => n._id === id ? { ...n, read: false } : n));
    }

    // Delete single notification
    async function deleteNotif(id) {
        await axios.delete(`/api/notifications/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setNotifs(list => list.filter(n => n._id !== id));
    }

    // Mark all as read
    async function markAllRead() {
        await axios.post(`/api/notifications/readall`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setNotifs(list => list.map(n => ({ ...n, read: true })));
        setInfo("All notifications marked as read.");
    }

    // Delete all notifications
    async function deleteAll() {
        await axios.delete(`/api/notifications/all`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        setNotifs([]);
        setInfo("All notifications deleted.");
    }

    // Filters
    const typeFilters = Array.from(new Set(notifs.map(n => n.type).filter(Boolean)));

    function filteredNotifs() {
        if (filter === "all") return notifs;
        if (filter === "unread") return notifs.filter(n => !n.read);
        if (filter === "read") return notifs.filter(n => n.read);
        return notifs.filter(n => n.type === filter);
    }

    return (
        <div className="max-w-2xl mx-auto p-6">
            <div className="flex items-center gap-2 mb-4">
                <Bell className="text-yellow-400" />
                <h1 className="text-2xl font-bold">Notifications Center</h1>
            </div>

            {info && <div className="mb-2 text-yellow-400">{info}</div>}

            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setFilter("all")}
                    className={`px-3 py-1 rounded ${filter === "all" ? "bg-blue-700 text-white" : "bg-gray-700 text-gray-200"}`}
                >All</button>
                <button
                    onClick={() => setFilter("unread")}
                    className={`px-3 py-1 rounded ${filter === "unread" ? "bg-blue-700 text-white" : "bg-gray-700 text-gray-200"}`}
                >Unread</button>
                <button
                    onClick={() => setFilter("read")}
                    className={`px-3 py-1 rounded ${filter === "read" ? "bg-blue-700 text-white" : "bg-gray-700 text-gray-200"}`}
                >Read</button>
                {typeFilters.map(type => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`px-3 py-1 rounded capitalize ${filter === type ? "bg-yellow-400 text-black" : "bg-gray-700 text-gray-200"}`}
                    >{type}</button>
                ))}
                <button
                    onClick={markAllRead}
                    className="ml-auto px-2 py-1 rounded bg-green-600 text-white text-xs"
                ><Check className="inline mr-1" />Mark All Read</button>
                <button
                    onClick={deleteAll}
                    className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                ><Trash2 className="inline mr-1" />Delete All</button>
            </div>

            <div className="bg-black/70 rounded-xl p-2">
                {loading ? (
                    <p className="text-center text-gray-400">Loading...</p>
                ) : filteredNotifs().length === 0 ? (
                    <p className="text-center text-gray-400 py-6">No notifications.</p>
                ) : (
                    <ul>
                        {filteredNotifs().map(n => (
                            <li
                                key={n._id}
                                className={`flex items-center justify-between p-3 mb-2 rounded-lg border ${n.read ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-yellow-900/40 border-yellow-400 text-white"}`}
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
                                            title="Mark as read"
                                            className="text-green-400 hover:text-green-200"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => markAsUnread(n._id)}
                                            title="Mark as unread"
                                            className="text-yellow-400 hover:text-yellow-200"
                                        >
                                            <EyeOff className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteNotif(n._id)}
                                        title="Delete"
                                        className="text-red-400 hover:text-red-200"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="flex justify-center items-center gap-2 mt-6">
                <button
                    onClick={() => setPage(page => Math.max(page - 1, 1))}
                    disabled={page === 1}
                    className="px-2 py-1 bg-gray-700 rounded text-gray-200 disabled:opacity-40"
                >Prev</button>
                <span className="text-gray-300">Page {page} of {totalPages}</span>
                <button
                    onClick={() => setPage(page => Math.min(page + 1, totalPages))}
                    disabled={page === totalPages}
                    className="px-2 py-1 bg-gray-700 rounded text-gray-200 disabled:opacity-40"
                >Next</button>
                <button
                    onClick={() => setLoading(true) || setPage(1)}
                    className="px-2 py-1"
                    title="Refresh"
                >
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                </button>
            </div>
        </div>
    );
}