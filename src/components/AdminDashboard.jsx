// src/components/AdminDashboard.jsx - UNIVERSE EDITION 🌌
// World-Studio.live - Admin Dashboard with Moderation Bot 🤖
//
// Vereist:
//   - src/api/api.js  (axios instance)
//   - src/api/socket.js (socket.io-client instance)
//   - react-hot-toast

import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
} from "react";
import { toast } from "react-hot-toast";
import api from "../api/api";
import socket from "../api/socket";

// ============================================
// TABS
// ============================================
const TABS = [
    { id: "overview", label: "📊 Overview", icon: "📊" },
    { id: "users", label: "👥 Users", icon: "👥" },
    { id: "streams", label: "🎥 Streams", icon: "🎥" },
    { id: "gifts", label: "🎁 Gifts", icon: "🎁" },
    { id: "withdrawals", label: "💸 Withdrawals", icon: "💸" },
    { id: "reports", label: "🚨 Reports", icon: "🚨" },
    { id: "revenue", label: "💰 Revenue", icon: "💰" },
    { id: "moderation", label: "🚫 Moderation Bot", icon: "🚫" }, // 👈 NEW
];

// Ladder presets (robot penalties)
const MODERATION_PRESETS = [
    {
        id: "warning",
        label: "⚠️ Warning (no ban)",
        durationSeconds: 0,
    },
    {
        id: "ban_10m",
        label: "⏱️ 10 minutes ban",
        durationSeconds: 10 * 60,
    },
    {
        id: "ban_1h",
        label: "⏱️ 1 hour ban",
        durationSeconds: 60 * 60,
    },
    {
        id: "ban_1d",
        label: "📅 1 day ban",
        durationSeconds: 24 * 60 * 60,
    },
    {
        id: "ban_3d",
        label: "📅 3 days ban",
        durationSeconds: 3 * 24 * 60 * 60,
    },
    {
        id: "ban_30d",
        label: "📅 30 days ban",
        durationSeconds: 30 * 24 * 60 * 60,
    },
    {
        id: "ban_perm",
        label: "💀 Permanent ban",
        durationSeconds: -1, // -1 = permanent
    },
];

// ============================================
// Helper
// ============================================
const formatDateTime = (value) => {
    if (!value) return "—";
    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
};

