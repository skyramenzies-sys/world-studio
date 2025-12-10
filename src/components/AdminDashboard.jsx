// src/components/AdminDashboard.jsx - ADMIN ULTIMATE EDITION 🌌
import React, { useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { adminApi } from "../api/api";
import axios from "axios";

const TABS = [
    { id: "overview", label: "📊 Overview" },
    { id: "analytics", label: "📈 Analytics" },
    { id: "users", label: "👥 Users" },
    { id: "streams", label: "🎥 Streams" },
    { id: "withdrawals", label: "💸 Withdrawals" },
    { id: "reports", label: "🚨 Reports" },
];

const API_BASE = import.meta.env.VITE_API_URL || "https://world-studio-production.up.railway.app";

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [streams, setStreams] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [reports, setReports] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [analyticsRange, setAnalyticsRange] = useState("7d");
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            setLoading(true);
            if (!adminApi) {
                toast.error("Admin API not available");
                return;
            }

            const [statsRes, usersRes, streamsRes, withdrawalsRes, reportsRes, analyticsRes] = await Promise.all([
                adminApi.getStats?.(),
                adminApi.getUsers?.(),
                adminApi.getStreams?.(),
                adminApi.getWithdrawals?.(),
                adminApi.getReports?.(),
                adminApi.getAnalytics?.(analyticsRange),
            ]);

            setStats(statsRes?.data?.stats || statsRes?.data || {});
            setUsers(usersRes?.data?.users || usersRes?.data || []);
            setStreams(streamsRes?.data?.streams || streamsRes?.data || []);
            setWithdrawals(withdrawalsRes?.data?.withdrawals || withdrawalsRes?.data || []);
            setReports(reportsRes?.data?.reports || reportsRes?.data || []);
            setAnalytics(analyticsRes?.data?.analytics || null);
        } catch (err) {
            console.error("ADMIN LOAD ERROR", err);
            toast.error(err?.response?.data?.error || "Failed loading admin data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        if (activeTab === "analytics") {
            adminApi.getAnalytics?.(analyticsRange).then(res => {
                setAnalytics(res?.data?.analytics || null);
            });
        }
    }, [analyticsRange]);

    const handleUserAction = async (action, userId, username) => {
        const token = localStorage.getItem("ws_token");
        if (!token) return toast.error("Not authenticated");
        const headers = { Authorization: `Bearer ${token}` };

        try {
            const endpoints = {
                ban: `${API_BASE}/api/admin/ban-user/${userId}`,
                unban: `${API_BASE}/api/admin/unban-user/${userId}`,
                makeAdmin: `${API_BASE}/api/admin/make-admin/${userId}`,
                removeAdmin: `${API_BASE}/api/admin/remove-admin/${userId}`,
                verify: `${API_BASE}/api/admin/verify-user/${userId}`,
                unverify: `${API_BASE}/api/admin/unverify-user/${userId}`,
            };

            if (action === "delete") {
                if (!window.confirm(`DELETE @${username}? Cannot be undone!`)) return;
                await axios.delete(`${API_BASE}/api/admin/delete-user/${userId}`, { headers });
            } else {
                if (["ban", "unban", "makeAdmin", "removeAdmin"].includes(action)) {
                    if (!window.confirm(`${action} @${username}?`)) return;
                }
                await axios.post(endpoints[action], {}, { headers });
            }
            toast.success(`Action ${action} completed for @${username}`);
            loadData();
        } catch (err) {
            toast.error(err?.response?.data?.error || "Action failed");
        }
    };

    const sortedUsers = useMemo(() =>
        [...(users || [])].sort((a, b) => 
            new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0)
        ), [users]
    );

    if (loading) {
        return <div className="text-white p-4 animate-pulse">Loading admin…</div>;
    }

    // ============ RENDER FUNCTIONS ============
    const renderOverview = () => {
        const platform = analytics?.platform || {};
        return (
            <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="Total Users" value={platform.users?.total || stats?.totalUsers || 0} sub={`+${platform.users?.today || 0} today`} />
                    <StatCard title="Total Gifts" value={platform.gifts?.total || 0} sub={`+${platform.gifts?.today || 0} today`} />
                    <StatCard title="Coins Spent" value={formatCoins(platform.coins?.total || 0)} sub={`+${formatCoins(platform.coins?.today || 0)} today`} />
                    <StatCard title="Active Streams" value={stats?.activeStreams || stats?.streams?.live || 0} sub={`${stats?.totalStreams || 0} total`} />
                </div>

                {/* Period Comparison */}
                <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                    <h3 className="text-lg font-semibold mb-4">📊 Period Comparison</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-white/5 p-4 rounded-lg">
                            <p className="text-white/60 text-sm">Today</p>
                            <p className="text-2xl font-bold text-green-400">{formatCoins(platform.coins?.today || 0)}</p>
                            <p className="text-xs text-white/40">{platform.gifts?.today || 0} gifts</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-lg">
                            <p className="text-white/60 text-sm">This Week</p>
                            <p className="text-2xl font-bold text-blue-400">{formatCoins(platform.coins?.week || 0)}</p>
                            <p className="text-xs text-white/40">{platform.gifts?.week || 0} gifts</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-lg">
                            <p className="text-white/60 text-sm">This Month</p>
                            <p className="text-2xl font-bold text-purple-400">{formatCoins(platform.coins?.month || 0)}</p>
                            <p className="text-xs text-white/40">{platform.gifts?.month || 0} gifts</p>
                        </div>
                    </div>
                </div>

                {/* Top Performers */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                        <h3 className="text-lg font-semibold mb-3">🏆 Top Streamers</h3>
                        {(analytics?.topStreamers || []).slice(0, 5).map((s, i) => (
                            <div key={i} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                                <span>{i + 1}. {s.username || "Unknown"}</span>
                                <span className="text-yellow-400">{formatCoins(s.coins)} coins</span>
                            </div>
                        ))}
                        {(!analytics?.topStreamers?.length) && <p className="text-white/40">No data yet</p>}
                    </div>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                        <h3 className="text-lg font-semibold mb-3">💎 Top Senders</h3>
                        {(analytics?.topSenders || []).slice(0, 5).map((s, i) => (
                            <div key={i} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                                <span>{i + 1}. {s.username || "Unknown"}</span>
                                <span className="text-green-400">{formatCoins(s.coins)} coins</span>
                            </div>
                        ))}
                        {(!analytics?.topSenders?.length) && <p className="text-white/40">No data yet</p>}
                    </div>
                </div>
            </div>
        );
    };

    const renderAnalytics = () => {
        const timeline = analytics?.timeline || [];
        const maxCoins = Math.max(...timeline.map(t => t.coins || 0), 1);

        return (
            <div className="space-y-6">
                {/* Range Selector */}
                <div className="flex gap-2">
                    {["today", "7d", "30d", "90d", "all"].map(range => (
                        <button
                            key={range}
                            onClick={() => setAnalyticsRange(range)}
                            className={`px-3 py-1 rounded-full text-sm transition ${
                                analyticsRange === range
                                    ? "bg-white text-black"
                                    : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                        >
                            {range === "today" ? "Today" : range === "all" ? "All Time" : `Last ${range}`}
                        </button>
                    ))}
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="Total Coins" value={formatCoins(analytics?.summary?.totalCoins || 0)} />
                    <StatCard title="Unique Senders" value={analytics?.summary?.totalSenders || 0} />
                    <StatCard title="Unique Receivers" value={analytics?.summary?.totalReceivers || 0} />
                    <StatCard 
                        title="Top Streamer" 
                        value={analytics?.summary?.topStreamer?.username || "—"} 
                        sub={analytics?.summary?.topStreamer ? `${formatCoins(analytics.summary.topStreamer.coins)} coins` : ""} 
                    />
                </div>

                {/* Timeline Chart */}
                <div className="bg-black/40 p-4 rounded-xl border border-white/10">
                    <h3 className="text-lg font-semibold mb-4">📈 Coins Timeline</h3>
                    {timeline.length > 0 ? (
                        <div className="flex items-end gap-1 h-40">
                            {timeline.map((t, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center">
                                    <div 
                                        className="w-full bg-gradient-to-t from-purple-500 to-pink-500 rounded-t"
                                        style={{ height: `${(t.coins / maxCoins) * 100}%`, minHeight: "4px" }}
                                        title={`${t.label}: ${formatCoins(t.coins)} coins`}
                                    />
                                    <span className="text-xs text-white/40 mt-1 truncate w-full text-center">
                                        {t.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-white/40 text-center py-8">No data for this period</p>
                    )}
                </div>

                {/* Detailed Tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10 max-h-80 overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-3">🏆 All Top Streamers</h3>
                        <table className="w-full text-sm">
                            <thead><tr className="text-left text-white/60"><th>#</th><th>Username</th><th>Coins</th><th>Streams</th></tr></thead>
                            <tbody>
                                {(analytics?.topStreamers || []).map((s, i) => (
                                    <tr key={i} className="border-t border-white/5">
                                        <td className="py-1">{i + 1}</td>
                                        <td>{s.username}</td>
                                        <td className="text-yellow-400">{formatCoins(s.coins)}</td>
                                        <td>{s.streams || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-black/40 p-4 rounded-xl border border-white/10 max-h-80 overflow-y-auto">
                        <h3 className="text-lg font-semibold mb-3">💎 All Top Senders</h3>
                        <table className="w-full text-sm">
                            <thead><tr className="text-left text-white/60"><th>#</th><th>Username</th><th>Coins</th><th>Gifts</th></tr></thead>
                            <tbody>
                                {(analytics?.topSenders || []).map((s, i) => (
                                    <tr key={i} className="border-t border-white/5">
                                        <td className="py-1">{i + 1}</td>
                                        <td>{s.username}</td>
                                        <td className="text-green-400">{formatCoins(s.coins)}</td>
                                        <td>{s.gifts || 0}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderUsers = () => (
        <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Users ({sortedUsers.length})</h2>
            <table className="min-w-full text-sm">
                <thead className="text-left border-b border-white/10">
                    <tr>
                        <th className="py-2 pr-4">Username</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Role</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2 pr-4">Created</th>
                        <th className="py-2 pr-4">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedUsers.map((u) => (
                        <tr key={u._id} className={`border-b border-white/5 ${u.isBanned ? 'bg-red-500/10' : ''}`}>
                            <td className="py-2 pr-4">{u.username}{u.isVerified && " ✓"}</td>
                            <td className="py-2 pr-4">{u.email}</td>
                            <td className="py-2 pr-4">{u.role === "admin" ? "👑 Admin" : u.role}</td>
                            <td className="py-2 pr-4">{u.isBanned ? <span className="text-red-400">🚫 Banned</span> : <span className="text-green-400">Active</span>}</td>
                            <td className="py-2 pr-4">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                            <td className="py-2 pr-4">
                                <div className="flex gap-1 flex-wrap">
                                    {u.isBanned ? (
                                        <ActionBtn onClick={() => handleUserAction("unban", u._id, u.username)} color="green">Unban</ActionBtn>
                                    ) : (
                                        <ActionBtn onClick={() => handleUserAction("ban", u._id, u.username)} color="red">Ban</ActionBtn>
                                    )}
                                    {u.role === "admin" ? (
                                        <ActionBtn onClick={() => handleUserAction("removeAdmin", u._id, u.username)} color="orange">-Admin</ActionBtn>
                                    ) : (
                                        <ActionBtn onClick={() => handleUserAction("makeAdmin", u._id, u.username)} color="yellow">+Admin</ActionBtn>
                                    )}
                                    {!u.isVerified && <ActionBtn onClick={() => handleUserAction("verify", u._id, u.username)} color="blue">Verify</ActionBtn>}
                                    <ActionBtn onClick={() => handleUserAction("delete", u._id, u.username)} color="red">🗑️</ActionBtn>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderStreams = () => (
        <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Streams ({streams.length})</h2>
            <table className="min-w-full text-sm">
                <thead className="text-left border-b border-white/10">
                    <tr><th className="py-2 pr-4">Title</th><th className="py-2 pr-4">Streamer</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Viewers</th></tr>
                </thead>
                <tbody>
                    {streams.map((s) => (
                        <tr key={s._id} className="border-b border-white/5">
                            <td className="py-2 pr-4">{s.title || "—"}</td>
                            <td className="py-2 pr-4">{s.user?.username || s.streamer?.username || "—"}</td>
                            <td className="py-2 pr-4">{s.isLive ? <span className="text-green-400">🔴 LIVE</span> : "Ended"}</td>
                            <td className="py-2 pr-4">{s.viewerCount ?? 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {!streams.length && <p className="text-white/40 py-4">No streams</p>}
        </div>
    );

    const renderWithdrawals = () => (
        <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Withdrawals ({withdrawals.length})</h2>
            <table className="min-w-full text-sm">
                <thead className="text-left border-b border-white/10">
                    <tr><th className="py-2 pr-4">User</th><th className="py-2 pr-4">Amount</th><th className="py-2 pr-4">Status</th><th className="py-2 pr-4">Requested</th></tr>
                </thead>
                <tbody>
                    {withdrawals.map((w) => (
                        <tr key={w._id} className="border-b border-white/5">
                            <td className="py-2 pr-4">{w.username || w.user?.username || "—"}</td>
                            <td className="py-2 pr-4">{w.amount} coins {w.eurAmount && <span className="text-white/60">(€{w.eurAmount.toFixed(2)})</span>}</td>
                            <td className="py-2 pr-4">{w.status || "pending"}</td>
                            <td className="py-2 pr-4">{w.createdAt ? new Date(w.createdAt).toLocaleString() : "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {!withdrawals.length && <p className="text-white/40 py-4">No withdrawals</p>}
        </div>
    );

    const renderReports = () => (
        <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Reports ({reports.length})</h2>
            <table className="min-w-full text-sm">
                <thead className="text-left border-b border-white/10">
                    <tr><th className="py-2 pr-4">Type</th><th className="py-2 pr-4">From</th><th className="py-2 pr-4">Target</th><th className="py-2 pr-4">Reason</th><th className="py-2 pr-4">Date</th></tr>
                </thead>
                <tbody>
                    {reports.map((r) => (
                        <tr key={r._id} className="border-b border-white/5">
                            <td className="py-2 pr-4">{r.type || "—"}</td>
                            <td className="py-2 pr-4">{r.fromUser?.username || "—"}</td>
                            <td className="py-2 pr-4">{r.targetUser?.username || r.targetPost?.title || "—"}</td>
                            <td className="py-2 pr-4">{r.reason || r.message || "—"}</td>
                            <td className="py-2 pr-4">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {!reports.length && <p className="text-white/40 py-4">No reports</p>}
        </div>
    );

    const renderActiveTab = () => {
        switch (activeTab) {
            case "overview": return renderOverview();
            case "analytics": return renderAnalytics();
            case "users": return renderUsers();
            case "streams": return renderStreams();
            case "withdrawals": return renderWithdrawals();
            case "reports": return renderReports();
            default: return renderOverview();
        }
    };

    return (
        <div className="text-white p-4 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">🌌 Admin Dashboard</h1>
            <div className="flex flex-wrap gap-2 mb-6">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-full text-sm transition ${
                            activeTab === tab.id ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {renderActiveTab()}
        </div>
    );
}

// Helper Components
const StatCard = ({ title, value, sub }) => (
    <div className="bg-black/40 p-4 rounded-xl border border-white/10">
        <p className="text-white/60 text-sm">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {sub && <p className="text-xs text-white/40">{sub}</p>}
    </div>
);

const ActionBtn = ({ onClick, color, children }) => {
    const colors = {
        red: "bg-red-500/20 text-red-400 hover:bg-red-500/40",
        green: "bg-green-500/20 text-green-400 hover:bg-green-500/40",
        yellow: "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/40",
        orange: "bg-orange-500/20 text-orange-400 hover:bg-orange-500/40",
        blue: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/40",
    };
    return (
        <button onClick={onClick} className={`px-2 py-1 rounded text-xs transition ${colors[color]}`}>
            {children}
        </button>
    );
};

const formatCoins = (n) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n?.toLocaleString() || "0";
};

