// screens/AdminDashboardScreen.jsx - ULTIMATE MOBILE EDITION 🚀
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

    Share,
    StatusBar,

} from "react-native";

import axios from "axios";

const { width } = Dimensions.get("window");

// ============================================
// GRADIENT REPLACEMENT (No extra dependency needed!)
// ============================================
const GradientCard = ({ colors, children, style }) => (
    <View
        style={[
            {
                backgroundColor: colors[0],
                borderRadius: 16,
                borderWidth: 1,
                borderColor: colors[1] + "40", // 40 = 25% opacity
            },
            style,
        ]}
    >
        {children}
    </View>
);

// ============================================
// CONSTANTS
// ============================================
const TABS = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "users", label: "Users", icon: "👥" },
    { id: "streams", label: "Streams", icon: "🎥" },
    { id: "withdrawals", label: "Withdrawals", icon: "💸" },
    { id: "reports", label: "Reports", icon: "🚨" },
    { id: "revenue", label: "Revenue", icon: "💰" },
];

const USER_FILTERS = [
    { id: "all", label: "All" },
    { id: "admin", label: "Admins" },
    { id: "banned", label: "Banned" },
    { id: "verified", label: "Verified" },
];

// ============================================
// STAT CARD COMPONENT
// ============================================
const StatCard = ({ title, value, subtitle, icon, colors, trend }) => (
    <GradientCard
        colors={colors}
        style={{
            padding: 16,
            flex: 1,
            marginHorizontal: 4,
            minWidth: (width - 48) / 2 - 8,
        }}
    >
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
            }}
        >
            <Text
                style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 12,
                    fontWeight: "600",
                }}
            >
                {title}
            </Text>
            <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
        <Text
            style={{
                color: "#fff",
                fontSize: 28,
                fontWeight: "bold",
                marginTop: 8,
            }}
        >
            {value}
        </Text>
        <View
            style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 4,
            }}
        >
            <Text
                style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 11,
                }}
            >
                {subtitle}
            </Text>
            {trend !== undefined && (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor:
                            trend >= 0
                                ? "rgba(34,197,94,0.3)"
                                : "rgba(239,68,68,0.3)",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 8,
                    }}
                >
                    <Text
                        style={{
                            color: trend >= 0 ? "#22c55e" : "#ef4444",
                            fontSize: 10,
                            fontWeight: "bold",
                        }}
                    >
                        {trend >= 0 ? "↑" : "↓"} {Math.abs(trend)}%
                    </Text>
                </View>
            )}
        </View>
    </GradientCard>
);

