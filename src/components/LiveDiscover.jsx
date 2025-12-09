// src/components/LiveDiscover.jsx - WORLD STUDIO LIVE EDITION 🌍 (MASTER U.E.)

import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
    Search,
    RefreshCw,
    Users,
    Radio,
    Filter,
    X,
    WifiOff,
    Play,
    Eye,
    Clock,
    TrendingUp,
} from "lucide-react";
import api from "../api/api";
import { getSocket } from "../api/socket";

/* ============================================================
   CONSTANTS
   ============================================================ */
const CATEGORIES = [
    { id: "All", icon: "🌍", label: "All" },
    { id: "Music", icon: "🎵", label: "Music" },
    { id: "Gaming", icon: "🎮", label: "Gaming" },
    { id: "Talk", icon: "💬", label: "Talk" },
    { id: "Art", icon: "🎨", label: "Art" },
    { id: "Education", icon: "📚", label: "Education" },
    { id: "Sports", icon: "⚽", label: "Sports" },
    { id: "Cooking", icon: "🍳", label: "Cooking" },
    { id: "Fitness", icon: "💪", label: "Fitness" },
    { id: "Entertainment", icon: "🎭", label: "Entertainment" },
    { id: "Technology", icon: "💻", label: "Tech" },
    { id: "Dance", icon: "💃", label: "Dance" },
];

const SORT_OPTIONS = [
    { id: "viewers", label: "Most Viewers", icon: "👁" },
    { id: "recent", label: "Most Recent", icon: "🕐" },
    { id: "trending", label: "Trending", icon: "🔥" },
];

const getCategoryIconAndLabel = (category) => {
    if (!category) return { icon: "✨", label: "Other" };
    const found = CATEGORIES.find(
        (c) => c.id.toLowerCase() === category.toLowerCase()
    );
    return found || { icon: "✨", label: category };
};

