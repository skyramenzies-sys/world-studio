// src/components/ProfilePage.jsx - Universum Edition 🌌
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Loader2,
    ArrowLeft,
    Video,
    Gift,
    Users,
    Wallet as WalletIcon,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../api/api";
import GiftPanel from "./GiftPanel";

/* ============================================================
   CONFIG & HELPERS
   ============================================================ */

const RAW_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "https://world-studio-production.up.railway.app";

const API_BASE_URL = RAW_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");

const resolveAvatar = (url) => {
    if (!url) return `${API_BASE_URL}/defaults/default-avatar.png`;
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

// Helpers om veilig localStorage te lezen
const getStoredUser = () => {
    if (typeof window === "undefined") return null;
    try {
        const raw =
            window.localStorage.getItem("ws_currentUser") ||
            window.localStorage.getItem("user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

export default function ProfilePage() {
    const { userId: routeUserId } = useParams();
    const navigate = useNavigate();


    const [profile, setProfile] = useState(null);
    const [streams, setStreams] = useState([]);
    const [receivedGifts, setReceivedGifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const viewer = useMemo(() => getStoredUser(), []);
    const targetUserId = useMemo(
        () =>
            routeUserId ||
            viewer?._id ||
            viewer?.id ||
            viewer?.userId ||
            null,
        [routeUserId, viewer]
    );

    const isOwnProfile = useMemo(() => {
        if (!viewer || !targetUserId) return false;
        const vId = viewer._id || viewer.id || viewer.userId;
        return String(vId) === String(targetUserId);
    }, [viewer, targetUserId]);

    /* ============================================================
       LOAD PROFILE + STREAMS + GIFTS
       ============================================================ */
    useEffect(() => {

        if (!targetUserId) {
            setError("No user profile found");
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setError("");

        const fetchAll = async () => {
            try {
                // scroll naar boven bij nieuwe user
                if (typeof window !== "undefined") {
                    window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                    });
                }

                const [profileRes, streamsRes, giftsRes] =
                    await Promise.all([
                        api
                            .get(`/api/users/${targetUserId}`)
                            .catch(() => ({ data: null })),
                        api
                            .get("/live", {
                                params: { userId: targetUserId },
                            })
                            .catch(() => ({ data: [] })),
                        // gifts voor ingelogde user (token via interceptor)
                        api
                            .get("/api/gifts/received")
                            .catch(() => ({ data: [] })),
                    ]);

                if (cancelled) return;

                if (!profileRes.data) {
                    setError("User not found");
                    setProfile(null);
                    setStreams([]);
                    setReceivedGifts([]);
                    return;
                }

                const userData = profileRes.data;
                userData.avatar = resolveAvatar(userData.avatar);

                setProfile(userData);
                setStreams(
                    streamsRes.data?.streams ||
                    streamsRes.data ||
                    []
                );
                setReceivedGifts(
                    giftsRes.data?.gifts ||
                    giftsRes.data ||
                    []
                );
            } catch (err) {
                console.error(
                    "Failed to fetch profile:",
                    err
                );
                if (!cancelled) {
                    setError("Failed to load profile");
                    toast.error("Failed to load profile");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchAll();

        return () => {
            cancelled = true;
        };
    }, [targetUserId]);

    /* ============================================================
       STATS & WALLET
       ============================================================ */

    const wallet = profile?.wallet || {};
    const stats = {
        followers:
            profile?.followers?.length ??
            profile?.followersCount ??
            0,
        following:
            profile?.following?.length ??
            profile?.followingCount ??
            0,
        streams:
            profile?.totalStreams ??
            (streams ? streams.length : 0),
        coins: wallet.balance ?? 0,
        earnings: profile?.totalEarnings ?? 0,
        totalReceived: wallet.totalReceived ?? 0,
        totalSpent: wallet.totalSpent ?? 0,
    };

    /* ============================================================
       RENDER STATES
       ============================================================ */

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                    <p className="text-white/70">
                        Loading profile...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
                <div className="text-center max-w-md">
                    <div className="w-24 h-24 mx-auto mb-6 bg-white/5 rounded-full flex items-center justify-center">
                        <span className="text-5xl">😢</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {error === "User not found"
                            ? "User Not Found"
                            : "Profile Error"}
                    </h1>
                    <p className="text-white/60 mb-6">
                        {error === "User not found"
                            ? "This creator may have deleted their account or it never existed."
                            : error ||
                            "Something went wrong while loading this profile."}
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-3 bg-white/10 rounded-xl font-semibold hover:bg-white/20 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    /* ============================================================
       MAIN RENDER
       ============================================================ */

    const joinedAt = profile.createdAt
        ? new Date(
            profile.createdAt
        ).toLocaleDateString()
        : null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold">
                            {isOwnProfile
                                ? "My Profile"
                                : "Creator Profile"}
                        </h1>
                        {joinedAt && (
                            <p className="text-xs text-white/50">
                                Joined {joinedAt}
                            </p>
                        )}
                    </div>
                </div>

                {/* Top Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-4 flex-1">
                        <img
                            src={
                                profile.avatar ||
                                `${API_BASE_URL}/defaults/default-avatar.png`
                            }
                            alt="avatar"
                            className="w-20 h-20 rounded-full object-cover border-4 border-cyan-500/50"
                            onError={(e) => {
                                e.target.src = `${API_BASE_URL}/defaults/default-avatar.png`;
                            }}
                        />
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-2xl font-bold truncate">
                                    {profile.username ||
                                        "Unknown"}
                                </h2>
                                {profile.role ===
                                    "admin" && (
                                        <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                                            👑 ADMIN
                                        </span>
                                    )}
                                {profile.isVerified && (
                                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                        ✓ Verified
                                    </span>
                                )}
                            </div>
                            {profile.email && (
                                <p className="text-white/50 text-xs mt-1 truncate">
                                    {profile.email}
                                </p>
                            )}
                            {profile.bio && (
                                <p className="text-white/70 text-sm mt-2 line-clamp-2">
                                    {profile.bio}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col items-stretch gap-2 w-full md:w-auto">
                        {isOwnProfile ? (
                            <>
                                <button
                                    onClick={() =>
                                        toast(
                                            "Edit profile coming soon ✨",
                                            { icon: "⚙️" }
                                        )
                                    }
                                    className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold transition"
                                >
                                    Edit Profile
                                </button>
                                <button
                                    onClick={() =>
                                        navigate(
                                            "/upload"
                                        )
                                    }
                                    className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:shadow-lg text-sm font-semibold transition"
                                >
                                    Go Live / Upload
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() =>
                                        toast(
                                            "Follow feature coming soon ✨",
                                            {
                                                icon: "➕",
                                            }
                                        )
                                    }
                                    className="w-full px-4 py-2 rounded-xl bg-cyan-500/80 hover:bg-cyan-500 text-sm font-semibold transition"
                                >
                                    Follow
                                </button>
                                <button
                                    onClick={() =>
                                        toast(
                                            "Chat / DM feature coming soon ✉️",
                                            {
                                                icon: "✉️",
                                            }
                                        )
                                    }
                                    className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold transition"
                                >
                                    Message
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-xs text-white/50 mb-1">
                            Followers
                        </p>
                        <p className="text-xl font-bold text-cyan-400">
                            {stats.followers}
                        </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-xs text-white/50 mb-1">
                            Following
                        </p>
                        <p className="text-xl font-bold text-purple-400">
                            {stats.following}
                        </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-xs text-white/50 mb-1">
                            Streams
                        </p>
                        <p className="text-xl font-bold text-pink-400">
                            {stats.streams}
                        </p>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                        <p className="text-xs text-white/50 mb-1">
                            Coins (Balance)
                        </p>
                        <p className="text-xl font-bold text-yellow-400">
                            🪙 {stats.coins}
                        </p>
                    </div>
                </div>

                {/* Wallet Card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <WalletIcon className="w-4 h-4 text-emerald-400" />
                        <h3 className="font-semibold text-sm text-white/80">
                            Wallet & Earnings
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-black/20 rounded-xl p-3">
                            <p className="text-xs text-white/50 mb-1">
                                Current Balance
                            </p>
                            <p className="text-lg font-bold text-yellow-400">
                                🪙 {stats.coins}
                            </p>
                        </div>
                        <div className="bg-black/20 rounded-xl p-3">
                            <p className="text-xs text-white/50 mb-1">
                                Total Received
                            </p>
                            <p className="text-lg font-bold text-emerald-400">
                                🪙 {stats.totalReceived}
                            </p>
                        </div>
                        <div className="bg-black/20 rounded-xl p-3">
                            <p className="text-xs text-white/50 mb-1">
                                Total Spent
                            </p>
                            <p className="text-lg font-bold text-red-400">
                                🪙 {stats.totalSpent}
                            </p>
                        </div>
                    </div>
                    {stats.earnings > 0 && (
                        <p className="mt-3 text-xs text-white/60">
                            Estimated earnings:{" "}
                            <span className="font-semibold text-emerald-400">
                                {stats.earnings}
                            </span>
                        </p>
                    )}
                </div>

                {/* Layout: Streams + Gifts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Streams & activity */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Video className="w-4 h-4 text-red-400" />
                            <h3 className="font-semibold text-sm text-white/80">
                                Live & Recent Streams
                            </h3>
                        </div>
                        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                            {streams.length === 0 ? (
                                <p className="text-white/40 text-sm py-4 text-center">
                                    {isOwnProfile
                                        ? "You haven't gone live yet. Start your first stream!"
                                        : "This creator has no streams yet."}
                                </p>
                            ) : (
                                streams.map((s) => (
                                    <div
                                        key={s._id}
                                        className={`flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 ${s.isLive
                                                ? "border-red-500/50 bg-red-500/10"
                                                : ""
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {s.isLive && (
                                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                                            )}
                                            <div className="min-w-0">
                                                <p className="text-sm font-semibold truncate">
                                                    {s.title ||
                                                        "Untitled Stream"}
                                                </p>
                                                <p className="text-xs text-white/50">
                                                    {s.category ||
                                                        "General"}{" "}
                                                    • 👁{" "}
                                                    {s.viewers || 0}
                                                </p>
                                            </div>
                                        </div>
                                        {s.isLive && (
                                            <button
                                                onClick={() =>
                                                    navigate(
                                                        `/live/${s._id}`
                                                    )
                                                }
                                                className="text-xs px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 font-semibold transition"
                                            >
                                                Watch Live
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Gifts + Community */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Gift className="w-4 h-4 text-pink-400" />
                            <h3 className="font-semibold text-sm text-white/80">
                                {isOwnProfile
                                    ? "My Gifts"
                                    : "Recent Gifts"}
                            </h3>

                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                            {isOwnProfile ? (
                                <GiftPanel
                                    receivedGifts={
                                        receivedGifts
                                    }
                                    user={profile}
                                />
                            ) : receivedGifts.length ===
                                0 ? (
                                <p className="text-white/40 text-sm text-center py-4">
                                    No public gift data.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                    {receivedGifts
                                        .slice(0, 5)
                                        .map((g) => (
                                            <div
                                                key={g._id}
                                                className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-2 py-1.5"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span>
                                                        🎁
                                                    </span>
                                                    <span className="truncate">
                                                        {g.fromUsername ||
                                                            "Anonymous"}{" "}
                                                        →{" "}
                                                        {g.giftName ||
                                                            "Gift"}
                                                    </span>
                                                </div>
                                                <span className="text-pink-400 font-semibold">
                                                    {g.coins ||
                                                        g.amount ||
                                                        0}
                                                    🪙
                                                </span>
                                            </div>
                                        ))}
                                    {receivedGifts.length >
                                        5 && (
                                            <p className="text-white/40 text-[11px] text-right mt-1">
                                                +
                                                {receivedGifts.length -
                                                    5}{" "}
                                                more
                                            </p>
                                        )}
                                </div>
                            )}
                        </div>

                        {/* Social proof */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Users className="w-4 h-4 text-cyan-400" />
                                <p className="text-xs font-semibold text-white/80">
                                    Community
                                </p>
                            </div>
                            <p className="text-xs text-white/60">
                                {isOwnProfile
                                    ? "Keep streaming, posting and engaging – your World-Studio community grows with every live session."
                                    : "Follow and support this creator to help their World-Studio journey grow."}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
