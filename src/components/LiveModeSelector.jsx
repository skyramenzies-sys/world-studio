// src/components/LiveModeSelector.jsx - WORLD STUDIO LIVE EDITION 🎬 (U.E.)
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

// ✅ Use shared instances
import api from "../api/api";
import socket from "../api/socket";
import { MEDIA_CONSTRAINTS, MOBILE_CONSTRAINTS } from "../api/WebrtcConfig";

/* ============================================================
   CONSTANTS
   ============================================================ */
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
    { id: "education", name: "Education", icon: "📖" },
    { id: "fitness", name: "Fitness", icon: "💪" },
    { id: "cooking", name: "Cooking", icon: "🍳" },
];

const DEFAULT_AVATAR = "/defaults/default-avatar.png";

// Detect mobile
const isMobileDevice = () => {
    if (typeof navigator === "undefined") return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function LiveModeSelector({ currentUser, onStartLive }) {
    const navigate = useNavigate();
    const videoRef = useRef(null);
    const streamRef = useRef(null);


    const [selectedMode, setSelectedMode] = useState("multi");
    const [title, setTitle] = useState("");
    const [category, setCategory] = useState("chat");
    const [seatCount, setSeatCount] = useState(12);
    const [step, setStep] = useState(1);
    const [isStarting, setIsStarting] = useState(false);
    const [cameraReady, setCameraReady] = useState(false);

    const selfId = currentUser?._id || currentUser?.id;

    /* ========================================================
       CLEANUP CAMERA
       ======================================================== */
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
                track.stop();
                console.log(`🛑 Stopped preview ${track.kind} track`);
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    /* ========================================================
       SETUP CAMERA
       ======================================================== */
    const setupCamera = useCallback(async () => {
        try {
            // ✅ Use shared constraints from WebrtcConfig
            const isMobile = isMobileDevice();
            const constraints = isMobile ? MOBILE_CONSTRAINTS : MEDIA_CONSTRAINTS;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: constraints.video,
                audio: true, // Need audio for preview levels
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            setCameraReady(true);
            console.log("📷 Camera ready");
        } catch (err) {
            console.error("Camera access error:", err);
            setCameraReady(false);
            toast.error("Could not access camera. Please check permissions.");
        }
    }, []);

    /* ========================================================
       CAMERA PREVIEW EFFECT
       ======================================================== */
    useEffect(() => {
        if (step === 2 && selectedMode !== "audio") {
            setupCamera();
        }

        return () => {
            stopCamera();
        };
    }, [step, selectedMode, setupCamera, stopCamera]);

    /* ========================================================
       GENERATE ROOM ID
       ======================================================== */
    const generateRoomId = useCallback(() => {
        return `${currentUser?.username || "room"}_${Date.now()}_${Math.random()
            .toString(36)
            .substring(7)}`;
    }, [currentUser?.username]);

    /* ========================================================
       START LIVE
       ======================================================== */
    const handleStartLive = async () => {
        if (!title.trim()) {
            toast.error("Please enter a title");
            return;
        }

        if (!currentUser) {
            toast.error("Please log in to go live");
            navigate("/login");
            return;
        }

        setIsStarting(true);

        try {
            const roomId = generateRoomId();

            // Create stream on server
            const res = await api.post("/live/start", {
                title: title.trim(),
                category,
                mode: selectedMode,
                type: selectedMode, // Also send as 'type' for backend compatibility
                seatCount: selectedMode === "multi" ? seatCount : 1,
                maxSeats: selectedMode === "multi" ? seatCount : 1,
                roomId,
                hostId: selfId,
                hostUsername: currentUser.username,
                hostAvatar: currentUser.avatar,
            });

            const streamData = res.data.stream || res.data || {};

            // Emit to socket (so Discover/Home get real-time updates)
            socket.emit("stream_started", {
                streamId: streamData._id || roomId,
                roomId,
                title: title.trim(),
                category,
                mode: selectedMode,
                hostId: selfId,
                hostUsername: currentUser.username,
                hostAvatar: currentUser.avatar,
            });

            toast.success("You're live! 🔴");

            // Callback to parent or navigate to live-room
            if (onStartLive) {
                onStartLive({
                    ...streamData,
                    mode: selectedMode,
                    title: title.trim(),
                    category,
                    seatCount: selectedMode === "multi" ? seatCount : 1,
                    roomId,
                });
            } else {
                navigate(`/live/${streamData._id || roomId}`);
            }
        } catch (err) {
            console.error("Failed to start live:", err);
            toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to start stream");
        } finally {
            setIsStarting(false);
        }
    };

    /* ========================================================
       RENDER
       ======================================================== */
    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-black text-white">
            {/* Header - ✅ FIXED: was "flex.items-center" */}
            <div className="p-4 flex items-center gap-4 border-b border-white/10">
                <button
                    onClick={() => (step === 1 ? navigate(-1) : setStep(1))}
                    className="p-2 hover:bg-white/10 rounded-full transition"
                >
                    ←
                </button>
                <h1 className="text-xl font-bold">Go Live</h1>
                <div className="ml-auto text-sm text-white/60">Step {step}/2</div>
            </div>

            {step === 1 ? (
                /* ============================================
                   Step 1: Select Mode
                   ============================================ */
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
                                    <div
                                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center text-2xl`}
                                    >
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

                        {/* ✅ FIXED: was "bg-gradient.to-br ... to-red-500/20.rounded-xl" */}
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
                                                animationDelay: `${i * 0.1}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* ============================================
                   Step 2: Settings
                   ============================================ */
                <div className="p-6 space-y-6 pb-32">
                    {/* Camera preview */}
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
                        {selectedMode !== "audio" ? (
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover mirror"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex flex-col items-center justify-center">
                                <span className="text-6xl mb-4">🎙️</span>
                                <p className="text-white/60">Audio Only Mode</p>
                            </div>
                        )}

                        {/* Mode badge - ✅ FIXED: was "flex.items-center" */}
                        <div className="absolute top-3 left-3 px-3 py-1 bg-black/50 backdrop-blur rounded-full text-sm flex items-center gap-2">
                            <span>{LIVE_MODES.find((m) => m.id === selectedMode)?.icon}</span>
                            <span>{LIVE_MODES.find((m) => m.id === selectedMode)?.name}</span>
                        </div>

                        {/* Camera status */}
                        {selectedMode !== "audio" && (
                            <div
                                className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs ${cameraReady ? "bg-green-500/80" : "bg-yellow-500/80"
                                    }`}
                            >
                                {cameraReady ? "📷 Ready" : "⏳ Loading..."}
                            </div>
                        )}

                        {/* Avatar overlay - ✅ FIXED: was "flex.items-center" */}
                        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
                            <img
                                src={currentUser?.avatar || DEFAULT_AVATAR}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border border-white/20"
                                onError={(e) => {
                                    e.target.src = DEFAULT_AVATAR;
                                }}
                            />
                            <span className="text-sm font-semibold">
                                {currentUser?.username || "You"}
                            </span>
                        </div>
                    </div>

                    {/* Title input */}
                    <div>
                        <label className="text-sm text-white/50 mb-2 block">Stream Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="What's your stream about?"
                            maxLength={50}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:border-cyan-400 transition"
                        />
                        <p className="text-xs text-white/40 mt-1 text-right">{title.length}/50</p>
                    </div>

                    {/* Categories - ✅ FIXED: was "hover:bg.white/20" */}
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
                            <p className="text-xs text-white/40 mt-2">
                                You + {seatCount - 1} guests can join the stream
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Bottom Actions - ✅ FIXED: was "text-lg.disabled:opacity-50.disabled:cursor-not-allowed" and "rounded-full.animate-pulse" */}
            {step === 2 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-lg border-t border-white/10">
                    <button
                        onClick={handleStartLive}
                        disabled={!title.trim() || isStarting}
                        className="w-full py-4 bg-gradient-to-r from-red-500 to-pink-600 rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-red-500/30 transition-all flex items-center justify-center gap-3"
                    >
                        {isStarting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Starting...
                            </>
                        ) : (
                            <>
                                <span className="w-3 h-3 bg-white rounded-full animate-pulse" />
                                Go LIVE
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Bottom mode tabs (step 1) */}
            {step === 1 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-lg border-t border-white/10">
                    <div className="flex justify-center gap-6">
                        {LIVE_MODES.map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => setSelectedMode(mode.id)}
                                className={`text-center transition ${selectedMode === mode.id ? "text-white" : "text-white/40"
                                    }`}
                            >
                                <span className="text-2xl block">{mode.icon}</span>
                                <p
                                    className={`text-xs mt-1 ${selectedMode === mode.id ? "font-bold" : ""
                                        }`}
                                >
                                    {mode.name.replace(" LIVE", "")}
                                </p>
                                {selectedMode === mode.id && (
                                    <div className="w-1 h-1 bg-cyan-400 rounded-full mx-auto mt-1" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                .mirror { transform: scaleX(-1); }
            `}</style>
        </div>
    );
}