const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return "—";
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ${hrs % 24}h`;
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
};

// ============================================
// MAIN COMPONENT
// ============================================
const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState("overview");

    // Core data
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [streams, setStreams] = useState([]);

    const [selectedUser, setSelectedUser] = useState(null);

    // Moderation tab state
    const [modSearch, setModSearch] = useState("");
    const [modLoading, setModLoading] = useState(false);
    const [modUser, setModUser] = useState(null); // full user from backend
    const [modReason, setModReason] = useState("");
    const [modHistoryLoading, setModHistoryLoading] = useState(false);

    // ========================================
    // INITIAL FETCH
    // ========================================
    const fetchDashboard = useCallback(async () => {
        try {
            setLoading(true);

            // Pas routes aan naar jouw backend:
            const [statsRes, usersRes, streamsRes] = await Promise.all([
                api.get("/admin/dashboard"),
                api.get("/admin/users?limit=20"),
                api.get("/admin/streams?limit=20"),
            ]);

            setStats(statsRes.data || null);
            setUsers(usersRes.data?.users || []);
            setStreams(streamsRes.data?.streams || []);
        } catch (err) {
            console.error("AdminDashboard error:", err?.response || err);
            toast.error("Failed to load admin data");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    // ========================================
    // SOCKET EVENTS (optional)
    // ========================================
    useEffect(() => {
        if (!socket) return;

        const onStreamUpdate = (payload) => {
            // Example: refresh streams when something changes
            setStreams((prev) => {
                if (!payload?.stream) return prev;
                const updated = [...prev];
                const idx = updated.findIndex(
                    (s) => s._id === payload.stream._id
                );
                if (idx === -1) {
                    updated.unshift(payload.stream);
                } else {
                    updated[idx] = payload.stream;
                }
                return updated;
            });
        };

        socket.on("admin:streamUpdate", onStreamUpdate);

        return () => {
            socket.off("admin:streamUpdate", onStreamUpdate);
        };
    }, []);

    // ========================================
    // MODERATION LOGIC
    // ========================================

    // Search user for moderation robot
    const handleModerationSearch = async (e) => {
        e.preventDefault();
        if (!modSearch.trim()) {
            toast.error("Enter username, email or user ID");
            return;
        }

        try {
            setModLoading(true);
            setModUser(null);

            // Backend route voorstel:
            //  - GET /admin/moderation/user?query=xxx
            //   return { user }
            const res = await api.get(
                `/admin/moderation/user`,
                { params: { query: modSearch.trim() } }
            );

            if (!res.data?.user) {
                toast.error("User not found");
                return;
            }

            setModUser(res.data.user);
            toast.success(`Loaded user: @${res.data.user.username}`);
        } catch (err) {
            console.error("Moderation search error:", err?.response || err);
            toast.error("Failed to load user");
        } finally {
            setModLoading(false);
        }
    };

    // Reload moderation user from backend
    const reloadModerationUser = async () => {
        if (!modUser?._id) return;
        try {
            setModHistoryLoading(true);
            const res = await api.get(`/admin/moderation/user`, {
                params: { userId: modUser._id },
            });
            if (res.data?.user) setModUser(res.data.user);
        } catch (err) {
            console.error("Reload moderation user error:", err?.response || err);
        } finally {
            setModHistoryLoading(false);
        }
    };

    // Execute moderation action via robot ladder
    const handleModerationAction = async (preset) => {
        if (!modUser?._id) {
            toast.error("Select a user first");
            return;
        }

        const confirmText =
            preset.id === "ban_perm"
                ? `Are you sure you want to PERMANENTLY ban @${modUser.username}?`
                : preset.id === "warning"
                    ? `Send warning to @${modUser.username}?`
                    : `Apply ${preset.label} to @${modUser.username}?`;

        if (!window.confirm(confirmText)) return;

        try {
            setModLoading(true);

            // Backend voorstel:
            //  POST /admin/moderation/action
            //  body: { userId, action, durationSeconds, reason }
            const res = await api.post("/admin/moderation/action", {
                userId: modUser._id,
                action:
                    preset.id === "warning"
                        ? "warning"
                        : preset.id === "ban_perm"
                            ? "ban"
                            : "ban",
                durationSeconds: preset.durationSeconds, // -1 = permanent in backend
                reason:
                    modReason.trim() ||
                    `Moderation preset: ${preset.label}`,
            });

            toast.success(res.data?.message || "Moderation action applied");
            setModReason("");
            await reloadModerationUser();
        } catch (err) {
            console.error("Moderation action error:", err?.response || err);
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                "Failed to apply moderation action";
            toast.error(msg);
        } finally {
            setModLoading(false);
        }
    };

    const handleUnban = async () => {
        if (!modUser?._id) return;
        if (!window.confirm(`Unban @${modUser.username}?`)) return;

        try {
            setModLoading(true);
            const res = await api.post("/admin/moderation/action", {
                userId: modUser._id,
                action: "unban",
                durationSeconds: 0,
                reason: modReason.trim() || "Manual unban",
            });

            toast.success(res.data?.message || "User unbanned");
            setModReason("");
            await reloadModerationUser();
        } catch (err) {
            console.error("Unban error:", err?.response || err);
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                "Failed to unban user";
            toast.error(msg);
        } finally {
            setModLoading(false);
        }
    };

    // ========================================
    // RENDER HELPERS
    // ========================================

    const renderOverview = () => {
        if (loading) {
            return <div className="p-4">Loading overview…</div>;
        }
        if (!stats) {
            return (
                <div className="p-4 text-red-500">
                    No stats available from /admin/dashboard
                </div>
            );
        }

        const { users, live, wallet, platform, growth } = stats;

        return (
            <div className="p-4 grid gap-4 md:grid-cols-3">
                {/* Users */}
                <div className="border rounded-lg p-4 bg-[#050509]">
                    <h3 className="font-semibold mb-2">Users</h3>
                    <p>Total: {users?.total ?? 0}</p>
                    <p>Creators: {users?.creators ?? 0}</p>
                    <p>Premium: {users?.premium ?? 0}</p>
                    <p>Banned: {users?.banned ?? 0}</p>
                </div>

                {/* Live */}
                <div className="border rounded-lg p-4 bg-[#050509]">
                    <h3 className="font-semibold mb-2">Live</h3>
                    <p>Currently live: {live?.currentlyLive ?? 0}</p>
                </div>

                {/* Growth */}
                <div className="border rounded-lg p-4 bg-[#050509]">
                    <h3 className="font-semibold mb-2">Growth</h3>
                    <p>New today: {growth?.newToday ?? 0}</p>
                    <p>New this week: {growth?.newThisWeek ?? 0}</p>
                </div>

                {/* Wallet */}
                <div className="border rounded-lg p-4 bg-[#050509] md:col-span-3">
                    <h3 className="font-semibold mb-2">Platform Wallet</h3>
                    <div className="grid md:grid-cols-3 gap-2 text-sm">
                        <p>Total balance: {wallet?.totalBalance ?? 0}</p>
                        <p>
                            Pending balance: {wallet?.totalPendingBalance ?? 0}
                        </p>
                        <p>Total earned: {wallet?.totalEarned ?? 0}</p>
                        <p>Total withdrawn: {wallet?.totalWithdrawn ?? 0}</p>
                        <p>Total received: {wallet?.totalReceived ?? 0}</p>
                        <p>Total spent: {wallet?.totalSpent ?? 0}</p>
                    </div>
                </div>

                {/* Platform */}
                <div className="border rounded-lg p-4 bg-[#050509] md:col-span-3">
                    <h3 className="font-semibold mb-2">Platform Stats</h3>
                    <div className="grid md:grid-cols-3 gap-2 text-sm">
                        <p>Total posts: {platform?.totalPosts ?? 0}</p>
                        <p>Total streams: {platform?.totalStreams ?? 0}</p>
                        <p>
                            Total stream viewers:{" "}
                            {platform?.totalStreamViewers ?? 0}
                        </p>
                        <p>
                            Total PK battles:{" "}
                            {platform?.totalPkBattles ?? 0}
                        </p>
                        <p>
                            Gifts received value:{" "}
                            {platform?.totalGiftsReceivedValue ?? 0}
                        </p>
                        <p>Total earnings: {platform?.totalEarnings ?? 0}</p>
                    </div>
                </div>
            </div>
        );
    };

    const renderUsers = () => {
        return (
            <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">
                    👥 Users (latest)
                </h2>
                {users.length === 0 ? (
                    <p>No users</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="text-left py-2 pr-4">
                                        Username
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                        Role
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                        Followers
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                        Live
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                        Banned
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                        Created
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => (
                                    <tr
                                        key={u._id}
                                        className="border-b border-gray-800 hover:bg-[#050509] cursor-pointer"
                                        onClick={() => setSelectedUser(u)}
                                    >
                                        <td className="py-2 pr-4">
                                            @{u.username}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {u.role}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {u.followersCount ?? 0}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {u.isLive ? "🟢" : "⚫"}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {u.isBanned ? "🚫" : "✅"}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {formatDateTime(u.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {selectedUser && (
                    <div className="mt-4 border rounded-lg p-4 bg-[#050509]">
                        <h3 className="font-semibold mb-2">
                            User detail: @{selectedUser.username}
                        </h3>
                        <p>ID: {selectedUser._id}</p>
                        <p>Email: {selectedUser.email}</p>
                        <p>Role: {selectedUser.role}</p>
                        <p>Followers: {selectedUser.followersCount ?? 0}</p>
                        <p>Live: {selectedUser.isLive ? "🟢" : "⚫"}</p>
                        <p>Banned: {selectedUser.isBanned ? "🚫" : "✅"}</p>
                    </div>
                )}
            </div>
        );
    };

    const renderStreams = () => {
        return (
            <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">
                    🎥 Active / Recent Streams
                </h2>
                {streams.length === 0 ? (
                    <p>No streams</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="text-left py-2 pr-4">
                                        Title
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                        Streamer
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                        Live
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                        Viewers
                                    </th>
                                    <th className="text-left py-2 pr-4">
                                        Created
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {streams.map((s) => (
                                    <tr
                                        key={s._id}
                                        className="border-b border-gray-800 hover:bg-[#050509]"
                                    >
                                        <td className="py-2 pr-4">
                                            {s.title || "Untitled"}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {s.username ||
                                                s.streamerName ||
                                                "Unknown"}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {s.isLive ? "🟢" : "⚫"}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {s.viewersCount ??
                                                s.viewers?.length ??
                                                0}
                                        </td>
                                        <td className="py-2 pr-4">
                                            {formatDateTime(s.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    const renderPlaceholder = (label) => (
        <div className="p-4">
            <h2 className="text-lg font-semibold mb-2">{label}</h2>
            <p className="text-sm text-gray-400">
                This tab is ready for future expansion.
            </p>
        </div>
    );

    // ===== MODERATION TAB UI =====
    const renderModeration = () => {
        return (
            <div className="p-4 space-y-6">
                <h2 className="text-lg font-semibold mb-2">
                    🚫 Moderation Bot – Strike Ladder
                </h2>

                {/* Search */}
                <form
                    onSubmit={handleModerationSearch}
                    className="flex flex-col md:flex-row gap-2 items-stretch md:items-center"
                >
                    <input
                        type="text"
                        className="flex-1 px-3 py-2 rounded bg-[#050509] border border-gray-700 text-sm"
                        placeholder="Search user by username, email or user ID…"
                        value={modSearch}
                        onChange={(e) => setModSearch(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={modLoading}
                        className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-sm font-medium disabled:opacity-60"
                    >
                        {modLoading ? "Searching…" : "Search"}
                    </button>
                </form>

                {/* Selected user info */}
                {modUser && (
                    <div className="border border-gray-800 rounded-lg p-4 bg-[#050509] space-y-4">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold text-base">
                                        @{modUser.username}
                                    </span>
                                    {modUser.isVerified && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-blue-600">
                                            Verified
                                        </span>
                                    )}
                                    {modUser.role && (
                                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700">
                                            {modUser.role}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">
                                    ID: {modUser._id}
                                </p>
                                <p className="text-xs text-gray-400">
                                    Email: {modUser.email}
                                </p>
                            </div>
                            <div className="text-right text-xs space-y-1">
                                <p>
                                    Strikes:{" "}
                                    <span className="font-semibold">
                                        {modUser.moderationStrikes ?? 0}
                                    </span>
                                </p>
                                <p>
                                    Last violation:{" "}
                                    {formatDateTime(modUser.lastViolationAt)}
                                </p>
                                <p>
                                    Banned:{" "}
                                    {modUser.isBanned ? "🚫 YES" : "✅ NO"}
                                </p>
                                <p>
                                    Permanent:{" "}
                                    {modUser.isPermanentBan
                                        ? "💀 YES"
                                        : "NO"}
                                </p>
                                <p>
                                    Ban until:{" "}
                                    {modUser.banUntil
                                        ? formatDateTime(modUser.banUntil)
                                        : "—"}
                                </p>
                            </div>
                        </div>

                        {/* Reason */}
                        <div>
                            <label className="block text-xs mb-1 text-gray-300">
                                Reason / note (optional, stored in history &
                                notification)
                            </label>
                            <textarea
                                rows={2}
                                className="w-full px-3 py-2 rounded bg-black border border-gray-700 text-sm"
                                value={modReason}
                                onChange={(e) =>
                                    setModReason(e.target.value)
                                }
                                placeholder="Example: Hate speech in PK, explicit content, spam, etc."
                            />
                        </div>

                        {/* Actions */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-400">
                                    Strike ladder:
                                </span>
                                <button
                                    type="button"
                                    onClick={reloadModerationUser}
                                    disabled={modHistoryLoading}
                                    className="text-xs px-2 py-1 border border-gray-700 rounded hover:bg-gray-800 disabled:opacity-60"
                                >
                                    {modHistoryLoading
                                        ? "Refreshing…"
                                        : "Refresh user"}
                                </button>
                            </div>
                            <div className="grid md:grid-cols-4 gap-2">
                                {MODERATION_PRESETS.map((preset) => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        disabled={modLoading}
                                        onClick={() =>
                                            handleModerationAction(preset)
                                        }
                                        className="px-3 py-2 rounded text-xs border border-gray-700 hover:bg-gray-800 text-left disabled:opacity-50"
                                    >
                                        <div className="font-semibold">
                                            {preset.label}
                                        </div>
                                        {preset.durationSeconds > 0 && (
                                            <div className="text-[10px] text-gray-400">
                                                Duration:{" "}
                                                {formatDuration(
                                                    preset.durationSeconds
                                                )}
                                            </div>
                                        )}
                                        {preset.durationSeconds === -1 && (
                                            <div className="text-[10px] text-red-400">
                                                Permanent ban
                                            </div>
                                        )}
                                        {preset.id === "warning" && (
                                            <div className="text-[10px] text-yellow-400">
                                                No ban, only warning +
                                                strike
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Unban */}
                            {modUser.isBanned && (
                                <div className="pt-2 border-t border-gray-800 mt-2">
                                    <button
                                        type="button"
                                        disabled={modLoading}
                                        onClick={handleUnban}
                                        className="px-3 py-2 rounded text-xs bg-green-600 hover:bg-green-500 font-semibold disabled:opacity-60"
                                    >
                                        ✅ Unban user
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* History */}
                        <div className="pt-3 border-t border-gray-800">
                            <h3 className="text-sm font-semibold mb-2">
                                Moderation history
                            </h3>
                            {(!modUser.moderationHistory ||
                                modUser.moderationHistory.length === 0) && (
                                    <p className="text-xs text-gray-500">
                                        No moderation history yet.
                                    </p>
                                )}

                            {modUser.moderationHistory &&
                                modUser.moderationHistory.length > 0 && (
                                    <div className="max-h-60 overflow-y-auto text-xs space-y-2">
                                        {modUser.moderationHistory
                                            .slice()
                                            .reverse()
                                            .map((h, idx) => (
                                                <div
                                                    key={idx}
                                                    className="border border-gray-700 rounded p-2"
                                                >
                                                    <div className="flex justify-between">
                                                        <span className="font-semibold">
                                                            {h.action ===
                                                                "warning"
                                                                ? "⚠️ Warning"
                                                                : h.action ===
                                                                    "temp_ban"
                                                                    ? "⏱️ Temp ban"
                                                                    : h.action ===
                                                                        "permanent_ban"
                                                                        ? "💀 Permanent"
                                                                        : "🔄 Unban"}
                                                        </span>
                                                        <span className="text-gray-400">
                                                            {formatDateTime(
                                                                h.createdAt
                                                            )}
                                                        </span>
                                                    </div>
                                                    {h.durationSeconds >
                                                        0 && (
                                                            <p className="text-gray-400">
                                                                Duration:{" "}
                                                                {formatDuration(
                                                                    h.durationSeconds
                                                                )}
                                                            </p>
                                                        )}
                                                    {h.reason && (
                                                        <p className="mt-1">
                                                            Reason:{" "}
                                                            <span className="text-gray-300">
                                                                {h.reason}
                                                            </span>
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                    </div>
                                )}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // ========================================
    // MAIN RENDER
    // ========================================
    return (
        <div className="w-full h-full flex flex-col bg-black text-white">
            {/* Tabs */}
            <div className="border-b border-gray-800 flex overflow-x-auto">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                ? "border-indigo-500 text-indigo-400"
                                : "border-transparent text-gray-400 hover:text-white hover:bg-[#050509]"
                            }`}
                    >
                        <span className="mr-1">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === "overview" && renderOverview()}
                {activeTab === "users" && renderUsers()}
                {activeTab === "streams" && renderStreams()}
                {activeTab === "gifts" &&
                    renderPlaceholder("🎁 Gifts / Economy")}
                {activeTab === "withdrawals" &&
                    renderPlaceholder("💸 Withdrawals")}
                {activeTab === "reports" &&
                    renderPlaceholder("🚨 Reports & Flags")}
                {activeTab === "revenue" &&
                    renderPlaceholder("💰 Revenue & Analytics")}
                {activeTab === "moderation" && renderModeration()}
            </div>
        </div>
    );
};

export default AdminDashboard;
