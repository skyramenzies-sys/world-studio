// src/components/AdminLiveAnalytics.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, Eye, Gift, Activity, Users, TrendingUp, RefreshCw, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/api";

export default function AdminLiveAnalytics() {
    const navigate = useNavigate();

    // Get current user from localStorage
    const [currentUser, setCurrentUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [activeStreams, setActiveStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Load user from localStorage
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
                }
            } catch (e) {
                console.error("Failed to parse user:", e);
                navigate("/login");
            }
        } else {
            navigate("/login");
        }
    }, [navigate]);

    // Fetch stats
    const fetchStats = async () => {
        try {
            const [statsRes, streamsRes] = await Promise.allSettled([
                api.get("/live-analytics/stats"),
                api.get("/live"),
            ]);

            if (statsRes.status === "fulfilled") {
                setStats(statsRes.value.data);
            } else {
                // Generate mock stats if API doesn't exist
                setStats({
                    totalStreams: 0,
                    activeStreams: 0,
                    totalGifts: 0,
                    totalViewers: 0,
                    totalEarnings: 0,
                    avgStreamDuration: 0,
                    peakViewers: 0,
                });
            }

            if (streamsRes.status === "fulfilled") {
                const streams = Array.isArray(streamsRes.value.data)
                    ? streamsRes.value.data
                    : streamsRes.value.data?.streams || [];
                setActiveStreams(streams.filter(s => s.isLive !== false));
            }

            setLastUpdated(new Date());
            setError("");
        } catch (err) {
            console.error("Analytics error:", err);
            setError("Failed to load analytics");
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch and auto-refresh
    useEffect(() => {
        if (!currentUser) return;

        fetchStats();

        let interval;
        if (autoRefresh) {
            interval = setInterval(fetchStats, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [currentUser, autoRefresh]);

    // Manual refresh
    const handleRefresh = () => {
        setLoading(true);
        fetchStats();
        toast.success("Analytics refreshed");
    };

    // Format duration
    const formatDuration = (minutes) => {
        if (!minutes) return "0m";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    // Not logged in or not admin
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                    <p className="text-white/60">Loading...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error && !stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-4">
                <div className="text-center bg-white/5 rounded-2xl p-8 border border-white/10">
                    <p className="text-6xl mb-4">📊</p>
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="px-6 py-3 bg-cyan-500 rounded-lg hover:bg-cyan-400 transition"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // Stats cards config
    const statCards = [
        {
            label: "Active Streams",
            value: stats?.activeStreams || activeStreams.length,
            icon: <Activity className="w-8 h-8" />,
            color: "from-green-500 to-emerald-600",
            textColor: "text-green-400",
        },
        {
            label: "Total Viewers",
            value: stats?.totalViewers || activeStreams.reduce((sum, s) => sum + (s.viewers || 0), 0),
            icon: <Eye className="w-8 h-8" />,
            color: "from-pink-500 to-rose-600",
            textColor: "text-pink-400",
        },
        {
            label: "Total Streams",
            value: stats?.totalStreams || 0,
            icon: <Radio className="w-8 h-8" />,
            color: "from-cyan-500 to-blue-600",
            textColor: "text-cyan-400",
        },
        {
            label: "Gifts Revenue",
            value: `$${(stats?.totalGifts || 0).toLocaleString()}`,
            icon: <Gift className="w-8 h-8" />,
            color: "from-yellow-500 to-amber-600",
            textColor: "text-yellow-400",
        },
        {
            label: "Peak Viewers",
            value: stats?.peakViewers || 0,
            icon: <TrendingUp className="w-8 h-8" />,
            color: "from-purple-500 to-violet-600",
            textColor: "text-purple-400",
        },
        {
            label: "Avg Duration",
            value: formatDuration(stats?.avgStreamDuration || 0),
            icon: <Clock className="w-8 h-8" />,
            color: "from-blue-500 to-indigo-600",
            textColor: "text-blue-400",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-cyan-400 flex items-center gap-3">
                            <Radio className="w-8 h-8" />
                            Live Analytics Dashboard
                        </h1>
                        <p className="text-white/60 mt-1">
                            Real-time streaming statistics and insights
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Auto-refresh toggle */}
                        <button
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${autoRefresh
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "bg-white/10 text-white/60"
                                }`}
                        >
                            <RefreshCw className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`} />
                            Auto-refresh {autoRefresh ? "ON" : "OFF"}
                        </button>

                        {/* Manual refresh */}
                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition flex items-center gap-2"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {statCards.map((card, i) => (
                        <div
                            key={i}
                            className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition"
                        >
                            <div className={`${card.textColor} mb-3`}>
                                {card.icon}
                            </div>
                            <p className="text-white/60 text-sm mb-1">{card.label}</p>
                            <p className="text-2xl font-bold">{card.value}</p>
                        </div>
                    ))}
                </div>

                {/* Active Streams Table */}
                <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Activity className="w-5 h-5 text-green-400" />
                            Active Streams
                            {activeStreams.length > 0 && (
                                <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-sm">
                                    {activeStreams.length} live
                                </span>
                            )}
                        </h2>
                    </div>

                    {activeStreams.length === 0 ? (
                        <div className="p-8 text-center">
                            <Radio className="w-12 h-12 text-white/20 mx-auto mb-4" />
                            <p className="text-white/50">No active streams right now</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="text-left p-4 text-white/60 font-medium">Stream</th>
                                        <th className="text-left p-4 text-white/60 font-medium">Host</th>
                                        <th className="text-left p-4 text-white/60 font-medium">Category</th>
                                        <th className="text-right p-4 text-white/60 font-medium">Viewers</th>
                                        <th className="text-right p-4 text-white/60 font-medium">Gifts</th>
                                        <th className="text-right p-4 text-white/60 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {activeStreams.map((stream) => (
                                        <tr key={stream._id} className="hover:bg-white/5 transition">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                    <span className="font-medium truncate max-w-[200px]">
                                                        {stream.title || "Untitled Stream"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <img
                                                        src={stream.host?.avatar || "/defaults/default-avatar.png"}
                                                        alt=""
                                                        className="w-8 h-8 rounded-full object-cover"
                                                    />
                                                    <span>{stream.host?.username || "Unknown"}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-white/10 rounded text-sm">
                                                    {stream.category || "General"}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="flex items-center justify-end gap-1">
                                                    <Eye className="w-4 h-4 text-pink-400" />
                                                    {stream.viewers || 0}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-yellow-400">
                                                    ${stream.giftsReceived || 0}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => navigate(`/live/${stream._id}`)}
                                                    className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition text-sm"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Last Updated */}
                {lastUpdated && (
                    <div className="mt-6 text-center text-white/40 text-sm">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                        {autoRefresh && " • Auto-refreshing every 5 seconds"}
                    </div>
                )}
            </div>
        </div>
    );
}