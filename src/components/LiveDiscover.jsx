// src/components/LiveDiscover.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/api";
import socket from "../api/socket";

const CATEGORIES = [
    "All", "Music", "Gaming", "Talk", "Art", "Education", "Sports", "Cooking", "Fitness"
];

export default function LiveDiscover() {
    const navigate = useNavigate();

    const [streams, setStreams] = useState([]);
    const [category, setCategory] = useState("All");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Fetch streams from backend
    const fetchStreams = useCallback(async () => {
        try {
            setError("");
            const res = await api.get("/live");
            const data = Array.isArray(res.data) ? res.data : res.data?.streams || [];
            // Only show live streams
            const liveStreams = data.filter(s => s.isLive !== false);
            setStreams(liveStreams);
        } catch (err) {
            console.error("❌ Failed to load live streams", err);
            setError("Failed to load streams");
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch and realtime updates
    useEffect(() => {
        fetchStreams();

        // Socket events for realtime updates
        socket.on("live_started", (newStream) => {
            setStreams(prev => {
                // Add new stream if not already in list
                if (!prev.find(s => s._id === newStream._id)) {
                    return [newStream, ...prev];
                }
                return prev;
            });
            toast.success(`🔴 ${newStream.host?.username || "Someone"} went live!`);
        });

        socket.on("live_stopped", (stoppedStream) => {
            setStreams(prev => prev.filter(s => s._id !== stoppedStream._id));
        });

        socket.on("viewer_count_update", ({ streamId, viewers }) => {
            setStreams(prev =>
                prev.map(s => s._id === streamId ? { ...s, viewers } : s)
            );
        });

        return () => {
            socket.off("live_started");
            socket.off("live_stopped");
            socket.off("viewer_count_update");
        };
    }, [fetchStreams]);

    // Filter streams
    const filtered = streams
        .filter((s) => {
            const matchCategory = category === "All" || s.category === category;
            const matchSearch = search.length === 0 ||
                s.title?.toLowerCase().includes(search.toLowerCase()) ||
                s.host?.username?.toLowerCase().includes(search.toLowerCase());
            return matchCategory && matchSearch;
        })
        .sort((a, b) => (b.viewers || 0) - (a.viewers || 0));

    // Handle stream click
    const handleStreamClick = (stream) => {
        navigate(`/live/${stream._id}`);
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                    <p className="text-white/70">Loading live streams...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-white p-4 md:p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-cyan-400 mb-2">
                    🌍 Live Discovery
                </h1>
                <p className="text-white/60 mb-6">
                    Discover live streams from creators around the world
                </p>

                {/* Filters */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                    {/* Category buttons */}
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${category === cat
                                        ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/30"
                                        : "bg-white/10 text-white/80 hover:bg-white/20"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Search input */}
                    <input
                        className="md:ml-auto px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 outline-none focus:border-cyan-400 transition w-full md:w-64"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="🔍 Search streams..."
                    />
                </div>

                {/* Error state */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
                        <p className="text-red-400">{error}</p>
                        <button
                            onClick={fetchStreams}
                            className="mt-2 text-sm text-cyan-400 hover:underline"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Streams Grid */}
                {filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-6xl mb-4">📺</p>
                        <p className="text-white/60 mb-2">No live streams found</p>
                        <p className="text-white/40 text-sm mb-6">
                            {search || category !== "All"
                                ? "Try a different category or search term"
                                : "Be the first to go live!"
                            }
                        </p>
                        <button
                            onClick={() => navigate("/live")}
                            className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl font-semibold hover:shadow-lg transition"
                        >
                            🎥 Start Streaming
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Live count */}
                        <p className="text-white/50 text-sm mb-4">
                            {filtered.length} stream{filtered.length !== 1 ? "s" : ""} live
                        </p>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filtered.map((stream, idx) => (
                                <div
                                    key={stream._id}
                                    className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden hover:scale-[1.02] hover:border-cyan-500/50 transition-all cursor-pointer group"
                                    onClick={() => handleStreamClick(stream)}
                                >
                                    {/* Thumbnail */}
                                    <div className="relative aspect-video bg-black/50">
                                        <img
                                            src={stream.thumbnail || stream.coverImage || "/defaults/default-stream.jpg"}
                                            alt={stream.title}
                                            className="w-full h-full object-cover group-hover:opacity-90 transition"
                                            onError={(e) => {
                                                e.target.src = "/defaults/default-stream.jpg";
                                            }}
                                        />

                                        {/* Live badge */}
                                        <div className="absolute top-2 left-2 bg-red-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 animate-pulse">
                                            <span className="w-2 h-2 bg-white rounded-full"></span>
                                            LIVE
                                        </div>

                                        {/* Trending badge */}
                                        {idx === 0 && filtered.length > 1 && (
                                            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-yellow-400 text-black text-xs font-bold">
                                                🔥 TRENDING
                                            </div>
                                        )}

                                        {/* Viewers */}
                                        <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
                                            👁 {stream.viewers || 0}
                                        </div>
                                    </div>

                                    {/* Info */}
                                    <div className="p-4">
                                        <h2 className="font-bold text-lg line-clamp-1 group-hover:text-cyan-400 transition">
                                            {stream.title || "Untitled Stream"}
                                        </h2>

                                        <div className="flex items-center gap-2 mt-2">
                                            <img
                                                src={stream.host?.avatar || "/defaults/default-avatar.png"}
                                                alt={stream.host?.username}
                                                className="w-6 h-6 rounded-full object-cover"
                                                onError={(e) => {
                                                    e.target.src = "/defaults/default-avatar.png";
                                                }}
                                            />
                                            <span className="text-white/70 text-sm">
                                                {stream.host?.username || "Unknown"}
                                            </span>

                                            {stream.category && (
                                                <span className="ml-auto px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs">
                                                    {stream.category}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Start streaming CTA */}
                <div className="mt-12 text-center">
                    <div className="inline-block p-6 bg-white/5 rounded-2xl border border-white/10">
                        <h3 className="text-xl font-bold mb-2">Ready to go live?</h3>
                        <p className="text-white/60 mb-4">
                            Share your talent with the world
                        </p>
                        <button
                            onClick={() => navigate("/live")}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                        >
                            🎥 Start My Live Stream
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}