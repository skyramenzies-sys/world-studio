// src/components/LivePage.jsx - WORLD STUDIO LIVE EDITION 🎬 (U.E.)
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import { io } from "socket.io-client";

// Import child components
import LivePublisher from "./LivePublisher";
import LiveViewer from "./LiveViewer";
import MultiGuestLive from "./MultiGuestLive";
import AudioLive from "./AudioLive";

/* ============================================================
   WORLD STUDIO LIVE CONFIGURATION (U.E.)
   ============================================================ */
const RAW_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "https://world-studio-production.up.railway.app";

const API_BASE_URL = RAW_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
const SOCKET_URL = API_BASE_URL;

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

/* ============================================================
   CONSTANTS
   ============================================================ */
const CATEGORIES = [
    { id: "Chat", name: "Chat", icon: "💬" },
    { id: "Music", name: "Music", icon: "🎵" },
    { id: "Gaming", name: "Gaming", icon: "🎮" },
    { id: "Talk", name: "Talk", icon: "🎙️" },
    { id: "Art", name: "Art", icon: "🎨" },
    { id: "Education", name: "Education", icon: "📚" },
    { id: "Sports", name: "Sports", icon: "⚽" },
    { id: "Cooking", name: "Cooking", icon: "🍳" },
    { id: "Fitness", name: "Fitness", icon: "💪" },
    { id: "Dance", name: "Dance", icon: "💃" },
    { id: "Comedy", name: "Comedy", icon: "😂" },
    { id: "Beauty", name: "Beauty", icon: "💄" },
];

const LIVE_MODES = [
    {
        id: "solo",
        name: "Solo LIVE",
        icon: "🎥",
        description: "Stream by yourself",
        color: "from-red-500 to-pink-600",
        features: ["Full screen mode", "High quality stream", "Simple setup"],
    },
    {
        id: "multi",
        name: "Multi-guest LIVE",
        icon: "👥",
        description: "Invite up to 12 guests",
        color: "from-purple-500 to-pink-500",
        featured: true,
        features: ["Up to 12 guests", "Interactive layout", "Guest management"],
    },
    {
        id: "audio",
        name: "Audio LIVE",
        icon: "🎙️",
        description: "Voice-only streaming",
        color: "from-orange-500 to-red-500",
        features: ["Low bandwidth", "Multiple speakers", "Perfect for podcasts"],
    },
];

