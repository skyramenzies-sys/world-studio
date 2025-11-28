// src/components/LiveModeSelector.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

const LIVE_MODES = [
    {
        id: "solo",
        name: "Solo LIVE",
        icon: "🎥",
        description: "Stream by yourself",
        color: "from-blue-500 to-cyan-500",
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

const CATEGORIES = [
    { id: "chat", name: "Chat", icon: "💬" },
    { id: "dating", name: "Dating", icon: "🥰" },
    { id: "games", name: "Games", icon: "🎮" },
    { id: "interests", name: "Interests", icon: "📚" },
    { id: "emotional", name: "Emotional", icon: "💖" },
    { id: "music", name: "Music", icon: "🎵" },
    { id: "talent", name: "Talent", icon: "⭐" },
];

export default function LiveModeSelector({ currentUser, onStartLive }) {
    const navigate = useNavigate();

    const [selectedMode, setSelectedMode] = useState("multi");
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("chat");
    const [seatCount, setSeatCount] = useState(12);
    const [step, setStep] = useState(1); // 1: mode, 2: settings

    // Generate room ID
    const generateRoomId = () => {
        return `${currentUser?.username || "room"}_${Date.now()}`;
    };

    // Start stream
    const handleStartLive = () => {
        if (!title.trim()) {
            toast.error("Please enter a title");
            return;
        }

        const roomId = generateRoomId();

        onStartLive?.({
            mode: selectedMode,
            title,
            category,
            seatCount: selectedMode === "multi" ? seatCount : 1,
            roomId,
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-black text-white">
            {/* Header */}
            <div className="p-4 flex items-center gap-4 border-b border-white/10">
                <button
                    onClick={() => step === 1 ? navigate(-1) : setStep(1)}
                    className="p-2 hover:bg-white/10 rounded-full transition"
                >
                    ←
                </button>
                <h1 className="text-xl font-bold">Go Live</h1>
            </div>

            {step === 1 ? (
                /* Step 1: Select Mode */
                <div className="p-6">
                    <h2 className="text-lg font-semibold mb-4">Choose Live Mode</h2>

                    <div className="space-y-4">
                        {LIVE_MODES.map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => {
                                    setSelectedMode(mode.id);
                                    setStep(2);
                                }}
                                className={`w-full p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden ${selectedMode === mode.id
                                        ? "border-cyan-400 bg-white/10"
                                        : "border-white/10 hover:border-white/30 hover:bg-white/5"
                                    }`}
                            >
                                {mode.featured && (
                                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full text-xs font-bold text-black">
                                        Popular
                                    </span>
                                )}

                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center text-2xl`}>
                                        {mode.icon}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">{mode.name}</h3>
                                        <p className="text-white/50 text-sm">{mode.description}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Preview */}
                    <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10">
                        <h3 className="text-sm text-white/50 mb-2">Preview</h3>
                        {selectedMode === "solo" && (
                            <div className="aspect-video bg-black/50 rounded-xl flex items-center justify-center">
                                <span className="text-4xl">🎥</span>
                            </div>
                        )}
                        {selectedMode === "multi" && (
                            <div className="grid grid-cols-4 gap-2">
                                {[...Array(12)].map((_, i) => (
                                    <div
                                        key={i}
                                        className={`aspect-square rounded-lg flex items-center justify-center text-sm ${i === 0
                                                ? "bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border border-yellow-500/50"
                                                : "bg-white/10 border border-white/10"
                                            }`}
                                    >
                                        {i === 0 ? "👑" : "🪑"}
                                    </div>
                                ))}
                            </div>
                        )}
                        {selectedMode === "audio" && (
                            <div className="aspect-video bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl flex flex-col items-center justify-center">
                                <span className="text-4xl mb-2">🎙️</span>
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-1 bg-cyan-400 rounded-full animate-pulse"
                                            style={{
                                                height: `${20 + Math.random() * 30}px`,
                                                animationDelay: `${i * 0.1}s`
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Step 2: Settings */
                <div className="p-6 space-y-6">
                    {/* Camera preview */}
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
                        <video
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            ref={(el) => {
                                if (el && !el.srcObject) {
                                    navigator.mediaDevices.getUserMedia({
                                        video: selectedMode !== "audio",
                                        audio: true
                                    })
                                        .then(stream => {
                                            el.srcObject = stream;
                                        })
                                        .catch(console.error);
                                }
                            }}
                        />

                        {/* Mode badge */}
                        <div className="absolute top-3 left-3 px-3 py-1 bg-black/50 rounded-full text-sm">
                            {LIVE_MODES.find(m => m.id === selectedMode)?.icon} {LIVE_MODES.find(m => m.id === selectedMode)?.name}
                        </div>

                        {/* Avatar overlay */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
                            <img
                                src={currentUser?.avatar || "/defaults/default-avatar.png"}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover"
                            />
                            <span className="text-sm font-semibold">{currentUser?.username}</span>
                            <button className="text-xs text-cyan-400">Change cover</button>
                        </div>
                    </div>

                    {/* Title input */}
                    <div>
                        <label className="text-sm text-white/50 mb-2 block">Stream Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What's your stream about?"
                            maxLength={50}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:border-cyan-400"
                        />
                        <p className="text-xs text-white/40 mt-1 text-right">{title.length}/50</p>
                    </div>

                    {/* Categories */}
                    <div>
                        <label className="text-sm text-white/50 mb-2 block">Category</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`px-4 py-2 rounded-full text-sm flex items-center gap-2 transition ${category === cat.id
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

                    {/* Seat count (multi mode only) */}
                    {selectedMode === "multi" && (
                        <div>
                            <label className="text-sm text-white/50 mb-2 block">Number of Seats</label>
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
                        </div>
                    )}

                    {/* Go Live button */}
                    <button
                        onClick={handleStartLive}
                        disabled={!title.trim()}
                        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                    >
                        Go LIVE
                    </button>
                </div>
            )}

            {/* Bottom mode tabs */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-lg border-t border-white/10">
                <div className="flex justify-center gap-6">
                    {LIVE_MODES.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => {
                                setSelectedMode(mode.id);
                                if (step === 2) setStep(1);
                            }}
                            className={`text-center transition ${selectedMode === mode.id ? "text-white" : "text-white/40"
                                }`}
                        >
                            <span className="text-lg">{mode.icon}</span>
                            <p className={`text-xs mt-1 ${selectedMode === mode.id ? "font-bold" : ""}`}>
                                {mode.name.replace(" LIVE", "")}
                            </p>
                            {selectedMode === mode.id && (
                                <div className="w-1 h-1 bg-cyan-400 rounded-full mx-auto mt-1" />
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}