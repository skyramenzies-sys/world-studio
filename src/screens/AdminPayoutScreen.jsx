// screens/AdminPayoutScreen.jsx – WORLD STUDIO LIVE • PAYOUT ULTIMATE EDITION 💶🚀
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
    Alert,
    Modal,
    TextInput,
    Share,
} from "react-native";
import axios from "axios";

const { width } = Dimensions.get("window");
const API_BASE_URL = "https://world-studio-production.up.railway.app";

// Simple gradient-style card (no external deps)
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

// Number formatter
const formatNumber = (num) => {
    if (!num) return "0";
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toLocaleString();
};

// Money formatter (simple, USD/EUR neutral)
const formatMoney = (num) => `€${formatNumber(num || 0)}`;

// Payout status badge
const StatusBadge = ({ status }) => {
    let colorBg = "rgba(148,163,184,0.2)";
    let colorText = "#e5e7eb";
    let label = status || "unknown";

    switch (status) {
        case "pending":
            colorBg = "rgba(251,191,36,0.18)";
            colorText = "#facc15";
            label = "Pending";
            break;
        case "processing":
            colorBg = "rgba(56,189,248,0.18)";
            colorText = "#38bdf8";
            label = "Processing";
            break;
        case "completed":
            colorBg = "rgba(34,197,94,0.22)";
            colorText = "#4ade80";
            label = "Completed";
            break;
        case "failed":
            colorBg = "rgba(248,113,113,0.22)";
            colorText = "#f97373";
            label = "Failed";
            break;
        case "cancelled":
            colorBg = "rgba(148,163,184,0.25)";
            colorText = "#9ca3af";
            label = "Cancelled";
            break;
    }

    return (
        <View
            style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: colorBg,
            }}
        >
            <Text
                style={{
                    color: colorText,
                    fontSize: 11,
                    fontWeight: "600",
                }}
            >
                {label}
            </Text>
        </View>
    );
};

