// screens/AdminCoinHistoryScreen.jsx – WORLD STUDIO LIVE • COIN HISTORY ULTIMATE EDITION 💰📈
import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    Share,
    StatusBar,
} from "react-native";
import axios from "axios";

const { width } = Dimensions.get("window");
const API_BASE_URL = "https://world-studio-production.up.railway.app";

// ============================================
// GRADIENT CARD (No external dependency)
// ============================================
const GradientCard = ({ colors, children, style }) => (
    <View
        style={[
            {
                backgroundColor: colors[0],
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors[1] + "40",
            },
            style,
        ]}
    >
        {children}
    </View>
);

// ============================================
// MINI BAR CHART (TIMELINE VISUAL)
// ============================================
const MiniBarChart = ({ data, height = 80, color = "#22d3ee" }) => {
    if (!data || data.length === 0) return null;

    const max = Math.max(...data.map((d) => d.coins || 0)) || 1;

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "flex-end",
                height,
                gap: 4,
                paddingVertical: 8,
            }}
        >
            {data.map((item, i) => (
                <View
                    key={i}
                    style={{
                        flex: 1,
                        alignItems: "center",
                    }}
                >
                    <View
                        style={{
                            width: 10,
                            backgroundColor: color + "70",
                            height: Math.max(
                                ((item.coins || 0) / max) * (height - 20),
                                4
                            ),
                            borderRadius: 4,
                        }}
                    />
                    <Text
                        style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: 9,
                            marginTop: 4,
                        }}
                        numberOfLines={1}
                    >
                        {item.label || ""}
                    </Text>
                </View>
            ))}
        </View>
    );
};

// ============================================
// TOP USER ROW (STREAMER / SENDER)
// ============================================
const TopUserRow = ({ rank, username, coins, extra }) => (
    <View
        style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(255,255,255,0.05)",
        }}
    >
        <Text
            style={{
                width: 24,
                textAlign: "center",
                color: rank === 1 ? "#facc15" : "#e5e7eb",
                fontWeight: rank <= 3 ? "bold" : "normal",
                fontSize: 14,
            }}
        >
            {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
        </Text>
        <View style={{ flex: 1 }}>
            <Text
                style={{
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: "600",
                }}
                numberOfLines={1}
            >
                {username || "Unknown"}
            </Text>
            {extra ? (
                <Text
                    style={{
                        color: "rgba(255,255,255,0.5)",
                        fontSize: 11,
                        marginTop: 2,
                    }}
                    numberOfLines={1}
                >
                    {extra}
                </Text>
            ) : null}
        </View>
        <Text
            style={{
                color: "#fbbf24",
                fontWeight: "700",
                fontSize: 14,
            }}
        >
            💰 {coins?.toLocaleString() || 0}
        </Text>
    </View>
);

