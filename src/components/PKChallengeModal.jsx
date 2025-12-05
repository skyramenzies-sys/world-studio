// src/components/PKChallengeModal.jsx - WORLD STUDIO LIVE EDITION ⚔️
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import axios from "axios";

/* ============================================================
   WORLD STUDIO LIVE CONFIGURATION
   ============================================================ */
const API_BASE_URL = "https://world-studio-production.up.railway.app";

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

/* ============================================================
   CONSTANTS
   ============================================================ */
const DURATION_OPTIONS = [
    { label: "1m", value: 60 },
    { label: "3m", value: 180 },
    { label: "5m", value: 300 },
    { label: "10m", value: 600 },
];

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function PKChallengeModal({
    isOpen,
    onClose,
    onChallengeSent,
    currentUserId,
}) {
    const [liveStreamers, setLiveStreamers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [duration, setDuration] = useState(300); // 5 minutes default
    const [sending, setSending] = useState(null);
    const [noStreamers, setNoStreamers] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (isOpen) {
            fetchLiveStreamers();
        }
    }, [isOpen]);

    const fetchLiveStreamers = async () => {
        try {
            setLoading(true);
            setNoStreamers(false);

            const res = await api.get("/api/pk/live-streamers");
            const list = res?.data?.streamers || res?.data || [];

            // Filter out yourself
            const filtered = currentUserId
                ? list.filter((s) => s._id !== currentUserId && s.id !== currentUserId)
                : list;

            setLiveStreamers(filtered);
            setNoStreamers(filtered.length === 0);
        } catch (err) {
            console.error("Failed to load streamers:", err);
            toast.error("Failed to load streamers");
            setLiveStreamers([]);
            setNoStreamers(true);
        } finally {
            setLoading(false);
        }
    };

    const sendChallenge = async (opponentId) => {
        if (!opponentId || !duration) return;

        try {
            setSending(opponentId);

            const res = await api.post("/api/pk/challenge", {
                opponentId,
                duration,
            });

            const pk = res?.data?.pk || res?.data;
            toast.success("PK Challenge sent! ⚔️");

            if (pk && onChallengeSent) {
                onChallengeSent(pk);
            }

            onClose?.();
        } catch (err) {
            console.error("PK challenge error:", err);
            const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to send challenge";
            toast.error(msg);
        } finally {
            setSending(null);
        }
    };

    // Filter streamers by search
    const filteredStreamers = liveStreamers.filter(streamer =>
        streamer.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedDurationObj = DURATION_OPTIONS.find((d) => d.value === duration) || DURATION_OPTIONS[2];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 rounded-2xl p-6 w-full max-w-md border border-white/10 max-h-[80vh] overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                ⚔️ PK Battle
                            </h2>
                            <p className="text-white/50 text-sm">
                                Challenge a live streamer
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/50 hover:text-white text-2xl transition"
                        >
                            ×
                        </button>
                    </div>

                    {/* Duration Selector */}
                    <div className="mb-4">
                        <label className="text-white/70 text-sm mb-2 block">
                            Battle Duration
                        </label>
                        <div className="flex gap-2">
                            {DURATION_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setDuration(opt.value)}
                                    className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${duration === opt.value
                                            ? "bg-gradient-to-r from-pink-500 to-orange-500 text-white"
                                            : "bg-white/10 text-white/60 hover:bg-white/20"
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <p className="mt-1 text-xs text-white/40">
                            Selected:{" "}
                            <span className="text-white/80 font-semibold">
                                {selectedDurationObj.label} ({Math.round(selectedDurationObj.value / 60)} min)
                            </span>
                        </p>
                    </div>

                    {/* Search */}
                    <div className="mb-4">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search streamers..."
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 outline-none focus:border-cyan-400 transition"
                        />
                    </div>

                    {/* Live Streamers List */}
                    <div className="flex-1 overflow-y-auto">
                        <h3 className="text-white/70 text-sm mb-3 flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            Live Now ({filteredStreamers.length})
                        </h3>

                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : noStreamers ? (
                            <div className="text-center py-8">
                                <div className="text-4xl mb-2">😴</div>
                                <p className="text-white/50">No streamers available for PK</p>
                                <p className="text-white/30 text-sm">Check back later!</p>
                                <button
                                    onClick={fetchLiveStreamers}
                                    className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition"
                                >
                                    🔄 Refresh
                                </button>
                            </div>
                        ) : filteredStreamers.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-white/50">No streamers match "{searchQuery}"</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {filteredStreamers.map((streamer) => (
                                    <div
                                        key={streamer._id || streamer.id}
                                        className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img
                                                    src={streamer.avatar || "/defaults/default-avatar.png"}
                                                    alt=""
                                                    className="w-12 h-12 rounded-full border-2 border-red-500 object-cover"
                                                    onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                                                />
                                                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] px-1.5 rounded font-bold">
                                                    LIVE
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold">
                                                    {streamer.username}
                                                </p>
                                                <p className="text-white/40 text-sm">
                                                    {streamer.followers?.length || streamer.followersCount || 0} followers
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => sendChallenge(streamer._id || streamer.id)}
                                            disabled={sending === (streamer._id || streamer.id)}
                                            className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 rounded-lg font-bold text-white text-sm transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                                        >
                                            {sending === (streamer._id || streamer.id) ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                </span>
                                            ) : (
                                                "⚔️ Challenge"
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                        <p className="text-yellow-400/80 text-sm">
                            💡 The streamer who receives more gift coins wins the PK battle!
                        </p>
                    </div>

                    {/* How it works */}
                    <div className="mt-3 p-3 bg-white/5 rounded-xl">
                        <h4 className="text-white/70 text-sm font-semibold mb-2">How PK Battle Works:</h4>
                        <ol className="text-white/50 text-xs space-y-1 list-decimal list-inside">
                            <li>Challenge a live streamer</li>
                            <li>If they accept, the battle begins</li>
                            <li>Viewers support their favorite by sending gifts</li>
                            <li>Most coins wins when time runs out!</li>
                        </ol>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}