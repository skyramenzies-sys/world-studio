// src/components/LivePage.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/api";
import LivePublisher from "./LivePublisher";
import LiveViewer from "./LiveViewer";
import MultiGuestLive from "./MultiGuestLive";
import AudioLive from "./AudioLive";

const CATEGORIES = [
    { id: "chat", name: "Chat", icon: "💬" },
    { id: "music", name: "Music", icon: "🎵" },
    { id: "gaming", name: "Gaming", icon: "🎮" },
    { id: "talk", name: "Talk", icon: "🎙️" },
    { id: "art", name: "Art", icon: "🎨" },
    { id: "education", name: "Education", icon: "📚" },
    { id: "sports", name: "Sports", icon: "⚽" },
    { id: "cooking", name: "Cooking", icon: "🍳" },
    { id: "fitness", name: "Fitness", icon: "💪" },
];

const LIVE_MODES = [
    {
        id: "solo",
        name: "Solo LIVE",
        icon: "🎥",
        description: "Stream by yourself",
        color: "from-red-500 to-pink-600",
    },
    {
        id: "multi",
        name: "Multi-guest LIVE",
        icon: "👥",
        description: "Invite up to 12 guests",
        color: "from-purple-500 to-pink-500",
        featured: true,
    },
    {
        id: "audio",
        name: "Audio LIVE",
        icon: "🎙️",
        description: "Voice-only streaming",
        color: "from-orange-500 to-red-500",
    },
];

const SEAT_OPTIONS = [4, 6, 9, 12];

