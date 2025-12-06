// screens/AdminStreamerDetailScreen.jsx – WORLD STUDIO LIVE • STREAMER DETAIL ULTIMATE EDITION ⭐
import React, { useEffect, useState, useCallback } from "react";
import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    RefreshControl,
    Dimensions,
    StatusBar,
    Image,
    TextInput,
    Alert,
    Share,
} from "react-native";
import axios from "axios";

const { width } = Dimensions.get("window");
const API_BASE_URL = "https://world-studio-production.up.railway.app";

// Simple gradient-style card
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

// Very simple mini bar chart (no library)
const MiniBarChart = ({ data = [], color = "#22d3ee", height = 40 }) => {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data, 1);

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "flex-end",
                height,
                gap: 2,
                marginTop: 6,
            }}
        >
            {data.slice(-10).map((v, i) => (
                <View
                    key={i}
                    style={{
                        flex: 1,
                        height: Math.max((v / max) * height, 2),
                        borderRadius: 3,
                        backgroundColor: color + "80",
                    }}
                />
            ))}
        </View>
    );
};

const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
};

const formatMoney = (num) => `€${formatNumber(num || 0)}`;
const formatMinutes = (mins) => {
    if (!mins) return "0m";
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// Tab button component
const TabButton = ({ label, active, onPress }) => (
    <TouchableOpacity
        onPress={onPress}
        style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 999,
            marginRight: 8,
            backgroundColor: active ? "#22d3ee" : "rgba(15,23,42,0.9)",
            borderWidth: 1,
            borderColor: active ? "#06b6d4" : "rgba(148,163,184,0.4)",
        }}
    >
        <Text
            style={{
                color: active ? "#020617" : "#e5e7eb",
                fontWeight: "600",
                fontSize: 13,
            }}
        >
            {label}
        </Text>
    </TouchableOpacity>
);