// Single payout card
const PayoutCard = ({
    payout,
    onApprove,
    onReject,
    onMarkPaid,
    compact = false,
}) => {
    const createdAt = payout.createdAt
        ? new Date(payout.createdAt)
        : null;
    const requestedAtStr = createdAt
        ? `${createdAt.toLocaleDateString()} • ${createdAt.toLocaleTimeString()}`
        : "N/A";

    const canApprove = payout.status === "pending";
    const canMarkPaid = payout.status === "processing";
    const canReject = payout.status === "pending" || payout.status === "processing";

    return (
        <View
            style={{
                backgroundColor: "rgba(15,23,42,0.9)",
                borderRadius: 16,
                padding: 14,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: "rgba(148,163,184,0.35)",
            }}
        >
            {/* Header row */}
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                }}
            >
                <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text
                        style={{
                            color: "#e5e7eb",
                            fontSize: 15,
                            fontWeight: "700",
                        }}
                        numberOfLines={1}
                    >
                        {payout.user?.username || "Unknown user"}
                    </Text>
                    <Text
                        style={{
                            color: "rgba(148,163,184,0.9)",
                            fontSize: 11,
                            marginTop: 2,
                        }}
                        numberOfLines={1}
                    >
                        {payout.user?.email || "No email"}{" "}
                        {payout.user?.country ? `• ${payout.user.country}` : ""}
                    </Text>
                </View>
                <StatusBadge status={payout.status} />
            </View>

            {/* Amount + method */}
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginVertical: 8,
                }}
            >
                <View>
                    <Text
                        style={{
                            color: "rgba(148,163,184,0.9)",
                            fontSize: 11,
                        }}
                    >
                        Amount
                    </Text>
                    <Text
                        style={{
                            color: "#fbbf24",
                            fontSize: 20,
                            fontWeight: "800",
                            marginTop: 2,
                        }}
                    >
                        {formatMoney(payout.amount)}
                    </Text>
                    {payout.coins && (
                        <Text
                            style={{
                                color: "rgba(148,163,184,0.9)",
                                fontSize: 11,
                                marginTop: 2,
                            }}
                        >
                            {payout.coins.toLocaleString()} coins
                        </Text>
                    )}
                </View>

                <View style={{ alignItems: "flex-end" }}>
                    <Text
                        style={{
                            color: "rgba(148,163,184,0.9)",
                            fontSize: 11,
                        }}
                    >
                        Method
                    </Text>
                    <Text
                        style={{
                            color: "#e5e7eb",
                            fontSize: 13,
                            fontWeight: "600",
                            marginTop: 2,
                        }}
                    >
                        {payout.method || "Bank Transfer"}
                    </Text>
                    {payout.payoutAccount && (
                        <Text
                            style={{
                                color: "rgba(148,163,184,0.7)",
                                fontSize: 11,
                                marginTop: 2,
                            }}
                            numberOfLines={1}
                        >
                            {payout.payoutAccount}
                        </Text>
                    )}
                </View>
            </View>

            {/* Meta row */}
            {!compact && (
                <View
                    style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 8,
                    }}
                >
                    <View style={{ flex: 1, marginRight: 8 }}>
                        <Text
                            style={{
                                color: "rgba(148,163,184,0.9)",
                                fontSize: 11,
                            }}
                        >
                            Requested
                        </Text>
                        <Text
                            style={{
                                color: "#e5e7eb",
                                fontSize: 12,
                                marginTop: 2,
                            }}
                            numberOfLines={1}
                        >
                            {requestedAtStr}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text
                            style={{
                                color: "rgba(148,163,184,0.9)",
                                fontSize: 11,
                            }}
                        >
                            ID
                        </Text>
                        <Text
                            style={{
                                color: "rgba(226,232,240,0.9)",
                                fontSize: 12,
                                marginTop: 2,
                            }}
                            numberOfLines={1}
                        >
                            {payout._id}
                        </Text>
                    </View>
                </View>
            )}

            {payout.note && (
                <Text
                    style={{
                        color: "rgba(248,250,252,0.85)",
                        fontSize: 12,
                        marginBottom: 8,
                    }}
                    numberOfLines={2}
                >
                    📝 {payout.note}
                </Text>
            )}

            {payout.adminNote && (
                <Text
                    style={{
                        color: "rgba(248,113,113,0.9)",
                        fontSize: 11,
                        marginBottom: 8,
                    }}
                    numberOfLines={2}
                >
                    Admin: {payout.adminNote}
                </Text>
            )}

            {/* Actions */}
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    gap: 8,
                    marginTop: 4,
                }}
            >
                {canReject && (
                    <TouchableOpacity
                        onPress={() => onReject(payout)}
                        style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: "rgba(248,113,113,0.22)",
                        }}
                    >
                        <Text
                            style={{
                                color: "#fecaca",
                                fontSize: 12,
                                fontWeight: "600",
                            }}
                        >
                            ✖ Reject
                        </Text>
                    </TouchableOpacity>
                )}
                {canApprove && (
                    <TouchableOpacity
                        onPress={() => onApprove(payout)}
                        style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: "rgba(56,189,248,0.22)",
                        }}
                    >
                        <Text
                            style={{
                                color: "#bae6fd",
                                fontSize: 12,
                                fontWeight: "600",
                            }}
                        >
                            ✔ Approve
                        </Text>
                    </TouchableOpacity>
                )}
                {canMarkPaid && (
                    <TouchableOpacity
                        onPress={() => onMarkPaid(payout)}
                        style={{
                            paddingHorizontal: 10,
                            paddingVertical: 6,
                            borderRadius: 999,
                            backgroundColor: "rgba(34,197,94,0.25)",
                        }}
                    >
                        <Text
                            style={{
                                color: "#bbf7d0",
                                fontSize: 12,
                                fontWeight: "600",
                            }}
                        >
                            ✅ Mark Paid
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default function AdminPayoutScreen({ token, navigation }) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    const [statusFilter, setStatusFilter] = useState("pending"); // pending | processing | completed | failed | all
    const [payouts, setPayouts] = useState([]);

    const [stats, setStats] = useState({
        pendingAmount: 0,
        pendingCount: 0,
        completedAmount: 0,
        completedCount: 0,
        failedCount: 0,
        todayAmount: 0,
        todayCount: 0,
    });

    const [rejectModalVisible, setRejectModalVisible] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectTarget, setRejectTarget] = useState(null);

    const api = axios.create({
        baseURL: API_BASE_URL,
        headers: { Authorization: `Bearer ${token}` },
    });

    const fetchPayouts = useCallback(async () => {
        setError("");
        try {
            setLoading(true);

            const params =
                statusFilter === "all" ? {} : { status: statusFilter };

            const res = await api.get("/api/admin/payouts", { params });
            const data = Array.isArray(res.data)
                ? res.data
                : res.data?.payouts || [];

            setPayouts(data);

            // Quick stats from list (you can also call a dedicated stats endpoint)
            const now = new Date();
            let pendingAmount = 0;
            let pendingCount = 0;
            let completedAmount = 0;
            let completedCount = 0;
            let failedCount = 0;
            let todayAmount = 0;
            let todayCount = 0;

            data.forEach((p) => {
                const amt = p.amount || 0;
                if (p.status === "pending") {
                    pendingAmount += amt;
                    pendingCount += 1;
                } else if (p.status === "completed") {
                    completedAmount += amt;
                    completedCount += 1;
                } else if (p.status === "failed" || p.status === "cancelled") {
                    failedCount += 1;
                }

                if (p.status === "completed" && p.completedAt) {
                    const d = new Date(p.completedAt);
                    if (
                        d.getFullYear() === now.getFullYear() &&
                        d.getMonth() === now.getMonth() &&
                        d.getDate() === now.getDate()
                    ) {
                        todayAmount += amt;
                        todayCount += 1;
                    }
                }
            });

            setStats({
                pendingAmount,
                pendingCount,
                completedAmount,
                completedCount,
                failedCount,
                todayAmount,
                todayCount,
            });
        } catch (err) {
            console.error("Fetch payouts error:", err);
            setError("Failed to load payouts");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [api, statusFilter]);

    useEffect(() => {
        fetchPayouts();
    }, [fetchPayouts]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchPayouts();
    };

    const handleApprove = (payout) => {
        Alert.alert(
            "Approve Payout",
            `Approve payout of ${formatMoney(payout.amount)} for ${payout.user?.username || "Unknown"
            }?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Approve",
                    style: "default",
                    onPress: async () => {
                        try {
                            await api.post(
                                `/api/admin/payouts/${payout._id}/approve`
                            );
                            fetchPayouts();
                        } catch (err) {
                            Alert.alert(
                                "Error",
                                "Failed to approve payout"
                            );
                        }
                    },
                },
            ]
        );
    };

    const handleMarkPaid = (payout) => {
        Alert.alert(
            "Mark as Paid",
            `Confirm payout of ${formatMoney(
                payout.amount
            )} has been paid out?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    style: "default",
                    onPress: async () => {
                        try {
                            await api.post(
                                `/api/admin/payouts/${payout._id}/mark-paid`
                            );
                            fetchPayouts();
                        } catch (err) {
                            Alert.alert(
                                "Error",
                                "Failed to mark payout as paid"
                            );
                        }
                    },
                },
            ]
        );
    };

    const openRejectModal = (payout) => {
        setRejectTarget(payout);
        setRejectReason("");
        setRejectModalVisible(true);
    };

    const submitReject = async () => {
        if (!rejectTarget) return;
        if (!rejectReason.trim()) {
            Alert.alert("Reason required", "Please enter a reason");
            return;
        }
        try {
            await api.post(
                `/api/admin/payouts/${rejectTarget._id}/reject`,
                { reason: rejectReason.trim() }
            );
            setRejectModalVisible(false);
            setRejectTarget(null);
            setRejectReason("");
            fetchPayouts();
        } catch (err) {
            Alert.alert("Error", "Failed to reject payout");
        }
    };

    const handleExport = async () => {
        const data = {
            exportedAt: new Date().toISOString(),
            statusFilter,
            stats,
            payouts: payouts.map((p) => ({
                id: p._id,
                user: p.user?.username,
                email: p.user?.email,
                amount: p.amount,
                method: p.method,
                status: p.status,
                createdAt: p.createdAt,
                completedAt: p.completedAt,
            })),
        };

        try {
            await Share.share({
                message: JSON.stringify(data, null, 2),
                title: "Payout Export",
            });
        } catch (err) {
            console.error("Share error:", err);
        }
    };

    if (loading && payouts.length === 0) {
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
                        color: "rgba(226,232,240,0.8)",
                        marginTop: 16,
                    }}
                >
                    Loading payouts...
                </Text>
            </View>
        );
    }

    const statusOptions = [
        { id: "pending", label: "Pending" },
        { id: "processing", label: "Processing" },
        { id: "completed", label: "Completed" },
        { id: "failed", label: "Failed" },
        { id: "all", label: "All" },
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
                        paddingBottom: 16,
                        borderBottomWidth: 1,
                        borderBottomColor: "rgba(148,163,184,0.35)",
                        backgroundColor: "rgba(15,23,42,0.95)",
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
                                <Text style={{ fontSize: 24, marginRight: 8 }}>
                                    🧾
                                </Text>
                                <Text
                                    style={{
                                        color: "#22d3ee",
                                        fontSize: 22,
                                        fontWeight: "bold",
                                    }}
                                >
                                    Payouts
                                </Text>
                            </View>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 13,
                                    marginTop: 4,
                                }}
                            >
                                Manage withdrawals & cashouts
                            </Text>
                        </View>

                        <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                                onPress={handleExport}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 999,
                                    backgroundColor: "rgba(15,118,110,0.4)",
                                    borderWidth: 1,
                                    borderColor: "rgba(34,197,94,0.7)",
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
                    {/* STATS */}
                    <View
                        style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            marginBottom: 16,
                        }}
                    >
                        <GradientCard
                            colors={["#0f172a", "#eab308"]}
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
                                Pending Volume
                            </Text>
                            <Text
                                style={{
                                    color: "#fbbf24",
                                    fontSize: 20,
                                    fontWeight: "800",
                                    marginTop: 4,
                                }}
                            >
                                {formatMoney(stats.pendingAmount)}
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 11,
                                    marginTop: 4,
                                }}
                            >
                                {stats.pendingCount} requests
                            </Text>
                        </GradientCard>

                        <GradientCard
                            colors={["#0f172a", "#22c55e"]}
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
                                Completed Volume
                            </Text>
                            <Text
                                style={{
                                    color: "#bbf7d0",
                                    fontSize: 20,
                                    fontWeight: "800",
                                    marginTop: 4,
                                }}
                            >
                                {formatMoney(stats.completedAmount)}
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 11,
                                    marginTop: 4,
                                }}
                            >
                                {stats.completedCount} payouts
                            </Text>
                        </GradientCard>

                        <GradientCard
                            colors={["#020617", "#38bdf8"]}
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
                                Today Paid Out
                            </Text>
                            <Text
                                style={{
                                    color: "#bae6fd",
                                    fontSize: 20,
                                    fontWeight: "800",
                                    marginTop: 4,
                                }}
                            >
                                {formatMoney(stats.todayAmount)}
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 11,
                                    marginTop: 4,
                                }}
                            >
                                {stats.todayCount} payouts today
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
                                Failed / Cancelled
                            </Text>
                            <Text
                                style={{
                                    color: "#fecaca",
                                    fontSize: 20,
                                    fontWeight: "800",
                                    marginTop: 4,
                                }}
                            >
                                {stats.failedCount}
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(248,250,252,0.7)",
                                    fontSize: 11,
                                    marginTop: 4,
                                }}
                            >
                                payouts need review
                            </Text>
                        </GradientCard>
                    </View>

                    {/* STATUS FILTER */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginBottom: 12 }}
                    >
                        {statusOptions.map((s) => {
                            const active = statusFilter === s.id;
                            return (
                                <TouchableOpacity
                                    key={s.id}
                                    onPress={() => setStatusFilter(s.id)}
                                    style={{
                                        paddingHorizontal: 14,
                                        paddingVertical: 8,
                                        borderRadius: 999,
                                        marginRight: 8,
                                        backgroundColor: active
                                            ? "#22d3ee"
                                            : "rgba(15,23,42,0.9)",
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
                                        {s.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* LIST HEADER */}
                    <View
                        style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 12,
                        }}
                    >
                        <Text
                            style={{
                                color: "#e5e7eb",
                                fontSize: 16,
                                fontWeight: "700",
                            }}
                        >
                            {statusFilter === "all"
                                ? "All Payouts"
                                : `${statusFilter
                                    .charAt(0)
                                    .toUpperCase()}${statusFilter.slice(
                                        1
                                    )} Payouts`}
                        </Text>
                        <Text
                            style={{
                                color: "rgba(148,163,184,0.9)",
                                fontSize: 13,
                            }}
                        >
                            {payouts.length} records
                        </Text>
                    </View>

                    {/* PAYOUT LIST */}
                    {payouts.length === 0 ? (
                        <View
                            style={{
                                backgroundColor: "rgba(15,23,42,0.95)",
                                borderRadius: 16,
                                borderWidth: 1,
                                borderColor: "rgba(148,163,184,0.3)",
                                padding: 32,
                                alignItems: "center",
                            }}
                        >
                            <Text style={{ fontSize: 42, marginBottom: 8 }}>
                                💸
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(226,232,240,0.9)",
                                    fontSize: 15,
                                    fontWeight: "600",
                                }}
                            >
                                No payouts found
                            </Text>
                            <Text
                                style={{
                                    color: "rgba(148,163,184,0.9)",
                                    fontSize: 12,
                                    marginTop: 6,
                                    textAlign: "center",
                                }}
                            >
                                {statusFilter === "pending"
                                    ? "When creators request a payout, you will see them here."
                                    : "Try selecting another status filter."}
                            </Text>
                        </View>
                    ) : (
                        payouts.map((p) => (
                            <PayoutCard
                                key={p._id}
                                payout={p}
                                onApprove={handleApprove}
                                onReject={openRejectModal}
                                onMarkPaid={handleMarkPaid}
                            />
                        ))
                    )}

                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>

            {/* REJECT MODAL */}
            <Modal
                visible={rejectModalVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setRejectModalVisible(false)}
            >
                <View
                    style={{
                        flex: 1,
                        backgroundColor: "rgba(15,23,42,0.9)",
                        justifyContent: "center",
                        alignItems: "center",
                        paddingHorizontal: 24,
                    }}
                >
                    <View
                        style={{
                            width: "100%",
                            backgroundColor: "#020617",
                            borderRadius: 16,
                            padding: 16,
                            borderWidth: 1,
                            borderColor: "rgba(148,163,184,0.6)",
                        }}
                    >
                        <Text
                            style={{
                                color: "#e5e7eb",
                                fontSize: 16,
                                fontWeight: "700",
                                marginBottom: 8,
                            }}
                        >
                            Reject Payout
                        </Text>
                        <Text
                            style={{
                                color: "rgba(148,163,184,0.9)",
                                fontSize: 13,
                                marginBottom: 12,
                            }}
                        >
                            Enter a reason. The streamer will receive this
                            message in their payout notification.
                        </Text>
                        <TextInput
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            placeholder="Reason for rejection..."
                            placeholderTextColor="rgba(148,163,184,0.7)"
                            multiline
                            style={{
                                minHeight: 80,
                                maxHeight: 140,
                                borderRadius: 12,
                                borderWidth: 1,
                                borderColor: "rgba(148,163,184,0.7)",
                                paddingHorizontal: 10,
                                paddingVertical: 8,
                                color: "#f9fafb",
                                textAlignVertical: "top",
                                marginBottom: 14,
                            }}
                        />
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "flex-end",
                                gap: 8,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() => {
                                    setRejectModalVisible(false);
                                    setRejectTarget(null);
                                    setRejectReason("");
                                }}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 999,
                                    backgroundColor: "rgba(15,23,42,1)",
                                    borderWidth: 1,
                                    borderColor: "rgba(148,163,184,0.7)",
                                }}
                            >
                                <Text
                                    style={{
                                        color: "rgba(226,232,240,0.9)",
                                        fontSize: 13,
                                        fontWeight: "600",
                                    }}
                                >
                                    Cancel
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={submitReject}
                                style={{
                                    paddingHorizontal: 12,
                                    paddingVertical: 8,
                                    borderRadius: 999,
                                    backgroundColor: "rgba(248,113,113,0.9)",
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#fef2f2",
                                        fontSize: 13,
                                        fontWeight: "700",
                                    }}
                                >
                                    Reject
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}
