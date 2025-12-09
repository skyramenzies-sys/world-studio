// src/components/AdminLiveAnalytics.jsx - ULTIMATE EDITION 🚀
// World-Studio Live Analytics Dashboard

import React, {
    useEffect,
    useState,
    useCallback,
    useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import {
    Radio,
    Eye,
    Gift,
    Activity,
    Users,
    TrendingUp,
    RefreshCw,
    Clock,
    DollarSign,
    BarChart3,
    Download,
    Filter,
    Search,
    StopCircle,
    Play,
    Crown,
    Zap,
    Globe,
    ArrowUp,
    ArrowDown,
    ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/api";
import socket from "../api/socket";

// ============================================
// CONSTANTS - NO HARD-CODED RAILWAY URLS HERE
// ============================================

const SITE_NAME = "World-Studio";

const SITE_URL =
    typeof window !== "undefined" ? window.location.origin : "";

// Tabs & time ranges
const TABS = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "streams", label: "Live Streams", icon: Radio },
    { id: "analytics", label: "Analytics", icon: TrendingUp },
    { id: "leaderboard", label: "Leaderboard", icon: Crown },
];

const TIME_RANGES = [
    { id: "today", label: "Today" },
    { id: "week", label: "This Week" },
    { id: "month", label: "This Month" },
    { id: "all", label: "All Time" },
];