export default function AdminStreamerDetailScreen({ token, route, navigation }) {
    const streamerId = route?.params?.streamerId;
    const initialName = route?.params?.username;

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [tab, setTab] = useState("overview"); // overview | earnings | payouts | moderation

    const [user, setUser] = useState(null);
    const [totals, setTotals] = useState({
        totalEarnings: 0,
        totalCoins: 0,
        totalStreams: 0,
        totalWatchMinutes: 0,
        followers: 0,
        avgViewers: 0,
        strikes: 0,
    });
    const [charts, setCharts] = useState({
        earnings7d: [],
        viewers7d: [],
    });
    const [recentStreams, setRecentStreams] = useState([]);
    const [payouts, setPayouts] = useState([]);
    const [earningsEvents, setEarningsEvents] = useState([]);

    // moderation
    const [modMessage, setModMessage] = useState("");
    const [modLoading, setModLoading] = useState(false);

    const api = axios.create({
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${token}` },
    });

    const fetchData = useCallback(async () => {
        if (!streamerId) return;
        setError("");
        try {
            if (!refreshing) setLoading(true);

            const res = await api.get(`/api/admin/users/${streamerId}/overview`);

            const data = res.data || {};

            setUser(data.user || null);
            setTotals(data.totals || {});
            setCharts(data.charts || { earnings7d: [], viewers7d: [] });
            setRecentStreams(data.recentStreams || []);
            setPayouts(data.payouts || []);
            setEarningsEvents(data.earningsEvents || []);
        } catch (err) {
            console.error("Streamer overview error:", err);
            setError("Failed to load streamer data");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [api, streamerId, refreshing]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const displayName =
        user?.username || initialName || "Streamer";

    const handleShareSummary = async () => {
        try {
            const summary = {
                id: user?._id,
                username: user?.username,
                email: user?.email,
                totals,
                charts,
            };
            await Share.share({
                message: JSON.stringify(summary, null, 2),
                title: `Streamer Summary – ${displayName}`,
            });
        } catch (err) {
            console.error("Share error:", err);
        }
    };

    const sendModerationAction = async (type) => {
        if (!streamerId) return;
        setModLoading(true);

        try {
            if (type === "warn") {
                if (!modMessage.trim()) {
                    Alert.alert(
                        "Message required",
                        "Please enter a warning message."
                    );
                    setModLoading(false);
                    return;
                }
                await api.post(`/api/admin/users/${streamerId}/warn`, {
                    message: modMessage.trim(),
                });
                Alert.alert("Sent", "Warning has been sent.");
            } else if (type === "ban") {
                Alert.alert(
                    "Ban user",
                    `Ban ${displayName} from streaming?`,
                    [
                        { text: "Cancel", style: "cancel", onPress: () => setModLoading(false) },
                        {
                            text: "Ban user",
                            style: "destructive",
                            onPress: async () => {
                                try {
                                    await api.post(`/api/admin/users/${streamerId}/ban`, {
                                        reason: modMessage.trim() || undefined,
                                    });
                                    Alert.alert("Done", "User has been banned.");
                                    fetchData();
                                } catch (err2) {
                                    Alert.alert("Error", "Failed to ban user");
                                } finally {
                                    setModLoading(false);
                                }
                            },
                        },
                    ]
                );
                return;
            } else if (type === "unban") {
                await api.post(`/api/admin/users/${streamerId}/unban`);
                Alert.alert("Done", "User has been unbanned.");
                fetchData();
            }

            setModMessage("");
            fetchData();
        } catch (err) {
            console.error("Moderation error:", err);
            Alert.alert("Error", "Failed to perform moderation action");
        } finally {
            if (type !== "ban") setModLoading(false);
        }
    };

    if (loading && !user) {
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
                        marginTop: 16,
                        color: "rgba(226,232,240,0.8)",
                    }}
                >
                    Loading streamer dashboard...
                </Text>
            </View>
        );
    }

    const isBanned = !!user?.isBanned;

    // TABS
    const tabs = [
        { id: "overview", label: "Overview" },
        { id: "earnings", label: "Earnings" },
        { id: "payouts", label: "Payouts" },
        { id: "moderation", label: "Moderation" },
    ];

    return (
        <View style={{ flex: 1, backgroundColor: "#020617" }}>
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
                {/* HEADER */}
                <View
                    style={{
                        paddingTop: 56,
                        paddingHorizontal: 16,
                        paddingBottom: 18,
                        borderBottomWidth: 1,
                        borderBottomColor: "rgba(30,64,175,0.7)",
                        backgroundColor: "rgba(15,23,42,0.98)",
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 12,
                        }}
                    >
                        <TouchableOpacity
                            onPress={() => navigation?.goBack?.()}
                            style={{
                                marginRight: 12,
                                padding: 8,
                                borderRadius: 999,
                                backgroundColor: "rgba(15,23,42,0.9)",
                                borderWidth: 1,
                                borderColor: "rgba(148,163,184,0.4)",
                            }}
                        >
                            <Text
                                style={{
                                    color: "#e5e7eb",
                                    fontSize: 16,
                                }}
                            >
                                ←
                            </Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                            <Image
                                source={{
                                    uri:
                                        user?.avatar ||
                                        "https://ui-avatars.com/api/?background=0D1117&color=fff&name=" +
                                        encodeURIComponent(displayName),
                                }}
                                style={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: 24,
                                    marginRight: 12,
                                    borderWidth: 2,
                                    borderColor: isBanned
                                        ? "#ef4444"
                                        : "rgba(56,189,248,0.8)",
                                }}
                            />
                            <View style={{ flex: 1 }}>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#e5e7eb",
                                            fontSize: 18,
                                            fontWeight: "800",
                                            marginRight: 6,
                                        }}
                                        numberOfLines={1}
                                    >
                                        {displayName}
                                    </Text>
                                    {user?.isPartner && (
                                        <Text
                                            style={{
                                                fontSize: 13,
                                                marginRight: 4,
                                            }}
                                        >
                                            💎
                                        </Text>
                                    )}
                                </View>
                                <Text
                                    style={{
                                        color: "rgba(148,163,184,0.9)",
                                        fontSize: 12,
                                    }}
                                    numberOfLines={1}
                                >
                                    {user?.email || "No email"}{" "}
                                    {user?.country ? `• ${user.country}` : ""}
                                </Text>

                                <View
                                    style={{
                                        flexDirection: "row",
                                        marginTop: 4,
                                        flexWrap: "wrap",
                                    }}
                                >
                                    <View
                                        style={{
                                            paddingHorizontal: 8,
                                            paddingVertical: 2,
                                            borderRadius: 999,
                                            backgroundColor:
                                                "rgba(56,189,248,0.15)",
                                            marginRight: 6,
                                            marginBottom: 4,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: "#38bdf8",
                                                fontSize: 11,
                                                fontWeight: "600",
                                            }}
                                        >
                                            Followers:{" "}
                                            {formatNumber(
                                                totals.followers || 0
                                            )}
                                        </Text>
                                    </View>
                                    <View
                                        style={{
                                            paddingHorizontal: 8,
                                            paddingVertical: 2,
                                            borderRadius: 999,
                                            backgroundColor:
                                                "rgba(251,191,36,0.15)",
                                            marginRight: 6,
                                            marginBottom: 4,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: "#fbbf24",
                                                fontSize: 11,
                                                fontWeight: "600",
                                            }}
                                        >
                                            Streams:{" "}
                                            {formatNumber(
                                                totals.totalStreams || 0
                                            )}
                                        </Text>
                                    </View>
                                    {isBanned && (
                                        <View
                                            style={{
                                                paddingHorizontal: 8,
                                                paddingVertical: 2,
                                                borderRadius: 999,
                                                backgroundColor:
                                                    "rgba(248,113,113,0.2)",
                                                marginRight: 6,
                                                marginBottom: 4,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color: "#fecaca",
                                                    fontSize: 11,
                                                    fontWeight: "700",
                                                }}
                                            >
                                                BANNED
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleShareSummary}
                            style={{
                                paddingHorizontal: 12,
                                paddingVertical: 8,
                                borderRadius: 999,
                                marginLeft: 8,
                                backgroundColor: "rgba(15,118,110,0.6)",
                                borderWidth: 1,
                                borderColor: "rgba(34,197,94,0.7)",
                            }}
                        >
                            <Text
                                style={{
                                    color: "#bbf7d0",
                                    fontWeight: "600",
                                    fontSize: 13,
                                }}
                            >
                                📤
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {error ? (
                        <Text
                            style={{
                                color: "#f97373",
                                fontSize: 12,
                            }}
                        >
                            {error}
                        </Text>
                    ) : null}
                </View>

                {/* CONTENT */}
                <View style={{ padding: 16 }}>
                    {/* TOP STATS */}
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
                                Total Earnings
                            </Text>
                            <Text
                                style={{
                                    color: "#bbf7d0",
                                    fontSize: 21,
                                    fontWeight: "800",
                                    marginTop: 4,
                                }}
                            >
                                {formatMoney(totals.totalEarnings)}
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 11,
                                    marginTop: 4,
                                }}
                            >
                                Coins: {formatNumber(totals.totalCoins || 0)}
                            </Text>
                        </GradientCard>

                        <GradientCard
                            colors={["#020617", "#38bdf8"]}
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
                                Watch Time
                            </Text>
                            <Text
                                style={{
                                    color: "#e0f2fe",
                                    fontSize: 21,
                                    fontWeight: "800",
                                    marginTop: 4,
                                }}
                            >
                                {formatMinutes(
                                    totals.totalWatchMinutes || 0
                                )}
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 11,
                                    marginTop: 4,
                                }}
                            >
                                Avg Viewers:{" "}
                                {formatNumber(totals.avgViewers || 0)}
                            </Text>
                        </GradientCard>

                        <GradientCard
                            colors={["#020617", "#fbbf24"]}
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
                                Completed Payouts
                            </Text>
                            <Text
                                style={{
                                    color: "#facc15",
                                    fontSize: 21,
                                    fontWeight: "800",
                                    marginTop: 4,
                                }}
                            >
                                {formatMoney(totals.completedPayoutAmount || 0)}
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 11,
                                    marginTop: 4,
                                }}
                            >
                                {totals.completedPayoutCount || 0} payouts
                            </Text>
                        </GradientCard>

                        <GradientCard
                            colors={["#020617", "#ef4444"]}
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
                                Strikes / Reports
                            </Text>
                            <Text
                                style={{
                                    color: "#fecaca",
                                    fontSize: 21,
                                    fontWeight: "800",
                                    marginTop: 4,
                                }}
                            >
                                {totals.strikes || 0}
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(248,250,252,0.7)",
                                    fontSize: 11,
                                    marginTop: 4,
                                }}
                            >
                                Higher = needs attention
                            </Text>
                        </GradientCard>
                    </View>

                    {/* TABS */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 14 }}
                    >
                        {tabs.map((t) => (
                            <TabButton
                                key={t.id}
                                label={t.label}
                                active={tab === t.id}
                                onPress={() => setTab(t.id)}
                            />
                        ))}
                    </ScrollView>

                    {/* TAB CONTENTS */}
                    {tab === "overview" && (
                        <View>
                            {/* Charts */}
                            <GradientCard
                                colors={["#020617", "#22c55e"]}
                                style={{
                                    padding: 14,
                                    marginBottom: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "rgba(148,163,184,0.9)",
                                        fontSize: 11,
                                    }}
                                >
                                    Earnings – last 7 days
                                </Text>
                                <Text
                                    style={{
                                        color: "#bbf7d0",
                                        fontSize: 13,
                                        marginTop: 4,
                                    }}
                                >
                                    Peak day:{" "}
                                    {formatMoney(
                                        Math.max(
                                            ...charts.earnings7d,
                                            0
                                        )
                                    )}
                                </Text>
                                <MiniBarChart
                                    data={charts.earnings7d || []}
                                    color="#22c55e"
                                    height={50}
                                />
                            </GradientCard>

                            <GradientCard
                                colors={["#020617", "#38bdf8"]}
                                style={{
                                    padding: 14,
                                    marginBottom: 16,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "rgba(148,163,184,0.9)",
                                        fontSize: 11,
                                    }}
                                >
                                    Viewers – last 7 days
                                </Text>
                                <Text
                                    style={{
                                        color: "#e0f2fe",
                                        fontSize: 13,
                                        marginTop: 4,
                                    }}
                                >
                                    Peak viewers:{" "}
                                    {formatNumber(
                                        Math.max(
                                            ...charts.viewers7d,
                                            0
                                        )
                                    )}
                                </Text>
                                <MiniBarChart
                                    data={charts.viewers7d || []}
                                    color="#38bdf8"
                                    height={50}
                                />
                            </GradientCard>

                            {/* Recent Streams */}
                            <Text
                                style={{
                                    color: "#e5e7eb",
                                    fontSize: 16,
                                    fontWeight: "700",
                                    marginBottom: 8,
                                }}
                            >
                                Recent Streams
                            </Text>
                            {recentStreams.length === 0 ? (
                                <View
                                    style={{
                                        backgroundColor:
                                            "rgba(15,23,42,0.95)",
                                        borderRadius: 14,
                                        borderWidth: 1,
                                        borderColor:
                                            "rgba(148,163,184,0.35)",
                                        padding: 18,
                                        alignItems: "center",
                                        marginBottom: 24,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 40,
                                            marginBottom: 8,
                                        }}
                                    >
                                        📺
                                    </Text>
                                    <Text
                                        style={{
                                            color: "#e5e7eb",
                                            fontSize: 14,
                                            fontWeight: "600",
                                        }}
                                    >
                                        No recent streams
                                    </Text>
                                    <Text
                                        style={{
                                            color: "rgba(148,163,184,0.9)",
                                            fontSize: 12,
                                            marginTop: 4,
                                            textAlign: "center",
                                        }}
                                    >
                                        Once they go live, their latest streams
                                        will appear here.
                                    </Text>
                                </View>
                            ) : (
                                recentStreams.map((s) => (
                                    <View
                                        key={s._id}
                                        style={{
                                            backgroundColor:
                                                "rgba(15,23,42,0.92)",
                                            borderRadius: 14,
                                            borderWidth: 1,
                                            borderColor:
                                                "rgba(148,163,184,0.35)",
                                            padding: 12,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                justifyContent:
                                                    "space-between",
                                                alignItems: "center",
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={{
                                                        color: "#e5e7eb",
                                                        fontSize: 14,
                                                        fontWeight: "600",
                                                    }}
                                                    numberOfLines={1}
                                                >
                                                    {s.title ||
                                                        "Untitled stream"}
                                                </Text>
                                                <Text
                                                    style={{
                                                        color: "rgba(148,163,184,0.9)",
                                                        fontSize: 11,
                                                        marginTop: 2,
                                                    }}
                                                    numberOfLines={1}
                                                >
                                                    {s.category ||
                                                        "General"}{" "}
                                                    •{" "}
                                                    {s.startedAt
                                                        ? new Date(
                                                            s.startedAt
                                                        ).toLocaleString()
                                                        : "N/A"}
                                                </Text>
                                            </View>
                                            <View
                                                style={{
                                                    alignItems: "flex-end",
                                                    marginLeft: 8,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: "#fbbf24",
                                                        fontSize: 13,
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    {formatMoney(
                                                        s.earnings || 0
                                                    )}
                                                </Text>
                                                <Text
                                                    style={{
                                                        color: "rgba(148,163,184,0.9)",
                                                        fontSize: 11,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    👁{" "}
                                                    {formatNumber(
                                                        s.peakViewers || 0
                                                    )}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                    {tab === "earnings" && (
                        <View>
                            <Text
                                style={{
                                    color: "#e5e7eb",
                                    fontSize: 16,
                                    fontWeight: "700",
                                    marginBottom: 8,
                                }}
                            >
                                Earnings Events
                            </Text>

                            {earningsEvents.length === 0 ? (
                                <View
                                    style={{
                                        backgroundColor:
                                            "rgba(15,23,42,0.95)",
                                        borderRadius: 14,
                                        borderWidth: 1,
                                        borderColor:
                                            "rgba(148,163,184,0.35)",
                                        padding: 22,
                                        alignItems: "center",
                                        marginBottom: 26,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 40,
                                            marginBottom: 6,
                                        }}
                                    >
                                        🎁
                                    </Text>
                                    <Text
                                        style={{
                                            color: "#e5e7eb",
                                            fontSize: 14,
                                            fontWeight: "600",
                                        }}
                                    >
                                        No gift history yet
                                    </Text>
                                    <Text
                                        style={{
                                            color: "rgba(148,163,184,0.9)",
                                            fontSize: 12,
                                            marginTop: 4,
                                            textAlign: "center",
                                        }}
                                    >
                                        As viewers send gifts, they will appear
                                        here with full history.
                                    </Text>
                                </View>
                            ) : (
                                earningsEvents.map((e) => (
                                    <View
                                        key={e._id}
                                        style={{
                                            backgroundColor:
                                                "rgba(15,23,42,0.95)",
                                            borderRadius: 14,
                                            borderWidth: 1,
                                            borderColor:
                                                "rgba(148,163,184,0.35)",
                                            padding: 12,
                                            marginBottom: 6,
                                        }}
                                    >
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                justifyContent:
                                                    "space-between",
                                            }}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    style={{
                                                        color: "#e5e7eb",
                                                        fontSize: 13,
                                                        fontWeight: "600",
                                                    }}
                                                >
                                                    {e.type === "gift"
                                                        ? `${e.giftName || "Gift"} from ${e.fromUsername ||
                                                        "Viewer"
                                                        }`
                                                        : e.description ||
                                                        e.type ||
                                                        "Earning"}
                                                </Text>
                                                <Text
                                                    style={{
                                                        color: "rgba(148,163,184,0.9)",
                                                        fontSize: 11,
                                                        marginTop: 2,
                                                    }}
                                                    numberOfLines={1}
                                                >
                                                    {e.streamTitle
                                                        ? `Stream: ${e.streamTitle}`
                                                        : ""}
                                                </Text>
                                            </View>
                                            <View
                                                style={{
                                                    alignItems: "flex-end",
                                                    marginLeft: 8,
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: "#fbbf24",
                                                        fontSize: 14,
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    {formatMoney(
                                                        e.amount || 0
                                                    )}
                                                </Text>
                                                {e.coins ? (
                                                    <Text
                                                        style={{
                                                            color: "rgba(148,163,184,0.9)",
                                                            fontSize: 11,
                                                            marginTop: 2,
                                                        }}
                                                    >
                                                        {formatNumber(
                                                            e.coins
                                                        )}{" "}
                                                        coins
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </View>
                                        <Text
                                            style={{
                                                color: "rgba(148,163,184,0.9)",
                                                fontSize: 11,
                                                marginTop: 4,
                                            }}
                                        >
                                            {e.createdAt
                                                ? new Date(
                                                    e.createdAt
                                                ).toLocaleString()
                                                : ""}
                                        </Text>
                                    </View>
                                ))
                            )}
                            <View style={{ height: 32 }} />
                        </View>
                    )}

                    {tab === "payouts" && (
                        <View>
                            <Text
                                style={{
                                    color: "#e5e7eb",
                                    fontSize: 16,
                                    fontWeight: "700",
                                    marginBottom: 8,
                                }}
                            >
                                Payout History
                            </Text>

                            {payouts.length === 0 ? (
                                <View
                                    style={{
                                        backgroundColor:
                                            "rgba(15,23,42,0.95)",
                                        borderRadius: 14,
                                        borderWidth: 1,
                                        borderColor:
                                            "rgba(148,163,184,0.35)",
                                        padding: 26,
                                        alignItems: "center",
                                        marginBottom: 30,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: 42,
                                            marginBottom: 6,
                                        }}
                                    >
                                        💶
                                    </Text>
                                    <Text
                                        style={{
                                            color: "#e5e7eb",
                                            fontSize: 14,
                                            fontWeight: "600",
                                        }}
                                    >
                                        No payouts yet
                                    </Text>
                                    <Text
                                        style={{
                                            color: "rgba(148,163,184,0.9)",
                                            fontSize: 12,
                                            marginTop: 4,
                                            textAlign: "center",
                                        }}
                                    >
                                        Once this creator requests withdrawals,
                                        you'll see all payouts here.
                                    </Text>
                                </View>
                            ) : (
                                payouts.map((p) => {
                                    const createdAt = p.createdAt
                                        ? new Date(p.createdAt)
                                        : null;
                                    const completedAt = p.completedAt
                                        ? new Date(p.completedAt)
                                        : null;
                                    const status = p.status || "pending";
                                    let statusColor = "#e5e7eb";
                                    if (status === "completed")
                                        statusColor = "#4ade80";
                                    else if (status === "failed")
                                        statusColor = "#f97373";
                                    else if (status === "processing")
                                        statusColor = "#38bdf8";
                                    else if (status === "pending")
                                        statusColor = "#facc15";

                                    return (
                                        <View
                                            key={p._id}
                                            style={{
                                                backgroundColor:
                                                    "rgba(15,23,42,0.95)",
                                                borderRadius: 14,
                                                borderWidth: 1,
                                                borderColor:
                                                    "rgba(148,163,184,0.35)",
                                                padding: 12,
                                                marginBottom: 8,
                                            }}
                                        >
                                            <View
                                                style={{
                                                    flexDirection: "row",
                                                    justifyContent:
                                                        "space-between",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: "#fbbf24",
                                                        fontSize: 16,
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    {formatMoney(p.amount)}
                                                </Text>
                                                <Text
                                                    style={{
                                                        color: statusColor,
                                                        fontSize: 12,
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    {status.toUpperCase()}
                                                </Text>
                                            </View>
                                            <Text
                                                style={{
                                                    color: "rgba(148,163,184,0.9)",
                                                    fontSize: 11,
                                                    marginTop: 4,
                                                }}
                                            >
                                                Method: {p.method || "Bank"}{" "}
                                                • Requested:{" "}
                                                {createdAt
                                                    ? createdAt.toLocaleString()
                                                    : "N/A"}
                                            </Text>
                                            {completedAt && (
                                                <Text
                                                    style={{
                                                        color: "rgba(148,163,184,0.9)",
                                                        fontSize: 11,
                                                        marginTop: 2,
                                                    }}
                                                >
                                                    Completed:{" "}
                                                    {completedAt.toLocaleString()}
                                                </Text>
                                            )}
                                            {p.adminNote && (
                                                <Text
                                                    style={{
                                                        color: "rgba(248,250,252,0.8)",
                                                        fontSize: 12,
                                                        marginTop: 6,
                                                    }}
                                                >
                                                    Admin: {p.adminNote}
                                                </Text>
                                            )}
                                        </View>
                                    );
                                })
                            )}
                            <View style={{ height: 32 }} />
                        </View>
                    )}

                    {tab === "moderation" && (
                        <View>
                            <Text
                                style={{
                                    color: "#e5e7eb",
                                    fontSize: 16,
                                    fontWeight: "700",
                                    marginBottom: 10,
                                }}
                            >
                                Moderation Center
                            </Text>

                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(15,23,42,0.95)",
                                    borderRadius: 16,
                                    borderWidth: 1,
                                    borderColor:
                                        "rgba(148,163,184,0.35)",
                                    padding: 14,
                                    marginBottom: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "rgba(148,163,184,0.95)",
                                        fontSize: 12,
                                        marginBottom: 6,
                                    }}
                                >
                                    Message (optional, used for warnings and
                                    ban reason)
                                </Text>
                                <TextInput
                                    value={modMessage}
                                    onChangeText={setModMessage}
                                    placeholder="Type a warning / reason..."
                                    placeholderTextColor="rgba(148,163,184,0.7)"
                                    multiline
                                    style={{
                                        minHeight: 70,
                                        maxHeight: 140,
                                        borderRadius: 12,
                                        borderWidth: 1,
                                        borderColor:
                                            "rgba(148,163,184,0.7)",
                                        paddingHorizontal: 10,
                                        paddingVertical: 8,
                                        color: "#f9fafb",
                                        textAlignVertical: "top",
                                    }}
                                />
                            </View>

                            <View
                                style={{
                                    flexDirection: "row",
                                    flexWrap: "wrap",
                                    gap: 10,
                                    marginBottom: 28,
                                }}
                            >
                                <TouchableOpacity
                                    disabled={modLoading}
                                    onPress={() => sendModerationAction("warn")}
                                    style={{
                                        flex: 1,
                                        backgroundColor:
                                            "rgba(251,191,36,0.2)",
                                        paddingVertical: 12,
                                        borderRadius: 999,
                                        borderWidth: 1,
                                        borderColor:
                                            "rgba(251,191,36,0.8)",
                                        alignItems: "center",
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#facc15",
                                            fontWeight: "700",
                                            fontSize: 13,
                                        }}
                                    >
                                        ⚠ Send Warning
                                    </Text>
                                </TouchableOpacity>

                                {!isBanned ? (
                                    <TouchableOpacity
                                        disabled={modLoading}
                                        onPress={() =>
                                            sendModerationAction("ban")
                                        }
                                        style={{
                                            flex: 1,
                                            backgroundColor:
                                                "rgba(248,113,113,0.24)",
                                            paddingVertical: 12,
                                            borderRadius: 999,
                                            borderWidth: 1,
                                            borderColor:
                                                "rgba(248,113,113,0.9)",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: "#fecaca",
                                                fontWeight: "700",
                                                fontSize: 13,
                                            }}
                                        >
                                            ⛔ Ban from Streaming
                                        </Text>
                                    </TouchableOpacity>
                                ) : (
                                    <TouchableOpacity
                                        disabled={modLoading}
                                        onPress={() =>
                                            sendModerationAction("unban")
                                        }
                                        style={{
                                            flex: 1,
                                            backgroundColor:
                                                "rgba(34,197,94,0.2)",
                                            paddingVertical: 12,
                                            borderRadius: 999,
                                            borderWidth: 1,
                                            borderColor:
                                                "rgba(34,197,94,0.9)",
                                            alignItems: "center",
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: "#bbf7d0",
                                                fontWeight: "700",
                                                fontSize: 13,
                                            }}
                                        >
                                            ✅ Unban User
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(15,23,42,0.9)",
                                    borderRadius: 14,
                                    borderWidth: 1,
                                    borderColor:
                                        "rgba(148,163,184,0.35)",
                                    padding: 14,
                                    marginBottom: 40,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "rgba(248,250,252,0.8)",
                                        fontSize: 13,
                                        marginBottom: 6,
                                        fontWeight: "600",
                                    }}
                                >
                                    Notes
                                </Text>
                                <Text
                                    style={{
                                        color: "rgba(148,163,184,0.9)",
                                        fontSize: 12,
                                    }}
                                >
                                    • Warnings should include clear reasons and
                                    next steps.{"\n"}
                                    • Ban is recommended only for repeated or
                                    severe violations.{"\n"}
                                    • All moderation actions should follow your
                                    platform policy.
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