// ============================================
// USER CARD COMPONENT
// ============================================
const UserCard = ({ user, onPress, onBan, onMakeAdmin, currentUserId }) => {
    const isCurrentUser = user._id === currentUserId;

    return (
        <TouchableOpacity
            onPress={() => onPress(user)}
            activeOpacity={0.7}
            style={{ cursor: "pointer" }}
            style={{
                backgroundColor: user.isBanned
                    ? "rgba(239,68,68,0.1)"
                    : "rgba(255,255,255,0.05)",
                borderRadius: 16,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
                cursor: "pointer",
                cursor: "pointer",
                borderColor: user.isBanned
                    ? "rgba(239,68,68,0.3)"
                    : "rgba(255,255,255,0.1)",
            }}
        >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
                {/* Avatar */}
                <View
                    style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: "rgba(34,211,238,0.2)",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                    }}
                >
                    <Text style={{ fontSize: 20 }}>
                        {user.avatar
                            ? "👤"
                            : user.username?.charAt(0).toUpperCase()}
                    </Text>
                </View>

                {/* Info */}
                <View style={{ flex: 1 }}>
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flexWrap: "wrap",
                        }}
                    >
                        <Text
                            style={{
                                color: "#e5e7eb",
                                fontWeight: "700",
                                fontSize: 15,
                            }}
                        >
                            {user.username}
                        </Text>
                        {user.role === "admin" && (
                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(251,191,36,0.2)",
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                    marginLeft: 6,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#fbbf24",
                                        fontSize: 10,
                                        fontWeight: "bold",
                                    }}
                                >
                                    👑 ADMIN
                                </Text>
                            </View>
                        )}
                        {user.isBanned && (
                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(239,68,68,0.2)",
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                    marginLeft: 6,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#ef4444",
                                        fontSize: 10,
                                        fontWeight: "bold",
                                    }}
                                >
                                    🚫 BANNED
                                </Text>
                            </View>
                        )}
                        {isCurrentUser && (
                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(34,211,238,0.2)",
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                    marginLeft: 6,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#22d3ee",
                                        fontSize: 10,
                                        fontWeight: "bold",
                                    }}
                                >
                                    (You)
                                </Text>
                            </View>
                        )}
                    </View>
                    <Text
                        style={{
                            color: "#9ca3af",
                            fontSize: 12,
                            marginTop: 2,
                        }}
                        numberOfLines={1}
                    >
                        {user.email}
                    </Text>
                    <View style={{ flexDirection: "row", marginTop: 4 }}>
                        <Text
                            style={{ color: "#6b7280", fontSize: 11 }}
                        >
                            🪙 {user.wallet?.balance || 0} coins
                        </Text>
                        <Text
                            style={{
                                color: "#6b7280",
                                fontSize: 11,
                                marginLeft: 12,
                            }}
                        >
                            👥 {user.followers?.length || 0} followers
                        </Text>
                    </View>
                </View>

                {/* Arrow */}
                <Text style={{ color: "#6b7280", fontSize: 18 }}>›</Text>
            </View>

            {/* Quick Actions */}
            {!isCurrentUser && (
                <View
                    style={{
                        flexDirection: "row",
                        marginTop: 12,
                        gap: 8,
                    }}
                >
                    {user.role !== "admin" ? (
                        <TouchableOpacity
                            onPress={() => onMakeAdmin(user._id)}
                            style={{
                                flex: 1,
                                backgroundColor:
                                    "rgba(251,191,36,0.2)",
                                paddingVertical: 8,
                                borderRadius: 8,
                                alignItems: "center",
                            }}
                        >
                            <Text
                                style={{
                                    color: "#fbbf24",
                                    fontSize: 12,
                                    fontWeight: "600",
                                }}
                            >
                                👑 Make Admin
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={() => onMakeAdmin(user._id, true)}
                            style={{
                                flex: 1,
                                backgroundColor:
                                    "rgba(249,115,22,0.2)",
                                paddingVertical: 8,
                                borderRadius: 8,
                                alignItems: "center",
                            }}
                        >
                            <Text
                                style={{
                                    color: "#f97316",
                                    fontSize: 12,
                                    fontWeight: "600",
                                }}
                            >
                                Remove Admin
                            </Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity
                        onPress={() => onBan(user)}
                        style={{
                            flex: 1,
                            backgroundColor: user.isBanned
                                ? "rgba(34,197,94,0.2)"
                                : "rgba(239,68,68,0.2)",
                            paddingVertical: 8,
                            borderRadius: 8,
                            alignItems: "center",
                        }}
                    >
                        <Text
                            style={{
                                color: user.isBanned
                                    ? "#22c55e"
                                    : "#ef4444",
                                fontSize: 12,
                                fontWeight: "600",
                            }}
                        >
                            {user.isBanned ? "✓ Unban" : "🚫 Ban"}
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );
};

// ============================================
// STREAM CARD COMPONENT
// ============================================
const StreamCard = ({ stream, onStop }) => (
    <View
        style={{
            backgroundColor: stream.isLive
                ? "rgba(239,68,68,0.1)"
                : "rgba(255,255,255,0.05)",
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: stream.isLive
                ? "rgba(239,68,68,0.3)"
                : "rgba(255,255,255,0.1)",
        }}
    >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
            {stream.isLive && (
                <View
                    style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: "#ef4444",
                        marginRight: 8,
                    }}
                />
            )}
            <View style={{ flex: 1 }}>
                <Text
                    style={{
                        color: "#e5e7eb",
                        fontWeight: "700",
                        fontSize: 14,
                    }}
                    numberOfLines={1}
                >
                    {stream.title}
                </Text>
                <Text
                    style={{
                        color: "#9ca3af",
                        fontSize: 12,
                        marginTop: 2,
                    }}
                >
                    {stream.streamerName} • {stream.category} • 👁{" "}
                    {stream.viewers || 0}
                </Text>
            </View>
            {stream.isLive && (
                <TouchableOpacity
                    onPress={() => onStop(stream._id)}
                    style={{
                        backgroundColor: "#ef4444",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                    }}
                >
                    <Text
                        style={{
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "600",
                        }}
                    >
                        ⏹ Stop
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    </View>
);

// ============================================
// WITHDRAWAL CARD COMPONENT
// ============================================
const WithdrawalCard = ({
    withdrawal,
    onApprove,
    onReject,
    loading,
}) => (
    <View
        style={{
            backgroundColor:
                withdrawal.status === "pending"
                    ? "rgba(251,191,36,0.1)"
                    : withdrawal.status === "approved"
                        ? "rgba(34,197,94,0.1)"
                        : "rgba(239,68,68,0.1)",
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
            borderWidth: 1,
            borderColor:
                withdrawal.status === "pending"
                    ? "rgba(251,191,36,0.3)"
                    : withdrawal.status === "approved"
                        ? "rgba(34,197,94,0.3)"
                        : "rgba(239,68,68,0.3)",
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
                <Text
                    style={{
                        color: "#e5e7eb",
                        fontWeight: "700",
                        fontSize: 14,
                    }}
                >
                    {withdrawal.username || "Unknown User"}
                </Text>
                <Text
                    style={{
                        color: "#9ca3af",
                        fontSize: 12,
                        marginTop: 2,
                    }}
                >
                    €
                    {withdrawal.amount?.toFixed(2)} •{" "}
                    {withdrawal.method || "Bank"} •{" "}
                    {new Date(
                        withdrawal.createdAt
                    ).toLocaleDateString()}
                </Text>
            </View>
            {withdrawal.status === "pending" ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                        onPress={() => onApprove(withdrawal._id)}
                        disabled={loading}
                        style={{
                            backgroundColor: "#22c55e",
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            opacity: loading ? 0.5 : 1,
                        }}
                    >
                        <Text
                            style={{
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: "600",
                            }}
                        >
                            ✓
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => onReject(withdrawal._id)}
                        disabled={loading}
                        style={{
                            backgroundColor:
                                "rgba(239,68,68,0.5)",
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 8,
                            opacity: loading ? 0.5 : 1,
                        }}
                    >
                        <Text
                            style={{
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: "600",
                            }}
                        >
                            ✕
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View
                    style={{
                        backgroundColor:
                            withdrawal.status === "approved"
                                ? "rgba(34,197,94,0.2)"
                                : "rgba(239,68,68,0.2)",
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 8,
                    }}
                >
                    <Text
                        style={{
                            color:
                                withdrawal.status === "approved"
                                    ? "#22c55e"
                                    : "#ef4444",
                            fontSize: 11,
                            fontWeight: "600",
                            textTransform: "capitalize",
                        }}
                    >
                        {withdrawal.status}
                    </Text>
                </View>
            )}
        </View>
    </View>
);

// ============================================
// REPORT CARD COMPONENT
// ============================================
const ReportCard = ({ report, onResolve, onDismiss, loading }) => (
    <View
        style={{
            backgroundColor:
                report.status === "pending"
                    ? "rgba(239,68,68,0.1)"
                    : "rgba(255,255,255,0.05)",
            borderRadius: 16,
            padding: 14,
            marginBottom: 10,
            borderWidth: 1,
            borderColor:
                report.status === "pending"
                    ? "rgba(239,68,68,0.3)"
                    : "rgba(255,255,255,0.1)",
        }}
    >
        <View style={{ marginBottom: 8 }}>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexWrap: "wrap",
                }}
            >
                <Text
                    style={{
                        color: "#e5e7eb",
                        fontWeight: "600",
                    }}
                >
                    {report.reporterUsername || "Anonymous"}
                </Text>
                <Text style={{ color: "#9ca3af" }}> reported </Text>
                <Text
                    style={{
                        color: "#ef4444",
                        fontWeight: "600",
                    }}
                >
                    {report.reportedUsername}
                </Text>
            </View>
            <Text
                style={{
                    color: "#9ca3af",
                    fontSize: 12,
                    marginTop: 4,
                }}
            >
                Reason: {report.reason}
            </Text>
            {report.details && (
                <View
                    style={{
                        backgroundColor: "rgba(255,255,255,0.05)",
                        padding: 8,
                        borderRadius: 8,
                        marginTop: 6,
                    }}
                >
                    <Text
                        style={{ color: "#6b7280", fontSize: 11 }}
                    >
                        {report.details}
                    </Text>
                </View>
            )}
            <Text
                style={{
                    color: "#4b5563",
                    fontSize: 10,
                    marginTop: 6,
                }}
            >
                {new Date(
                    report.createdAt
                ).toLocaleString()}
            </Text>
        </View>

        {report.status === "pending" ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                    onPress={() => onResolve(report._id)}
                    disabled={loading}
                    style={{
                        flex: 1,
                        backgroundColor: "#22c55e",
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: "center",
                        opacity: loading ? 0.5 : 1,
                    }}
                >
                    <Text
                        style={{
                            color: "#fff",
                            fontSize: 12,
                            fontWeight: "600",
                        }}
                    >
                        ✓ Resolve
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={() => onDismiss(report._id)}
                    disabled={loading}
                    style={{
                        flex: 1,
                        backgroundColor:
                            "rgba(255,255,255,0.1)",
                        paddingVertical: 8,
                        borderRadius: 8,
                        alignItems: "center",
                        opacity: loading ? 0.5 : 1,
                    }}
                >
                    <Text
                        style={{
                            color: "#9ca3af",
                            fontSize: 12,
                            fontWeight: "600",
                        }}
                    >
                        Dismiss
                    </Text>
                </TouchableOpacity>
            </View>
        ) : (
            <View
                style={{
                    backgroundColor:
                        report.status === "resolved"
                            ? "rgba(34,197,94,0.2)"
                            : "rgba(255,255,255,0.1)",
                    paddingVertical: 6,
                    borderRadius: 8,
                    alignItems: "center",
                }}
            >
                <Text
                    style={{
                        color:
                            report.status === "resolved"
                                ? "#22c55e"
                                : "#9ca3af",
                        fontSize: 12,
                        fontWeight: "600",
                        textTransform: "capitalize",
                    }}
                >
                    {report.status}
                </Text>
            </View>
        )}
    </View>
);

