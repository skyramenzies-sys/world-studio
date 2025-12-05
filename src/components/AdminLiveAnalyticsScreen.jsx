// screens/AdminLiveAnalyticsScreen.jsx - REACT NATIVE ULTIMATE EDITION 🚀
import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Alert,
    RefreshControl,
    TextInput,
    Modal,
    Dimensions,
    FlatList,
    Share,
    StatusBar,
} from "react-native";
import axios from "axios";

const { width } = Dimensions.get("window");
const API_BASE_URL = "https://world-studio.live";

// ============================================
// GRADIENT CARD (No external dependency)
// ============================================
const GradientCard = ({ colors, children, style }) => (
    <View style={[{
        backgroundColor: colors[0],
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors[1] + "40",
    }, style]}>
        {children}
    </View>
);

// ============================================
// MINI CHART COMPONENT (SVG-like with Views)
// ============================================
const MiniBarChart = ({ data, color = "#22d3ee", height = 40 }) => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data) || 1;

    return (
        <View style={{ flexDirection: "row", alignItems: "flex-end", height, gap: 2 }}>
            {data.slice(-10).map((value, i) => (
                <View
                    key={i}
                    style={{
                        flex: 1,
                        backgroundColor: color + "60",
                        height: Math.max((value / max) * height, 2),
                        borderRadius: 2,
                    }}
                />
            ))}
        </View>
    );
};

// ============================================
// STAT CARD COMPONENT
// ============================================
const StatCard = ({ label, value, icon, colors, trend, trendValue, chartData }) => (
    <GradientCard
        colors={colors}
        style={{
            padding: 12,
            minWidth: (width - 48) / 2 - 4,
            flex: 1,
            marginHorizontal: 2,
            marginVertical: 4,
        }}
    >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
            {trend && (
                <View style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: trend === "up" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    borderRadius: 8,
                }}>
                    <Text style={{
                        color: trend === "up" ? "#22c55e" : "#ef4444",
                        fontSize: 10,
                        fontWeight: "bold"
                    }}>
                        {trend === "up" ? "↑" : "↓"} {trendValue}%
                    </Text>
                </View>
            )}
        </View>
        <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 8 }}>{label}</Text>
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "bold", marginTop: 2 }}>{value}</Text>
        {chartData && chartData.length > 2 && (
            <View style={{ marginTop: 8 }}>
                <MiniBarChart data={chartData} color={colors[1]} />
            </View>
        )}
    </GradientCard>
);