// ============================================
// MAIN SCREEN
// ============================================
export default function AdminCoinHistoryScreen({ token, navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [timeRange, setTimeRange] = useState("7d"); // today | 7d | 30d | 90d | all
    const [groupBy, setGroupBy] = useState("day"); // day | week | month

    const [summary, setSummary] = useState(null);
    const [timeline, setTimeline] = useState([]);
    const [topStreamers, setTopStreamers] = useState([]);
    const [topSenders, setTopSenders] = useState([]);



    // ============================================
    // HELPERS
    // ============================================
    const formatNumber = (num) => {
        if (!num) return "0";
        if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
        if (num >= 1000) return (num / 1000).toFixed(1) + "K";
        return num.toLocaleString();
    };

    const rangeLabel =
        {
            today: "Today",
            "7d": "Last 7 days",
            "30d": "Last 30 days",
            "90d": "Last 90 days",
            all: "All time",
        }[timeRange] || "Last 7 days";

    const groupLabel =
        {
            day: "Daily",
            week: "Weekly",
            month: "Monthly",
        }[groupBy] || "Daily";

    // ============================================
    // FETCH DATA
    // ============================================
    const fetchData = useCallback(async () => {
        if (!token) {
            setError("Missing admin token");
            setLoading(false);
            setRefreshing(false);
            return;
        }

        setError("");
        try {
            setLoading(true);

            const res = await axios.get(
                `${API_BASE_URL}/api/admin/coins/history`,
                {
                    params: {
                        range: timeRange,
                        groupBy,
                    },
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = res.data || {};

            setSummary(data.summary || null);
            setTimeline(data.timeline || []);
            setTopStreamers(data.topStreamers || []);
            setTopSenders(data.topSenders || []);
        } catch (err) {
            console.error("Coin history fetch error:", err);
            setError("Failed to load coin history");

            // Fallback / mock data (veilig, zodat UI altijd werkt)
            const now = new Date();
            const mockTimeline = Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(
                    now.getTime() - (6 - i) * 24 * 60 * 60 * 1000
                );
                return {
                    date: d.toISOString().slice(0, 10),
                    label: `${d.getDate()}/${d.getMonth() + 1}`,
                    coins: 500 + i * 120,
                    gifts: 10 + i * 2,
                    streams: 2 + (i % 3),
                };
            });

            setSummary({
                totalCoins: 12345,
                totalSenders: 24,
                totalReceivers: 18,
                topStreamer: { username: "CommanderS", coins: 4200 },
                topSender: { username: "WhaleUser", coins: 3100 },
            });

            setTimeline(mockTimeline);

            setTopStreamers([
                {
                    username: "CommanderS",
                    coins: 4200,
                    streams: 8,
                    followers: 2500,
                },
                {
                    username: "ArtistLive",
                    coins: 2100,
                    streams: 5,
                    followers: 1300,
                },
                {
                    username: "DJNight",
                    coins: 1800,
                    streams: 4,
                    followers: 900,
                },
            ]);

            setTopSenders([
                { username: "WhaleUser", coins: 3100, gifts: 75 },
                { username: "VIP_Giver", coins: 2200, gifts: 40 },
                { username: "Supporter", coins: 1500, gifts: 28 },
            ]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [token, timeRange, groupBy]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleExport = async () => {
        const data = {
            exportedAt: new Date().toISOString(),
            timeRange,
            timeRangeLabel: rangeLabel,
            groupBy,
            groupLabel,
            summary,
            timeline,
            topStreamers,
            topSenders,
        };

        try {
            await Share.share({
                message: JSON.stringify(data, null, 2),
                title: "Coin History Export",
            });
        } catch (err) {
            console.error("Share error:", err);
        }
    };

    // ============================================
    // LOADING SCREEN
    // ============================================
    if (loading && !summary && timeline.length === 0) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: "#020617",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <StatusBar barStyle="light-content" />
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text
                    style={{
                        color: "rgba(255,255,255,0.7)",
                        marginTop: 16,
                    }}
                >
                    Loading coin history...
                </Text>
            </View>
        );
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <View style={{ flex: 1, backgroundColor: "#020617" }}>
            <StatusBar barStyle="light-content" />

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor="#22d3ee"
                    />
                }
            >
                {/* HEADER */}
                <View
                    style={{
                        paddingTop: 56,
                        paddingHorizontal: 16,
                        paddingBottom: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: "rgba(148,163,184,0.25)",
                        backgroundColor: "rgba(15,23,42,0.9)",
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <View>
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                }}
                            >
                                <Text
                                    style={{
                                        fontSize: 24,
                                        marginRight: 8,
                                    }}
                                >
                                    💰
                                </Text>
                                <Text
                                    style={{
                                        color: "#22d3ee",
                                        fontSize: 22,
                                        fontWeight: "bold",
                                    }}
                                >
                                    Coin History
                                </Text>
                            </View>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 13,
                                    marginTop: 4,
                                }}
                            >
                                {rangeLabel} • {groupLabel}
                            </Text>
                        </View>

                        <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                                onPress={handleExport}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 999,
                                    backgroundColor: "rgba(15,118,110,0.3)",
                                    borderWidth: 1,
                                    borderColor: "rgba(34,197,94,0.6)",
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#bbf7d0",
                                        fontWeight: "600",
                                    }}
                                >
                                    📤 Export
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {error ? (
                        <Text
                            style={{
                                color: "#f97373",
                                fontSize: 12,
                                marginTop: 8,
                            }}
                        >
                            {error}
                        </Text>
                    ) : null}
                </View>

                <View style={{ padding: 16 }}>
                    {/* TIME RANGE FILTERS */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 12 }}
                    >
                        {[
                            { id: "today", label: "Today" },
                            { id: "7d", label: "7d" },
                            { id: "30d", label: "30d" },
                            { id: "90d", label: "90d" },
                            { id: "all", label: "All Time" },
                        ].map((opt) => {
                            const active = timeRange === opt.id;
                            return (
                                <TouchableOpacity
                                    key={opt.id}
                                    onPress={() => setTimeRange(opt.id)}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 999,
                                        backgroundColor: active
                                            ? "#22d3ee"
                                            : "rgba(15,23,42,0.8)",
                                        marginRight: 8,
                                        borderWidth: 1,
                                        borderColor: active
                                            ? "#06b6d4"
                                            : "rgba(148,163,184,0.4)",
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: active ? "#0f172a" : "#e5e7eb",
                                            fontWeight: "600",
                                            fontSize: 13,
                                        }}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* GROUP BY */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 16 }}
                    >
                        <Text
                            style={{
                                color: "rgba(148,163,184,0.9)",
                                marginRight: 8,
                                alignSelf: "center",
                                fontSize: 13,
                            }}
                        >
                            Group by:
                        </Text>
                        {[
                            { id: "day", label: "Day" },
                            { id: "week", label: "Week" },
                            { id: "month", label: "Month" },
                        ].map((opt) => {
                            const active = groupBy === opt.id;
                            return (
                                <TouchableOpacity
                                    key={opt.id}
                                    onPress={() => setGroupBy(opt.id)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 999,
                                        marginRight: 8,
                                        borderWidth: 1,
                                        borderColor: active
                                            ? "rgba(56,189,248,0.9)"
                                            : "rgba(148,163,184,0.3)",
                                        backgroundColor: active
                                            ? "rgba(8,47,73,0.8)"
                                            : "transparent",
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: active
                                                ? "#38bdf8"
                                                : "#e5e7eb",
                                            fontSize: 13,
                                            fontWeight: "600",
                                        }}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* SUMMARY CARDS */}
                    <View
                        style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            marginBottom: 16,
                        }}
                    >
                        <GradientCard
                            colors={["#0f172a", "#22c55e"]}
                            style={{
                                padding: 14,
                                minWidth: (width - 48) / 2,
                                marginRight: 8,
                                marginBottom: 8,
                            }}
                        >
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 11,
                                }}
                            >
                                Total Coins
                            </Text>
                            <Text
                                style={{
                                    color: "#fbbf24",
                                    fontSize: 22,
                                    fontWeight: "bold",
                                    marginTop: 4,
                                }}
                            >
                                💰 {formatNumber(summary?.totalCoins || 0)}
                            </Text>
                        </GradientCard>

                        <GradientCard
                            colors={["#0f172a", "#38bdf8"]}
                            style={{
                                padding: 14,
                                minWidth: (width - 48) / 2,
                                marginBottom: 8,
                            }}
                        >
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 11,
                                }}
                            >
                                Unique Senders
                            </Text>
                            <Text
                                style={{
                                    color: "#e5e7eb",
                                    fontSize: 22,
                                    fontWeight: "bold",
                                    marginTop: 4,
                                }}
                            >
                                {summary?.totalSenders || 0}
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 11,
                                    marginTop: 4,
                                }}
                            >
                                Receivers: {summary?.totalReceivers || 0}
                            </Text>
                        </GradientCard>

                        {summary?.topStreamer && (
                            <GradientCard
                                colors={["#0f172a", "#6366f1"]}
                                style={{
                                    padding: 14,
                                    minWidth: (width - 48) / 2,
                                    marginRight: 8,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "rgba(148,163,184,0.9)",
                                        fontSize: 11,
                                    }}
                                >
                                    Top Streamer
                                </Text>
                                <Text
                                    style={{
                                        color: "#e5e7eb",
                                        fontSize: 16,
                                        fontWeight: "bold",
                                        marginTop: 4,
                                    }}
                                    numberOfLines={1}
                                >
                                    {summary.topStreamer.username}
                                </Text>
                                <Text
                                    style={{
                                        color: "#fbbf24",
                                        fontSize: 14,
                                        fontWeight: "600",
                                        marginTop: 4,
                                    }}
                                >
                                    💰 {formatNumber(summary.topStreamer.coins)}
                                </Text>
                            </GradientCard>
                        )}

                        {summary?.topSender && (
                            <GradientCard
                                colors={["#0f172a", "#ec4899"]}
                                style={{
                                    padding: 14,
                                    minWidth: (width - 48) / 2,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "rgba(148,163,184,0.9)",
                                        fontSize: 11,
                                    }}
                                >
                                    Top Sender
                                </Text>
                                <Text
                                    style={{
                                        color: "#e5e7eb",
                                        fontSize: 16,
                                        fontWeight: "bold",
                                        marginTop: 4,
                                    }}
                                    numberOfLines={1}
                                >
                                    {summary.topSender.username}
                                </Text>
                                <Text
                                    style={{
                                        color: "#fbbf24",
                                        fontSize: 14,
                                        fontWeight: "600",
                                        marginTop: 4,
                                    }}
                                >
                                    💰 {formatNumber(summary.topSender.coins)}
                                </Text>
                            </GradientCard>
                        )}
                    </View>

                    {/* TIMELINE */}
                    <GradientCard
                        colors={["#020617", "#0ea5e9"]}
                        style={{
                            padding: 14,
                            marginBottom: 16,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 4,
                            }}
                        >
                            <Text
                                style={{
                                    color: "#e5e7eb",
                                    fontSize: 15,
                                    fontWeight: "bold",
                                }}
                            >
                                Coin Timeline
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 11,
                                }}
                            >
                                {timeline.length} points • {groupLabel}
                            </Text>
                        </View>
                        {timeline.length === 0 ? (
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.8)",
                                    fontSize: 12,
                                    marginTop: 6,
                                }}
                            >
                                No data for this range.
                            </Text>
                        ) : (
                            <MiniBarChart
                                data={timeline.map((t) => ({
                                    coins: t.coins,
                                    label:
                                        t.label ||
                                        (t.date ? t.date.slice(5) : ""),
                                }))}
                                height={90}
                                color="#22d3ee"
                            />
                        )}
                    </GradientCard>

                    {/* TOP STREAMERS */}
                    <GradientCard
                        colors={["#020617", "#4f46e5"]}
                        style={{
                            padding: 14,
                            marginBottom: 16,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 4,
                            }}
                        >
                            <Text
                                style={{
                                    color: "#e5e7eb",
                                    fontSize: 15,
                                    fontWeight: "bold",
                                }}
                            >
                                Top Streamers
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 11,
                                }}
                            >
                                {topStreamers.length} creators
                            </Text>
                        </View>

                        {topStreamers.length === 0 ? (
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.8)",
                                    fontSize: 12,
                                    marginTop: 6,
                                }}
                            >
                                No streamer coin data for this range.
                            </Text>
                        ) : (
                            topStreamers.slice(0, 10).map((s, idx) => (
                                <TopUserRow
                                    key={s.userId || s.username || idx}
                                    rank={idx + 1}
                                    username={s.username}
                                    coins={s.coins}
                                    extra={
                                        s.streams || s.followers
                                            ? [
                                                s.streams
                                                    ? `${s.streams} streams`
                                                    : null,
                                                s.followers
                                                    ? `${formatNumber(
                                                        s.followers
                                                    )} followers`
                                                    : null,
                                            ]
                                                .filter(Boolean)
                                                .join(" • ")
                                            : undefined
                                    }
                                />
                            ))
                        )}
                    </GradientCard>

                    {/* TOP SENDERS */}
                    <GradientCard
                        colors={["#020617", "#ec4899"]}
                        style={{
                            padding: 14,
                            marginBottom: 40,
                        }}
                    >
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 4,
                            }}
                        >
                            <Text
                                style={{
                                    color: "#e5e7eb",
                                    fontSize: 15,
                                    fontWeight: "bold",
                                }}
                            >
                                Top Senders (Whales)
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 11,
                                }}
                            >
                                {topSenders.length} users
                            </Text>
                        </View>

                        {topSenders.length === 0 ? (
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.8)",
                                    fontSize: 12,
                                    marginTop: 6,
                                }}
                            >
                                No sender coin data for this range.
                            </Text>
                        ) : (
                            topSenders.slice(0, 10).map((s, idx) => (
                                <TopUserRow
                                    key={s.userId || s.username || idx}
                                    rank={idx + 1}
                                    username={s.username}
                                    coins={s.coins}
                                    extra={
                                        s.gifts
                                            ? `${s.gifts} gifts sent`
                                            : undefined
                                    }
                                />
                            ))
                        )}
                    </GradientCard>
                </View>
            </ScrollView>
        </View>
    );
}