// ============================================
// USER DETAIL MODAL
// ============================================
const UserDetailModal = ({ user, visible, onClose, onAction }) => {
    if (!user) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.8)",
                    justifyContent: "flex-end",
                }}
            >
                <View
                    style={{
                        backgroundColor: "#111827",
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        padding: 20,
                        maxHeight: "80%",
                    }}
                >
                    {/* Handle */}
                    <View
                        style={{
                            width: 40,
                            height: 4,
                            backgroundColor:
                                "rgba(255,255,255,0.2)",
                            borderRadius: 2,
                            alignSelf: "center",
                            marginBottom: 20,
                        }}
                    />

                    {/* Header */}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginBottom: 20,
                        }}
                    >
                        <View
                            style={{
                                width: 64,
                                height: 64,
                                borderRadius: 32,
                                backgroundColor:
                                    "rgba(34,211,238,0.2)",
                                justifyContent: "center",
                                alignItems: "center",
                                marginRight: 16,
                            }}
                        >
                            <Text style={{ fontSize: 28 }}>👤</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text
                                style={{
                                    color: "#fff",
                                    fontSize: 22,
                                    fontWeight: "bold",
                                }}
                            >
                                {user.username}
                            </Text>
                            <Text
                                style={{
                                    color: "#9ca3af",
                                    fontSize: 14,
                                }}
                            >
                                {user.email}
                            </Text>
                            <View
                                style={{
                                    flexDirection: "row",
                                    marginTop: 6,
                                    flexWrap: "wrap",
                                }}
                            >
                                {user.role === "admin" && (
                                    <View
                                        style={{
                                            backgroundColor:
                                                "rgba(251,191,36,0.2)",
                                            paddingHorizontal: 8,
                                            paddingVertical: 3,
                                            borderRadius: 8,
                                            marginRight: 6,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: "#fbbf24",
                                                fontSize: 11,
                                                fontWeight: "bold",
                                            }}
                                        >
                                            👑 ADMIN
                                        </Text>
                                    </View>
                                )}
                                {user.isBanned && (
                                    <View
                                        style={{
                                            backgroundColor:
                                                "rgba(239,68,68,0.2)",
                                            paddingHorizontal: 8,
                                            paddingVertical: 3,
                                            borderRadius: 8,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: "#ef4444",
                                                fontSize: 11,
                                                fontWeight: "bold",
                                            }}
                                        >
                                            🚫 BANNED
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* Stats Grid */}
                    <View
                        style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            marginBottom: 20,
                        }}
                    >
                        <View
                            style={{
                                width: "50%",
                                padding: 6,
                            }}
                        >
                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(255,255,255,0.05)",
                                    borderRadius: 12,
                                    padding: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#6b7280",
                                        fontSize: 11,
                                    }}
                                >
                                    Coins Balance
                                </Text>
                                <Text
                                    style={{
                                        color: "#fbbf24",
                                        fontSize: 20,
                                        fontWeight: "bold",
                                    }}
                                >
                                    🪙 {user.wallet?.balance || 0}
                                </Text>
                            </View>
                        </View>
                        <View style={{ width: "50%", padding: 6 }}>
                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(255,255,255,0.05)",
                                    borderRadius: 12,
                                    padding: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#6b7280",
                                        fontSize: 11,
                                    }}
                                >
                                    Total Earnings
                                </Text>
                                <Text
                                    style={{
                                        color: "#22c55e",
                                        fontSize: 20,
                                        fontWeight: "bold",
                                    }}
                                >
                                    €
                                    {(
                                        user.totalEarnings || 0
                                    ).toFixed(2)}
                                </Text>
                            </View>
                        </View>
                        <View style={{ width: "50%", padding: 6 }}>
                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(255,255,255,0.05)",
                                    borderRadius: 12,
                                    padding: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#6b7280",
                                        fontSize: 11,
                                    }}
                                >
                                    Followers
                                </Text>
                                <Text
                                    style={{
                                        color: "#22d3ee",
                                        fontSize: 20,
                                        fontWeight: "bold",
                                    }}
                                >
                                    {user.followers?.length || 0}
                                </Text>
                            </View>
                        </View>
                        <View style={{ width: "50%", padding: 6 }}>
                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(255,255,255,0.05)",
                                    borderRadius: 12,
                                    padding: 12,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#6b7280",
                                        fontSize: 11,
                                    }}
                                >
                                    Joined
                                </Text>
                                <Text
                                    style={{
                                        color: "#a855f7",
                                        fontSize: 14,
                                        fontWeight: "bold",
                                    }}
                                >
                                    {user.createdAt
                                        ? new Date(
                                            user.createdAt
                                        ).toLocaleDateString()
                                        : "N/A"}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Bio */}
                    {user.bio && (
                        <View
                            style={{
                                backgroundColor:
                                    "rgba(255,255,255,0.05)",
                                borderRadius: 12,
                                padding: 12,
                                marginBottom: 20,
                            }}
                        >
                            <Text
                                style={{
                                    color: "#6b7280",
                                    fontSize: 11,
                                    marginBottom: 4,
                                }}
                            >
                                Bio
                            </Text>
                            <Text
                                style={{
                                    color: "#e5e7eb",
                                    fontSize: 13,
                                }}
                            >
                                {user.bio}
                            </Text>
                        </View>
                    )}

                    {/* Actions */}
                    <View style={{ gap: 10 }}>
                        {user.role !== "admin" ? (
                            <TouchableOpacity
                                onPress={() =>
                                    onAction("makeAdmin", user._id)
                                }
                                style={{
                                    backgroundColor:
                                        "rgba(251,191,36,0.2)",
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: "center",
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#fbbf24",
                                        fontSize: 15,
                                        fontWeight: "600",
                                    }}
                                >
                                    👑 Make Admin
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                onPress={() =>
                                    onAction("removeAdmin", user._id)
                                }
                                style={{
                                    backgroundColor:
                                        "rgba(249,115,22,0.2)",
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: "center",
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#f97316",
                                        fontSize: 15,
                                        fontWeight: "600",
                                    }}
                                >
                                    Remove Admin
                                </Text>
                            </TouchableOpacity>
                        )}

                        <View
                            style={{
                                flexDirection: "row",
                                gap: 10,
                            }}
                        >
                            <TouchableOpacity
                                onPress={() =>
                                    onAction(
                                        user.isBanned ? "unban" : "ban",
                                        user._id
                                    )
                                }
                                style={{
                                    flex: 1,
                                    backgroundColor: user.isBanned
                                        ? "rgba(34,197,94,0.2)"
                                        : "rgba(239,68,68,0.2)",
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: "center",
                                }}
                            >
                                <Text
                                    style={{
                                        color: user.isBanned
                                            ? "#22c55e"
                                            : "#ef4444",
                                        fontSize: 15,
                                        fontWeight: "600",
                                    }}
                                >
                                    {user.isBanned
                                        ? "✓ Unban"
                                        : "🚫 Ban"}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() =>
                                    onAction("delete", user._id)
                                }
                                style={{
                                    flex: 1,
                                    backgroundColor:
                                        "rgba(239,68,68,0.3)",
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: "center",
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#ef4444",
                                        fontSize: 15,
                                        fontWeight: "600",
                                    }}
                                >
                                    🗑️ Delete
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            onPress={onClose}
                            style={{
                                backgroundColor:
                                    "rgba(255,255,255,0.1)",
                                paddingVertical: 14,
                                borderRadius: 12,
                                alignItems: "center",
                                marginTop: 10,
                            }}
                        >
                            <Text
                                style={{
                                    color: "#9ca3af",
                                    fontSize: 15,
                                    fontWeight: "600",
                                }}
                            >
                                Close
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ============================================
// ANNOUNCEMENT MODAL
// ============================================
const AnnouncementModal = ({ visible, onClose, onSend }) => {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [type, setType] = useState("info");
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert("Error", "Please fill in all fields");
            return;
        }
        setSending(true);
        await onSend({ title, message, type });
        setSending(false);
        setTitle("");
        setMessage("");
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View
                style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.8)",
                    justifyContent: "center",
                    padding: 20,
                }}
            >
                <View
                    style={{
                        backgroundColor: "#111827",
                        borderRadius: 20,
                        padding: 20,
                    }}
                >
                    <Text
                        style={{
                            color: "#fff",
                            fontSize: 20,
                            fontWeight: "bold",
                            marginBottom: 20,
                            textAlign: "center",
                        }}
                    >
                        📢 Send Announcement
                    </Text>

                    {/* Type Selection */}
                    <Text
                        style={{
                            color: "#9ca3af",
                            fontSize: 12,
                            marginBottom: 8,
                        }}
                    >
                        Type
                    </Text>
                    <View
                        style={{
                            flexDirection: "row",
                            marginBottom: 16,
                            gap: 8,
                        }}
                    >
                        {[
                            {
                                id: "info",
                                label: "ℹ️ Info",
                                color: "#3b82f6",
                            },
                            {
                                id: "warning",
                                label: "⚠️ Warning",
                                color: "#eab308",
                            },
                            {
                                id: "success",
                                label: "✅ Success",
                                color: "#22c55e",
                            },
                        ].map((t) => (
                            <TouchableOpacity
                                key={t.id}
                                onPress={() => setType(t.id)}
                                style={{
                                    flex: 1,
                                    backgroundColor:
                                        type === t.id
                                            ? t.color
                                            : "rgba(255,255,255,0.1)",
                                    paddingVertical: 10,
                                    borderRadius: 10,
                                    alignItems: "center",
                                }}
                            >
                                <Text
                                    style={{
                                        color:
                                            type === t.id
                                                ? "#fff"
                                                : "#9ca3af",
                                        fontSize: 12,
                                        fontWeight: "600",
                                    }}
                                >
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Title */}
                    <Text
                        style={{
                            color: "#9ca3af",
                            fontSize: 12,
                            marginBottom: 8,
                        }}
                    >
                        Title
                    </Text>
                    <TextInput
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Announcement title..."
                        placeholderTextColor="#6b7280"
                        style={{
                            backgroundColor:
                                "rgba(255,255,255,0.1)",
                            borderRadius: 12,
                            padding: 14,
                            color: "#fff",
                            marginBottom: 16,
                        }}
                    />

                    {/* Message */}
                    <Text
                        style={{
                            color: "#9ca3af",
                            fontSize: 12,
                            marginBottom: 8,
                        }}
                    >
                        Message
                    </Text>
                    <TextInput
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Write your announcement..."
                        placeholderTextColor="#6b7280"
                        multiline
                        numberOfLines={4}
                        style={{
                            backgroundColor:
                                "rgba(255,255,255,0.1)",
                            borderRadius: 12,
                            padding: 14,
                            color: "#fff",
                            marginBottom: 20,
                            minHeight: 100,
                            textAlignVertical: "top",
                        }}
                    />

                    {/* Buttons */}
                    <View
                        style={{
                            flexDirection: "row",
                            gap: 10,
                        }}
                    >
                        <TouchableOpacity
                            onPress={onClose}
                            style={{
                                flex: 1,
                                backgroundColor:
                                    "rgba(255,255,255,0.1)",
                                paddingVertical: 14,
                                borderRadius: 12,
                                alignItems: "center",
                            }}
                        >
                            <Text
                                style={{
                                    color: "#9ca3af",
                                    fontSize: 15,
                                    fontWeight: "600",
                                }}
                            >
                                Cancel
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={handleSend}
                            disabled={sending}
                            style={{
                                flex: 1,
                                backgroundColor: "#22d3ee",
                                paddingVertical: 14,
                                borderRadius: 12,
                                alignItems: "center",
                                opacity: sending ? 0.5 : 1,
                            }}
                        >
                            <Text
                                style={{
                                    color: "#000",
                                    fontSize: 15,
                                    fontWeight: "bold",
                                }}
                            >
                                {sending ? "Sending..." : "📢 Send"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function AdminDashboardScreen({ token, navigation }) {
    // State
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [streams, setStreams] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [reports, setReports] = useState([]);
    const [revenue, setRevenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [activeTab, setActiveTab] = useState("overview");

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [userFilter, setUserFilter] = useState("all");
    const [streamFilter, setStreamFilter] = useState("live");

    // Modals
    const [selectedUser, setSelectedUser] = useState(null);
    const [showAnnouncement, setShowAnnouncement] = useState(false);

    // Loading states
    const [actionLoading, setActionLoading] = useState({});

    // Current user ID
    const [currentUserId, setCurrentUserId] = useState(null);

    const authHeaders = {
        headers: { Authorization: `Bearer ${token}` },
    };

    // ============================================
    // DATA FETCHING
    // ============================================
    const loadAll = useCallback(async () => {
        try {
            setError("");
            if (!refreshing) setLoading(true);

            const [statsRes, usersRes, revenueRes] = await Promise.all([
                axios.get("/admin/stats", authHeaders).catch(() => ({ data: {} })),
                axios.get("/admin/users", authHeaders).catch(() => ({ data: [] })),
                axios.get("/admin/revenue", authHeaders).catch(() => ({ data: {} })),
            ]);

            setStats(statsRes.data);
            setUsers(
                Array.isArray(usersRes.data)
                    ? usersRes.data
                    : usersRes.data.users || []
            );
            setRevenue(revenueRes.data);

            // Additional data
            const [streamsRes, withdrawalsRes, reportsRes] =
                await Promise.all([
                    axios
                        .get("/admin/streams", authHeaders)
                        .catch(() => ({ data: [] })),
                    axios
                        .get("/admin/withdrawals", authHeaders)
                        .catch(() => ({ data: [] })),
                    axios
                        .get("/admin/reports", authHeaders)
                        .catch(() => ({ data: [] })),
                ]);

            setStreams(
                Array.isArray(streamsRes.data)
                    ? streamsRes.data
                    : streamsRes.data.streams || []
            );
            setWithdrawals(
                Array.isArray(withdrawalsRes.data)
                    ? withdrawalsRes.data
                    : withdrawalsRes.data.withdrawals || []
            );
            setReports(
                Array.isArray(reportsRes.data)
                    ? reportsRes.data
                    : reportsRes.data.reports || []
            );
        } catch (err) {
            console.error("Admin dashboard error:", err);
            setError("Failed to load admin dashboard");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [refreshing, token]);

    useEffect(() => {
        if (token) {
            loadAll();

            // current user ophalen
            axios
                .get("/auth/me", authHeaders)
                .then((res) => {
                    if (res?.data?._id) {
                        setCurrentUserId(res.data._id);
                    }
                })
                .catch(() => { });
        }
    }, [token]);

    const onRefresh = () => {
        setRefreshing(true);
        loadAll();
    };

    // ============================================
    // USER ACTIONS
    // ============================================
    const handleUserAction = async (action, userId) => {
        if (
            userId === currentUserId &&
            ["ban", "delete", "removeAdmin"].includes(action)
        ) {
            Alert.alert(
                "Error",
                "You cannot perform this action on yourself"
            );
            return;
        }

        const confirmActions = [
            "ban",
            "delete",
            "makeAdmin",
            "removeAdmin",
        ];
        if (confirmActions.includes(action)) {
            Alert.alert(
                "Confirm Action",
                `Are you sure you want to ${action} this user?`,
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "OK",
                        onPress: async () =>
                            await executeUserAction(action, userId),
                    },
                ]
            );
        } else {
            await executeUserAction(action, userId);
        }
    };

    const executeUserAction = async (action, userId) => {
        setActionLoading((prev) => ({ ...prev, [userId]: true }));

        try {
            switch (action) {
                case "makeAdmin":
                    await axios.post(
                        `/admin/make-admin/${userId}`,
                        null,
                        authHeaders
                    );
                    Alert.alert("Success", "User promoted to admin!");
                    break;
                case "removeAdmin":
                    await axios.post(
                        `/admin/remove-admin/${userId}`,
                        null,
                        authHeaders
                    );
                    Alert.alert("Success", "Admin role removed!");
                    break;
                case "ban":
                    await axios.post(
                        `/admin/ban-user/${userId}`,
                        null,
                        authHeaders
                    );
                    Alert.alert("Success", "User banned!");
                    break;
                case "unban":
                    await axios.post(
                        `/admin/unban-user/${userId}`,
                        null,
                        authHeaders
                    );
                    Alert.alert("Success", "User unbanned!");
                    break;
                case "delete":
                    await axios.delete(
                        `/admin/delete-user/${userId}`,
                        authHeaders
                    );
                    Alert.alert("Success", "User deleted!");
                    break;
            }
            await loadAll();
            setSelectedUser(null);
        } catch (err) {
            Alert.alert(
                "Error",
                err.response?.data?.error ||
                `Failed to ${action} user`
            );
        } finally {
            setActionLoading((prev) => ({
                ...prev,
                [userId]: false,
            }));
        }
    };

    const handleBanUser = (user) =>
        handleUserAction(
            user.isBanned ? "unban" : "ban",
            user._id
        );
    const handleMakeAdmin = (userId, remove = false) =>
        handleUserAction(
            remove ? "removeAdmin" : "makeAdmin",
            userId
        );

    // ============================================
    // STREAM ACTIONS
    // ============================================
    const handleStopStream = (streamId) => {
        Alert.alert(
            "Stop Stream",
            "Are you sure you want to stop this stream?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Stop",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await axios.post(
                                `/admin/stop-stream/${streamId}`,
                                null,
                                authHeaders
                            );
                            Alert.alert(
                                "Success",
                                "Stream stopped!"
                            );
                            await loadAll();
                        } catch (err) {
                            Alert.alert(
                                "Error",
                                "Failed to stop stream"
                            );
                        }
                    },
                },
            ]
        );
    };

    // ============================================
    // WITHDRAWAL ACTIONS
    // ============================================
    const handleApproveWithdrawal = async (id) => {
        setActionLoading((prev) => ({
            ...prev,
            [`w-${id}`]: true,
        }));
        try {
            await axios.post(
                `/admin/withdrawals/${id}/approve`,
                null,
                authHeaders
            );
            Alert.alert("Success", "Withdrawal approved!");
            await loadAll();
        } catch (err) {
            Alert.alert(
                "Error",
                "Failed to approve withdrawal"
            );
        } finally {
            setActionLoading((prev) => ({
                ...prev,
                [`w-${id}`]: false,
            }));
        }
    };

    const handleRejectWithdrawal = async (id) => {
        setActionLoading((prev) => ({
            ...prev,
            [`w-${id}`]: true,
        }));
        try {
            await axios.post(
                `/admin/withdrawals/${id}/reject`,
                null,
                authHeaders
            );
            Alert.alert("Success", "Withdrawal rejected!");
            await loadAll();
        } catch (err) {
            Alert.alert(
                "Error",
                "Failed to reject withdrawal"
            );
        } finally {
            setActionLoading((prev) => ({
                ...prev,
                [`w-${id}`]: false,
            }));
        }
    };

    // ============================================
    // REPORT ACTIONS
    // ============================================
    const handleResolveReport = async (id) => {
        setActionLoading((prev) => ({
            ...prev,
            [`r-${id}`]: true,
        }));
        try {
            await axios.post(
                `/admin/reports/${id}/resolve`,
                null,
                authHeaders
            );
            Alert.alert("Success", "Report resolved!");
            await loadAll();
        } catch (err) {
            Alert.alert(
                "Error",
                "Failed to resolve report"
            );
        } finally {
            setActionLoading((prev) => ({
                ...prev,
                [`r-${id}`]: false,
            }));
        }
    };

    const handleDismissReport = async (id) => {
        setActionLoading((prev) => ({
            ...prev,
            [`r-${id}`]: true,
        }));
        try {
            await axios.post(
                `/admin/reports/${id}/dismiss`,
                null,
                authHeaders
            );
            Alert.alert("Success", "Report dismissed!");
            await loadAll();
        } catch (err) {
            Alert.alert(
                "Error",
                "Failed to dismiss report"
            );
        } finally {
            setActionLoading((prev) => ({
                ...prev,
                [`r-${id}`]: false,
            }));
        }
    };

    // ============================================
    // ANNOUNCEMENT
    // ============================================
    const handleSendAnnouncement = async (data) => {
        try {
            await axios.post(
                "/admin/announcement",
                data,
                authHeaders
            );
            Alert.alert(
                "Success",
                "Announcement sent to all users!"
            );
        } catch (err) {
            Alert.alert(
                "Error",
                "Failed to send announcement"
            );
        }
    };

    // ============================================
    // EXPORT
    // ============================================
    const handleExport = async (type) => {
        let data = "";
        switch (type) {
            case "users":
                data = users
                    .map(
                        (u) =>
                            `${u.username},${u.email},${u.role}`
                    )
                    .join("\n");
                data = `Username,Email,Role\n${data}`;
                break;
            case "revenue":
                data = (revenue?.recentTransactions ||
                    [])
                    .map(
                        (t) =>
                            `${t.username},${t.type},€${t.amount}`
                    )
                    .join("\n");
                data = `User,Type,Amount\n${data}`;
                break;
        }

        try {
            await Share.share({
                message: data,
                title: `${type}_export.csv`,
            });
        } catch (err) {
            Alert.alert("Error", "Failed to export data");
        }
    };

    // ============================================
    // FILTERED DATA
    // ============================================
    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.username
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            user.email
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase());

        if (userFilter === "all") return matchesSearch;
        if (userFilter === "admin")
            return matchesSearch && user.role === "admin";
        if (userFilter === "banned")
            return matchesSearch && user.isBanned;
        if (userFilter === "verified")
            return matchesSearch && user.isVerified;

        return matchesSearch;
    });

    const filteredStreams = streams.filter((stream) => {
        if (streamFilter === "live") return stream.isLive;
        if (streamFilter === "ended") return !stream.isLive;
        return true;
    });

    const pendingWithdrawals = withdrawals.filter(
        (w) => w.status === "pending"
    );
    const pendingReports = reports.filter(
        (r) => r.status === "pending"
    );

    // Stats
    const totalAdmins = users.filter(
        (u) => u.role === "admin"
    ).length;
    const totalBanned = users.filter((u) => u.isBanned).length;
    const liveStreamsCount = streams.filter(
        (s) => s.isLive
    ).length;

    // ============================================
    // LOADING STATE
    // ============================================
    if (loading && !refreshing) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: "#030712",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <ActivityIndicator
                    size="large"
                    color="#22d3ee"
                />
                <Text
                    style={{
                        marginTop: 12,
                        color: "#9ca3af",
                    }}
                >
                    Loading admin dashboard...
                </Text>
            </View>
        );
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#030712",
            }}
        >
            <StatusBar
                barStyle="light-content"
                backgroundColor="#030712"
            />

            {/* Modals */}
            <UserDetailModal
                user={selectedUser}
                visible={!!selectedUser}
                onClose={() => setSelectedUser(null)}
                onAction={handleUserAction}
            />
            <AnnouncementModal
                visible={showAnnouncement}
                onClose={() => setShowAnnouncement(false)}
                onSend={handleSendAnnouncement}
            />

            <ScrollView
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#22d3ee"
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View
                    style={{
                        paddingHorizontal: 16,
                        paddingTop: 16,
                        paddingBottom: 12,
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
                            <Text
                                style={{
                                    fontSize: 28,
                                    fontWeight: "bold",
                                    color: "#22d3ee",
                                }}
                            >
                                🎛️ Admin
                            </Text>
                            <Text
                                style={{
                                    color: "#6b7280",
                                    marginTop: 2,
                                }}
                            >
                                World-Studio •{" "}
                                {new Date().toLocaleDateString()}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() =>
                                setShowAnnouncement(true)
                            }
                            style={{
                                backgroundColor:
                                    "rgba(168,85,247,0.2)",
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderRadius: 12,
                            }}
                        >
                            <Text
                                style={{
                                    color: "#a855f7",
                                    fontWeight: "600",
                                }}
                            >
                                📢
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {error ? (
                        <View
                            style={{
                                marginTop: 12,
                                backgroundColor:
                                    "rgba(239,68,68,0.1)",
                                padding: 12,
                                borderRadius: 12,
                            }}
                        >
                            <Text style={{ color: "#ef4444" }}>
                                {error}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* Quick Stats */}
                <View
                    style={{
                        paddingHorizontal: 12,
                        marginBottom: 16,
                    }}
                >
                    <View
                        style={{
                            flexDirection: "row",
                            marginBottom: 8,
                        }}
                    >
                        <StatCard
                            title="Total Users"
                            value={
                                stats?.totalUsers ||
                                users.length
                            }
                            subtitle={`+${stats?.newUsersToday || 0
                                } today`}
                            icon="👥"
                            colors={["#0891b2", "#0e7490"]}
                            trend={stats?.userGrowthPercent}
                        />
                        <StatCard
                            title="Revenue"
                            value={`€${(
                                revenue?.totalRevenue || 0
                            ).toFixed(0)}`}
                            subtitle={`€${(
                                revenue?.revenueToday || 0
                            ).toFixed(2)} today`}
                            icon="💰"
                            colors={["#059669", "#047857"]}
                            trend={
                                revenue?.revenueGrowthPercent
                            }
                        />
                    </View>
                    <View style={{ flexDirection: "row" }}>
                        <StatCard
                            title="Live Streams"
                            value={
                                stats?.activeStreams ||
                                liveStreamsCount
                            }
                            subtitle={`${streams.length} total`}
                            icon="🎥"
                            colors={["#7c3aed", "#6d28d9"]}
                        />
                        <StatCard
                            title="Pending"
                            value={
                                pendingWithdrawals.length +
                                pendingReports.length
                            }
                            subtitle={`${pendingWithdrawals.length}💸 ${pendingReports.length}🚨`}
                            icon="⏳"
                            colors={["#ea580c", "#c2410c"]}
                        />
                    </View>
                </View>

                {/* Tabs */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{
                        paddingHorizontal: 12,
                        marginBottom: 16,
                    }}
                >
                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab.id}
                            onPress={() =>
                                setActiveTab(tab.id)
                            }
                            style={{
                                backgroundColor:
                                    activeTab === tab.id
                                        ? "#22d3ee"
                                        : "rgba(255,255,255,0.05)",
                                paddingHorizontal: 16,
                                paddingVertical: 10,
                                borderRadius: 12,
                                marginRight: 8,
                                flexDirection: "row",
                                alignItems: "center",
                            }}
                        >
                            <Text style={{ marginRight: 4 }}>
                                {tab.icon}
                            </Text>
                            <Text
                                style={{
                                    color:
                                        activeTab === tab.id
                                            ? "#000"
                                            : "#9ca3af",
                                    fontWeight: "600",
                                    fontSize: 13,
                                }}
                            >
                                {tab.label}
                            </Text>
                            {tab.id === "reports" &&
                                pendingReports.length > 0 && (
                                    <View
                                        style={{
                                            backgroundColor:
                                                "#ef4444",
                                            width: 18,
                                            height: 18,
                                            borderRadius: 9,
                                            justifyContent:
                                                "center",
                                            alignItems:
                                                "center",
                                            marginLeft: 6,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: "#fff",
                                                fontSize: 10,
                                                fontWeight:
                                                    "bold",
                                            }}
                                        >
                                            {
                                                pendingReports.length
                                            }
                                        </Text>
                                    </View>
                                )}
                            {tab.id === "withdrawals" &&
                                pendingWithdrawals.length >
                                0 && (
                                    <View
                                        style={{
                                            backgroundColor:
                                                "#eab308",
                                            width: 18,
                                            height: 18,
                                            borderRadius: 9,
                                            justifyContent:
                                                "center",
                                            alignItems:
                                                "center",
                                            marginLeft: 6,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: "#000",
                                                fontSize: 10,
                                                fontWeight:
                                                    "bold",
                                            }}
                                        >
                                            {
                                                pendingWithdrawals.length
                                            }
                                        </Text>
                                    </View>
                                )}
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Tab Content */}
                <View
                    style={{
                        paddingHorizontal: 16,
                        paddingBottom: 100,
                    }}
                >
                    {/* ==================== OVERVIEW ==================== */}
                    {activeTab === "overview" && (
                        <View>
                            {/* Quick Info */}
                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(255,255,255,0.05)",
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 16,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#22d3ee",
                                        fontWeight: "bold",
                                        marginBottom: 12,
                                    }}
                                >
                                    📈 Quick Stats
                                </Text>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        justifyContent:
                                            "space-between",
                                        marginBottom: 8,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#9ca3af",
                                        }}
                                    >
                                        Admins
                                    </Text>
                                    <Text
                                        style={{
                                            color: "#fbbf24",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {totalAdmins}
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        justifyContent:
                                            "space-between",
                                        marginBottom: 8,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#9ca3af",
                                        }}
                                    >
                                        Banned Users
                                    </Text>
                                    <Text
                                        style={{
                                            color: "#ef4444",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {totalBanned}
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        flexDirection: "row",
                                        justifyContent:
                                            "space-between",
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#9ca3af",
                                        }}
                                    >
                                        Active Streams
                                    </Text>
                                    <Text
                                        style={{
                                            color: "#a855f7",
                                            fontWeight: "bold",
                                        }}
                                    >
                                        {liveStreamsCount}
                                    </Text>
                                </View>
                            </View>

                            {/* Live Streams */}
                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(255,255,255,0.05)",
                                    borderRadius: 16,
                                    padding: 16,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#ef4444",
                                        fontWeight: "bold",
                                        marginBottom: 12,
                                    }}
                                >
                                    🔴 Live Now
                                </Text>
                                {streams.filter(
                                    (s) => s.isLive
                                ).length === 0 ? (
                                    <Text
                                        style={{
                                            color: "#6b7280",
                                            textAlign: "center",
                                            paddingVertical: 20,
                                        }}
                                    >
                                        No active streams
                                    </Text>
                                ) : (
                                    streams
                                        .filter(
                                            (s) => s.isLive
                                        )
                                        .slice(0, 3)
                                        .map((stream, idx) => (
                                            <StreamCard
                                                key={idx}
                                                stream={stream}
                                                onStop={
                                                    handleStopStream
                                                }
                                            />
                                        ))
                                )}
                            </View>
                        </View>
                    )}

                    {/* ==================== USERS ==================== */}
                    {activeTab === "users" && (
                        <View>
                            {/* Search & Filter */}
                            <View style={{ marginBottom: 12 }}>
                                <TextInput
                                    value={searchTerm}
                                    onChangeText={setSearchTerm}
                                    placeholder="Search users..."
                                    placeholderTextColor="#6b7280"
                                    style={{
                                        backgroundColor:
                                            "rgba(255,255,255,0.05)",
                                        borderRadius: 12,
                                        padding: 12,
                                        color: "#fff",
                                        marginBottom: 10,
                                    }}
                                />
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={
                                        false
                                    }
                                >
                                    {USER_FILTERS.map((f) => (
                                        <TouchableOpacity
                                            key={f.id}
                                            onPress={() =>
                                                setUserFilter(
                                                    f.id
                                                )
                                            }
                                            style={{
                                                backgroundColor:
                                                    userFilter ===
                                                        f.id
                                                        ? "#22d3ee"
                                                        : "rgba(255,255,255,0.05)",
                                                paddingHorizontal: 14,
                                                paddingVertical: 8,
                                                borderRadius: 10,
                                                marginRight: 8,
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        userFilter ===
                                                            f.id
                                                            ? "#000"
                                                            : "#9ca3af",
                                                    fontWeight:
                                                        "600",
                                                    fontSize: 12,
                                                }}
                                            >
                                                {f.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}

                                    {/* Creators List Button */}
                                    <TouchableOpacity
                                        onPress={() =>
                                            navigation.navigate(
                                                "AdminUserList"
                                            )
                                        }
                                        style={{
                                            backgroundColor:
                                                "rgba(59,130,246,0.2)",
                                            paddingHorizontal: 14,
                                            paddingVertical: 8,
                                            borderRadius: 10,
                                            marginRight: 8,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: "#3b82f6",
                                                fontWeight: "600",
                                                fontSize: 12,
                                            }}
                                        >
                                            👑 Creators List
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Export Button */}
                                    <TouchableOpacity
                                        onPress={() =>
                                            handleExport(
                                                "users"
                                            )
                                        }
                                        style={{
                                            backgroundColor:
                                                "rgba(34,197,94,0.2)",
                                            paddingHorizontal: 14,
                                            paddingVertical: 8,
                                            borderRadius: 10,
                                        }}
                                    >
                                        <Text
                                            style={{
                                                color: "#22c55e",
                                                fontWeight: "600",
                                                fontSize: 12,
                                            }}
                                        >
                                            📥 Export
                                        </Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>

                            {/* Users List */}
                            {filteredUsers.length === 0 ? (
                                <Text
                                    style={{
                                        color: "#6b7280",
                                        textAlign: "center",
                                        paddingVertical: 40,
                                    }}
                                >
                                    No users found
                                </Text>
                            ) : (
                                filteredUsers.map((user) => (
                                    <UserCard
                                        key={user._id}
                                        user={user}
                                        onPress={setSelectedUser}
                                        onBan={handleBanUser}
                                        onMakeAdmin={
                                            handleMakeAdmin
                                        }
                                        currentUserId={
                                            currentUserId
                                        }
                                    />
                                ))
                            )}
                        </View>
                    )}

                    {/* ==================== STREAMS ==================== */}
                    {activeTab === "streams" && (
                        <View>
                            {/* Filter */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    marginBottom: 12,
                                    gap: 8,
                                }}
                            >
                                {["all", "live", "ended"].map(
                                    (f) => (
                                        <TouchableOpacity
                                            key={f}
                                            onPress={() =>
                                                setStreamFilter(
                                                    f
                                                )
                                            }
                                            style={{
                                                flex: 1,
                                                backgroundColor:
                                                    streamFilter ===
                                                        f
                                                        ? "#22d3ee"
                                                        : "rgba(255,255,255,0.05)",
                                                paddingVertical: 10,
                                                borderRadius: 10,
                                                alignItems: "center",
                                            }}
                                        >
                                            <Text
                                                style={{
                                                    color:
                                                        streamFilter ===
                                                            f
                                                            ? "#000"
                                                            : "#9ca3af",
                                                    fontWeight:
                                                        "600",
                                                    fontSize: 13,
                                                }}
                                            >
                                                {f === "live"
                                                    ? "🔴 "
                                                    : ""}
                                                {f
                                                    .charAt(0)
                                                    .toUpperCase() +
                                                    f.slice(1)}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                )}
                            </View>

                            {/* Streams List */}
                            {filteredStreams.length === 0 ? (
                                <Text
                                    style={{
                                        color: "#6b7280",
                                        textAlign: "center",
                                        paddingVertical: 40,
                                    }}
                                >
                                    No streams found
                                </Text>
                            ) : (
                                filteredStreams.map(
                                    (stream) => (
                                        <StreamCard
                                            key={stream._id}
                                            stream={stream}
                                            onStop={
                                                handleStopStream
                                            }
                                        />
                                    )
                                )
                            )}
                        </View>
                    )}

                    {/* ==================== WITHDRAWALS ==================== */}
                    {activeTab === "withdrawals" && (
                        <View>
                            {pendingWithdrawals.length > 0 && (
                                <View
                                    style={{
                                        backgroundColor:
                                            "rgba(251,191,36,0.1)",
                                        borderRadius: 12,
                                        padding: 12,
                                        marginBottom: 12,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#fbbf24",
                                            fontWeight: "600",
                                        }}
                                    >
                                        ⏳{" "}
                                        {
                                            pendingWithdrawals.length
                                        }{" "}
                                        pending withdrawal(s)
                                    </Text>
                                </View>
                            )}

                            {withdrawals.length === 0 ? (
                                <Text
                                    style={{
                                        color: "#6b7280",
                                        textAlign: "center",
                                        paddingVertical: 40,
                                    }}
                                >
                                    No withdrawal requests
                                </Text>
                            ) : (
                                withdrawals.map((w) => (
                                    <WithdrawalCard
                                        key={w._id}
                                        withdrawal={w}
                                        onApprove={
                                            handleApproveWithdrawal
                                        }
                                        onReject={
                                            handleRejectWithdrawal
                                        }
                                        loading={
                                            actionLoading[
                                            `w-${w._id}`
                                            ]
                                        }
                                    />
                                ))
                            )}
                        </View>
                    )}

                    {/* ==================== REPORTS ==================== */}
                    {activeTab === "reports" && (
                        <View>
                            {pendingReports.length > 0 && (
                                <View
                                    style={{
                                        backgroundColor:
                                            "rgba(239,68,68,0.1)",
                                        borderRadius: 12,
                                        padding: 12,
                                        marginBottom: 12,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#ef4444",
                                            fontWeight: "600",
                                        }}
                                    >
                                        ⚠️{" "}
                                        {
                                            pendingReports.length
                                        }{" "}
                                        report(s) need
                                        attention
                                    </Text>
                                </View>
                            )}

                            {reports.length === 0 ? (
                                <Text
                                    style={{
                                        color: "#6b7280",
                                        textAlign: "center",
                                        paddingVertical: 40,
                                    }}
                                >
                                    No reports
                                </Text>
                            ) : (
                                reports.map((r) => (
                                    <ReportCard
                                        key={r._id}
                                        report={r}
                                        onResolve={
                                            handleResolveReport
                                        }
                                        onDismiss={
                                            handleDismissReport
                                        }
                                        loading={
                                            actionLoading[
                                            `r-${r._id}`
                                            ]
                                        }
                                    />
                                ))
                            )}
                        </View>
                    )}

                    {/* ==================== REVENUE ==================== */}
                    {activeTab === "revenue" && (
                        <View>
                            {/* Revenue Cards */}
                            <View
                                style={{
                                    flexDirection: "row",
                                    marginBottom: 16,
                                }}
                            >
                                <View
                                    style={{
                                        flex: 1,
                                        backgroundColor:
                                            "rgba(34,197,94,0.1)",
                                        borderRadius: 16,
                                        padding: 16,
                                        marginRight: 8,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#6b7280",
                                            fontSize: 12,
                                        }}
                                    >
                                        Today
                                    </Text>
                                    <Text
                                        style={{
                                            color: "#22c55e",
                                            fontSize: 24,
                                            fontWeight: "bold",
                                        }}
                                    >
                                        €
                                        {(
                                            revenue?.revenueToday ||
                                            0
                                        ).toFixed(2)}
                                    </Text>
                                </View>
                                <View
                                    style={{
                                        flex: 1,
                                        backgroundColor:
                                            "rgba(59,130,246,0.1)",
                                        borderRadius: 16,
                                        padding: 16,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: "#6b7280",
                                            fontSize: 12,
                                        }}
                                    >
                                        This Month
                                    </Text>
                                    <Text
                                        style={{
                                            color: "#3b82f6",
                                            fontSize: 24,
                                            fontWeight: "bold",
                                        }}
                                    >
                                        €
                                        {(
                                            revenue?.revenueThisMonth ||
                                            0
                                        ).toFixed(2)}
                                    </Text>
                                </View>
                            </View>

                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(168,85,247,0.1)",
                                    borderRadius: 16,
                                    padding: 16,
                                    marginBottom: 16,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#6b7280",
                                        fontSize: 12,
                                    }}
                                >
                                    All Time
                                </Text>
                                <Text
                                    style={{
                                        color: "#a855f7",
                                        fontSize: 32,
                                        fontWeight: "bold",
                                    }}
                                >
                                    €
                                    {(
                                        revenue?.totalRevenue || 0
                                    ).toFixed(2)}
                                </Text>
                            </View>

                            {/* Export Button */}
                            <TouchableOpacity
                                onPress={() =>
                                    handleExport("revenue")
                                }
                                style={{
                                    backgroundColor:
                                        "rgba(34,197,94,0.2)",
                                    paddingVertical: 14,
                                    borderRadius: 12,
                                    alignItems: "center",
                                    marginBottom: 16,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#22c55e",
                                        fontWeight: "600",
                                    }}
                                >
                                    📥 Export Revenue Data
                                </Text>
                            </TouchableOpacity>

                            {/* Recent Transactions */}
                            <View
                                style={{
                                    backgroundColor:
                                        "rgba(255,255,255,0.05)",
                                    borderRadius: 16,
                                    padding: 16,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#22d3ee",
                                        fontWeight: "bold",
                                        marginBottom: 12,
                                    }}
                                >
                                    Recent Transactions
                                </Text>
                                {(revenue?.recentTransactions ||
                                    []
                                )
                                    .slice(0, 10)
                                    .map((tx, idx) => (
                                        <View
                                            key={idx}
                                            style={{
                                                flexDirection:
                                                    "row",
                                                justifyContent:
                                                    "space-between",
                                                alignItems:
                                                    "center",
                                                paddingVertical: 10,
                                                borderBottomWidth:
                                                    idx < 9
                                                        ? 1
                                                        : 0,
                                                borderBottomColor:
                                                    "rgba(255,255,255,0.05)",
                                            }}
                                        >
                                            <View>
                                                <Text
                                                    style={{
                                                        color: "#e5e7eb",
                                                        fontWeight:
                                                            "600",
                                                    }}
                                                >
                                                    {
                                                        tx.username
                                                    }
                                                </Text>
                                                <Text
                                                    style={{
                                                        color: "#6b7280",
                                                        fontSize: 11,
                                                    }}
                                                >
                                                    {tx.type}
                                                </Text>
                                            </View>
                                            <View
                                                style={{
                                                    alignItems:
                                                        "flex-end",
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        color: "#22c55e",
                                                        fontWeight:
                                                            "bold",
                                                    }}
                                                >
                                                    €
                                                    {tx.amount?.toFixed(
                                                        2
                                                    )}
                                                </Text>
                                                <Text
                                                    style={{
                                                        color: "#4b5563",
                                                        fontSize: 10,
                                                    }}
                                                >
                                                    {new Date(
                                                        tx.date
                                                    ).toLocaleDateString()}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                {(!revenue?.recentTransactions ||
                                    revenue
                                        .recentTransactions
                                        .length === 0) && (
                                        <Text
                                            style={{
                                                color: "#6b7280",
                                                textAlign: "center",
                                                paddingVertical: 20,
                                            }}
                                        >
                                            No transactions yet
                                        </Text>
                                    )}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