// ============================================
// STREAM CARD COMPONENT
// ============================================
const StreamCard = ({ stream, onView, onStop, onWarn, isExpanded, onToggle }) => {
    const [actionLoading, setActionLoading] = useState(null);

    const streamDuration = stream.startedAt
        ? Math.floor((Date.now() - new Date(stream.startedAt).getTime()) / 60000)
        : 0;

    const handleStop = async () => {
        setActionLoading("stop");
        await onStop(stream);
        setActionLoading(null);
    };

    const handleWarn = async () => {
        setActionLoading("warn");
        await onWarn(stream);
        setActionLoading(null);
    };

    return (
        <TouchableOpacity
            onPress={() => onToggle(stream._id)}
            activeOpacity={0.7}
            style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.1)",
            }}
        >
            {/* Header Row */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                {/* Live Indicator */}
                <View style={{
                    width: 10,
                    height: 10,
                    backgroundColor: "#ef4444",
                    borderRadius: 5,
                    marginRight: 10,
                }} />

                {/* Stream Title */}
                <View style={{ flex: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }} numberOfLines={1}>
                        {stream.title || "Untitled Stream"}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                        ID: {stream._id?.slice(-8)}
                    </Text>
                </View>

                {/* Expand Icon */}
                <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 }}>
                    {isExpanded ? "▲" : "▼"}
                </Text>
            </View>

            {/* Host Info */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
                <View style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "rgba(255,255,255,0.1)",
                    marginRight: 10,
                    justifyContent: "center",
                    alignItems: "center",
                }}>
                    <Text style={{ fontSize: 16 }}>👤</Text>
                </View>
                <View>
                    <Text style={{ color: "#fff", fontWeight: "500" }}>
                        {stream.host?.username || "Unknown"}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
                        {stream.host?.followers?.toLocaleString() || 0} followers
                    </Text>
                </View>
            </View>

            {/* Stats Row */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Viewers</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ marginRight: 4 }}>👁️</Text>
                        <Text style={{ color: "#f472b6", fontWeight: "bold" }}>{stream.viewers || 0}</Text>
                    </View>
                </View>
                <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Earnings</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ marginRight: 4 }}>🎁</Text>
                        <Text style={{ color: "#fbbf24", fontWeight: "bold" }}>${stream.giftsReceived || 0}</Text>
                    </View>
                </View>
                <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Duration</Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={{ marginRight: 4 }}>⏱️</Text>
                        <Text style={{ color: "#fff", fontWeight: "bold" }}>{streamDuration}m</Text>
                    </View>
                </View>
                <View style={{ alignItems: "center" }}>
                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Category</Text>
                    <Text style={{ color: "#22d3ee", fontWeight: "500", fontSize: 12 }}>
                        {stream.category || "General"}
                    </Text>
                </View>
            </View>

            {/* Expanded Details */}
            {isExpanded && (
                <View style={{
                    backgroundColor: "rgba(0,0,0,0.2)",
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 12,
                }}>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                        <View style={{ width: "45%" }}>
                            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Quality</Text>
                            <Text style={{ color: "#fff" }}>{stream.quality || "1080p"}</Text>
                        </View>
                        <View style={{ width: "45%" }}>
                            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Device</Text>
                            <Text style={{ color: "#fff" }}>{stream.device || "Desktop"}</Text>
                        </View>
                        <View style={{ width: "45%" }}>
                            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Started</Text>
                            <Text style={{ color: "#fff" }}>
                                {stream.startedAt ? new Date(stream.startedAt).toLocaleTimeString() : "N/A"}
                            </Text>
                        </View>
                        <View style={{ width: "45%" }}>
                            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Chat Messages</Text>
                            <Text style={{ color: "#fff" }}>{stream.chatMessages || 0}</Text>
                        </View>
                        <View style={{ width: "45%" }}>
                            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Unique Viewers</Text>
                            <Text style={{ color: "#fff" }}>{stream.uniqueViewers || stream.viewers || 0}</Text>
                        </View>
                        <View style={{ width: "45%" }}>
                            <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>Reports</Text>
                            <Text style={{ color: stream.reports > 0 ? "#ef4444" : "#fff" }}>
                                {stream.reports || 0}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                    onPress={() => onView(stream)}
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(34,211,238,0.2)",
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: "center",
                    }}
                >
                    <Text style={{ color: "#22d3ee", fontWeight: "600" }}>👁️ View</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleWarn}
                    disabled={actionLoading === "warn"}
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(251,191,36,0.2)",
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: "center",
                        opacity: actionLoading === "warn" ? 0.5 : 1,
                    }}
                >
                    {actionLoading === "warn" ? (
                        <ActivityIndicator size="small" color="#fbbf24" />
                    ) : (
                        <Text style={{ color: "#fbbf24", fontWeight: "600" }}>⚠️ Warn</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleStop}
                    disabled={actionLoading === "stop"}
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(239,68,68,0.2)",
                        paddingVertical: 10,
                        borderRadius: 10,
                        alignItems: "center",
                        opacity: actionLoading === "stop" ? 0.5 : 1,
                    }}
                >
                    {actionLoading === "stop" ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                        <Text style={{ color: "#ef4444", fontWeight: "600" }}>⏹️ Stop</Text>
                    )}
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function AdminLiveAnalyticsScreen({ token, navigation }) {
    // State
    const [stats, setStats] = useState(null);
    const [activeStreams, setActiveStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [sortBy, setSortBy] = useState("viewers");

    // UI State
    const [expandedStream, setExpandedStream] = useState(null);

    // Chart Data
    const [viewerHistory, setViewerHistory] = useState([]);
    const [revenueHistory, setRevenueHistory] = useState([]);

    // Categories
    const categories = ["All", "Gaming", "Music", "Talk Show", "Art", "Cooking", "Other"];

    // Sort Options
    const sortOptions = [
        { id: "viewers", label: "Viewers" },
        { id: "earnings", label: "Earnings" },
        { id: "duration", label: "Duration" },
    ];

    // ============================================
    // API SETUP
    // ============================================
    const api = axios.create({
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${token}` },
    });

    // ============================================
    // FETCH DATA
    // ============================================
    const fetchData = useCallback(async () => {
        try {
            const [statsRes, streamsRes] = await Promise.allSettled([
                api.get("/api/admin/live-analytics/stats"),
                api.get("/api/live"),
            ]);

            // Process stats
            if (statsRes.status === "fulfilled") {
                setStats(statsRes.value.data);

                setViewerHistory(prev => {
                    const newHistory = [...prev, statsRes.value.data.totalViewers || 0];
                    return newHistory.slice(-10);
                });

                setRevenueHistory(prev => {
                    const newHistory = [...prev, statsRes.value.data.todayRevenue || 0];
                    return newHistory.slice(-10);
                });
            } else {
                // Mock stats
                setStats({
                    activeStreams: 0,
                    totalViewers: 0,
                    todayRevenue: 0,
                    peakViewers: 0,
                    avgStreamDuration: 0,
                    todayStreams: 0,
                });
            }

            // Process streams
            if (streamsRes.status === "fulfilled") {
                const streams = Array.isArray(streamsRes.value.data)
                    ? streamsRes.value.data
                    : streamsRes.value.data?.streams || [];
                setActiveStreams(streams.filter(s => s.isLive !== false));
            }

            setLastUpdated(new Date());
            setError("");
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Failed to load analytics");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token]);

    // ============================================
    // AUTO REFRESH
    // ============================================
    useEffect(() => {
        fetchData();

        let interval;
        if (autoRefresh) {
            interval = setInterval(fetchData, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh, fetchData]);

    // ============================================
    // ACTIONS
    // ============================================
    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleStopStream = async (stream) => {
        Alert.alert(
            "Stop Stream",
            `Stop "${stream.title || "Untitled"}" by ${stream.host?.username}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Stop",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await api.post(`/api/admin/streams/${stream._id}/stop`);
                            Alert.alert("Success", "Stream stopped");
                            fetchData();
                        } catch (err) {
                            Alert.alert("Error", "Failed to stop stream");
                        }
                    },
                },
            ]
        );
    };

    const handleWarnStreamer = async (stream) => {
        Alert.prompt(
            "Send Warning",
            "Enter warning message for streamer:",
            async (message) => {
                if (!message) return;
                try {
                    await api.post(`/api/admin/streams/${stream._id}/warn`, { message });
                    Alert.alert("Success", "Warning sent");
                } catch (err) {
                    Alert.alert("Error", "Failed to send warning");
                }
            },
            "plain-text"
        );
    };

    const handleViewStream = (stream) => {
        if (navigation) {
            navigation.navigate("LiveWatch", { streamId: stream._id });
        }
    };

    const handleExport = async () => {
        const data = {
            exportedAt: new Date().toISOString(),
            stats,
            streams: activeStreams.map(s => ({
                title: s.title,
                host: s.host?.username,
                viewers: s.viewers,
                earnings: s.giftsReceived,
            })),
        };

        try {
            await Share.share({
                message: JSON.stringify(data, null, 2),
                title: "Live Analytics Export",
            });
        } catch (err) {
            console.error("Share error:", err);
        }
    };

    // ============================================
    // FILTERING
    // ============================================
    const filteredStreams = activeStreams
        .filter(stream => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                if (!stream.title?.toLowerCase().includes(query) &&
                    !stream.host?.username?.toLowerCase().includes(query)) {
                    return false;
                }
            }
            if (categoryFilter !== "all" && stream.category !== categoryFilter) {
                return false;
            }
            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "viewers":
                    return (b.viewers || 0) - (a.viewers || 0);
                case "earnings":
                    return (b.giftsReceived || 0) - (a.giftsReceived || 0);
                case "duration":
                    const dA = a.startedAt ? Date.now() - new Date(a.startedAt).getTime() : 0;
                    const dB = b.startedAt ? Date.now() - new Date(b.startedAt).getTime() : 0;
                    return dB - dA;
                default:
                    return 0;
            }
        });

    // ============================================
    // HELPERS
    // ============================================
    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(1) + "K";
        return num?.toLocaleString() || "0";
    };

    const formatDuration = (minutes) => {
        if (!minutes) return "0m";
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    // ============================================
    // LOADING
    // ============================================
    if (loading && !stats) {
        return (
            <View style={{
                flex: 1,
                backgroundColor: "#0f0a1e",
                justifyContent: "center",
                alignItems: "center",
            }}>
                <StatusBar barStyle="light-content" />
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text style={{ color: "rgba(255,255,255,0.6)", marginTop: 16 }}>Loading analytics...</Text>
            </View>
        );
    }

    // ============================================
    // STAT CARDS CONFIG
    // ============================================
    const statCards = [
        {
            label: "Active Streams",
            value: filteredStreams.length.toString(),
            icon: "📡",
            colors: ["#059669", "#10b981"],
            trend: "up",
            trendValue: 12,
        },
        {
            label: "Total Viewers",
            value: formatNumber(stats?.totalViewers || filteredStreams.reduce((sum, s) => sum + (s.viewers || 0), 0)),
            icon: "👁️",
            colors: ["#db2777", "#f472b6"],
            trend: "up",
            trendValue: 8,
            chartData: viewerHistory,
        },
        {
            label: "Today's Revenue",
            value: `$${formatNumber(stats?.todayRevenue || 0)}`,
            icon: "💰",
            colors: ["#d97706", "#fbbf24"],
            trend: "up",
            trendValue: 23,
            chartData: revenueHistory,
        },
        {
            label: "Peak Viewers",
            value: formatNumber(stats?.peakViewers || 0),
            icon: "📈",
            colors: ["#7c3aed", "#a78bfa"],
        },
        {
            label: "Avg Duration",
            value: formatDuration(stats?.avgStreamDuration || 0),
            icon: "⏱️",
            colors: ["#2563eb", "#60a5fa"],
        },
        {
            label: "Streams Today",
            value: (stats?.todayStreams || filteredStreams.length).toString(),
            icon: "📅",
            colors: ["#0891b2", "#22d3ee"],
        },
    ];

    // ============================================
    // RENDER
    // ============================================
    return (
        <View style={{ flex: 1, backgroundColor: "#0f0a1e" }}>
            <StatusBar barStyle="light-content" />

            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#22d3ee"
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={{
                    padding: 16,
                    paddingTop: 60,
                    backgroundColor: "rgba(0,0,0,0.3)",
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255,255,255,0.1)",
                }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <View>
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                                <Text style={{ fontSize: 24, marginRight: 8 }}>📡</Text>
                                <Text style={{ color: "#22d3ee", fontSize: 22, fontWeight: "bold" }}>
                                    Live Analytics
                                </Text>
                                {filteredStreams.length > 0 && (
                                    <View style={{
                                        width: 10,
                                        height: 10,
                                        backgroundColor: "#ef4444",
                                        borderRadius: 5,
                                        marginLeft: 8,
                                    }} />
                                )}
                            </View>
                            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>
                                {filteredStreams.length} active streams
                            </Text>
                        </View>

                        <View style={{ flexDirection: "row", gap: 8 }}>
                            {/* Auto Refresh Toggle */}
                            <TouchableOpacity
                                onPress={() => setAutoRefresh(!autoRefresh)}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 10,
                                    backgroundColor: autoRefresh
                                        ? "rgba(34,197,94,0.2)"
                                        : "rgba(255,255,255,0.1)",
                                    borderWidth: 1,
                                    borderColor: autoRefresh
                                        ? "rgba(34,197,94,0.3)"
                                        : "rgba(255,255,255,0.1)",
                                }}
                            >
                                <Text style={{
                                    color: autoRefresh ? "#22c55e" : "rgba(255,255,255,0.5)",
                                    fontWeight: "600",
                                    fontSize: 12,
                                }}>
                                    {autoRefresh ? "● LIVE" : "○ PAUSED"}
                                </Text>
                            </TouchableOpacity>

                            {/* Export */}
                            <TouchableOpacity
                                onPress={handleExport}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 10,
                                    backgroundColor: "rgba(255,255,255,0.1)",
                                }}
                            >
                                <Text style={{ color: "#fff", fontSize: 16 }}>📤</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={{ padding: 16 }}>
                    {/* Stats Grid */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 16 }}>
                        {statCards.map((card, i) => (
                            <StatCard key={i} {...card} />
                        ))}
                    </View>

                    {/* Search */}
                    <View style={{
                        backgroundColor: "rgba(255,255,255,0.05)",
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        marginBottom: 12,
                        flexDirection: "row",
                        alignItems: "center",
                    }}>
                        <Text style={{ marginRight: 8 }}>🔍</Text>
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search streams or hosts..."
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            style={{
                                flex: 1,
                                paddingVertical: 12,
                                color: "#fff",
                            }}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery("")}>
                                <Text style={{ color: "rgba(255,255,255,0.5)" }}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Category Filter */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 12 }}
                    >
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                onPress={() => setCategoryFilter(cat === "All" ? "all" : cat)}
                                style={{
                                    paddingHorizontal: 16,
                                    paddingVertical: 8,
                                    borderRadius: 20,
                                    backgroundColor: (cat === "All" ? "all" : cat) === categoryFilter
                                        ? "#22d3ee"
                                        : "rgba(255,255,255,0.1)",
                                    marginRight: 8,
                                }}
                            >
                                <Text style={{
                                    color: (cat === "All" ? "all" : cat) === categoryFilter
                                        ? "#000"
                                        : "#fff",
                                    fontWeight: "600",
                                }}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Sort Options */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 16 }}
                    >
                        <Text style={{ color: "rgba(255,255,255,0.5)", marginRight: 8, alignSelf: "center" }}>
                            Sort:
                        </Text>
                        {sortOptions.map(option => (
                            <TouchableOpacity
                                key={option.id}
                                onPress={() => setSortBy(option.id)}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    backgroundColor: sortBy === option.id
                                        ? "rgba(34,211,238,0.2)"
                                        : "transparent",
                                    borderWidth: 1,
                                    borderColor: sortBy === option.id
                                        ? "rgba(34,211,238,0.3)"
                                        : "transparent",
                                    marginRight: 8,
                                }}
                            >
                                <Text style={{
                                    color: sortBy === option.id ? "#22d3ee" : "rgba(255,255,255,0.5)",
                                    fontSize: 13,
                                }}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Streams Header */}
                    <View style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                    }}>
                        <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
                            🔴 Active Streams
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                            {filteredStreams.length} of {activeStreams.length}
                        </Text>
                    </View>

                    {/* Streams List */}
                    {filteredStreams.length === 0 ? (
                        <View style={{
                            backgroundColor: "rgba(255,255,255,0.05)",
                            borderRadius: 16,
                            padding: 40,
                            alignItems: "center",
                        }}>
                            <Text style={{ fontSize: 48, marginBottom: 16 }}>📡</Text>
                            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 16 }}>
                                No active streams
                            </Text>
                            <Text style={{ color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 8, textAlign: "center" }}>
                                {searchQuery || categoryFilter !== "all"
                                    ? "Try adjusting your filters"
                                    : "Streams will appear here when users go live"
                                }
                            </Text>
                        </View>
                    ) : (
                        filteredStreams.map(stream => (
                            <StreamCard
                                key={stream._id}
                                stream={stream}
                                onView={handleViewStream}
                                onStop={handleStopStream}
                                onWarn={handleWarnStreamer}
                                isExpanded={expandedStream === stream._id}
                                onToggle={(id) => setExpandedStream(expandedStream === id ? null : id)}
                            />
                        ))
                    )}

                    {/* Quick Stats */}
                    {filteredStreams.length > 0 && (
                        <View style={{
                            backgroundColor: "rgba(255,255,255,0.05)",
                            borderRadius: 16,
                            padding: 16,
                            marginTop: 16,
                        }}>
                            <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 12 }}>
                                📊 Quick Stats
                            </Text>
                            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                                <View style={{ alignItems: "center" }}>
                                    <Text style={{ color: "#f472b6", fontSize: 18, fontWeight: "bold" }}>
                                        {formatNumber(filteredStreams.reduce((sum, s) => sum + (s.viewers || 0), 0))}
                                    </Text>
                                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Total Viewers</Text>
                                </View>
                                <View style={{ alignItems: "center" }}>
                                    <Text style={{ color: "#fbbf24", fontSize: 18, fontWeight: "bold" }}>
                                        ${formatNumber(filteredStreams.reduce((sum, s) => sum + (s.giftsReceived || 0), 0))}
                                    </Text>
                                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Total Revenue</Text>
                                </View>
                                <View style={{ alignItems: "center" }}>
                                    <Text style={{ color: "#22d3ee", fontSize: 18, fontWeight: "bold" }}>
                                        {Math.round(filteredStreams.reduce((sum, s) => sum + (s.viewers || 0), 0) / filteredStreams.length)}
                                    </Text>
                                    <Text style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Avg Viewers</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Last Updated */}
                    {lastUpdated && (
                        <Text style={{
                            color: "rgba(255,255,255,0.3)",
                            fontSize: 12,
                            textAlign: "center",
                            marginTop: 20,
                            marginBottom: 40,
                        }}>
                            Last updated: {lastUpdated.toLocaleTimeString()}
                            {autoRefresh && " • Auto-refreshing"}
                        </Text>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}