// ============================================
// SIMPLE BAR CHART COMPONENT
// ============================================
const SimpleBarChart = ({ data, color = "#06b6d4", height = 120 }) => {
    const safeData = Array.isArray(data) ? data : [];
    const maxValue = Math.max(
        ...safeData.map((d) => d.value || 0),
        1
    );

    return (
        <div
            className="flex items-end justify-between gap-1"
            style={{ height }}
        >
            {safeData.map((item, idx) => (
                <div
                    key={idx}
                    className="flex-1 flex flex-col items-center"
                >
                    <div
                        className="w-full rounded-t transition-all duration-500"
                        style={{
                            height: `${(item.value / maxValue) * 100}%`,
                            minHeight: item.value > 0 ? 4 : 0,
                            backgroundColor: color,
                        }}
                        title={`${item.label}: ${item.value}`}
                    />
                    <span className="text-[10px] text-white/40 mt-1 truncate w-full text-center">
                        {item.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ============================================
// CIRCULAR PROGRESS COMPONENT
// ============================================
const CircularProgress = ({
    value,
    max,
    size = 80,
    color = "#06b6d4",
    label,
}) => {
    const safeMax = max > 0 ? max : 1;
    const safeValue = Math.max(0, value || 0);
    const percentage = (safeValue / safeMax) * 100;
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset =
        circumference - (percentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center">
            <svg width={size} height={size} className="transform -rotate-90">
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="6"
                    fill="none"
                />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                />
            </svg>
            <span className="text-xl font-bold -mt-14">
                {safeValue}
            </span>
            <span className="text-xs text-white/50 mt-8">{label}</span>
        </div>
    );
};

// ============================================
// STAT CARD COMPONENT
// ============================================
const StatCard = ({
    label,
    value,
    icon: Icon,
    color,
    trend,
    subtitle,
    onClick,
}) => (
    <div
        onClick={onClick}
        className={`bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition ${onClick ? "cursor-pointer" : ""
            }`}
    >
        <div className="flex items-start justify-between mb-2">
            <div className={`p-2 rounded-lg ${color}`}>
                <Icon className="w-5 h-5" />
            </div>
            {trend !== undefined && trend !== null && (
                <span
                    className={`text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 ${trend >= 0
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                >
                    {trend >= 0 ? (
                        <ArrowUp className="w-3 h-3" />
                    ) : (
                        <ArrowDown className="w-3 h-3" />
                    )}
                    {Math.abs(trend)}%
                </span>
            )}
        </div>
        <p className="text-white/60 text-sm mb-1">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
        {subtitle && (
            <p className="text-white/40 text-xs mt-1">{subtitle}</p>
        )}
    </div>
);

// ============================================
// HELPER FUNCTIONS
// ============================================
const formatDuration = (ms) => {
    if (!ms || ms < 0) return "0m";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
};

const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    const n = Number(num) || 0;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
};

const formatCurrency = (amount, currency = "€") => {
    const n = Number(amount) || 0;
    return `${currency}${n.toLocaleString()}`;
};

// ============================================
// STREAM ROW COMPONENT
// ============================================
const StreamRow = ({ stream, onView, onStop, isAdmin }) => {
    const [stopping, setStopping] = useState(false);

    const handleStop = async () => {
        if (
            !window.confirm(
                "Stop this stream? The streamer will be disconnected."
            )
        )
            return;
        try {
            setStopping(true);
            await onStop(stream._id);
        } finally {
            setStopping(false);
        }
    };

    const streamDuration = stream.startedAt
        ? formatDuration(new Date() - new Date(stream.startedAt))
        : "N/A";

    const fallbackAvatar = "/defaults/default-avatar.png";

    return (
        <tr className="hover:bg-white/5 transition border-b border-white/5">
            <td className="p-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <img
                            src={
                                stream.coverImage ||
                                stream.host?.avatar ||
                                fallbackAvatar
                            }
                            alt=""
                            className="w-12 h-12 rounded-lg object-cover"
                            onError={(e) => {
                                e.target.src = fallbackAvatar;
                            }}
                        />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-gray-900" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold truncate max-w-[200px]">
                            {stream.title || "Untitled Stream"}
                        </p>
                        <p className="text-white/50 text-sm flex items-center gap-1">
                            {stream.type === "multi" ? (
                                <>
                                    <Users className="w-3 h-3" /> Multi-guest
                                </>
                            ) : stream.type === "audio" ? (
                                <>
                                    <Radio className="w-3 h-3" /> Audio
                                </>
                            ) : (
                                <>
                                    <Play className="w-3 h-3" /> Solo
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </td>

            <td className="p-4">
                <div className="flex items-center gap-2">
                    <img
                        src={
                            stream.host?.avatar ||
                            stream.streamerAvatar ||
                            fallbackAvatar
                        }
                        alt=""
                        className="w-8 h-8 rounded-full"
                        onError={(e) => {
                            e.target.src = fallbackAvatar;
                        }}
                    />
                    <div>
                        <span className="text-white/80">
                            {stream.host?.username ||
                                stream.streamerName ||
                                "Unknown"}
                        </span>
                        {stream.host?.isVerified && (
                            <span className="ml-1 text-cyan-400">✓</span>
                        )}
                    </div>
                </div>
            </td>

            <td className="p-4">
                <span className="px-2 py-1 bg-white/10 rounded text-sm">
                    {stream.category || "General"}
                </span>
            </td>

            <td className="p-4 text-right">
                <span className="flex items-center justify-end gap-1 text-pink-400 font-semibold">
                    <Eye className="w-4 h-4" /> {stream.viewers || 0}
                </span>
            </td>

            <td className="p-4 text-right">
                <span className="text-purple-400 font-semibold flex items-center justify-end gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {stream.peakViewers || stream.viewers || 0}
                </span>
            </td>

            <td className="p-4 text-right">
                <span className="text-yellow-400 font-semibold flex items-center justify-end gap-1">
                    <Gift className="w-4 h-4" />
                    {stream.totalGifts || stream.giftsReceived || 0}
                </span>
            </td>

            <td className="p-4 text-right">
                <span className="text-white/50 text-sm flex items-center justify-end gap-1">
                    <Clock className="w-4 h-4" />
                    {streamDuration}
                </span>
            </td>

            <td className="p-4 text-right">
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => onView(stream._id)}
                        className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition text-sm font-semibold flex items-center gap-1"
                    >
                        <Eye className="w-4 h-4" /> View
                    </button>
                    {isAdmin && (
                        <button
                            onClick={handleStop}
                            disabled={stopping}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition text-sm font-semibold disabled:opacity-50 flex items-center gap-1"
                        >
                            <StopCircle className="w-4 h-4" />
                            {stopping ? "..." : "Stop"}
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
};

// ============================================
// TOP STREAMER CARD COMPONENT
// ============================================
const TopStreamerCard = ({ streamer, rank, metric, metricLabel }) => {
    const fallbackAvatar = "/defaults/default-avatar.png";

    return (
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg_WHITE/10 transition">
            <span className="text-2xl w-8 text-center">
                {rank === 1
                    ? "🥇"
                    : rank === 2
                        ? "🥈"
                        : rank === 3
                            ? "🥉"
                            : `#${rank}`}
            </span>

            <img
                src={streamer.avatar || fallbackAvatar}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
                onError={(e) => {
                    e.target.src = fallbackAvatar;
                }}
            />

            <div className="flex-1 min-w-0">
                <p className="font-semibold truncate flex items-center gap-1">
                    {streamer.username}
                    {streamer.isVerified && (
                        <span className="text-cyan-400 text-sm">✓</span>
                    )}
                </p>
                <p className="text-white/50 text-xs">
                    {streamer.streamCount || 0} streams
                </p>
            </div>

            <div className="text-right">
                <p className="font-bold text-cyan-400">{metric}</p>
                <p className="text-white/40 text-xs">{metricLabel}</p>
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function AdminLiveAnalytics() {
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [stats, setStats] = useState(null);
    const [activeStreams, setActiveStreams] = useState([]);
    const [historicalData, setHistoricalData] = useState([]);
    const [topStreamers, setTopStreamers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [timeRange, setTimeRange] = useState("today");
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");

    // =========================
    // AUTH CHECK
    // =========================
    useEffect(() => {
        if (typeof window === "undefined") return;

        const storedUser = window.localStorage.getItem(
            "ws_currentUser"
        );
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentUser(user);

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

    // =========================
    // FETCH STATS
    // =========================
    const fetchStats = useCallback(async () => {
        try {
            const [statsRes, streamsRes, topRes] =
                await Promise.allSettled([
                    api.get("/live-analytics/stats"),
                    api.get("/live"),
                    api.get("/live-analytics/top-streamers"),
                ]);

            if (statsRes.status === "fulfilled") {
                setStats(statsRes.value.data || {});
            } else {
                setStats({
                    totalStreams: 0,
                    activeStreams: 0,
                    totalGifts: 0,
                    totalViewers: 0,
                    totalEarnings: 0,
                    avgStreamDuration: 0,
                    peakViewers: 0,
                    newStreamersToday: 0,
                    streamsTodayCount: 0,
                    revenueToday: 0,
                });
            }

            if (streamsRes.status === "fulfilled") {
                const streams = Array.isArray(streamsRes.value.data)
                    ? streamsRes.value.data
                    : streamsRes.value.data?.streams || [];
                setActiveStreams(
                    streams.filter((s) => s.isLive !== false)
                );
            }

            if (topRes.status === "fulfilled") {
                setTopStreamers(
                    topRes.value.data?.streamers ||
                    topRes.value.data ||
                    []
                );
            }

            // Dummy historical data (later koppelen aan echte API)
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                return {
                    label: date.toLocaleDateString("en", {
                        weekday: "short",
                    }),
                    value: Math.floor(Math.random() * 50) + 10,
                };
            });
            setHistoricalData(last7Days);

            setLastUpdated(new Date());
            setError("");
        } catch (err) {
            console.error("Analytics error:", err);
            setError("Failed to load analytics");
        } finally {
            setLoading(false);
        }
    }, []);

    // =========================
    // AUTO-REFRESH
    // =========================
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
    }, [currentUser, autoRefresh, fetchStats]);

    // =========================
    // SOCKET LISTENERS
    // =========================
    useEffect(() => {
        if (!socket || !socket.on || !socket.off) return;

        // Live started
        socket.on("live_started", (stream) => {
            setActiveStreams((prev) => [
                stream,
                ...prev.filter((s) => s._id !== stream._id),
            ]);
            setStats((prev) =>
                prev
                    ? {
                        ...prev,
                        activeStreams:
                            (prev.activeStreams || 0) + 1,
                    }
                    : prev
            );
            toast.success(
                `🔴 ${stream.streamerName || "Someone"
                } started streaming on ${SITE_NAME}!`,
                { duration: 3000 }
            );
        });

        // Live stopped
        socket.on("live_stopped", ({ _id }) => {
            setActiveStreams((prev) =>
                prev.filter((s) => s._id !== _id)
            );
            setStats((prev) =>
                prev
                    ? {
                        ...prev,
                        activeStreams: Math.max(
                            0,
                            (prev.activeStreams || 1) - 1
                        ),
                    }
                    : prev
            );
        });

        // Viewers update
        socket.on("viewer_count", ({ streamId, viewers, count }) => {
            const viewerCount = viewers ?? count ?? 0;
            setActiveStreams((prev) =>
                prev.map((s) =>
                    s._id === streamId
                        ? { ...s, viewers: viewerCount }
                        : s
                )
            );
        });

        // Gifts update
        socket.on("gift_sent", ({ streamId, amount }) => {
            setActiveStreams((prev) =>
                prev.map((s) =>
                    s._id === streamId
                        ? {
                            ...s,
                            totalGifts:
                                (s.totalGifts || 0) +
                                (amount || 1),
                        }
                        : s
                )
            );
            setStats((prev) =>
                prev
                    ? {
                        ...prev,
                        totalGifts:
                            (prev.totalGifts || 0) +
                            (amount || 1),
                    }
                    : prev
            );
        });

        return () => {
            socket.off("live_started");
            socket.off("live_stopped");
            socket.off("viewer_count");
            socket.off("gift_sent");
        };
    }, []);

    // =========================
    // HANDLERS
    // =========================
    const handleRefresh = () => {
        setLoading(true);
        fetchStats();
        toast.success("Analytics refreshed");
    };

    const handleStopStream = async (streamId) => {
        try {
            await api.post(`/admin/stop-stream/${streamId}`);
            if (socket && socket.emit) {
                socket.emit("admin_stop_stream", streamId);
            }
            setActiveStreams((prev) =>
                prev.filter((s) => s._id !== streamId)
            );
            toast.success("Stream stopped successfully");
        } catch (err) {
            console.error("Stop stream error:", err);
            toast.error("Failed to stop stream");
        }
    };

    const handleViewStream = (streamId) => {
        navigate(`/live/${streamId}`);
    };

    const handleExport = () => {
        if (typeof window === "undefined") {
            toast.error("Export not available in this environment");
            return;
        }

        const data = activeStreams.map((s) => ({
            title: s.title || "Untitled",
            host:
                s.host?.username ||
                s.streamerName ||
                "Unknown",
            category: s.category || "General",
            viewers: s.viewers || 0,
            peakViewers: s.peakViewers || s.viewers || 0,
            gifts:
                s.totalGifts || s.giftsReceived || 0,
            startedAt: s.startedAt || "",
        }));

        const csv = [
            "Title,Host,Category,Viewers,Peak Viewers,Gifts,Started At",
            ...data.map(
                (d) =>
                    `"${d.title}","${d.host}","${d.category}",${d.viewers},${d.peakViewers},${d.gifts},"${d.startedAt}"`
            ),
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `world-studio-live-analytics-${new Date().toISOString().split("T")[0]
            }.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success("Data exported!");
    };

    // =========================
    // DERIVED VALUES
    // =========================
    const totalViewers = useMemo(
        () =>
            activeStreams.reduce(
                (sum, s) => sum + (s.viewers || 0),
                0
            ),
        [activeStreams]
    );

    const totalGiftsLive = useMemo(
        () =>
            activeStreams.reduce(
                (sum, s) =>
                    sum +
                    (s.totalGifts || s.giftsReceived || 0),
                0
            ),
        [activeStreams]
    );

    const avgViewersPerStream = useMemo(
        () =>
            activeStreams.length > 0
                ? Math.round(totalViewers / activeStreams.length)
                : 0,
        [activeStreams, totalViewers]
    );

    const categoryChartData = useMemo(() => {
        const counts = {};
        activeStreams.forEach((s) => {
            const cat = s.category || "General";
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([label, value]) => ({ label, value }))
            .slice(0, 8);
    }, [activeStreams]);

    const categories = useMemo(() => {
        const cats = new Set(
            activeStreams.map((s) => s.category || "General")
        );
        return ["all", ...Array.from(cats)];
    }, [activeStreams]);

    const filteredStreams = useMemo(
        () =>
            activeStreams.filter((stream) => {
                const search = searchQuery.toLowerCase();
                const matchesSearch =
                    search === "" ||
                    (stream.title || "")
                        .toLowerCase()
                        .includes(search) ||
                    (stream.host?.username ||
                        stream.streamerName ||
                        "")
                        .toLowerCase()
                        .includes(search);

                const matchesCategory =
                    categoryFilter === "all" ||
                    (stream.category || "General") ===
                    categoryFilter;

                return matchesSearch && matchesCategory;
            }),
        [activeStreams, searchQuery, categoryFilter]
    );

    const statCards = [
        {
            label: "Active Streams",
            value: stats?.activeStreams || activeStreams.length,
            icon: Activity,
            color: "bg-green-500/20 text-green-400",
            trend: 12,
            subtitle: "Right now",
        },
        {
            label: "Total Viewers",
            value: formatNumber(totalViewers),
            icon: Eye,
            color: "bg-pink-500/20 text-pink-400",
            trend: 8,
            subtitle: "Watching live",
        },
        {
            label: "Avg per Stream",
            value: avgViewersPerStream,
            icon: Users,
            color: "bg-cyan-500/20 text-cyan-400",
            subtitle: "Viewers",
        },
        {
            label: "Gifts Sent",
            value: formatNumber(
                stats?.totalGifts || totalGiftsLive
            ),
            icon: Gift,
            color: "bg-yellow-500/20 text-yellow-400",
            trend: 15,
            subtitle: "Today",
        },
        {
            label: "Revenue",
            value: formatCurrency(
                stats?.totalEarnings || 0
            ),
            icon: DollarSign,
            color: "bg-emerald-500/20 text-emerald-400",
            subtitle: "Today",
        },
        {
            label: "Peak Viewers",
            value: formatNumber(stats?.peakViewers || 0),
            icon: TrendingUp,
            color: "bg-purple-500/20 text-purple-400",
            subtitle: "All time high",
        },
    ];

    const isAdmin =
        currentUser?.isAdmin || currentUser?.role === "admin";

    // =========================
    // EARLY STATES
    // =========================
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4" />
                    <p className="text-white/60">
                        Loading {SITE_NAME}...
                    </p>
                </div>
            </div>
        );
    }

    if (error && !stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 flex items-center justify-center p-4">
                <div className="text-center bg-white/5 rounded-2xl p-8 border border-white/10">
                    <Radio className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={handleRefresh}
                        className="px-6 py-3 bg-cyan-500 rounded-lg hover:bg-cyan-400 transition font-semibold flex items-center gap-2 mx-auto"
                    >
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // =========================
    // RENDER
    // =========================
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 text-white">
            <div className="max-w-7xl mx-auto p-4 md:p-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 flex items-center gap-3">
                            <Radio className="w-8 h-8" />
                            Live Analytics
                        </h1>
                        <p className="text-white/60 text-sm mt-1 flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            {SITE_NAME} • Real-time streaming
                            insights
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
                            {TIME_RANGES.map((range) => (
                                <button
                                    key={range.id}
                                    onClick={() =>
                                        setTimeRange(range.id)
                                    }
                                    className={`px-3 py-1.5 rounded text-sm transition ${timeRange === range.id
                                            ? "bg-cyan-500 text-black font-semibold"
                                            : "text-white/60 hover:text-white"
                                        }`}
                                >
                                    {range.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() =>
                                setAutoRefresh(!autoRefresh)
                            }
                            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition ${autoRefresh
                                    ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                    : "bg-white/10 text-white/60"
                                }`}
                        >
                            <RefreshCw
                                className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""
                                    }`}
                            />
                            {autoRefresh ? "Live" : "Paused"}
                        </button>

                        <button
                            onClick={handleExport}
                            className="px-3 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>

                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="px-4 py-2 bg-cyan-500 rounded-lg hover:bg-cyan-400 transition text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                        >
                            <RefreshCw
                                className={`w-4 h-4 ${loading ? "animate-spin" : ""
                                    }`}
                            />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Live Banner */}
                {activeStreams.length > 0 && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="font-semibold">
                                {activeStreams.length} stream
                                {activeStreams.length !== 1
                                    ? "s"
                                    : ""}{" "}
                                live now
                            </span>
                            <span className="text-white/50">
                                •
                            </span>
                            <span className="text-pink-400 flex items-center gap-1">
                                <Eye className="w-4 h-4" />
                                {formatNumber(totalViewers)} watching
                            </span>
                            <span className="text-white/50">
                                •
                            </span>
                            <span className="text-yellow-400 flex items-center gap-1">
                                <Gift className="w-4 h-4" />
                                {formatNumber(totalGiftsLive)} gifts
                            </span>
                        </div>

                        <button
                            onClick={() => setActiveTab("streams")}
                            className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition text-sm flex items-center gap-2"
                        >
                            View All
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        const count =
                            tab.id === "streams"
                                ? activeStreams.length
                                : null;

                        return (
                            <button
                                key={tab.id}
                                onClick={() =>
                                    setActiveTab(tab.id)
                                }
                                className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition flex items-center gap-2 ${activeTab === tab.id
                                        ? "bg-cyan-500 text-black"
                                        : "bg-white/10 text-white/70 hover:bg-white/20"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {tab.label}
                                {count !== null &&
                                    count > 0 && (
                                        <span
                                            className={`px-1.5 py-0.5 rounded-full text-xs ${activeTab === tab.id
                                                    ? "bg-black/20"
                                                    : "bg-green-500/20 text-green-400"
                                                }`}
                                        >
                                            {count}
                                        </span>
                                    )}
                            </button>
                        );
                    })}
                </div>

                {/* OVERVIEW TAB */}
                {activeTab === "overview" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            {statCards.map((card, i) => (
                                <StatCard key={i} {...card} />
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <h3 className="font-semibold mb-4 text-cyan-400 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5" />
                                    Streams This Week
                                </h3>
                                <SimpleBarChart
                                    data={historicalData}
                                    color="#06b6d4"
                                    height={100}
                                />
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <h3 className="font-semibold mb-4 text-pink-400 flex items-center gap-2">
                                    <Filter className="w-5 h-5" />
                                    Active by Category
                                </h3>
                                {categoryChartData.length > 0 ? (
                                    <SimpleBarChart
                                        data={categoryChartData}
                                        color="#ec4899"
                                        height={100}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-[100px] text-white/40">
                                        <p>No active streams</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Live preview list */}
                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <Radio className="w-5 h-5 text-red-400" />
                                    Live Now
                                </h3>
                                <button
                                    onClick={() =>
                                        setActiveTab("streams")
                                    }
                                    className="text-cyan-400 text-sm hover:underline flex items-center gap-1"
                                >
                                    View all
                                    <ExternalLink className="w-4 h-4" />
                                </button>
                            </div>

                            {activeStreams.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Radio className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                    <p className="text-white/50">
                                        No active streams right now
                                    </p>
                                    <p className="text-white/30 text-sm mt-1">
                                        Streams will appear here when
                                        someone goes live on{" "}
                                        {SITE_NAME}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5">
                                    {activeStreams
                                        .slice(0, 5)
                                        .map((stream) => (
                                            <div
                                                key={stream._id}
                                                className="p-4 flex items-center justify-between hover:bg-white/5 transition"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                        <img
                                                            src={
                                                                stream
                                                                    .host
                                                                    ?.avatar ||
                                                                stream.streamerAvatar ||
                                                                "/defaults/default-avatar.png"
                                                            }
                                                            className="w-10 h-10 rounded-full object-cover"
                                                            alt=""
                                                            onError={(
                                                                e
                                                            ) => {
                                                                e.target.src =
                                                                    "/defaults/default-avatar.png";
                                                            }}
                                                        />
                                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold flex items-center gap-1">
                                                            {stream.host
                                                                ?.username ||
                                                                stream.streamerName}
                                                            {stream.host
                                                                ?.isVerified && (
                                                                    <span className="text-cyan-400 text-sm">
                                                                        ✓
                                                                    </span>
                                                                )}
                                                        </p>
                                                        <p className="text-white/50 text-sm truncate max-w-[200px]">
                                                            {stream.title ||
                                                                "Untitled Stream"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="text-pink-400 flex items-center gap-1">
                                                        <Eye className="w-4 h-4" />
                                                        {stream.viewers ||
                                                            0}
                                                    </span>
                                                    <span className="text-yellow-400 flex items-center gap-1">
                                                        <Gift className="w-4 h-4" />
                                                        {stream.totalGifts ||
                                                            stream.giftsReceived ||
                                                            0}
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            handleViewStream(
                                                                stream._id
                                                            )
                                                        }
                                                        className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition flex items-center gap-1"
                                                    >
                                                        <Play className="w-4 h-4" />
                                                        Watch
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STREAMS TAB */}
                {activeTab === "streams" && (
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Radio className="w-5 h-5 text-green-400" />
                                Active Streams
                                {filteredStreams.length > 0 && (
                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-sm">
                                        {filteredStreams.length} live
                                    </span>
                                )}
                            </h3>

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                                    <input
                                        type="text"
                                        placeholder="Search streams..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(
                                                e.target.value
                                            )
                                        }
                                        className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm outline-none focus:border-cyan-500 w-48"
                                    />
                                </div>

                                <select
                                    value={categoryFilter}
                                    onChange={(e) =>
                                        setCategoryFilter(
                                            e.target.value
                                        )
                                    }
                                    className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm outline-none"
                                >
                                    {categories.map((cat) => (
                                        <option
                                            key={cat}
                                            value={cat}
                                        >
                                            {cat === "all"
                                                ? "All Categories"
                                                : cat}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {filteredStreams.length === 0 ? (
                            <div className="p-12 text-center">
                                <Radio className="w-16 h-16 text-white/20 mx-auto mb-4" />
                                <p className="text-white/50 text-lg">
                                    {activeStreams.length === 0
                                        ? "No active streams right now"
                                        : "No streams match your filters"}
                                </p>
                                <p className="text-white/30 text-sm mt-2">
                                    {activeStreams.length === 0
                                        ? `Streams will appear here when someone goes live on ${SITE_NAME}`
                                        : "Try adjusting your search or filters"}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-white/5">
                                        <tr>
                                            <th className="text-left p-4 text-white/60 font-medium">
                                                Stream
                                            </th>
                                            <th className="text-left p-4 text-white/60 font-medium">
                                                Host
                                            </th>
                                            <th className="text-left p-4 text-white/60 font-medium">
                                                Category
                                            </th>
                                            <th className="text-right p-4 text-white/60 font-medium">
                                                Viewers
                                            </th>
                                            <th className="text-right p-4 text-white/60 font-medium">
                                                Peak
                                            </th>
                                            <th className="text-right p-4 text-white/60 font-medium">
                                                Gifts
                                            </th>
                                            <th className="text-right p-4 text-white/60 font-medium">
                                                Duration
                                            </th>
                                            <th className="text-right p-4 text-white/60 font-medium">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredStreams.map(
                                            (stream) => (
                                                <StreamRow
                                                    key={stream._id}
                                                    stream={stream}
                                                    onView={
                                                        handleViewStream
                                                    }
                                                    onStop={
                                                        handleStopStream
                                                    }
                                                    isAdmin={isAdmin}
                                                />
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ANALYTICS TAB */}
                {activeTab === "analytics" && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex justify-center">
                                <CircularProgress
                                    value={activeStreams.length}
                                    max={20}
                                    color="#06b6d4"
                                    label="Active Streams"
                                />
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex justify-center">
                                <CircularProgress
                                    value={totalViewers}
                                    max={1000}
                                    color="#ec4899"
                                    label="Total Viewers"
                                />
                            </div>
                            <div className="bg-white/5 border border_WHITE/10 rounded-xl p-6 flex justify-center">
                                <CircularProgress
                                    value={stats?.totalGifts || 0}
                                    max={500}
                                    color="#eab308"
                                    label="Gifts Today"
                                />
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex justify-center">
                                <CircularProgress
                                    value={
                                        stats?.newStreamersToday ||
                                        0
                                    }
                                    max={50}
                                    color="#22c55e"
                                    label="New Streamers"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <h3 className="font-semibold mb-4 text-green-400 flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" />
                                    Revenue Trend
                                </h3>
                                <SimpleBarChart
                                    data={[
                                        { label: "Mon", value: 120 },
                                        { label: "Tue", value: 180 },
                                        { label: "Wed", value: 150 },
                                        { label: "Thu", value: 220 },
                                        { label: "Fri", value: 280 },
                                        { label: "Sat", value: 350 },
                                        { label: "Sun", value: 200 },
                                    ]}
                                    color="#22c55e"
                                    height={120}
                                />
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <h3 className="font-semibold mb-4 text-purple-400 flex items-center gap-2">
                                    <Clock className="w-5 h-5" />
                                    Peak Hours
                                </h3>
                                <SimpleBarChart
                                    data={[
                                        { label: "6AM", value: 5 },
                                        { label: "9AM", value: 15 },
                                        { label: "12PM", value: 35 },
                                        { label: "3PM", value: 45 },
                                        { label: "6PM", value: 80 },
                                        { label: "9PM", value: 100 },
                                        { label: "12AM", value: 40 },
                                    ]}
                                    color="#a855f7"
                                    height={120}
                                />
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <h3 className="font-semibold mb-4 text-cyan-400 flex items-center gap-2">
                                <Zap className="w-5 h-5" />
                                Platform Performance
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-cyan-400">
                                        {formatDuration(
                                            (stats?.avgStreamDuration ||
                                                0) * 60000
                                        )}
                                    </p>
                                    <p className="text-white/50 text-sm mt-1">
                                        Avg Stream Duration
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-pink-400">
                                        {formatNumber(
                                            stats?.totalStreams || 0
                                        )}
                                    </p>
                                    <p className="text-white/50 text-sm mt-1">
                                        Total Streams
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-yellow-400">
                                        {formatCurrency(
                                            stats?.totalEarnings || 0
                                        )}
                                    </p>
                                    <p className="text-white/50 text-sm mt-1">
                                        Total Revenue
                                    </p>
                                </div>
                                <div className="bg-white/5 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-green-400">
                                        {stats?.streamsTodayCount ||
                                            activeStreams.length}
                                    </p>
                                    <p className="text-white/50 text-sm mt-1">
                                        Streams Today
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* LEADERBOARD TAB */}
                {activeTab === "leaderboard" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/10 bg-pink-500/10">
                                <h3 className="font-semibold text-pink-400 flex items-center gap-2">
                                    <Eye className="w-5 h-5" />
                                    Most Viewed
                                </h3>
                            </div>
                            <div className="p-3 space-y-2">
                                {topStreamers.length > 0 ? (
                                    topStreamers
                                        .slice(0, 5)
                                        .map((s, idx) => (
                                            <TopStreamerCard
                                                key={
                                                    s._id || idx
                                                }
                                                streamer={s}
                                                rank={idx + 1}
                                                metric={formatNumber(
                                                    s.totalViewers ||
                                                    0
                                                )}
                                                metricLabel="views"
                                            />
                                        ))
                                ) : (
                                    <p className="text-white/40 text-center py-8">
                                        No data yet
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/10 bg-yellow-500/10">
                                <h3 className="font-semibold text-yellow-400 flex items-center gap-2">
                                    <Gift className="w-5 h-5" />
                                    Top Earners
                                </h3>
                            </div>
                            <div className="p-3 space-y-2">
                                {topStreamers.length > 0 ? (
                                    topStreamers
                                        .slice(0, 5)
                                        .map((s, idx) => (
                                            <TopStreamerCard
                                                key={
                                                    s._id || idx
                                                }
                                                streamer={s}
                                                rank={idx + 1}
                                                metric={formatCurrency(
                                                    s.totalEarnings ||
                                                    0
                                                )}
                                                metricLabel="earned"
                                            />
                                        ))
                                ) : (
                                    <p className="text-white/40 text-center py-8">
                                        No data yet
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                            <div className="p-4 border-b border-white/10 bg-cyan-500/10">
                                <h3 className="font-semibold text-cyan-400 flex items-center gap-2">
                                    <Radio className="w-5 h-5" />
                                    Most Active
                                </h3>
                            </div>
                            <div className="p-3 space-y-2">
                                {topStreamers.length > 0 ? (
                                    topStreamers
                                        .slice(0, 5)
                                        .map((s, idx) => (
                                            <TopStreamerCard
                                                key={
                                                    s._id || idx
                                                }
                                                streamer={s}
                                                rank={idx + 1}
                                                metric={`${s.streamCount || 0}`}
                                                metricLabel="streams"
                                            />
                                        ))
                                ) : (
                                    <p className="text-white/40 text-center py-8">
                                        No data yet
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                {lastUpdated && (
                    <div className="mt-8 text-center text-white/40 text-sm border-t border-white/10 pt-6">
                        <p>
                            Last updated:{" "}
                            {lastUpdated.toLocaleTimeString()}
                            {autoRefresh &&
                                " • Auto-refreshing every 5 seconds"}
                        </p>

                        {SITE_URL && (
                            <p className="mt-2 flex items-center justify-center gap-2">
                                <Globe className="w-4 h-4" />
                                <a
                                    href={SITE_URL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:text-cyan-400 transition"
                                >
                                    {SITE_URL.replace(
                                        "https://",
                                        ""
                                    ).replace("http://", "")}
                                </a>
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
