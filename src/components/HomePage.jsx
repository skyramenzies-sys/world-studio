// src/components/HomePage.jsx - WORLD STUDIO LIVE EDITION 🏠
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, RefreshCw, TrendingUp, Users, Zap, Search, Radio, Heart, MessageCircle, Share2, Bookmark } from "lucide-react";
import { toast } from "react-hot-toast";
import useSWR from "swr";
import axios from "axios";
import { io } from "socket.io-client";
import PostCard from "./PostCard";

/* ============================================================
   WORLD STUDIO LIVE CONFIGURATION
   ============================================================ */
const API_BASE_URL = "https://world-studio-production.up.railway.app";
const SOCKET_URL = "https://world-studio-production.up.railway.app";

// Create API instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("ws_token") || localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Socket connection (singleton)
let socket = null;
const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
    }
    return socket;
};

// SWR Fetcher
const fetcher = (url) => api.get(url).then((r) => r.data);

/* ============================================================
   LIVE STORIES COMPONENT
   ============================================================ */
const LiveStories = ({ lives, onWatch }) => {
    if (!lives || lives.length === 0) return null;

    return (
        <div className="mb-6">
            <h3 className="text-white/70 text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="relative">
                    <span className="w-2 h-2 bg-red-500 rounded-full block" />
                    <span className="absolute inset-0 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                </span>
                Live Now
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {lives.map((live) => (
                    <button
                        key={live._id}
                        onClick={() => onWatch(live)}
                        className="flex-shrink-0 flex flex-col items-center gap-2 group"
                    >
                        <div className="relative">
                            <div className="w-16 h-16 rounded-full p-[3px] bg-gradient-to-tr from-red-500 via-pink-500 to-purple-500 group-hover:scale-105 transition">
                                <img
                                    src={live.host?.avatar || live.streamerAvatar || "/defaults/default-avatar.png"}
                                    alt={live.host?.username || live.streamerName}
                                    className="w-full h-full rounded-full object-cover border-2 border-gray-900"
                                    onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                                />
                            </div>
                            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full shadow-lg">
                                LIVE
                            </span>
                            {live.viewers > 0 && (
                                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-black/80 text-white text-[9px] rounded-full">
                                    {live.viewers > 999 ? `${(live.viewers / 1000).toFixed(1)}k` : live.viewers}
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-white/70 truncate max-w-[70px] group-hover:text-white transition">
                            {live.host?.username || live.streamerName}
                        </span>
                    </button>
                ))}

                {/* Go Live Button */}
                <button
                    onClick={() => window.location.href = "/go-live"}
                    className="flex-shrink-0 flex flex-col items-center gap-2 group"
                >
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center group-hover:border-cyan-400 transition">
                        <Plus className="w-6 h-6 text-white/40 group-hover:text-cyan-400 transition" />
                    </div>
                    <span className="text-xs text-white/50 group-hover:text-cyan-400 transition">Go Live</span>
                </button>
            </div>
        </div>
    );
};

/* ============================================================
   QUICK STATS COMPONENT
   ============================================================ */
const QuickStats = ({ stats }) => (
    <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-4 border border-cyan-500/20 hover:border-cyan-500/40 transition">
            <TrendingUp className="w-5 h-5 text-cyan-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.posts?.toLocaleString() || 0}</p>
            <p className="text-xs text-white/50">Total Posts</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20 hover:border-purple-500/40 transition">
            <Users className="w-5 h-5 text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.users?.toLocaleString() || 0}</p>
            <p className="text-xs text-white/50">Creators</p>
        </div>
        <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-xl p-4 border border-red-500/20 hover:border-red-500/40 transition">
            <Radio className="w-5 h-5 text-red-400 mb-2" />
            <p className="text-2xl font-bold text-white">{stats.live || 0}</p>
            <p className="text-xs text-white/50">Live Now</p>
        </div>
    </div>
);

/* ============================================================
   SUGGESTED USERS COMPONENT
   ============================================================ */
const SuggestedUsers = ({ users, onFollow }) => {
    if (!users || users.length === 0) return null;

    return (
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 mb-6">
            <h3 className="text-white/70 text-sm font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Suggested Creators
            </h3>
            <div className="space-y-3">
                {users.slice(0, 3).map((user) => (
                    <div key={user._id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img
                                src={user.avatar || "/defaults/default-avatar.png"}
                                alt={user.username}
                                className="w-10 h-10 rounded-full object-cover"
                                onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                            />
                            <div>
                                <p className="text-sm font-semibold text-white">{user.username}</p>
                                <p className="text-xs text-white/50">{user.followers || 0} followers</p>
                            </div>
                        </div>
                        <button
                            onClick={() => onFollow(user)}
                            className="px-3 py-1 bg-cyan-500 text-white text-xs font-semibold rounded-lg hover:bg-cyan-400 transition"
                        >
                            Follow
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function HomePage() {
    const navigate = useNavigate();
    const feedRef = useRef(null);
    const observerRef = useRef(null);
    const socketRef = useRef(null);

    const [currentUser, setCurrentUser] = useState(null);
    const [filter, setFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [allPosts, setAllPosts] = useState([]);
    const [suggestedUsers, setSuggestedUsers] = useState([]);

    // Initialize socket
    useEffect(() => {
        socketRef.current = getSocket();
        return () => {
            // Don't disconnect - singleton
        };
    }, []);

    // Load user
    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                user.following = Array.isArray(user.following) ? user.following : [];
                setCurrentUser(user);
            } catch (e) { }
        }

        const handleAuthChange = () => {
            const updated = localStorage.getItem("ws_currentUser");
            if (updated) {
                try { setCurrentUser(JSON.parse(updated)); } catch (e) { }
            } else {
                setCurrentUser(null);
            }
        };

        window.addEventListener("auth-change", handleAuthChange);
        return () => window.removeEventListener("auth-change", handleAuthChange);
    }, []);

    // Fetch posts
    const { data, error, isLoading, mutate } = useSWR(
        `/api/posts?page=${page}&limit=20`,
        fetcher,
        {
            refreshInterval: 30000,
            revalidateOnFocus: true,
            onSuccess: (newData) => {
                const posts = Array.isArray(newData) ? newData : newData?.posts || [];
                if (page === 1) {
                    setAllPosts(posts);
                } else {
                    setAllPosts(prev => {
                        const existingIds = new Set(prev.map(p => p._id));
                        const newPosts = posts.filter(p => !existingIds.has(p._id));
                        return [...prev, ...newPosts];
                    });
                }
                setHasMore(posts.length === 20);
            }
        }
    );

    // Fetch live streams
    const { data: liveData } = useSWR("/api/live?isLive=true", fetcher, {
        refreshInterval: 15000,
    });

    // Fetch suggested users
    useEffect(() => {
        if (currentUser) {
            api.get("/api/users/suggested?limit=5")
                .then(res => setSuggestedUsers(Array.isArray(res.data?.users) ? res.data.users : Array.isArray(res.data) ? res.data : []))
                .catch(() => { });
        }
    }, [currentUser]);

    // Socket events
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        socket.on("post_created", (newPost) => {
            setAllPosts(prev => [newPost, ...prev]);
            toast.success("🆕 New post in feed!");
        });

        socket.on("post_deleted", ({ postId }) => {
            setAllPosts(prev => prev.filter(p => p._id !== postId));
        });

        socket.on("update_likes", ({ postId, likes, likedBy }) => {
            setAllPosts(prev => prev.map(p =>
                p._id === postId ? { ...p, likes, likedBy } : p
            ));
        });

        socket.on("update_comments", ({ postId, comments }) => {
            setAllPosts(prev => prev.map(p =>
                p._id === postId ? { ...p, comments } : p
            ));
        });

        socket.on("live_started", (stream) => {
            toast(`🔴 ${stream.streamerName || stream.host?.username} is live!`, {
                icon: "📺",
                duration: 5000,
            });
        });

        return () => {
            socket.off("post_created");
            socket.off("post_deleted");
            socket.off("update_likes");
            socket.off("update_comments");
            socket.off("live_started");
        };
    }, []);

    // Infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !isLoading) {
                    setPage(prev => prev + 1);
                }
            },
            { threshold: 0.1 }
        );

        if (observerRef.current) observer.observe(observerRef.current);
        return () => observer.disconnect();
    }, [hasMore, isLoading]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setPage(1);
        await mutate();
        setIsRefreshing(false);
        toast.success("Feed refreshed!");
    };

    const handleDeletePost = useCallback((postId) => {
        setAllPosts(prev => prev.filter(p => p._id !== postId));
        socketRef.current?.emit("post_deleted", { postId });
    }, []);

    const handleUpdatePost = useCallback((updatedPost) => {
        setAllPosts(prev => prev.map(p =>
            p._id === updatedPost._id ? updatedPost : p
        ));
    }, []);

    const handleWatchLive = (live) => {
        navigate(`/live/${live._id || live.roomId}`);
    };

    const handleFollowUser = async (user) => {
        if (!currentUser) {
            toast.error("Please log in to follow users");
            return;
        }

        try {
            await api.post(`/api/users/${user._id}/follow`);
            toast.success(`Following ${user.username}!`);
            setSuggestedUsers(prev => prev.filter(u => u._id !== user._id));

            // Update local user
            const updatedUser = {
                ...currentUser,
                following: [...(currentUser.following || []), user._id]
            };
            localStorage.setItem("ws_currentUser", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);
        } catch (err) {
            toast.error("Failed to follow user");
        }
    };

    // Filter posts
    const filteredPosts = allPosts.filter(post => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                post.title?.toLowerCase().includes(query) ||
                post.description?.toLowerCase().includes(query) ||
                post.username?.toLowerCase().includes(query) ||
                post.caption?.toLowerCase().includes(query);
            if (!matchesSearch) return false;
        }

        if (filter === "following" && currentUser) {
            const authorId = post.userId?._id || post.userId || post.authorId;
            return currentUser.following.some(id => String(id) === String(authorId));
        }

        return true;
    });

    const sortedPosts = filter === "trending"
        ? [...filteredPosts].sort((a, b) => (b.likes || 0) - (a.likes || 0))
        : filteredPosts;

    const lives = Array.isArray(liveData) ? liveData : liveData?.streams || [];
    const stats = { posts: allPosts.length, users: suggestedUsers.length, live: lives.length };

    // Loading state
    if (isLoading && page === 1) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                    <p className="text-white/70">Loading feed...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error && page === 1) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center p-8 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-6xl mb-4">😕</p>
                    <p className="text-red-400 mb-4">Failed to load feed</p>
                    <button onClick={() => mutate()} className="px-6 py-2 bg-cyan-500 rounded-lg hover:bg-cyan-400 transition">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="text-white min-h-screen">
            <div className="max-w-2xl mx-auto py-6 px-4" ref={feedRef}>

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        Feed
                    </h1>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSearch(!showSearch)}
                            className={`p-2 rounded-xl transition ${showSearch ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                        >
                            <Search size={20} />
                        </button>
                        <button
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="p-2 bg-white/10 rounded-xl text-white/70 hover:bg-white/20 transition disabled:opacity-50"
                        >
                            <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                {showSearch && (
                    <div className="mb-6 animate-fadeIn">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                            <input
                                type="text"
                                placeholder="Search posts, users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition"
                                autoFocus
                            />
                            {searchQuery && (
                                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Welcome Card */}
                {currentUser && (
                    <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 p-4 rounded-xl border border-cyan-500/20 mb-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img
                                    src={currentUser.avatar || "/defaults/default-avatar.png"}
                                    alt=""
                                    className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500/50"
                                    onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                                />
                                <div>
                                    <p className="text-white/80">
                                        Welcome back, <span className="text-cyan-400 font-semibold">{currentUser.username}</span>! 👋
                                    </p>
                                    <p className="text-xs text-white/50 flex items-center gap-2">
                                        <span>💰 {currentUser.wallet?.balance?.toLocaleString() || 0} coins</span>
                                        <span>•</span>
                                        <span>👥 {currentUser.followers?.length || 0} followers</span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => navigate("/upload")}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold text-sm hover:shadow-lg hover:scale-105 transition"
                            >
                                <Plus size={18} />
                                Post
                            </button>
                        </div>
                    </div>
                )}

                {/* Not logged in */}
                {!currentUser && (
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 p-6 rounded-xl border border-purple-500/20 mb-6 text-center">
                        <p className="text-white/80 mb-4">Join World Studio to connect with creators!</p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => navigate("/login")}
                                className="px-6 py-2 bg-white/10 rounded-xl hover:bg-white/20 transition"
                            >
                                Log In
                            </button>
                            <button
                                onClick={() => navigate("/register")}
                                className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg transition"
                            >
                                Sign Up
                            </button>
                        </div>
                    </div>
                )}

                {/* Stats */}
                <QuickStats stats={stats} />

                {/* Live Stories */}
                <LiveStories lives={lives} onWatch={handleWatchLive} />

                {/* Suggested Users */}
                <SuggestedUsers users={suggestedUsers} onFollow={handleFollowUser} />

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                        { id: "all", label: "For You", icon: "✨" },
                        { id: "following", label: "Following", icon: "👥" },
                        { id: "trending", label: "Trending", icon: "🔥" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setFilter(tab.id); setPage(1); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${filter === tab.id
                                ? "bg-cyan-500 text-white"
                                : "bg-white/10 text-white/70 hover:bg-white/20"
                                }`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Posts */}
                {sortedPosts.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-6xl mb-4">{filter === "following" ? "👥" : searchQuery ? "🔍" : "📭"}</p>
                        <p className="text-white/60 mb-2">
                            {filter === "following"
                                ? "No posts from people you follow"
                                : searchQuery
                                    ? `No results for "${searchQuery}"`
                                    : "No posts yet"
                            }
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={() => filter === "following" ? navigate("/discover") : navigate("/upload")}
                                className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg transition"
                            >
                                {filter === "following" ? "Discover Creators" : "Create First Post"}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {sortedPosts.map((post) => (
                            <PostCard
                                key={post._id}
                                post={post}
                                onUpdate={handleUpdatePost}
                                onDelete={handleDeletePost}
                            />
                        ))}

                        <div ref={observerRef} className="h-10" />

                        {isLoading && page > 1 && (
                            <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                            </div>
                        )}

                        {!hasMore && sortedPosts.length > 0 && (
                            <p className="text-center text-white/40 text-sm py-8">You're all caught up! 🎉</p>
                        )}
                    </div>
                )}

                {/* FAB Mobile */}
                {currentUser && (
                    <button
                        onClick={() => navigate("/upload")}
                        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full shadow-lg shadow-cyan-500/30 flex items-center justify-center hover:scale-110 transition z-40 md:hidden"
                    >
                        <Plus size={28} />
                    </button>
                )}
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}