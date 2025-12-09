// screens/AdminUserListScreen.jsx - ULTIMATE CREATOR LIST 🚀
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
    StatusBar,
} from "react-native";
import axios from "axios";

const API_BASE_URL = "https://world-studio-production.up.railway.app";

// =========================
// Reusable UserCard (same style as AdminDashboard)
// =========================
const UserCard = ({ user, onPress, onBan, onMakeAdmin, currentUserId }) => {
    const isCurrentUser = user._id === currentUserId;

    return (
        <TouchableOpacity
            onPress={() => onPress(user)}
            activeOpacity={0.7}
            style={{
                backgroundColor: user.isBanned
                    ? "rgba(239,68,68,0.1)"
                    : "rgba(255,255,255,0.05)",
                borderRadius: 16,
                padding: 14,
                marginBottom: 10,
                borderWidth: 1,
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

                        {/* Creator badge */}
                        {(user.role === "creator" || user.isCreator) && (
                            <View
                                style={{
                                    backgroundColor: "rgba(59,130,246,0.2)",
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 6,
                                    marginLeft: 6,
                                }}
                            >
                                <Text
                                    style={{
                                        color: "#3b82f6",
                                        fontSize: 10,
                                        fontWeight: "bold",
                                    }}
                                >
                                    🎬 CREATOR
                                </Text>
                            </View>
                        )}

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

// =========================
// MAIN SCREEN
// =========================
export default function AdminUserListScreen({ token, navigation }) {
    const api = axios.create({ baseURL: API_BASE_URL });

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("creators"); // default: creators
    const [currentUserId, setCurrentUserId] = useState(null);
    const [actionLoading, setActionLoading] = useState({});

    const authHeaders = {
        headers: { Authorization: `Bearer ${token}` },
    };

    const loadUsers = useCallback(async () => {
        try {
            setError("");
            if (!refreshing) setLoading(true);

            const res = await api
                .get("/api/admin/users", authHeaders)
                .catch(() => ({ data: [] }));

            const list = Array.isArray(res.data)
                ? res.data
                : res.data.users || [];

            setUsers(list);
        } catch (err) {
            console.error("AdminUserList error:", err);
            setError("Failed to load users");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [api, refreshing, token]);

    useEffect(() => {
        if (token) {
            loadUsers();

            // current user ophalen
            api.get("/auth/me", authHeaders)
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
        loadUsers();
    };

    // =========================
    // ACTIONS
    // =========================
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

        const confirmActions = ["ban", "delete", "makeAdmin", "removeAdmin"];
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
                    await api.post(
                        `/api/admin/make-admin/${userId}`,
                        null,
                        authHeaders
                    );
                    Alert.alert("Success", "User promoted to admin!");
                    break;
                case "removeAdmin":
                    await api.post(
                        `/api/admin/remove-admin/${userId}`,
                        null,
                        authHeaders
                    );
                    Alert.alert("Success", "Admin role removed!");
                    break;
                case "ban":
                    await api.post(
                        `/api/admin/ban-user/${userId}`,
                        null,
                        authHeaders
                    );
                    Alert.alert("Success", "User banned!");
                    break;
                case "unban":
                    await api.post(
                        `/api/admin/unban-user/${userId}`,
                        null,
                        authHeaders
                    );
                    Alert.alert("Success", "User unbanned!");
                    break;
                case "delete":
                    await api.delete(
                        `/api/admin/delete-user/${userId}`,
                        authHeaders
                    );
                    Alert.alert("Success", "User deleted!");
                    break;
            }
            await loadUsers();
        } catch (err) {
            Alert.alert(
                "Error",
                err.response?.data?.error || `Failed to ${action} user`
            );
        } finally {
            setActionLoading((prev) => ({
                ...prev,
                [userId]: false,
            }));
        }
    };

    const handleBanUser = (user) =>
        handleUserAction(user.isBanned ? "unban" : "ban", user._id);
    const handleMakeAdmin = (userId, remove = false) =>
        handleUserAction(remove ? "removeAdmin" : "makeAdmin", userId);

    const openCreatorProfile = (user) => {
        // Pas "CreatorProfile" aan naar jouw echte route naam
        navigation.navigate("CreatorProfile", { userId: user._id });
    };

    // =========================
    // FILTER LOGIC
    // =========================
    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.username
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase()) ||
            user.email
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        if (filter === "creators") {
            return user.role === "creator" || user.isCreator;
        }
        if (filter === "admins") return user.role === "admin";
        if (filter === "banned") return user.isBanned;
        if (filter === "verified") return user.isVerified;

        return true; // all
    });

    // =========================
    // LOADING
    // =========================
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
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text
                    style={{
                        color: "#9ca3af",
                        marginTop: 8,
                    }}
                >
                    Loading creators...
                </Text>
            </View>
        );
    }

    // =========================
    // RENDER
    // =========================
    return (
        <View style={{ flex: 1, backgroundColor: "#030712" }}>
            <StatusBar
                barStyle="light-content"
                backgroundColor="#030712"
            />

            {/* HEADER */}
            <View
                style={{
                    paddingHorizontal: 16,
                    paddingTop: 16,
                    paddingBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}
            >
                <View>
                    <Text
                        style={{
                            color: "#22d3ee",
                            fontSize: 24,
                            fontWeight: "bold",
                        }}
                    >
                        👑 Creators
                    </Text>
                    <Text
                        style={{
                            color: "#6b7280",
                            fontSize: 12,
                            marginTop: 2,
                        }}
                    >
                        World-Studio • Full creator list
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{
                        backgroundColor: "rgba(255,255,255,0.05)",
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 12,
                    }}
                >
                    <Text
                        style={{
                            color: "#9ca3af",
                            fontWeight: "600",
                        }}
                    >
                        ← Back
                    </Text>
                </TouchableOpacity>
            </View>

            {error ? (
                <View
                    style={{
                        marginHorizontal: 16,
                        marginBottom: 8,
                        backgroundColor: "rgba(239,68,68,0.1)",
                        padding: 10,
                        borderRadius: 10,
                    }}
                >
                    <Text style={{ color: "#ef4444" }}>{error}</Text>
                </View>
            ) : null}

            {/* SEARCH + FILTERS */}
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
                <View style={{ paddingHorizontal: 16, marginBottom: 10 }}>
                    <TextInput
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        placeholder="Search creators..."
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
                        showsHorizontalScrollIndicator={false}
                    >
                        {[
                            { id: "creators", label: "Creators" },
                            { id: "all", label: "All Users" },
                            { id: "admins", label: "Admins" },
                            { id: "banned", label: "Banned" },
                            { id: "verified", label: "Verified" },
                        ].map((f) => (
                            <TouchableOpacity
                                key={f.id}
                                onPress={() => setFilter(f.id)}
                                style={{
                                    backgroundColor:
                                        filter === f.id
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
                                            filter === f.id
                                                ? "#000"
                                                : "#9ca3af",
                                        fontWeight: "600",
                                        fontSize: 12,
                                    }}
                                >
                                    {f.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* LIST */}
                <View style={{ paddingHorizontal: 16, paddingBottom: 40 }}>
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
                                onPress={openCreatorProfile}
                                onBan={handleBanUser}
                                onMakeAdmin={handleMakeAdmin}
                                currentUserId={currentUserId}
                                loading={actionLoading[user._id]}
                            />
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );
}