export default function LivePage() {
    const { streamId } = useParams();
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [mode, setMode] = useState(null);
    const [step, setStep] = useState(1);
    const [selectedLiveMode, setSelectedLiveMode] = useState("solo");
    const [roomId, setRoomId] = useState("");
    const [streamTitle, setStreamTitle] = useState("");
    const [streamCategory, setStreamCategory] = useState("chat");
    const [seatCount, setSeatCount] = useState(12);
    const [streamInfo, setStreamInfo] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentUser(user);
                if (!roomId && !streamId) {
                    setRoomId(`${user.username}-${Date.now().toString(36)}`);
                }
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        }
    }, []);

    useEffect(() => {
        if (streamId) {
            setLoading(true);
            const fetchStreamInfo = async () => {
                try {
                    const res = await api.get(`/live/${streamId}`);
                    const stream = res.data;

                    if (!stream) {
                        toast.error("Stream not found");
                        navigate("/discover");
                        return;
                    }

                    if (!stream.isLive) {
                        toast.error("This stream has ended");
                        navigate("/discover");
                        return;
                    }

                    setStreamInfo(stream);
                    setRoomId(stream.roomId || stream._id || streamId);
                    setStreamTitle(stream.title || "Live Stream");
                    setStreamCategory(stream.category || "chat");

                    if (stream.type === "multi-guest") {
                        setMode("watch-multi");
                    } else if (stream.type === "audio") {
                        setMode("watch-audio");
                    } else {
                        setMode("watch");
                    }
                } catch (err) {
                    console.error("Failed to fetch stream:", err);
                    setRoomId(streamId);
                    setMode("watch");
                } finally {
                    setLoading(false);
                }
            };
            fetchStreamInfo();
        }
    }, [streamId, navigate]);

    const startStreaming = () => {
        if (!currentUser) {
            toast.error("Please log in to go live");
            navigate("/login");
            return;
        }
        if (!streamTitle.trim()) {
            toast.error("Please enter a stream title");
            return;
        }
        if (selectedLiveMode === "solo") {
            setMode("publish");
        } else if (selectedLiveMode === "multi") {
            setMode("multi");
        } else if (selectedLiveMode === "audio") {
            setMode("audio");
        }
    };

    const startAsViewer = () => {
        if (!roomId.trim()) {
            toast.error("Please enter a valid Room ID");
            return;
        }
        setMode("watch");
    };

    const handleStopStream = () => {
        setMode(null);
        setStep(1);
        toast.success("Stream ended");
        navigate("/discover");
    };

    const handleLeaveStream = () => {
        setMode(null);
        setStep(1);
        setRoomId("");
        setStreamInfo(null);
        navigate("/discover");
    };

    const generateRoomId = () => {
        const username = currentUser?.username || "user";
        const randomId = Math.random().toString(36).substring(2, 8);
        setRoomId(`${username}-${randomId}`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                    <p className="text-white/70">Connecting to stream...</p>
                </div>
            </div>
        );
    }

    if (mode === "publish") {
        return (
            <div className="w-full h-screen">
                <LivePublisher
                    currentUser={currentUser}
                    roomId={roomId}
                    streamTitle={streamTitle}
                    streamCategory={streamCategory}
                    onStop={handleStopStream}
                />
            </div>
        );
    }

    if (mode === "multi") {
        return (
            <MultiGuestLive
                roomId={roomId}
                currentUser={currentUser}
                streamTitle={streamTitle}
                streamCategory={streamCategory}
                maxSeats={seatCount}
                isHost={true}
                onEnd={handleStopStream}
            />
        );
    }

    if (mode === "audio") {
        return (
            <AudioLive
                roomId={roomId}
                currentUser={currentUser}
                streamTitle={streamTitle}
                streamCategory={streamCategory}
                isHost={true}
                onEnd={handleStopStream}
            />
        );
    }

    if (mode === "watch") {
        return (
            <div className="w-full h-screen">
                <LiveViewer
                    roomId={roomId}
                    currentUser={currentUser}
                    streamInfo={streamInfo}
                    onLeave={handleLeaveStream}
                />
            </div>
        );
    }

    if (mode === "watch-multi") {
        return (
            <MultiGuestLive
                roomId={roomId}
                currentUser={currentUser}
                streamTitle={streamInfo?.title || "Multi-Guest Live"}
                streamCategory={streamInfo?.category}
                maxSeats={streamInfo?.maxSeats || 12}
                isHost={false}
                onEnd={handleLeaveStream}
            />
        );
    }

    if (mode === "watch-audio") {
        return (
            <AudioLive
                roomId={roomId}
                currentUser={currentUser}
                streamTitle={streamInfo?.title || "Audio Live"}
                streamCategory={streamInfo?.category}
                isHost={false}
                onEnd={handleLeaveStream}
            />
        );
    }

    return (
        <div className="text-white pb-24">
            {step === 1 ? (
                <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-cyan-400 mb-2">🎥 Go Live</h1>
                        <p className="text-white/60">Choose how you want to stream</p>
                    </div>

                    {!currentUser && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                            <p className="text-yellow-400 text-sm">
                                ⚠️ Please{" "}
                                <button onClick={() => navigate("/login")} className="underline font-semibold">log in</button>{" "}
                                to start streaming
                            </p>
                        </div>
                    )}

                    <div className="space-y-3">
                        {LIVE_MODES.map((liveMode) => (
                            <button
                                key={liveMode.id}
                                onClick={() => {
                                    setSelectedLiveMode(liveMode.id);
                                    setStep(2);
                                }}
                                className="w-full p-4 rounded-2xl border-2 border-white/10 hover:border-white/30 hover:bg-white/5 transition-all text-left relative overflow-hidden hover:scale-[1.02]"
                            >
                                {liveMode.featured && (
                                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full text-xs font-bold text-black">
                                        🔥 Popular
                                    </span>
                                )}
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${liveMode.color} flex items-center justify-center text-2xl shadow-lg`}>
                                        {liveMode.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{liveMode.name}</h3>
                                        <p className="text-white/50 text-sm">{liveMode.description}</p>
                                    </div>
                                    <span className="ml-auto text-white/30">→</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 mt-8">
                        <h2 className="text-lg font-semibold flex items-center gap-2">👁 Watch a Stream</h2>
                        <div className="flex gap-2">
                            <input
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="Enter Room ID"
                                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:border-cyan-400 transition"
                            />
                            <button
                                disabled={!roomId.trim()}
                                onClick={startAsViewer}
                                className="px-6 py-3 bg-cyan-500 rounded-xl font-semibold disabled:opacity-40 hover:bg-cyan-400 transition"
                            >
                                Join
                            </button>
                        </div>
                        <p className="text-center text-white/50 text-sm">
                            or{" "}
                            <button onClick={() => navigate("/discover")} className="text-cyan-400 hover:underline">
                                browse live streams
                            </button>
                        </p>
                    </div>
                </div>
            ) : (
                <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setStep(1)} className="p-2 hover:bg-white/10 rounded-full transition">←</button>
                        <div>
                            <h1 className="text-xl font-bold">
                                {LIVE_MODES.find(m => m.id === selectedLiveMode)?.icon}{" "}
                                {LIVE_MODES.find(m => m.id === selectedLiveMode)?.name}
                            </h1>
                            <p className="text-white/50 text-sm">Configure your stream</p>
                        </div>
                    </div>

                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
                        {selectedLiveMode !== "audio" ? (
                            <video
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                                ref={(el) => {
                                    if (el && !el.srcObject) {
                                        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
                                            .then(stream => { el.srcObject = stream; })
                                            .catch(() => { });
                                    }
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex flex-col items-center justify-center">
                                <span className="text-6xl mb-4">🎙️</span>
                                <p className="text-white/60">Audio Only</p>
                            </div>
                        )}
                        <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur rounded-full text-sm flex items-center gap-2">
                            <span>{LIVE_MODES.find(m => m.id === selectedLiveMode)?.icon}</span>
                            <span>{LIVE_MODES.find(m => m.id === selectedLiveMode)?.name}</span>
                        </div>
                        {selectedLiveMode === "multi" && (
                            <div className="absolute bottom-3 right-3 flex gap-1">
                                {[...Array(Math.min(4, seatCount))].map((_, i) => (
                                    <div key={i} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-xs">
                                        {i === 0 ? "👑" : "🪑"}
                                    </div>
                                ))}
                                {seatCount > 4 && (
                                    <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-xs">+{seatCount - 4}</div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-white/70">Stream Title *</label>
                        <input
                            value={streamTitle}
                            onChange={(e) => setStreamTitle(e.target.value)}
                            placeholder="What's your stream about?"
                            maxLength={100}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:border-cyan-400 transition"
                        />
                        <p className="text-xs text-white/40 text-right">{streamTitle.length}/100</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm text-white/70">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setStreamCategory(cat.id)}
                                    className={`px-3 py-2 rounded-full text-sm flex items-center gap-1.5 transition ${streamCategory === cat.id
                                            ? "bg-cyan-500 text-black font-semibold"
                                            : "bg-white/10 text-white/70 hover:bg-white/20"
                                        }`}
                                >
                                    <span>{cat.icon}</span>
                                    <span>{cat.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedLiveMode === "multi" && (
                        <div className="space-y-2">
                            <label className="text-sm text-white/70">Number of Seats</label>
                            <div className="flex gap-2">
                                {SEAT_OPTIONS.map((count) => (
                                    <button
                                        key={count}
                                        onClick={() => setSeatCount(count)}
                                        className={`flex-1 py-3 rounded-xl font-bold transition ${seatCount === count
                                                ? "bg-gradient-to-r from-purple-500 to-pink-500"
                                                : "bg-white/10 hover:bg-white/20"
                                            }`}
                                    >
                                        {count}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-white/40">Viewers can request to join your stream</p>
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm text-white/70">Room ID</label>
                        <div className="flex gap-2">
                            <input
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="your-room-id"
                                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:border-cyan-400 transition font-mono"
                            />
                            <button onClick={generateRoomId} className="px-4 py-3 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition">
                                🎲
                            </button>
                        </div>
                    </div>

                    <button
                        disabled={!streamTitle.trim() || !currentUser}
                        onClick={startStreaming}
                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r ${LIVE_MODES.find(m => m.id === selectedLiveMode)?.color
                            } hover:shadow-lg hover:scale-[1.02]`}
                    >
                        🔴 Go LIVE
                    </button>

                    <button
                        onClick={() => setStep(1)}
                        className="w-full py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition"
                    >
                        ← Choose Different Mode
                    </button>
                </div>
            )}

            {step === 1 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
                    <div className="flex justify-center gap-8 text-center">
                        {LIVE_MODES.map((liveMode) => (
                            <button
                                key={liveMode.id}
                                onClick={() => { setSelectedLiveMode(liveMode.id); setStep(2); }}
                                className="text-white/60 hover:text-white transition"
                            >
                                <span className="text-2xl">{liveMode.icon}</span>
                                <p className="text-xs mt-1">{liveMode.name.replace(" LIVE", "")}</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}