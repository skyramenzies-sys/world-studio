// src/components/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users, Radio, Shield, ShieldOff, Play, StopCircle,
    RefreshCw, Search, BarChart3, Settings, Trash2
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/api";
import socket from "../api/socket";

export default function AdminDashboard() {
    const navigate = useNavigate();

    // Get current user from localStorage
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("users"); // users | streams | settings
    const [searchQuery, setSearchQuery] = useState("");
    const [actionLoading, setActionLoading] = useState(null);

    // Stats
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        bannedUsers: 0,
        totalStreams: 0,
        activeStreams: 0,
    });

    // Load user from localStorage and check admin
    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentUser(user);

                // Check if user is admin
                if (!user.isAdmin && user.role !== "admin") {
                    toast.error("Admin access required");
                    navigate("/");
                    return;
                }
            } catch (e) {
                console.error("Failed to parse user:", e);
                navigate("/login");
            }
        } else {
            toast.error("Please log in");
            navigate("/login");
        }
    }, [navigate]);

    // Fetch data
    const fetchData = async () => {
        if (!currentUser) return;

        setLoading(true);
        try {
            const [usersRes, streamsRes] = await Promise.allSettled([
                api.get("/users"),
                api.get("/live"),
            ]);

            if (usersRes.status === "fulfilled") {
                const usersData = usersRes.value.data.users || usersRes.value.data || [];
                setUsers(usersData);

                // Calculate stats
                setStats(prev => ({
                    ...prev,
                    totalUsers: usersData.length,
                    activeUsers: usersData.filter(u => !u.banned).length,
                    bannedUsers: usersData.filter(u => u.banned).length,
                }));
            }

            if (streamsRes.status === "fulfilled") {
                const streamsData = Array.isArray(streamsRes.value.data)
                    ? streamsRes.value.data
                    : streamsRes.value.data?.streams || [];
                setStreams(streamsData);

                setStats(prev => ({
                    ...prev,
                    totalStreams: streamsData.length,
                    activeStreams: streamsData.filter(s => s.isLive !== false).length,
                }));
            }
        } catch (err) {
            console.error("Admin fetch error:", err);
            toast.error("Failed to load admin data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (currentUser) {
            fetchData();
        }
    }, [currentUser]);

    // Stop stream
    const stopStream = async (streamId) => {
        setActionLoading(streamId);
        try {
            await api.post(`/live/stop/${streamId}`);
            setStreams((prev) => prev.filter((s) => s._id !== streamId));
            socket.emit("admin_stop_stream", streamId);
            toast.success("Stream stopped");

            setStats(prev => ({
                ...prev,
                activeStreams: prev.activeStreams - 1,
            }));
        } catch (err) {
            console.error("Stop stream error:", err);
            toast.error("Failed to stop stream");
        } finally {
            setActionLoading(null);
        }
    };

    // Ban/Unban user
    const updateBanStatus = async (userId, action) => {
        setActionLoading(userId);
        try {
            await api.put(`/admin/${action}/${userId}`);

            setUsers((prev) =>
                prev.map((u) =>
                    u._id === userId ? { ...u, banned: action === "ban" } : u
                )
            );

            if (action === "ban") {
                socket.emit("admin_ban_user", userId);
                setStats(prev => ({
                    ...prev,
                    activeUsers: prev.activeUsers - 1,
                    bannedUsers: prev.bannedUsers + 1,
                }));
            } else {
                setStats(prev => ({
                    ...prev,
                    activeUsers: prev.activeUsers + 1,
                    bannedUsers: prev.bannedUsers - 1,
                }));
            }

            toast.success(action === "ban" ? "User banned" : "User unbanned");
        } catch (err) {
            console.error("Ban/Unban error:", err);
            toast.error(`Failed to ${action} user`);
        } finally {
            setActionLoading(null);
        }
    };

    // Delete user
    const deleteUser = async (userId) => {
        if (!window.confirm("Are you sure you want to delete this user? This cannot be undone.")) {
            return;
        }

        setActionLoading(userId);
        try {
            await api.delete(`/admin/users/${userId}`);
            setUsers((prev) => prev.filter((u) => u._id !== userId));
            toast.success("User deleted");

            setStats(prev => ({
                ...prev,
                totalUsers: prev.totalUsers - 1,
            }));
        } catch (err) {
            console.error("Delete user error:", err);
            toast.error("Failed to delete user");
        } finally {
            setActionLoading(null);
        }
    };

    // Start test stream
    const startTestStream = async () => {
        setActionLoading("test-stream");
        try {
            const res = await api.post("/live", {
                title: "Admin Test Stream",
                category: "Admin",
                coverImage: "",
                hostId: currentUser._id || currentUser.id,
                hostUsername: currentUser.username,
            });

            setStreams((prev) => [res.data, ...prev]);
            toast.success("Test stream started");

            setStats(prev => ({
                ...prev,
                totalStreams: prev.totalStreams + 1,
                activeStreams: prev.activeStreams + 1,
            }));
        } catch (err) {
            console.error("Start stream error:", err);
            toast.error("Failed to start test stream");
        } finally {
            setActionLoading(null);
        }
    };

    // Filter users by search
    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Filter streams by search
    const filteredStreams = streams.filter(s =>
        s.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.host?.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Loading state
    if (!currentUser || loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                    <p className="text-white/60">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black text-white">
            {/* Header */}
            <div className="bg-black/30 border-b border-white/10 px-4 md:px-8 py-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
                            <Shield className="w-8 h-8 text-cyan-400" />
                            Admin Dashboard
                        </h1>
                        <p className="text-white/60 text-sm mt-1">
                            Manage users, streams, and platform settings
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchData}
                            disabled={loading}
                            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                        <button
                            onClick={() => navigate("/admin/analytics")}
                            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition flex items-center gap-2"
                        >
                            <BarChart3 className="w-4 h-4" />
                            Analytics
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Users className="w-6 h-6 text-blue-400 mb-2" />
                        <p className="text-white/60 text-sm">Total Users</p>
                        <p className="text-2xl font-bold">{stats.totalUsers}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Users className="w-6 h-6 text-green-400 mb-2" />
                        <p className="text-white/60 text-sm">Active Users</p>
                        <p className="text-2xl font-bold">{stats.activeUsers}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <ShieldOff className="w-6 h-6 text-red-400 mb-2" />
                        <p className="text-white/60 text-sm">Banned Users</p>
                        <p className="text-2xl font-bold">{stats.bannedUsers}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Radio className="w-6 h-6 text-purple-400 mb-2" />
                        <p className="text-white/60 text-sm">Total Streams</p>
                        <p className="text-2xl font-bold">{stats.totalStreams}</p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <Play className="w-6 h-6 text-pink-400 mb-2" />
                        <p className="text-white/60 text-sm">Live Now</p>
                        <p className="text-2xl font-bold">{stats.activeStreams}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${activeTab === "users"
                                ? "bg-cyan-500 text-black"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                            }`}
                    >
                        <Users className="w-4 h-4" />
                        Users
                    </button>
                    <button
                        onClick={() => setActiveTab("streams")}
                        className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${activeTab === "streams"
                                ? "bg-cyan-500 text-black"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                            }`}
                    >
                        <Radio className="w-4 h-4" />
                        Streams
                    </button>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 outline-none focus:border-cyan-400 transition"
                        />
                    </div>
                </div>

                {/* Users Tab */}
                {activeTab === "users" && (
                    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="text-left p-4 text-white/60 font-medium">User</th>
                                        <th className="text-left p-4 text-white/60 font-medium">Email</th>
                                        <th className="text-left p-4 text-white/60 font-medium">Role</th>
                                        <th className="text-left p-4 text-white/60 font-medium">Status</th>
                                        <th className="text-right p-4 text-white/60 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-white/50">
                                                No users found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map((user) => (
                                            <tr key={user._id} className="hover:bg-white/5 transition">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <img
                                                            src={user.avatar || "/defaults/default-avatar.png"}
                                                            alt=""
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                        <div>
                                                            <p className="font-medium">{user.username}</p>
                                                            <p className="text-xs text-white/40">ID: {user._id?.slice(-6)}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-white/60">
                                                    {user.email || "N/A"}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs ${user.role === "admin" || user.isAdmin
                                                            ? "bg-purple-500/20 text-purple-400"
                                                            : "bg-white/10 text-white/60"
                                                        }`}>
                                                        {user.role || "user"}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {user.banned ? (
                                                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">
                                                            🚫 Banned
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                                                            ✅ Active
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {user.banned ? (
                                                            <button
                                                                onClick={() => updateBanStatus(user._id, "unban")}
                                                                disabled={actionLoading === user._id}
                                                                className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition text-sm disabled:opacity-50"
                                                            >
                                                                Unban
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => updateBanStatus(user._id, "ban")}
                                                                disabled={actionLoading === user._id || user.role === "admin"}
                                                                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm disabled:opacity-50"
                                                            >
                                                                Ban
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => deleteUser(user._id)}
                                                            disabled={actionLoading === user._id || user.role === "admin"}
                                                            className="p-1.5 bg-white/10 text-white/60 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition disabled:opacity-50"
                                                            title="Delete user"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Streams Tab */}
                {activeTab === "streams" && (
                    <div className="space-y-4">
                        <button
                            onClick={startTestStream}
                            disabled={actionLoading === "test-stream"}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg font-semibold hover:from-cyan-400 hover:to-blue-500 transition flex items-center gap-2 disabled:opacity-50"
                        >
                            {actionLoading === "test-stream" ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                            Start Test Stream
                        </button>

                        <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="text-left p-4 text-white/60 font-medium">Stream</th>
                                            <th className="text-left p-4 text-white/60 font-medium">Category</th>
                                            <th className="text-left p-4 text-white/60 font-medium">Host</th>
                                            <th className="text-left p-4 text-white/60 font-medium">Viewers</th>
                                            <th className="text-right p-4 text-white/60 font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredStreams.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-white/50">
                                                    No active streams
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredStreams.map((stream) => (
                                                <tr key={stream._id} className="hover:bg-white/5 transition">
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                            <span className="font-medium truncate max-w-[200px]">
                                                                {stream.title || "Untitled"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <span className="px-2 py-1 bg-white/10 rounded text-sm">
                                                            {stream.category || "General"}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        {stream.host?.username || "Unknown"}
                                                    </td>
                                                    <td className="p-4">
                                                        {stream.viewers || 0}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => navigate(`/live/${stream._id}`)}
                                                                className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition text-sm"
                                                            >
                                                                View
                                                            </button>
                                                            <button
                                                                onClick={() => stopStream(stream._id)}
                                                                disabled={actionLoading === stream._id}
                                                                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm flex items-center gap-1 disabled:opacity-50"
                                                            >
                                                                <StopCircle className="w-4 h-4" />
                                                                Stop
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}