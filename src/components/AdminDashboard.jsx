// src/components/AdminDashboard.jsx - ULTIMATE EDITION 🚀
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "react-hot-toast";
import api from "../api/api";
import socket from "../api/socket";

// ============================================
// CONSTANTS
// ============================================
const TABS = [
    { id: "overview", label: "📊 Overview", icon: "📊" },
    { id: "users", label: "👥 Users", icon: "👥" },
    { id: "streams", label: "🎥 Streams", icon: "🎥" },
    { id: "gifts", label: "🎁 Gifts", icon: "🎁" },
    { id: "withdrawals", label: "💸 Withdrawals", icon: "💸" },
    { id: "reports", label: "🚨 Reports", icon: "🚨" },
    { id: "revenue", label: "💰 Revenue", icon: "💰" },
    { id: "settings", label: "⚙️ Settings", icon: "⚙️" },
];

// ============================================
// STAT CARD COMPONENT
// ============================================
const StatCard = ({ title, value, subtitle, icon, gradient, trend }) => (
    <div className={`bg-gradient-to-br ${gradient} border border-white/20 rounded-2xl p-5 hover:scale-[1.02] transition-transform`}>
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-white/70 text-sm font-semibold">{title}</h3>
            <span className="text-2xl">{icon}</span>
        </div>
        <p className="text-3xl font-bold text-white">{value}</p>
        <div className="flex items-center justify-between mt-2">
            <p className="text-white/50 text-sm">{subtitle}</p>
            {trend !== undefined && (
                <span className={`text-xs font-bold ${trend >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
                </span>
            )}
        </div>
    </div>
);

// ============================================
// USER DETAIL MODAL
// ============================================
const UserDetailModal = ({ user, onClose, onAction }) => {
    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-white/20 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <img
                            src={user.avatar || "/defaults/default-avatar.png"}
                            className="w-20 h-20 rounded-full border-4 border-cyan-500/50"
                            alt=""
                        />
                        <div>
                            <h2 className="text-2xl font-bold text-white">{user.username}</h2>
                            <p className="text-white/50">{user.email}</p>
                            <div className="flex gap-2 mt-2">
                                {user.role === "admin" && (
                                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">👑 ADMIN</span>
                                )}
                                {user.isBanned && (
                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full">🚫 BANNED</span>
                                )}
                                {user.isVerified && (
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">✓ Verified</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-white/50 text-xs">Coins Balance</p>
                            <p className="text-xl font-bold text-yellow-400">🪙 {user.wallet?.balance || 0}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-white/50 text-xs">Total Earnings</p>
                            <p className="text-xl font-bold text-green-400">€{(user.totalEarnings || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-white/50 text-xs">Followers</p>
                            <p className="text-xl font-bold text-cyan-400">{user.followers?.length || 0}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-white/50 text-xs">Following</p>
                            <p className="text-xl font-bold text-purple-400">{user.following?.length || 0}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-white/50 text-xs">Total Streams</p>
                            <p className="text-xl font-bold text-pink-400">{user.totalStreams || 0}</p>
                        </div>
                        <div className="bg-white/5 rounded-xl p-3">
                            <p className="text-white/50 text-xs">Joined</p>
                            <p className="text-sm font-bold text-white/70">
                                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                            </p>
                        </div>
                    </div>

                    {/* Bio */}
                    {user.bio && (
                        <div className="bg-white/5 rounded-xl p-4 mb-6">
                            <p className="text-white/50 text-xs mb-1">Bio</p>
                            <p className="text-white/80 text-sm">{user.bio}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                        {user.role !== "admin" ? (
                            <button
                                onClick={() => onAction("makeAdmin", user._id)}
                                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-sm font-semibold transition"
                            >
                                👑 Make Admin
                            </button>
                        ) : (
                            <button
                                onClick={() => onAction("removeAdmin", user._id)}
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg text-sm font-semibold transition"
                            >
                                Remove Admin
                            </button>
                        )}

                        {!user.isBanned ? (
                            <button
                                onClick={() => onAction("ban", user._id)}
                                className="px-4 py-2 bg-red-500/70 hover:bg-red-500 rounded-lg text-sm font-semibold transition"
                            >
                                🚫 Ban User
                            </button>
                        ) : (
                            <button
                                onClick={() => onAction("unban", user._id)}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-semibold transition"
                            >
                                ✓ Unban
                            </button>
                        )}

                        <button
                            onClick={() => onAction("delete", user._id)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-semibold transition"
                        >
                            🗑️ Delete
                        </button>

                        <button
                            onClick={() => onAction("message", user._id)}
                            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-semibold transition"
                        >
                            ✉️ Message
                        </button>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white transition"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// ANNOUNCEMENT MODAL
// ============================================
const AnnouncementModal = ({ onClose, onSend }) => {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("info"); // info, warning, success
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            toast.error("Please fill in all fields");
            return;
        }
        setSending(true);
        await onSend({ title, message, type });
        setSending(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-white/20 rounded-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        📢 Send Announcement
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="text-sm text-white/70 mb-1 block">Type</label>
                            <div className="flex gap-2">
                                {["info", "warning", "success"].map(t => (
                                    <button
                                        key={t}
                                        onClick={() => setType(t)}
                                        className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${type === t
                                            ? t === "info" ? "bg-blue-500" : t === "warning" ? "bg-yellow-500" : "bg-green-500"
                                            : "bg-white/10 hover:bg-white/20"
                                            }`}
                                    >
                                        {t === "info" ? "ℹ️ Info" : t === "warning" ? "⚠️ Warning" : "✅ Success"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm text-white/70 mb-1 block">Title</label>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Announcement title..."
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg outline-none focus:border-cyan-400"
                            />
                        </div>

                        <div>
                            <label className="text-sm text-white/70 mb-1 block">Message</label>
                            <textarea
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Write your announcement..."
                                rows={4}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg outline-none focus:border-cyan-400 resize-none"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={sending}
                                className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 rounded-xl font-semibold transition"
                            >
                                {sending ? "Sending..." : "📢 Send to All"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function AdminDashboard() {
    // State
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [streams, setStreams] = useState([]);
    const [gifts, setGifts] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [reports, setReports] = useState([]);
    const [revenue, setRevenue] = useState(null);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [userFilter, setUserFilter] = useState("all");
    const [streamFilter, setStreamFilter] = useState("live");
    const [dateRange, setDateRange] = useState("7d");

    // Selection for bulk actions
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedStreams, setSelectedStreams] = useState([]);

    // Modals
    const [selectedUser, setSelectedUser] = useState(null);
    const [showAnnouncement, setShowAnnouncement] = useState(false);

    // Action loading states
    const [actionLoading, setActionLoading] = useState({});

    // Current admin user
    const currentUserId = useMemo(() => {
        try {
            const raw = localStorage.getItem("ws_currentUser") || localStorage.getItem("user");
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed._id || parsed.userId || parsed.id || null;
        } catch {
            return null;
        }
    }, []);

    // ============================================
    // DATA FETCHING
    // ============================================
    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);

            const [statsRes, usersRes, revenueRes] = await Promise.all([
                api.get("/admin/stats").catch(() => ({ data: {} })),
                api.get("/admin/users").catch(() => ({ data: { users: [] } })),
                api.get("/admin/revenue").catch(() => ({ data: {} })),
            ]);

            setStats(statsRes.data);
            setUsers(usersRes.data.users || usersRes.data || []);
            setRevenue(revenueRes.data);

            // Fetch additional data
            const [streamsRes, withdrawalsRes, reportsRes] = await Promise.all([
                api.get("/admin/streams").catch(() => ({ data: [] })),
                api.get("/admin/withdrawals").catch(() => ({ data: [] })),
                api.get("/admin/reports").catch(() => ({ data: [] })),
            ]);

            setStreams(streamsRes.data.streams || streamsRes.data || []);
            setWithdrawals(withdrawalsRes.data.withdrawals || withdrawalsRes.data || []);
            setReports(reportsRes.data.reports || reportsRes.data || []);

        } catch (err) {
            console.error("Dashboard fetch error:", err);
            toast.error("Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // ============================================
    // REAL-TIME SOCKET UPDATES
    // ============================================
    useEffect(() => {
        socket.on("live_started", (stream) => {
            setStreams(prev => [stream, ...prev.filter(s => s._id !== stream._id)]);
            setStats(prev => prev ? { ...prev, activeStreams: (prev.activeStreams || 0) + 1 } : prev);
        });

        socket.on("live_stopped", ({ _id }) => {
            setStreams(prev => prev.map(s => s._id === _id ? { ...s, isLive: false } : s));
            setStats(prev => prev ? { ...prev, activeStreams: Math.max(0, (prev.activeStreams || 1) - 1) } : prev);
        });

        socket.on("new_user_registered", (user) => {
            setUsers(prev => [user, ...prev]);
            setStats(prev => prev ? { ...prev, totalUsers: (prev.totalUsers || 0) + 1, newUsersToday: (prev.newUsersToday || 0) + 1 } : prev);
        });

        socket.on("new_report", (report) => {
            setReports(prev => [report, ...prev]);
            toast("🚨 New report received!", { icon: "🚨" });
        });

        socket.on("new_withdrawal", (withdrawal) => {
            setWithdrawals(prev => [withdrawal, ...prev]);
            toast("💸 New withdrawal request!", { icon: "💸" });
        });

        return () => {
            socket.off("live_started");
            socket.off("live_stopped");
            socket.off("new_user_registered");
            socket.off("new_report");
            socket.off("new_withdrawal");
        };
    }, []);

    // ============================================
    // ACTION HELPERS
    // ============================================
    const setActionLoadingState = (id, action, value) => {
        setActionLoading(prev => ({ ...prev, [`${id}-${action}`]: value }));
    };

    const isActionLoading = (id, action) => !!actionLoading[`${id}-${action}`];

    // ============================================
    // USER ACTIONS
    // ============================================
    const handleUserAction = async (action, userId) => {
        if (userId === currentUserId && ["ban", "delete", "removeAdmin"].includes(action)) {
            toast.error("You cannot perform this action on yourself");
            return;
        }

        if (["delete", "ban"].includes(action)) {
            if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
        }

        setActionLoadingState(userId, action, true);

        try {
            switch (action) {
                case "makeAdmin":
                    await api.post(`/admin/make-admin/${userId}`);
                    toast.success("User promoted to admin!");
                    break;
                case "removeAdmin":
                    await api.post(`/admin/remove-admin/${userId}`);
                    toast.success("Admin role removed!");
                    break;
                case "ban":
                    await api.post(`/admin/ban-user/${userId}`);
                    toast.success("User banned!");
                    break;
                case "unban":
                    await api.post(`/admin/unban-user/${userId}`);
                    toast.success("User unbanned!");
                    break;
                case "delete":
                    await api.delete(`/admin/delete-user/${userId}`);
                    toast.success("User deleted!");
                    break;
                case "message":
                    toast("Message feature coming soon!", { icon: "✉️" });
                    return;
                default:
                    break;
            }
            await fetchDashboardData();
            setSelectedUser(null);
        } catch (err) {
            toast.error(err.response?.data?.error || `Failed to ${action} user`);
        } finally {
            setActionLoadingState(userId, action, false);
        }
    };

    // Bulk user actions
    const handleBulkUserAction = async (action) => {
        if (selectedUsers.length === 0) {
            toast.error("No users selected");
            return;
        }

        if (!window.confirm(`${action} ${selectedUsers.length} users?`)) return;

        try {
            for (const userId of selectedUsers) {
                if (userId !== currentUserId) {
                    await handleUserAction(action, userId);
                }
            }
            setSelectedUsers([]);
            toast.success(`Bulk ${action} completed!`);
        } catch (err) {
            toast.error("Some actions failed");
        }
    };

    // ============================================
    // STREAM ACTIONS
    // ============================================
    const stopStream = async (streamId) => {
        if (!window.confirm("Stop this stream?")) return;

        setActionLoadingState(streamId, "stop", true);
        try {
            await api.post(`/admin/stop-stream/${streamId}`);
            socket.emit("admin_stop_stream", streamId);
            toast.success("Stream stopped!");
            await fetchDashboardData();
        } catch (err) {
            toast.error("Failed to stop stream");
        } finally {
            setActionLoadingState(streamId, "stop", false);
        }
    };

    // ============================================
    // WITHDRAWAL ACTIONS
    // ============================================
    const handleWithdrawal = async (withdrawalId, action) => {
        setActionLoadingState(withdrawalId, action, true);
        try {
            await api.post(`/admin/withdrawals/${withdrawalId}/${action}`);
            toast.success(`Withdrawal ${action}ed!`);
            await fetchDashboardData();
        } catch (err) {
            toast.error(`Failed to ${action} withdrawal`);
        } finally {
            setActionLoadingState(withdrawalId, action, false);
        }
    };

    // ============================================
    // REPORT ACTIONS
    // ============================================
    const handleReport = async (reportId, action) => {
        setActionLoadingState(reportId, action, true);
        try {
            await api.post(`/admin/reports/${reportId}/${action}`);
            toast.success(`Report ${action}ed!`);
            await fetchDashboardData();
        } catch (err) {
            toast.error(`Failed to ${action} report`);
        } finally {
            setActionLoadingState(reportId, action, false);
        }
    };

    // ============================================
    // ANNOUNCEMENT
    // ============================================
    const sendAnnouncement = async (data) => {
        try {
            await api.post("/admin/announcement", data);
            socket.emit("system_announcement", data);
            toast.success("Announcement sent to all users!");
        } catch (err) {
            toast.error("Failed to send announcement");
        }
    };

    // ============================================
    // EXPORT DATA
    // ============================================
    const exportData = (type) => {
        let data = [];
        let filename = "";

        switch (type) {
            case "users":
                data = users.map(u => ({
                    username: u.username,
                    email: u.email,
                    role: u.role,
                    banned: u.isBanned ? "Yes" : "No",
                    coins: u.wallet?.balance || 0,
                    joined: u.createdAt
                }));
                filename = "users_export.csv";
                break;
            case "revenue":
                data = revenue?.recentTransactions || [];
                filename = "revenue_export.csv";
                break;
            case "streams":
                data = streams.map(s => ({
                    title: s.title,
                    streamer: s.streamerName,
                    category: s.category,
                    viewers: s.viewers,
                    isLive: s.isLive ? "Yes" : "No",
                    startedAt: s.startedAt
                }));
                filename = "streams_export.csv";
                break;
            default:
                return;
        }

        if (data.length === 0) {
            toast.error("No data to export");
            return;
        }

        const headers = Object.keys(data[0]).join(",");
        const rows = data.map(row => Object.values(row).join(",")).join("\n");
        const csv = `${headers}\n${rows}`;

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);

        toast.success(`Exported ${data.length} records!`);
    };

    // ============================================
    // FILTERED DATA
    // ============================================
    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            const matchesSearch =
                user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email?.toLowerCase().includes(searchTerm.toLowerCase());

            if (userFilter === "all") return matchesSearch;
            if (userFilter === "admin") return matchesSearch && user.role === "admin";
            if (userFilter === "banned") return matchesSearch && user.isBanned;
            if (userFilter === "verified") return matchesSearch && user.isVerified;

            return matchesSearch;
        });
    }, [users, searchTerm, userFilter]);

    const filteredStreams = useMemo(() => {
        return streams.filter(stream => {
            if (streamFilter === "live") return stream.isLive;
            if (streamFilter === "ended") return !stream.isLive;
            return true;
        });
    }, [streams, streamFilter]);

    const pendingWithdrawals = useMemo(() =>
        withdrawals.filter(w => w.status === "pending"), [withdrawals]);

    const pendingReports = useMemo(() =>
        reports.filter(r => r.status === "pending"), [reports]);

    // Stats
    const totalAdmins = useMemo(() => users.filter(u => u.role === "admin").length, [users]);
    const totalBanned = useMemo(() => users.filter(u => u.isBanned).length, [users]);
    const liveStreamsCount = useMemo(() => streams.filter(s => s.isLive).length, [streams]);

    // ============================================
    // LOADING STATE
    // ============================================
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/70">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 text-white">
            {/* Modals */}
            {selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onAction={handleUserAction}
                />
            )}
            {showAnnouncement && (
                <AnnouncementModal
                    onClose={() => setShowAnnouncement(false)}
                    onSend={sendAnnouncement}
                />
            )}

            <div className="max-w-7xl mx-auto p-4 md:p-6">
                {/* Header */}
                <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                            🎛️ Admin Dashboard
                        </h1>
                        <p className="text-white/60 text-sm">
                            World-Studio Control Center • {new Date().toLocaleDateString()}
                        </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setShowAnnouncement(true)}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg font-semibold transition flex items-center gap-2"
                        >
                            <span>📢</span>
                            <span className="hidden sm:inline">Announce</span>
                        </button>
                        <button
                            onClick={fetchDashboardData}
                            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg font-semibold transition flex items-center gap-2"
                        >
                            <span>🔄</span>
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <StatCard
                        title="Total Users"
                        value={stats?.totalUsers || users.length}
                        subtitle={`+${stats?.newUsersToday || 0} today`}
                        icon="👥"
                        gradient="from-cyan-500/20 to-blue-500/20"
                        trend={stats?.userGrowthPercent}
                    />
                    <StatCard
                        title="Revenue"
                        value={`€${(revenue?.totalRevenue || 0).toFixed(0)}`}
                        subtitle={`€${(revenue?.revenueToday || 0).toFixed(2)} today`}
                        icon="💰"
                        gradient="from-green-500/20 to-emerald-500/20"
                        trend={revenue?.revenueGrowthPercent}
                    />
                    <StatCard
                        title="Live Streams"
                        value={stats?.activeStreams || liveStreamsCount}
                        subtitle={`${streams.length} total`}
                        icon="🎥"
                        gradient="from-purple-500/20 to-pink-500/20"
                    />
                    <StatCard
                        title="Pending"
                        value={pendingWithdrawals.length + pendingReports.length}
                        subtitle={`${pendingWithdrawals.length} withdrawals, ${pendingReports.length} reports`}
                        icon="⏳"
                        gradient="from-orange-500/20 to-red-500/20"
                    />
                </div>

                {/* Tabs */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                    {/* Tab Navigation */}
                    <div className="flex overflow-x-auto border-b border-white/10 scrollbar-hide">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-shrink-0 py-3 px-4 md:px-6 font-semibold transition whitespace-nowrap ${activeTab === tab.id
                                    ? "bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400"
                                    : "text-white/50 hover:text-white/80"
                                    }`}
                            >
                                <span className="md:hidden">{tab.icon}</span>
                                <span className="hidden md:inline">{tab.label}</span>
                                {tab.id === "reports" && pendingReports.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                                        {pendingReports.length}
                                    </span>
                                )}
                                {tab.id === "withdrawals" && pendingWithdrawals.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-yellow-500 text-black text-xs rounded-full">
                                        {pendingWithdrawals.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="p-4 md:p-6">
                        {/* ==================== OVERVIEW TAB ==================== */}
                        {activeTab === "overview" && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* User Growth */}
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                        <h3 className="font-semibold mb-3 text-cyan-400">📈 User Growth (7 Days)</h3>
                                        <div className="space-y-2">
                                            {stats?.userGrowth?.length ? (
                                                stats.userGrowth.map((day, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm">
                                                        <span className="text-white/70">{day.date}</span>
                                                        <span className="font-bold text-green-400">+{day.count}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-white/40 text-sm">No growth data yet</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Top Earners */}
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                        <h3 className="font-semibold mb-3 text-yellow-400">💎 Top Earners</h3>
                                        <div className="space-y-2">
                                            {stats?.topEarners?.slice(0, 5).map((user, idx) => (
                                                <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                                                    <div className="flex items-center gap-2">
                                                        <span>{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][idx]}</span>
                                                        <img src={user.avatar || "/defaults/default-avatar.png"} className="w-8 h-8 rounded-full" alt="" />
                                                        <span className="font-semibold text-sm truncate max-w-[100px]">{user.username}</span>
                                                    </div>
                                                    <span className="font-bold text-green-400 text-sm">€{user.earnings?.toFixed(2) || "0.00"}</span>
                                                </div>
                                            )) || <p className="text-white/40 text-sm">No data yet</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Activity */}
                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h3 className="font-semibold mb-3 text-purple-400">🔔 Recent Activity</h3>
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {/* Live Streams */}
                                        {streams.filter(s => s.isLive).slice(0, 3).map((stream, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                                    <span className="font-semibold">{stream.streamerName}</span>
                                                    <span className="text-white/50 text-sm">is live: {stream.title}</span>
                                                </div>
                                                <span className="text-white/50 text-sm">👁 {stream.viewers || 0}</span>
                                            </div>
                                        ))}
                                        {streams.filter(s => s.isLive).length === 0 && (
                                            <p className="text-white/40 text-sm text-center py-4">No active streams</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ==================== USERS TAB ==================== */}
                        {activeTab === "users" && (
                            <div className="space-y-4">
                                {/* Stats & Filters */}
                                <div className="flex flex-col md:flex-row md:items-center gap-3">
                                    <div className="flex flex-wrap gap-2 text-xs text-white/60">
                                        <span>👥 {users.length} total</span>
                                        <span>👑 {totalAdmins} admins</span>
                                        <span>🚫 {totalBanned} banned</span>
                                    </div>
                                    <div className="flex-1"></div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            placeholder="Search..."
                                            className="flex-1 md:w-48 px-3 py-2 bg-white/10 border border-white/20 rounded-lg outline-none focus:border-cyan-400 text-sm"
                                        />
                                        <select
                                            value={userFilter}
                                            onChange={e => setUserFilter(e.target.value)}
                                            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg outline-none text-sm"
                                        >
                                            <option value="all">All</option>
                                            <option value="admin">Admins</option>
                                            <option value="banned">Banned</option>
                                        </select>
                                        <button
                                            onClick={() => exportData("users")}
                                            className="px-3 py-2 bg-green-500/20 hover:bg-green-500/40 border border-green-500/30 rounded-lg text-sm"
                                        >
                                            📥 Export
                                        </button>
                                    </div>
                                </div>

                                {/* Bulk Actions */}
                                {selectedUsers.length > 0 && (
                                    <div className="flex items-center gap-2 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                                        <span className="text-sm">{selectedUsers.length} selected</span>
                                        <button onClick={() => handleBulkUserAction("ban")} className="px-3 py-1 bg-red-500/50 hover:bg-red-500 rounded-lg text-sm">Ban All</button>
                                        <button onClick={() => setSelectedUsers([])} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-sm">Clear</button>
                                    </div>
                                )}

                                {/* Users List */}
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {filteredUsers.length === 0 ? (
                                        <p className="text-white/40 text-center py-8">No users found</p>
                                    ) : filteredUsers.map(user => (
                                        <div
                                            key={user._id}
                                            className="bg-white/5 hover:bg-white/10 rounded-xl p-3 border border-white/10 cursor-pointer transition"
                                            onClick={() => setSelectedUser(user)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(user._id)}
                                                    onChange={e => {
                                                        e.stopPropagation();
                                                        setSelectedUsers(prev =>
                                                            prev.includes(user._id)
                                                                ? prev.filter(id => id !== user._id)
                                                                : [...prev, user._id]
                                                        );
                                                    }}
                                                    className="w-4 h-4 rounded"
                                                />
                                                <img src={user.avatar || "/defaults/default-avatar.png"} className="w-10 h-10 rounded-full" alt="" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold truncate">{user.username}</span>
                                                        {user.role === "admin" && <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">👑</span>}
                                                        {user.isBanned && <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">🚫</span>}
                                                        {user._id === currentUserId && <span className="text-cyan-400 text-xs">(You)</span>}
                                                    </div>
                                                    <p className="text-white/50 text-sm truncate">{user.email}</p>
                                                </div>
                                                <div className="text-right text-sm">
                                                    <p className="text-yellow-400 font-bold">🪙 {user.wallet?.balance || 0}</p>
                                                    <p className="text-white/40 text-xs">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ==================== STREAMS TAB ==================== */}
                        {activeTab === "streams" && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-2">
                                        {["all", "live", "ended"].map(f => (
                                            <button
                                                key={f}
                                                onClick={() => setStreamFilter(f)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${streamFilter === f
                                                    ? "bg-cyan-500 text-black"
                                                    : "bg-white/10 text-white/70 hover:bg-white/20"
                                                    }`}
                                            >
                                                {f === "live" && "🔴 "}{f.charAt(0).toUpperCase() + f.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex-1"></div>
                                    <button onClick={() => exportData("streams")} className="px-3 py-2 bg-green-500/20 hover:bg-green-500/40 border border-green-500/30 rounded-lg text-sm">
                                        📥 Export
                                    </button>
                                </div>

                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {filteredStreams.length === 0 ? (
                                        <p className="text-white/40 text-center py-8">No streams found</p>
                                    ) : filteredStreams.map(stream => (
                                        <div key={stream._id} className={`rounded-xl p-4 border ${stream.isLive ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/10"}`}>
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {stream.isLive && <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse flex-shrink-0"></span>}
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold truncate">{stream.title}</h4>
                                                        <p className="text-white/50 text-sm">
                                                            {stream.streamerName} • {stream.category} • 👁 {stream.viewers || 0}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    {stream.isLive && (
                                                        <button
                                                            onClick={() => stopStream(stream._id)}
                                                            disabled={isActionLoading(stream._id, "stop")}
                                                            className="px-3 py-1.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-lg text-sm font-semibold"
                                                        >
                                                            {isActionLoading(stream._id, "stop") ? "..." : "⏹ Stop"}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ==================== GIFTS TAB ==================== */}
                        {activeTab === "gifts" && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold">🎁 Gift Statistics</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                                        <p className="text-3xl font-bold text-pink-400">{stats?.totalGiftsSent || 0}</p>
                                        <p className="text-white/50 text-sm">Total Gifts Sent</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                                        <p className="text-3xl font-bold text-yellow-400">{stats?.totalCoinsSpent || 0}</p>
                                        <p className="text-white/50 text-sm">Coins Spent</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                                        <p className="text-3xl font-bold text-green-400">€{(stats?.totalGiftValue || 0).toFixed(2)}</p>
                                        <p className="text-white/50 text-sm">Gift Value</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
                                        <p className="text-3xl font-bold text-cyan-400">{stats?.uniqueGifters || 0}</p>
                                        <p className="text-white/50 text-sm">Unique Gifters</p>
                                    </div>
                                </div>

                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h3 className="font-semibold mb-3">🏆 Most Gifted Streamers</h3>
                                    <div className="space-y-2">
                                        {stats?.topGiftedStreamers?.slice(0, 5).map((streamer, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                                                <div className="flex items-center gap-3">
                                                    <span>{["🥇", "🥈", "🥉", "4️⃣", "5️⃣"][idx]}</span>
                                                    <span className="font-semibold">{streamer.username}</span>
                                                </div>
                                                <span className="text-pink-400 font-bold">{streamer.giftsReceived} gifts</span>
                                            </div>
                                        )) || <p className="text-white/40 text-sm text-center py-4">No data yet</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ==================== WITHDRAWALS TAB ==================== */}
                        {activeTab === "withdrawals" && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold">💸 Withdrawal Requests</h2>

                                {pendingWithdrawals.length > 0 && (
                                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                                        <p className="text-yellow-400 font-semibold">⏳ {pendingWithdrawals.length} pending withdrawal(s)</p>
                                    </div>
                                )}

                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {withdrawals.length === 0 ? (
                                        <p className="text-white/40 text-center py-8">No withdrawal requests</p>
                                    ) : withdrawals.map(w => (
                                        <div key={w._id} className={`rounded-xl p-4 border ${w.status === "pending" ? "bg-yellow-500/10 border-yellow-500/30" : w.status === "approved" ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <h4 className="font-bold">{w.username || w.userId}</h4>
                                                    <p className="text-white/50 text-sm">
                                                        €{w.amount?.toFixed(2)} • {w.method || "Bank"} • {new Date(w.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {w.status === "pending" ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleWithdrawal(w._id, "approve")}
                                                                disabled={isActionLoading(w._id, "approve")}
                                                                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm font-semibold"
                                                            >
                                                                ✓ Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleWithdrawal(w._id, "reject")}
                                                                disabled={isActionLoading(w._id, "reject")}
                                                                className="px-3 py-1.5 bg-red-500/50 hover:bg-red-500 disabled:opacity-50 rounded-lg text-sm font-semibold"
                                                            >
                                                                ✕ Reject
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${w.status === "approved" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                                                            {w.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ==================== REPORTS TAB ==================== */}
                        {activeTab === "reports" && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold">🚨 User Reports</h2>

                                {pendingReports.length > 0 && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                                        <p className="text-red-400 font-semibold">⚠️ {pendingReports.length} pending report(s) need attention</p>
                                    </div>
                                )}

                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {reports.length === 0 ? (
                                        <p className="text-white/40 text-center py-8">No reports</p>
                                    ) : reports.map(r => (
                                        <div key={r._id} className={`rounded-xl p-4 border ${r.status === "pending" ? "bg-red-500/10 border-red-500/30" : "bg-white/5 border-white/10"}`}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold">{r.reporterUsername || "Anonymous"}</span>
                                                        <span className="text-white/50">reported</span>
                                                        <span className="font-bold text-red-400">{r.reportedUsername}</span>
                                                    </div>
                                                    <p className="text-white/70 text-sm mb-2">Reason: {r.reason}</p>
                                                    {r.details && <p className="text-white/50 text-xs bg-white/5 rounded p-2">{r.details}</p>}
                                                    <p className="text-white/40 text-xs mt-2">{new Date(r.createdAt).toLocaleString()}</p>
                                                </div>
                                                <div className="flex gap-2 flex-shrink-0">
                                                    {r.status === "pending" ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleReport(r._id, "resolve")}
                                                                disabled={isActionLoading(r._id, "resolve")}
                                                                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg text-sm font-semibold"
                                                            >
                                                                ✓ Resolve
                                                            </button>
                                                            <button
                                                                onClick={() => handleReport(r._id, "dismiss")}
                                                                disabled={isActionLoading(r._id, "dismiss")}
                                                                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 rounded-lg text-sm font-semibold"
                                                            >
                                                                Dismiss
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <span className={`px-3 py-1.5 rounded-lg text-sm ${r.status === "resolved" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/50"}`}>
                                                            {r.status}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ==================== REVENUE TAB ==================== */}
                        {activeTab === "revenue" && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold">💰 Revenue</h2>
                                    <button onClick={() => exportData("revenue")} className="px-3 py-2 bg-green-500/20 hover:bg-green-500/40 border border-green-500/30 rounded-lg text-sm">
                                        📥 Export
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-6">
                                        <h3 className="text-white/70 text-sm mb-2">Today</h3>
                                        <p className="text-3xl font-bold text-green-400">€{(revenue?.revenueToday || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-xl p-6">
                                        <h3 className="text-white/70 text-sm mb-2">This Month</h3>
                                        <p className="text-3xl font-bold text-blue-400">€{(revenue?.revenueThisMonth || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6">
                                        <h3 className="text-white/70 text-sm mb-2">All Time</h3>
                                        <p className="text-3xl font-bold text-purple-400">€{(revenue?.totalRevenue || 0).toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                    <h3 className="font-semibold mb-4">Recent Transactions</h3>
                                    <div className="space-y-2 max-h-72 overflow-y-auto">
                                        {revenue?.recentTransactions?.slice(0, 15).map((tx, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xl">💳</span>
                                                    <div>
                                                        <p className="font-semibold text-sm">{tx.username}</p>
                                                        <p className="text-xs text-white/50">{tx.type}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-green-400">€{tx.amount?.toFixed(2)}</p>
                                                    <p className="text-xs text-white/40">{new Date(tx.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        )) || <p className="text-white/40 text-sm text-center py-4">No transactions yet</p>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ==================== SETTINGS TAB ==================== */}
                        {activeTab === "settings" && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-bold">⚙️ Platform Settings</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                        <h3 className="font-semibold mb-4">🎁 Gift Settings</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/70">Platform Commission</span>
                                                <span className="font-bold text-cyan-400">30%</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/70">Min Withdrawal</span>
                                                <span className="font-bold text-cyan-400">€10.00</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/70">Coin Rate</span>
                                                <span className="font-bold text-cyan-400">1 coin = €0.01</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                        <h3 className="font-semibold mb-4">🎥 Stream Settings</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/70">Max Stream Duration</span>
                                                <span className="font-bold text-cyan-400">Unlimited</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/70">Multi-Guest Max Seats</span>
                                                <span className="font-bold text-cyan-400">12</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/70">Stream Quality</span>
                                                <span className="font-bold text-cyan-400">720p/1080p</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                        <h3 className="font-semibold mb-4">🔒 Security</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/70">2FA Required for Admin</span>
                                                <span className="font-bold text-green-400">Enabled</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/70">Rate Limiting</span>
                                                <span className="font-bold text-green-400">400/15min</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                                        <h3 className="font-semibold mb-4">📊 System Info</h3>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/70">Version</span>
                                                <span className="font-bold text-cyan-400">2.0.0</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/70">Environment</span>
                                                <span className="font-bold text-green-400">Production</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-white/70">Database</span>
                                                <span className="font-bold text-green-400">Connected</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                                    <h3 className="font-semibold text-red-400 mb-2">⚠️ Danger Zone</h3>
                                    <p className="text-white/60 text-sm mb-4">These actions are irreversible. Be careful!</p>
                                    <div className="flex flex-wrap gap-2">
                                        <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-lg text-sm font-semibold transition">
                                            🗑️ Clear All Ended Streams
                                        </button>
                                        <button className="px-4 py-2 bg-red-500/20 hover:bg-red-500/40 border border-red-500/30 rounded-lg text-sm font-semibold transition">
                                            🧹 Purge Inactive Users
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}