// ------------------------------------------------------------
// Stream Card Component
// ------------------------------------------------------------
const StreamCard = ({ stream, onClick }) => {
    const viewers = stream.viewers || stream.viewerCount || 0;
    const username =
        stream.streamerName ||
        stream.username ||
        stream.host?.username ||
        "Anonymous";
    const avatar =
        stream.streamerAvatar ||
        stream.avatar ||
        stream.host?.avatar ||
        "/defaults/default-avatar.png";
    const title = stream.title || "Untitled Stream";
    const category = stream.category || "Other";

    const { icon: categoryIcon, label: categoryLabel } =
        getCategoryIconAndLabel(category);

    const getStreamDuration = () => {
        const start = new Date(stream.startedAt || stream.createdAt || Date.now());
        const diff = Date.now() - start.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor(
            (diff % (1000 * 60 * 60)) / (1000 * 60)
        );
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <div
            onClick={() => onClick(stream)}
            className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden cursor-pointer hover:bg-white/10 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10 transition-all duration-300 transform hover:-translate-y-1"
        >
            <div className="relative aspect-video bg-gradient-to-br from-purple-900/50 to-blue-900/50 overflow-hidden">
                {stream.thumbnail || stream.coverImage ? (
                    <img
                        src={stream.thumbnail || stream.coverImage}
                        alt={title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                            e.target.style.display = "none";
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600/30 to-cyan-600/30">
                        <span className="text-5xl">🎥</span>
                    </div>
                )}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                        LIVE
                    </div>
                    <div className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded-full flex items-center gap-1">
                        <Clock size={10} />
                        {getStreamDuration()}
                    </div>
                </div>
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-sm rounded-full">
                    <Eye size={14} />
                    <span className="font-semibold">
                        {viewers.toLocaleString()}
                    </span>
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white text-xs rounded-full">
                    {categoryIcon} {categoryLabel}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex.items-end justify-center pb-4">
                    <span className="px-4 py-2 bg-cyan-500 rounded-full text-white font-semibold text-sm flex items-center gap-2">
                        <Play size={14} />
                        Watch Now
                    </span>
                </div>
            </div>
            <div className="p-4">
                <h3 className="font-bold text-white truncate group-hover:text-cyan-400 transition.mb-2">
                    {title}
                </h3>
                <div className="flex items-center gap-3">
                    <img
                        src={avatar}
                        alt={username}
                        className="w-8 h-8 rounded-full object-cover border-2 border-white/20"
                        onError={(e) => {
                            e.target.src = "/defaults/default-avatar.png";
                        }}
                    />
                    <div className="flex-1 min-w-0">
                        <p className="text-white/80 text-sm font-medium truncate">
                            {username}
                        </p>
                        <p className="text-white/40 text-xs">
                            {viewers} watching
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ------------------------------------------------------------
// Featured Stream Component
// ------------------------------------------------------------
const FeaturedStream = ({ stream, onClick }) => {
    if (!stream) return null;
    const viewers = stream.viewers || 0;
    const username =
        stream.streamerName ||
        stream.username ||
        stream.host?.username ||
        "Anonymous";
    const avatar =
        stream.streamerAvatar ||
        stream.avatar ||
        stream.host?.avatar ||
        "/defaults/default-avatar.png";

    const { icon: categoryIcon, label: categoryLabel } =
        getCategoryIconAndLabel(stream.category || "Live");

    return (
        <div
            onClick={() => onClick(stream)}
            className="relative rounded-2xl overflow-hidden cursor-pointer group mb-8"
        >
            <div className="aspect-[21/9] bg-gradient-to-br from-purple-900 to-cyan-900 relative">
                {stream.thumbnail || stream.coverImage ? (
                    <img
                        src={stream.thumbnail || stream.coverImage}
                        alt={stream.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-8xl">🎥</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm font-bold rounded-full">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            FEATURED
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 backdrop-blur-sm text-white text-sm rounded-full">
                            <Eye size={14} />
                            {viewers.toLocaleString()} watching
                        </div>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 max-w-2xl">
                        {stream.title || "Untitled Stream"}
                    </h2>
                    <div className="flex items-center gap-3">
                        <img
                            src={avatar}
                            alt={username}
                            className="w-10 h-10 rounded-full border-2 border-white/30"
                            onError={(e) => {
                                e.target.src = "/defaults/default-avatar.png";
                            }}
                        />
                        <div>
                            <p className="text-white font-semibold">
                                {username}
                            </p>
                            <p className="text-white/60 text-sm">
                                {categoryIcon} {categoryLabel}
                            </p>
                        </div>
                        <button className="ml-auto px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 rounded-full text-white font-semibold transition flex.items-center gap-2">
                            <Play size={16} />
                            Watch Now
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ------------------------------------------------------------
// Stats Bar Component
// ------------------------------------------------------------
const StatsBar = ({ totalStreams, totalViewers, isConnected }) => (
    <div className="flex items-center gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center gap-2">
            <div
                className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                    }`}
            />
            <span className="text-white/60 text-sm">
                {isConnected ? "Connected" : "Reconnecting..."}
            </span>
        </div>
        <div className="h-4 w-px bg-white/20" />
        <div className="flex items-center gap-2">
            <Radio size={16} className="text-red-400" />
            <span className="text-white font-semibold">{totalStreams}</span>
            <span className="text-white/60 text-sm">Streams</span>
        </div>
        <div className="h-4 w-px bg-white/20" />
        <div className="flex items-center gap-2">
            <Users.size />={16} className="text-cyan-400"
            <span className="text-white font-semibold">
                {totalViewers.toLocaleString()}
            </span>
            <span className="text-white/60 text-sm">Watching</span>
        </div>
    </div>
);

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function LiveDiscover() {
    const navigate = useNavigate();
    const socketRef = useRef(null);

    const [streams, setStreams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortBy, setSortBy] = useState("viewers");
    const [currentUser, setCurrentUser] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isConnected, setIsConnected] = useState(true);
    const [showFilters, setShowFilters] = useState(false);
    const hasFetched = useRef(false);

    // Socket init
    useEffect(() => {
        socketRef.current = getSocket();
        return () => {
            // singleton: niet disconnecten
        };
    }, []);

    // Load user
    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                // ignore
            }
        }
    }, []);

    // Fetch streams
    const fetchStreams = useCallback(async (showToast = false) => {
        try {
            setError(null);

            // ✅ belangrijk: geen /api hier, api.js heeft baseURL = .../api
            const res = await api.get("/live?isLive=true");
            const allStreams = Array.isArray(res.data)
                ? res.data
                : res.data?.streams || [];

            const verifiedStreams = allStreams.filter((stream) => {
                if (!stream.isLive) return false;

                const streamDate = new Date(
                    stream.startedAt || stream.createdAt || Date.now()
                );
                const hoursSinceStart =
                    (Date.now() - streamDate.getTime()) / (1000 * 60 * 60);

                // Auto-clean oude zombie streams
                if (hoursSinceStart > 12) {
                    api.post(`/live/${stream._id}/end`).catch(() => { });
                    return false;
                }

                const lastActivity = stream.updatedAt
                    ? new Date(stream.updatedAt)
                    : streamDate;
                const hoursSinceActivity =
                    (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);

                if (hoursSinceActivity > 2 && hoursSinceStart > 2) {
                    api.post(`/live/${stream._id}/end`).catch(() => { });
                    return false;
                }

                return true;
            });

            setStreams(verifiedStreams);
            if (showToast) {
                toast.success(`Found ${verifiedStreams.length} live streams`);
            }
        } catch (err) {
            console.error("Failed to fetch streams:", err);
            setError("Failed to load streams");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (!hasFetched.current) {
            hasFetched.current = true;
            fetchStreams();
        }
    }, [fetchStreams]);

    // Socket connection status
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        setIsConnected(socket.connected);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
        };
    }, []);

    // Socket live events
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleStreamStarted = (data) => {
            toast.success(
                `🔴 ${data.streamerName || data.username || "Someone"} went live!`,
                { duration: 5000, icon: "📺" }
            );
            setStreams((prev) => {
                const exists = prev.some(
                    (s) =>
                        s._id === data._id ||
                        s._id === data.streamId ||
                        s.streamId === data.streamId
                );
                if (exists) return prev;
                return [
                    {
                        ...data,
                        _id: data._id || data.streamId,
                        isLive: true,
                        viewers: data.viewers || 0,
                        startedAt: new Date().toISOString(),
                    },
                    ...prev,
                ];
            });
        };

        const handleStreamEnded = (data) => {
            const endedId = data._id || data.streamId;
            setStreams((prev) =>
                prev.filter((s) => s._id !== endedId && s.streamId !== endedId)
            );
        };

        const handleViewerUpdate = (data) => {
            setStreams((prev) =>
                prev.map((s) =>
                    s._id === data.streamId ||
                        s._id === data._id ||
                        s.streamId === data.streamId
                        ? {
                            ...s,
                            viewers: data.viewers || data.count || s.viewers,
                        }
                        : s
                )
            );
        };

        socket.on("stream_started", handleStreamStarted);
        socket.on("new_stream", handleStreamStarted);
        socket.on("live_started", handleStreamStarted);

        socket.on("stream_ended", handleStreamEnded);
        socket.on("stream_stopped", handleStreamEnded);
        socket.on("live_stopped", handleStreamEnded);
        socket.on("live_ended", handleStreamEnded);

        socket.on("viewer_update", handleViewerUpdate);
        socket.on("viewer_count", handleViewerUpdate);

        socket.emit("join_discover");

        return () => {
            socket.off("stream_started", handleStreamStarted);
            socket.off("new_stream", handleStreamStarted);
            socket.off("live_started", handleStreamStarted);

            socket.off("stream_ended", handleStreamEnded);
            socket.off("stream_stopped", handleStreamEnded);
            socket.off("live_stopped", handleStreamEnded);
            socket.off("live_ended", handleStreamEnded);

            socket.off("viewer_update", handleViewerUpdate);
            socket.off("viewer_count", handleViewerUpdate);
            socket.emit("leave_discover");
        };
    }, []);

    // Periodic refresh
    useEffect(() => {
        const interval = setInterval(() => fetchStreams(), 30000);
        return () => clearInterval(interval);
    }, [fetchStreams]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchStreams(true);
    };

    const filteredStreams = streams
        .filter((stream) => {
            const categoryValue = stream.category || "Other";
            if (
                selectedCategory !== "All" &&
                categoryValue.toLowerCase() !== selectedCategory.toLowerCase()
            )
                return false;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const title = (stream.title || "").toLowerCase();
                const username = (
                    stream.streamerName ||
                    stream.username ||
                    stream.host?.username ||
                    ""
                ).toLowerCase();
                if (!title.includes(query) && !username.includes(query))
                    return false;
            }
            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case "viewers":
                    return (b.viewers || 0) - (a.viewers || 0);
                case "recent":
                    return (
                        new Date(b.startedAt || b.createdAt || 0) -
                        new Date(a.startedAt || a.createdAt || 0)
                    );
                case "trending": {
                    const aScore =
                        (a.viewers || 0) * 2 -
                        (Date.now() -
                            new Date(a.startedAt || a.createdAt || Date.now()).getTime()) /
                        3600000;
                    const bScore =
                        (b.viewers || 0) * 2 -
                        (Date.now() -
                            new Date(b.startedAt || b.createdAt || Date.now()).getTime()) /
                        3600000;
                    return bScore - aScore;
                }
                default:
                    return 0;
            }
        });

    const featuredStream =
        filteredStreams.length > 1
            ? [...filteredStreams].sort(
                (a, b) => (b.viewers || 0) - (a.viewers || 0)
            )[0]
            : null;

    const otherStreams = featuredStream
        ? filteredStreams.filter((s) => s._id !== featuredStream._id)
        : filteredStreams;

    const totalViewers = streams.reduce(
        (sum, s) => sum + (s.viewers || 0),
        0
    );

    const handleJoinStream = (stream) =>
        navigate(`/live/${stream._id || stream.streamId || stream.roomId}`);

    const handleStartStream = () => {
        if (!currentUser) {
            toast.error("Please login to start streaming");
            navigate("/login");
            return;
        }
        navigate("/go-live");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                    <p className="text-white/70">Discovering streams...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10">
                    <WifiOff className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400.mb-4">{error}</p>
                    <button
                        onClick={() => {
                            setLoading(true);
                            fetchStreams();
                        }}
                        className="px-6 py-2 bg-cyan-500 rounded-lg hover:bg-cyan-400 transition"
                    >
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6 text-white">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <span className="text-4xl">🌍</span>
                        Live Discovery
                    </h1>
                    <p className="text-white/60 mt-1">
                        Watch live streams from creators worldwide
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative flex-1 md:w-72">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
                            size={18}
                        />
                        <input
                            type="text"
                            placeholder="Search streams..."
                            value={searchQuery}
                            onChange={(e) =>
                                setSearchQuery(e.target.value)
                            }
                            className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:border-cyan-400 outline-none transition"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setShowFilters((prev) => !prev)}
                        className={`p-2.5 rounded-xl border transition ${showFilters
                            ? "bg-cyan-500 border-cyan-500"
                            : "bg-white/10 border-white/20 hover:bg-white/20"
                            }`}
                    >
                        <Filter size={20} />
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-2.5 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition.disabled:opacity-50"
                    >
                        <RefreshCw
                            size={20}
                            className={isRefreshing ? "animate-spin" : ""}
                        />
                    </button>
                </div>
            </div>

            <StatsBar
                totalStreams={streams.length}
                totalViewers={totalViewers}
                isConnected={isConnected}
            />

            {showFilters && (
                <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10 animate-fadeIn">
                    <div className="mb-4">
                        <p className="text-white/60 text-sm mb-2">
                            Sort by
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {SORT_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setSortBy(option.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${sortBy === option.id
                                        ? "bg-cyan-500 text-white"
                                        : "bg-white/10 text-white/70 hover:bg-white/20"
                                        }`}
                                >
                                    <span>{option.icon}</span>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-white/60 text-sm mb-2">
                            Categories
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() =>
                                        setSelectedCategory(category.id)
                                    }
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${selectedCategory === category.id
                                        ? "bg-cyan-500 text-white"
                                        : "bg-white/10 text-white/70 hover:bg-white/20"
                                        }`}
                                >
                                    <span>{category.icon}</span>
                                    {category.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!showFilters && (
                <div className="flex.gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {CATEGORIES.slice(0, 8).map((category) => (
                        <button
                            key={category.id}
                            onClick={() =>
                                setSelectedCategory(category.id)
                            }
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === category.id
                                ? "bg-cyan-500 text-white"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                                }`}
                        >
                            <span>{category.icon}</span>
                            {category.label}
                        </button>
                    ))}
                </div>
            )}

            {filteredStreams.length === 0 ? (
                <div className="text-center py-20">
                    <div className="w-24 h-24 mx-auto mb-6 bg-white/5 rounded-full flex.items-center justify-center">
                        <Radio size={40} className="text-white/30" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                        No Live Streams
                    </h3>
                    <p className="text-white/60 mb-6">
                        {searchQuery
                            ? `No streams matching "${searchQuery}"`
                            : "Be the first to go live!"}
                    </p>
                    <button
                        onClick={handleStartStream}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg transition"
                    >
                        🎥 Start Streaming
                    </button>
                </div>
            ) : (
                <>
                    {featuredStream && filteredStreams.length > 1 && (
                        <FeaturedStream
                            stream={featuredStream}
                            onClick={handleJoinStream}
                        />
                    )}
                    <p className="text-white/60 mb-4 flex items-center gap-2">
                        <TrendingUp size={16} />
                        {filteredStreams.length} stream
                        {filteredStreams.length !== 1 ? "s" : ""} live
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                        {(featuredStream && filteredStreams.length > 1
                            ? otherStreams
                            : filteredStreams
                        ).map((stream) => (
                            <StreamCard
                                key={stream._id || stream.streamId || stream.roomId}
                                stream={stream}
                                onClick={handleJoinStream}
                            />
                        ))}
                    </div>
                </>
            )}

            <div className="text-center py-12 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-blue-500/10 rounded-2xl border border-white/10">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Radio size={32} />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                    Ready to Go Live?
                </h2>
                <p className="text-white/60 mb-6">
                    Share your talent and earn rewards
                </p>
                <button
                    onClick={handleStartStream}
                    className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all"
                >
                    🎥 Start My Live Stream
                </button>
            </div>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
            `}</style>
        </div>
    );
}

