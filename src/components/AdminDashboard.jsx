// src/components/AdminDashboard.jsx - ADMIN ULTIMATE EDITION 🌌
import React, { useEffect, useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { adminApi } from "../api/api";

// ============================================
// TABS CONFIG
// ============================================
const TABS = [
    { id: "overview", label: "📊 Overview" },
    { id: "users", label: "👥 Users" },
    { id: "streams", label: "🎥 Streams" },
    { id: "withdrawals", label: "💸 Withdrawals" },
    { id: "reports", label: "🚨 Reports" },
    { id: "revenue", label: "💰 Revenue" },
];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState("overview");

    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [streams, setStreams] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [reports, setReports] = useState([]);
    const [revenue, setRevenue] = useState(null);
    const [loading, setLoading] = useState(true);

    // ============================================
    // DATA LOAD
    // ============================================
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                setLoading(true);

                if (!adminApi) {
                    console.error("adminApi is undefined – check ../api/api export");
                    toast.error("Admin API not available");
                    return;
                }

                const [
                    statsRes,
                    usersRes,
                    streamsRes,
                    withdrawalsRes,
                    reportsRes,
                    revenueRes,
                ] = await Promise.all([
                    adminApi.getStats?.(),
                    adminApi.getUsers?.(),
                    adminApi.getStreams?.(),
                    adminApi.getWithdrawals?.(), // verwacht: /api/wallet/admin/pending-withdrawals
                    adminApi.getReports?.(),
                    adminApi.getRevenue?.(),
                ]);

                if (cancelled) return;

                setStats(
                    statsRes?.data?.stats ||
                    statsRes?.data ||
                    statsRes ||
                    {}
                );

                setUsers(
                    usersRes?.data?.users ||
                    usersRes?.data ||
                    usersRes ||
                    []
                );

                setStreams(
                    streamsRes?.data?.streams ||
                    streamsRes?.data ||
                    streamsRes ||
                    []
                );

                setWithdrawals(
                    withdrawalsRes?.data?.withdrawals ||
                    withdrawalsRes?.data ||
                    withdrawalsRes ||
                    []
                );

                setReports(
                    reportsRes?.data?.reports ||
                    reportsRes?.data ||
                    reportsRes ||
                    []
                );

                setRevenue(
                    revenueRes?.data?.revenue ||
                    revenueRes?.data ||
                    revenueRes ||
                    {}
                );
            } catch (err) {
                console.error("ADMIN LOAD ERROR", err);
                const msg =
                    err?.response?.data?.error ||
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed loading admin data";
                toast.error(msg);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    const totalUsers = stats?.totalUsers ?? 0;
    const newUsersToday = stats?.newUsersToday ?? 0;
    const activeStreams = stats?.activeStreams ?? 0;
    const totalStreams = stats?.totalStreams ?? 0;
    const totalRevenue = revenue?.totalRevenue ?? 0;
    const revenueToday = revenue?.revenueToday ?? 0;

    // Veilige sort op createdAt (ongeacht string of Date)
    const sortedUsers = useMemo(
        () =>
            [...(users || [])].sort((a, b) => {
                const aTime = a?.createdAt
                    ? new Date(a.createdAt).getTime()
                    : 0;
                const bTime = b?.createdAt
                    ? new Date(b.createdAt).getTime()
                    : 0;
                return bTime - aTime;
            }),
        [users]
    );

    if (loading) {
        return (
            <div className="text-white p-4">
                <div className="animate-pulse">Loading admin…</div>
            </div>
        );
    }

    // ============================================
    // RENDER HELPERS PER TAB
    // ============================================
    const renderOverview = () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                <h2 className="text-lg font-semibold mb-2">Users</h2>
                <p>Total: {totalUsers}</p>
                <p>Today: {newUsersToday}</p>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                <h2 className="text-lg font-semibold mb-2">Streams</h2>
                <p>Active: {activeStreams}</p>
                <p>Total: {totalStreams}</p>
            </div>

            <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                <h2 className="text-lg font-semibold mb-2">Revenue</h2>
                <p>Total: {totalRevenue}</p>
                <p>Today: {revenueToday}</p>
            </div>
        </div>
    );

    const renderUsers = () => (
        <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Users</h2>
            {sortedUsers.length === 0 ? (
                <p className="text-sm text-white/60">No users found.</p>
            ) : (
                <table className="min-w-full text-sm">
                    <thead className="text-left border-b border-white/10">
                        <tr>
                            <th className="py-2 pr-4">Name</th>
                            <th className="py-2 pr-4">Username</th>
                            <th className="py-2 pr-4">Email</th>
                            <th className="py-2 pr-4">Role</th>
                            <th className="py-2 pr-4">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map((u) => (
                            <tr
                                key={u._id}
                                className="border-b border-white/5 last:border-none"
                            >
                                <td className="py-2 pr-4">{u.name || "—"}</td>
                                <td className="py-2 pr-4">{u.username || "—"}</td>
                                <td className="py-2 pr-4">{u.email || "—"}</td>
                                <td className="py-2 pr-4">{u.role || "user"}</td>
                                <td className="py-2 pr-4">
                                    {u.createdAt
                                        ? new Date(u.createdAt).toLocaleString()
                                        : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    const renderStreams = () => (
        <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Streams</h2>
            {!streams || streams.length === 0 ? (
                <p className="text-sm text-white/60">No streams found.</p>
            ) : (
                <table className="min-w-full text-sm">
                    <thead className="text-left border-b border-white/10">
                        <tr>
                            <th className="py-2 pr-4">Title</th>
                            <th className="py-2 pr-4">Streamer</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Viewers</th>
                        </tr>
                    </thead>
                    <tbody>
                        {streams.map((s) => (
                            <tr
                                key={s._id}
                                className="border-b border-white/5 last:border-none"
                            >
                                <td className="py-2 pr-4">{s.title || "—"}</td>
                                <td className="py-2 pr-4">
                                    {s.user?.username ||
                                        s.streamer?.username ||
                                        s.user?.name ||
                                        s.streamer?.name ||
                                        "—"}
                                </td>
                                <td className="py-2 pr-4">
                                    {s.isLive ? "LIVE" : "Ended"}
                                </td>
                                <td className="py-2 pr-4">{s.viewerCount ?? 0}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    const renderWithdrawals = () => (
        <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Withdrawals</h2>
            {!withdrawals || withdrawals.length === 0 ? (
                <p className="text-sm text-white/60">No withdrawals found.</p>
            ) : (
                <table className="min-w-full text-sm">
                    <thead className="text-left border-b border-white/10">
                        <tr>
                            <th className="py-2 pr-4">User</th>
                            <th className="py-2 pr-4">Email</th>
                            <th className="py-2 pr-4">Amount</th>
                            <th className="py-2 pr-4">Status</th>
                            <th className="py-2 pr-4">Requested</th>
                        </tr>
                    </thead>
                    <tbody>
                        {withdrawals.map((w) => (
                            <tr
                                key={w._id}
                                className="border-b border-white/5 last:border-none"
                            >
                                <td className="py-2 pr-4">
                                    {w.username ||
                                        w.user?.username ||
                                        w.user?.name ||
                                        "—"}
                                </td>
                                <td className="py-2 pr-4">
                                    {w.email || w.user?.email || "—"}
                                </td>
                                <td className="py-2 pr-4">
                                    {w.amount != null ? (
                                        <>
                                            {w.amount} coins{" "}
                                            {w.eurAmount != null && (
                                                <span className="text-white/70">
                                                    ({`€${Number(
                                                        w.eurAmount
                                                    ).toFixed(2)}`})
                                                </span>
                                            )}
                                        </>
                                    ) : (
                                        "—"
                                    )}
                                </td>
                                <td className="py-2 pr-4">
                                    {w.status || "pending"}
                                </td>
                                <td className="py-2 pr-4">
                                    {w.createdAt
                                        ? new Date(w.createdAt).toLocaleString()
                                        : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    const renderReports = () => (
        <div className="bg-black/40 p-4 rounded-xl border border-white/5 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Reports</h2>
            {!reports || reports.length === 0 ? (
                <p className="text-sm text-white/60">No reports found.</p>
            ) : (
                <table className="min-w-full text-sm">
                    <thead className="text-left border-b border-white/10">
                        <tr>
                            <th className="py-2 pr-4">Type</th>
                            <th className="py-2 pr-4">From</th>
                            <th className="py-2 pr-4">Target</th>
                            <th className="py-2 pr-4">Reason</th>
                            <th className="py-2 pr-4">Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map((r) => (
                            <tr
                                key={r._id}
                                className="border-b border-white/5 last:border-none"
                            >
                                <td className="py-2 pr-4">{r.type || "—"}</td>
                                <td className="py-2 pr-4">
                                    {r.fromUser?.username ||
                                        r.fromUser?.name ||
                                        "—"}
                                </td>
                                <td className="py-2 pr-4">
                                    {r.targetUser?.username ||
                                        r.targetUser?.name ||
                                        r.targetPost?.title ||
                                        "—"}
                                </td>
                                <td className="py-2 pr-4">
                                    {r.reason || r.message || "—"}
                                </td>
                                <td className="py-2 pr-4">
                                    {r.createdAt
                                        ? new Date(r.createdAt).toLocaleString()
                                        : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );

    const renderRevenue = () => (
        <div className="bg-black/40 p-4 rounded-xl border border-white/5">
            <h2 className="text-lg font-semibold mb-3">Revenue</h2>
            <p className="mb-1">Total revenue: {totalRevenue}</p>
            <p className="mb-1">Today: {revenueToday}</p>
            {/* Later kun je hier charts / breakdown per dag toevoegen */}
        </div>
    );

    const renderActiveTab = () => {
        switch (activeTab) {
            case "overview":
                return renderOverview();
            case "users":
                return renderUsers();
            case "streams":
                return renderStreams();
            case "withdrawals":
                return renderWithdrawals();
            case "reports":
                return renderReports();
            case "revenue":
                return renderRevenue();
            default:
                return renderOverview();
        }
    };

    // ============================================
    // MAIN RENDER
    // ============================================
    return (
        <div className="text-white p-4">
            <h1 className="text-2xl font-bold mb-4">
                🌌 Admin Dashboard – Universe Edition
            </h1>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
                {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={[
                                "px-3 py-1 rounded-full text-sm border transition",
                                isActive
                                    ? "bg-white text-black border-white"
                                    : "bg-transparent text-white border-white/30 hover:border-white/70",
                            ].join(" ")}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            {renderActiveTab()}
        </div>
    );
}