const SEAT_OPTIONS = [4, 6, 9, 12];

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function LivePage() {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const socketRef = useRef(null);

    const [currentUser, setCurrentUser] = useState(null);
    const [mode, setMode] = useState(null);
    const [step, setStep] = useState(1);
    const [selectedLiveMode, setSelectedLiveMode] = useState("solo");
    const [roomId, setRoomId] = useState("");
    const [streamTitle, setStreamTitle] = useState("");
    const [streamCategory, setStreamCategory] = useState("Chat");
    const [seatCount, setSeatCount] = useState(12);
    const [streamInfo, setStreamInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeStreamId, setActiveStreamId] = useState(null);

    // Camera permission state
    const [cameraStatus, setCameraStatus] = useState("pending");
    const [cameraError, setCameraError] = useState(null);
    const previewStreamRef = useRef(null);
    const videoRef = useRef(null);

    // Initialize socket
    useEffect(() => {
        socketRef.current = getSocket();
        return () => { };
    }, []);

    // Load user from localStorage
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Start camera preview when entering step 2
    useEffect(() => {
        if (step === 2 && selectedLiveMode !== "audio") {
            startCameraPreview();
        }
        return () => {
            stopCameraPreview();
        };
    }, [step, selectedLiveMode]);

    // Function to start camera preview
    const startCameraPreview = async () => {
        setCameraStatus("pending");
        setCameraError(null);

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setCameraStatus("error");
            setCameraError("Camera API not supported in this browser");
            toast.error("Camera not supported");
            return;
        }

        try {
            console.log("📷 Requesting camera access...");

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    facingMode: "user",
                },
                audio: false,
            });

            console.log("✅ Camera access granted:", stream.getTracks());

            previewStreamRef.current = stream;
            setCameraStatus("granted");

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch((err) => {
                    console.warn("Video autoplay blocked:", err);
                });
            }

        } catch (err) {
            console.error("❌ Camera error:", err.name, err.message);
            setCameraStatus("denied");

            let errorMsg = `${err.name}: ${err.message}`;

            if (err.name === "NotAllowedError") {
                errorMsg = "Camera access denied. Please allow camera in browser settings.";
            } else if (err.name === "NotFoundError") {
                errorMsg = "No camera found on this device.";
            } else if (err.name === "NotReadableError") {
                errorMsg = "Camera is in use by another application.";
            } else if (err.name === "OverconstrainedError") {
                errorMsg = "Camera doesn't support requested resolution.";
            } else if (err.name === "SecurityError") {
                errorMsg = "Camera blocked due to security restrictions.";
            }

            setCameraError(errorMsg);
            toast.error(`Camera: ${err.name}`);
        }
    };

    const stopCameraPreview = () => {
        if (previewStreamRef.current) {
            previewStreamRef.current.getTracks().forEach((track) => {
                track.stop();
            });
            previewStreamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const retryCamera = () => {
        stopCameraPreview();
        startCameraPreview();
    };

    // Fetch stream info if streamId is provided (viewer mode)
    useEffect(() => {
        if (streamId) {
            setLoading(true);
            const fetchStreamInfo = async () => {
                try {
                    const res = await api.get(`/api/live/${streamId}`);
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
                    setStreamCategory(stream.category || "Chat");
                    setActiveStreamId(stream._id);

                    if (stream.type === "multi" || stream.type === "multi-guest") {
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

    // Start streaming
    const startStreaming = async () => {
        if (!currentUser) {
            toast.error("Please log in to go live");
            navigate("/login");
            return;
        }
        if (!streamTitle.trim()) {
            toast.error("Please enter a stream title");
            return;
        }

        if (selectedLiveMode !== "audio" && cameraStatus !== "granted") {
            toast.error("Camera access required");
            retryCamera();
            return;
        }

        setLoading(true);
        stopCameraPreview();

        try {
            const res = await api.post("/api/live/start", {
                title: streamTitle.trim(),
                category: streamCategory,
                type: selectedLiveMode,
                maxSeats: selectedLiveMode === "multi" ? seatCount : 1,
                hostId: currentUser._id || currentUser.id,
                hostUsername: currentUser.username,
                hostAvatar: currentUser.avatar,
            });

            const stream = res.data;
            console.log("✅ Stream created:", stream);

            setActiveStreamId(stream._id || stream.id);
            setRoomId(stream.roomId || stream._id);
            setStreamInfo(stream);

            // Emit socket event
            const socket = socketRef.current;
            if (socket) {
                socket.emit("start_broadcast", {
                    streamId: stream._id,
                    roomId: stream.roomId || stream._id,
                    hostId: currentUser._id || currentUser.id,
                    hostUsername: currentUser.username,
                    title: streamTitle.trim(),
                    category: streamCategory,
                    type: selectedLiveMode,
                });
            }

            toast.success("🔴 You're now live!");

            if (selectedLiveMode === "solo") {
                setMode("publish");
            } else if (selectedLiveMode === "multi") {
                setMode("multi");
            } else if (selectedLiveMode === "audio") {
                setMode("audio");
            }
        } catch (err) {
            console.error("Failed to start stream:", err);
            toast.error(err.response?.data?.error || "Failed to start stream");
        } finally {
            setLoading(false);
        }
    };

    const startAsViewer = () => {
        if (!roomId.trim()) {
            toast.error("Please enter a valid Room ID");
            return;
        }
        setMode("watch");
    };

    const handleStopStream = async () => {
        try {
            if (activeStreamId) {
                await api.post(`/api/live/${activeStreamId}/end`);
            }

            const socket = socketRef.current;
            if (socket) {
                socket.emit("stop_broadcast", {
                    roomId: activeStreamId || roomId,
                    streamId: activeStreamId,
                });
            }
        } catch (err) {
            console.error("Failed to end stream:", err);
        }

        setMode(null);
        setStep(1);
        setActiveStreamId(null);
        setStreamInfo(null);
        toast.success("Stream ended");
        navigate("/discover");
    };

    const handleLeaveStream = async () => {
        try {
            if (activeStreamId) {
                await api.post(`/api/live/${activeStreamId}/leave`);
            }

            const socket = socketRef.current;
            if (socket) {
                socket.emit("leave_stream", {
                    roomId: roomId,
                    streamId: activeStreamId || streamId,
                });
            }
        } catch (err) {
            // ignore
        }

        setMode(null);
        setStep(1);
        setRoomId("");
        setStreamInfo(null);
        setActiveStreamId(null);
        navigate("/discover");
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20 min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                    <p className="text-white/70">Connecting to stream...</p>
                </div>
            </div>
        );
    }

    // Render modes
    if (mode === "publish") {
        return (
            <div className="w-full h-screen">
                <LivePublisher
                    currentUser={currentUser}
                    roomId={activeStreamId || roomId}
                    streamTitle={streamTitle}
                    streamCategory={streamCategory}
                    streamId={activeStreamId}
                    onStop={handleStopStream}
                />
            </div>
        );
    }

    if (mode === "multi") {
        return (
            <MultiGuestLive
                roomId={activeStreamId || roomId}
                currentUser={currentUser}
                streamTitle={streamTitle}
                streamCategory={streamCategory}
                maxSeats={seatCount}
                streamId={activeStreamId}
                isHost={true}
                onEnd={handleStopStream}
            />
        );
    }

    if (mode === "audio") {
        return (
            <AudioLive
                roomId={activeStreamId || roomId}
                currentUser={currentUser}
                streamTitle={streamTitle}
                streamCategory={streamCategory}
                streamId={activeStreamId}
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
                    streamId={activeStreamId || streamId}
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
                streamId={activeStreamId || streamId}
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
                streamId={activeStreamId || streamId}
                isHost={false}
                onEnd={handleLeaveStream}
            />
        );
    }

    // Default: Mode selection UI
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white pb-24">
            {step === 1 ? (
                /* Step 1: Select Live Mode */
                <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-cyan-400 mb-2">🎥 Go Live</h1>
                        <p className="text-white/60">Choose how you want to stream</p>
                    </div>

                    {!currentUser && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                            <p className="text-yellow-400 text-sm">
                                ⚠️ Please{" "}
                                <button
                                    onClick={() => navigate("/login")}
                                    className="underline font-semibold"
                                >
                                    log in
                                </button>{" "}
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
                                className="w-full p-4 rounded-2xl border-2 border-white/10 hover:border-white/30 hover:bg-white/5 transition-all text-left relative overflow-hidden hover:scale-[1.02] group"
                            >
                                {liveMode.featured && (
                                    <span className="absolute top-2 right-2 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full text-xs font-bold text-black">
                                        🔥 Popular
                                    </span>
                                )}
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`w-14 h-14 rounded-xl bg-gradient-to-br ${liveMode.color} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition`}
                                    >
                                        {liveMode.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg">{liveMode.name}</h3>
                                        <p className="text-white/50 text-sm">
                                            {liveMode.description}
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {liveMode.features?.map((f, i) => (
                                                <span
                                                    key={i}
                                                    className="text-[10px] px-2 py-0.5 bg-white/10 rounded-full text-white/60"
                                                >
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-white/30 group-hover:text-white transition">
                                        →
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Watch a Stream Section */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 mt-8">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            👁 Watch a Stream
                        </h2>
                        <div className="flex gap-2">
                            <input
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                                placeholder="Enter Room ID or Stream ID"
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
                        <p className="text-white/40 text-xs">
                            Or browse streams in the{" "}
                            <button
                                onClick={() => navigate("/discover")}
                                className="text-cyan-400 underline"
                            >
                                Discover
                            </button>{" "}
                            section
                        </p>
                    </div>
                </div>
            ) : (
                /* Step 2: Configure Stream */
                <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                stopCameraPreview();
                                setStep(1);
                            }}
                            className="p-2 hover:bg-white/10 rounded-full transition"
                        >
                            ← Back
                        </button>
                        <div>
                            <h1 className="text-xl font-bold">
                                {LIVE_MODES.find((m) => m.id === selectedLiveMode)?.icon}{" "}
                                {LIVE_MODES.find((m) => m.id === selectedLiveMode)?.name}
                            </h1>
                            <p className="text-white/50 text-sm">Configure your stream</p>
                        </div>
                    </div>

                    {/* Video / Audio Preview */}
                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
                        {selectedLiveMode !== "audio" ? (
                            <>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={`w-full h-full object-cover ${cameraStatus !== "granted" ? "hidden" : ""
                                        }`}
                                />

                                {cameraStatus === "pending" && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                                        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-white/60">Requesting camera...</p>
                                    </div>
                                )}

                                {(cameraStatus === "denied" ||
                                    cameraStatus === "error") && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-4">
                                            <span className="text-5xl mb-3">📷❌</span>
                                            <p className="text-red-400 font-bold text-lg mb-3">
                                                Camera Error
                                            </p>

                                            <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4 w-full max-w-sm">
                                                <p className="text-red-200 text-sm text-center">
                                                    {cameraError || "Unknown error"}
                                                </p>
                                            </div>

                                            <button
                                                onClick={retryCamera}
                                                className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 rounded-xl font-bold transition"
                                            >
                                                🔄 Try Again
                                            </button>
                                        </div>
                                    )}
                            </>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex flex-col items-center justify-center">
                                <span className="text-6xl mb-4">🎙️</span>
                                <p className="text-white/60">Audio Only Mode</p>
                                <div className="flex gap-1 mt-4">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-1.5 bg-gradient-to-t from-orange-500 to-red-500 rounded-full animate-pulse"
                                            style={{
                                                height: `${15 + Math.random() * 25}px`,
                                                animationDelay: `${i * 0.1}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Mode badge */}
                        <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 backdrop-blur rounded-full text-sm">
                            {LIVE_MODES.find((m) => m.id === selectedLiveMode)?.icon}{" "}
                            {LIVE_MODES.find((m) => m.id === selectedLiveMode)?.name}
                        </div>

                        {/* Camera status badge */}
                        {selectedLiveMode !== "audio" && (
                            <div
                                className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-bold ${cameraStatus === "granted"
                                        ? "bg-green-500"
                                        : cameraStatus === "pending"
                                            ? "bg-yellow-500"
                                            : "bg-red-500"
                                    }`}
                            >
                                {cameraStatus === "granted"
                                    ? "✓ Camera OK"
                                    : cameraStatus === "pending"
                                        ? "⏳ Checking"
                                        : "✗ Error"}
                            </div>
                        )}
                    </div>

                    {/* Stream Title */}
                    <div className="space-y-2">
                        <label className="text-sm text-white/70 font-semibold">
                            Stream Title *
                        </label>
                        <input
                            value={streamTitle}
                            onChange={(e) => setStreamTitle(e.target.value)}
                            placeholder="What's your stream about?"
                            maxLength={100}
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:border-cyan-400 transition"
                        />
                        <p className="text-xs text-white/40 text-right">
                            {streamTitle.length}/100
                        </p>
                    </div>

                    {/* Category Selection */}
                    <div className="space-y-2">
                        <label className="text-sm text-white/70 font-semibold">
                            Category
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setStreamCategory(cat.id)}
                                    className={`px-3 py-2 rounded-full text-sm transition ${streamCategory === cat.id
                                            ? "bg-cyan-500 text-black font-semibold"
                                            : "bg-white/10 text-white/70 hover:bg-white/20"
                                        }`}
                                >
                                    {cat.icon} {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Seat Count (Multi mode only) */}
                    {selectedLiveMode === "multi" && (
                        <div className="space-y-2">
                            <label className="text-sm text-white/70 font-semibold">
                                Number of Seats
                            </label>
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
                                        {count} 🪑
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Go Live Button */}
                    <button
                        disabled={
                            !streamTitle.trim() ||
                            !currentUser ||
                            loading ||
                            (selectedLiveMode !== "audio" &&
                                cameraStatus !== "granted")
                        }
                        onClick={startStreaming}
                        className={`w-full py-4 rounded-xl font-bold text-lg disabled:opacity-40 bg-gradient-to-r ${LIVE_MODES.find((m) => m.id === selectedLiveMode)?.color
                            } hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-3`}
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Starting...
                            </>
                        ) : selectedLiveMode !== "audio" &&
                            cameraStatus !== "granted" ? (
                            "📷 Camera Required"
                        ) : (
                            <>
                                <div className="relative">
                                    <span className="w-3 h-3 bg-white rounded-full block" />
                                    <span className="absolute inset-0 w-3 h-3 bg-white rounded-full animate-ping" />
                                </div>
                                Go LIVE
                            </>
                        )}
                    </button>

                    {/* Back Button */}
                    <button
                        onClick={() => {
                            stopCameraPreview();
                            setStep(1);
                        }}
                        className="w-full py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition"
                    >
                        ← Choose Different Mode
                    </button>
                </div>
            )}
        </div>
    );
}
