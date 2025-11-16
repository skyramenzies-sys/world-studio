import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import socket from "../api/socket";

const CATEGORIES = [
    "All", "Music", "Gaming", "Talk", "Art", "Education", "Sports"
];

export default function LiveDiscover({ setCurrentPage, setSelectedStream }) {
    const [streams, setStreams] = useState([]);
    const [category, setCategory] = useState("All");
    const [search, setSearch] = useState("");

    // Fetch streams from backend
    const fetchStreams = useCallback(async () => {
        try {
            const res = await axios.get("/api/live");
            setStreams(res.data || []);
        } catch (err) {
            console.error("❌ Failed to load live streams", err);
        }
    }, []);

    // Realtime live updates
    useEffect(() => {
        fetchStreams();

        socket.on("live_started", fetchStreams);
        socket.on("live_stopped", fetchStreams);

        return () => {
            socket.off("live_started", fetchStreams);
            socket.off("live_stopped", fetchStreams);
        };
    }, [fetchStreams]);

    // Filter UI
    const filtered = streams
        .filter((s) => {
            const matchCategory =
                category === "All" || (s.category && s.category === category);

            const matchSearch =
                search.length === 0 ||
                s.title?.toLowerCase().includes(search.toLowerCase()) ||
                s.host?.username?.toLowerCase().includes(search.toLowerCase());

            return matchCategory && matchSearch;
        })
        .sort((a, b) => (b.viewers || 0) - (a.viewers || 0));

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white p-8">
            <h1 className="text-3xl font-bold text-cyan-400 mb-6">
                🌍 World-Studio LIVE+ Discovery
            </h1>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="flex gap-2">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategory(cat)}
                            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all
                            ${category === cat
                                    ? "bg-cyan-500 text-black shadow"
                                    : "bg-white/10 text-white/80 hover:bg-white/20"}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <input
                    className="ml-auto px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/60 outline-none"
                    style={{ minWidth: 200 }}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search title or streamer"
                />
            </div>

            {/* Streams */}
            {filtered.length === 0 ? (
                <p className="text-white/60 text-center mt-20">
                    No live streams found. Try a new category or search!
                </p>
            ) : (
                <div className="grid md:grid-cols-3 gap-6">
                    {filtered.map((stream, idx) => (
                        <div
                            key={stream._id}
                            className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl overflow-hidden hover:scale-105 transition-transform cursor-pointer relative"
                            onClick={() => setSelectedStream(stream)}
                        >
                            <div className="relative">
                                <img
                                    src={
                                        stream.coverImage && stream.coverImage !== ""
                                            ? stream.coverImage
                                            : "/default-cover.jpg"
                                    }
                                    alt="cover"
                                    className="w-full h-48 object-cover"
                                />

                                <div className="absolute top-2 left-2 bg-red-500 px-2 py-1 rounded-lg text-xs font-semibold">
                                    LIVE
                                </div>

                                {idx === 0 && filtered.length > 1 && (
                                    <div className="absolute top-2 right-2 px-3 py-1 rounded-lg bg-yellow-400 text-black text-xs font-bold shadow">
                                        TRENDING
                                    </div>
                                )}
                            </div>

                            <div className="p-4">
                                <h2 className="font-bold text-lg">{stream.title}</h2>

                                <div className="flex items-center gap-2 text-white/60">
                                    🎙 {stream.host?.username || "Unknown"}

                                    {stream.category && (
                                        <span className="ml-2 px-2 py-0.5 bg-cyan-700/60 rounded text-xs">
                                            {stream.category}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2 text-sm text-white/60">
                                    👁 {stream.viewers || 0} viewers
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CTA */}
            <div className="mt-10 flex justify-center">
                <button
                    onClick={() => setCurrentPage("live")}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                >
                    🎥 Start My Live Stream
                </button>
            </div>
        </div>
    );
}

