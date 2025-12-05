// src/components/LivePublisher.jsx - WORLD STUDIO LIVE EDITION 📹
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { io } from "socket.io-client";

/* ============================================================
   WORLD STUDIO LIVE CONFIGURATION
   ============================================================ */
const API_BASE_URL = "https://world-studio.live";
const SOCKET_URL = "https://world-studio.live";

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
   WebRTC Configuration
   ============================================================ */
const RTC_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun3.l.google.com:19302" },
    ],
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function LivePublisher({
    currentUser,
    roomId,
    streamTitle = "Untitled Stream",
    streamCategory = "Talk",
    streamId,
    onStop,
}) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const peersRef = useRef(new Map());
    const socketRef = useRef(null);

    const [viewers, setViewers] = useState(0);
    const [isLive, setIsLive] = useState(false);
    const [error, setError] = useState("");
    const [duration, setDuration] = useState(0);
    const [chat, setChat] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [gifts, setGifts] = useState([]);
    const [totalGifts, setTotalGifts] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [chatInput, setChatInput] = useState("");

    // Initialize socket
    useEffect(() => {
        socketRef.current = getSocket();
        setIsConnected(socketRef.current.connected);

        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);

        socketRef.current.on("connect", handleConnect);
        socketRef.current.on("disconnect", handleDisconnect);

        return () => {
            socketRef.current.off("connect", handleConnect);
            socketRef.current.off("disconnect", handleDisconnect);
        };
    }, []);

    // Stop live stream
    const stopLive = async () => {
        setIsLive(false);

        // Close all peer connections
        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();

        // Stop local media
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }

        // Notify server & watchers
        const socket = socketRef.current;
        if (socket) {
            socket.emit("stop_broadcast", { roomId, streamId });
        }

        try {
            await api.post(`/api/live/${streamId || roomId}/end`);
        } catch (err) {
            console.error("Failed to end stream:", err);
        }

        onStop?.();
    };

    // Toggle mute
    const toggleMute = () => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);

                const socket = socketRef.current;
                if (socket) {
                    socket.emit("host_muted", { roomId, isMuted: !audioTrack.enabled });
                }
            }
        }
    };

    // Toggle camera
    const toggleCamera = () => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);

                const socket = socketRef.current;
                if (socket) {
                    socket.emit("host_camera", { roomId, isCameraOff: !videoTrack.enabled });
                }
            }
        }
    };

    // Duration timer
    useEffect(() => {
        let interval;
        if (isLive) {
            interval = setInterval(() => setDuration((d) => d + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isLive]);

    // Format duration
    const formatDuration = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
        }
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    // Send chat message (host)
    const sendChatMessage = (e) => {
        e?.preventDefault();
        if (!chatInput.trim()) return;

        const socket = socketRef.current;
        if (socket) {
            socket.emit("chat_message", {
                streamId: streamId || roomId,
                roomId,
                username: currentUser?.username || "Host",
                userId: currentUser?._id || currentUser?.id,
                text: chatInput.trim(),
                isHost: true,
                timestamp: new Date().toISOString(),
            });
        }

        setChatInput("");
    };

    // Main broadcast setup
    useEffect(() => {
        let active = true;
        const socket = socketRef.current;

        const startBroadcast = async () => {
            try {
                // 1) Get camera + mic
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user",
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true,
                    },
                });

                if (!active) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                // 2) Create stream entry in DB
                try {
                    await api.post("/api/live", {
                        roomId,
                        title: streamTitle,
                        category: streamCategory,
                        hostId: currentUser?._id || currentUser?.id,
                        hostUsername: currentUser?.username,
                        hostAvatar: currentUser?.avatar,
                    });
                } catch (err) {
                    console.log("Stream creation error:", err?.response?.data || err);
                }

                const streamerId = currentUser?._id || currentUser?.id;

                // 3) Socket: start_broadcast
                socket.emit("start_broadcast", {
                    roomId,
                    streamId: streamId || roomId,
                    streamer: currentUser?.username,
                    streamerId,
                    title: streamTitle,
                    category: streamCategory,
                });

                setIsLive(true);
                toast.success("You're now live! 🔴 Your followers will be notified!");

                // 4) WebRTC signalling handlers

                // Viewer joins - create offer
                socket.on("watcher", async ({ watcherId }) => {
                    if (!streamRef.current) return;

                    const pc = new RTCPeerConnection(RTC_CONFIG);

                    // Add tracks
                    streamRef.current.getTracks().forEach((t) =>
                        pc.addTrack(t, streamRef.current)
                    );

                    // ICE candidate to viewer
                    pc.onicecandidate = ({ candidate }) => {
                        if (candidate) {
                            socket.emit("candidate", {
                                target: watcherId,
                                candidate,
                            });
                        }
                    };

                    // Connection state monitoring
                    pc.onconnectionstatechange = () => {
                        console.log(`Peer ${watcherId}: ${pc.connectionState}`);
                        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
                            pc.close();
                            peersRef.current.delete(watcherId);
                        }
                    };

                    // Create and send offer
                    try {
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);

                        socket.emit("offer", {
                            watcherId,
                            sdp: offer,
                        });

                        peersRef.current.set(watcherId, pc);
                    } catch (err) {
                        console.error("Failed to create offer:", err);
                    }
                });

                // Viewer sends answer back
                socket.on("answer", async ({ watcherId, sdp }) => {
                    const pc = peersRef.current.get(watcherId);
                    if (!pc) return;

                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    } catch (e) {
                        console.error("setRemoteDescription error:", e);
                    }
                });

                // ICE candidate from viewer
                socket.on("candidate", async ({ from, candidate }) => {
                    const pc = peersRef.current.get(from);
                    if (pc && candidate) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (e) {
                            console.warn("addIceCandidate error:", e?.message || e);
                        }
                    }
                });

                // Viewer left
                socket.on("remove_watcher", ({ watcherId }) => {
                    const pc = peersRef.current.get(watcherId);
                    if (pc) pc.close();
                    peersRef.current.delete(watcherId);
                });

                // Viewer count update
                socket.on("viewer_count", ({ viewers: count }) => setViewers(count));

                // Chat messages
                socket.on("chat_message", (msg) => {
                    setChat((prev) => [...prev.slice(-50), msg]);
                });

                // Gift received
                socket.on("gift_received", (gift) => {
                    setGifts((prev) => [...prev.slice(-10), { ...gift, timestamp: Date.now() }]);
                    setTotalGifts((prev) => prev + (gift.amount || 0));
                    toast.success(`🎁 ${gift.senderUsername} sent ${gift.icon || "💝"} x${gift.amount}!`, {
                        duration: 3000,
                    });

                    // Auto-remove gift after 5 seconds
                    setTimeout(() => {
                        setGifts((prev) => prev.filter(g => g.timestamp !== gift.timestamp));
                    }, 5000);
                });

                // Stream ended (external trigger)
                socket.on("stream_ended", () => {
                    toast.error("Stream ended");
                    stopLive();
                });

            } catch (err) {
                console.error("getUserMedia error:", err);

                let errorMsg = "Failed to start stream.";
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    errorMsg = "Camera/microphone access denied. Check browser permissions.";
                } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                    errorMsg = "No camera or microphone found on this device.";
                } else if (err.name === "NotReadableError") {
                    errorMsg = "Camera or microphone is already in use by another app.";
                } else if (err.name === "OverconstrainedError") {
                    errorMsg = "This camera doesn't support the requested resolution.";
                }

                setError(errorMsg);
                toast.error("Failed to access camera/microphone");
            }
        };

        startBroadcast();

        return () => {
            active = false;

            // Remove socket listeners
            [
                "watcher",
                "answer",
                "candidate",
                "remove_watcher",
                "viewer_count",
                "chat_message",
                "stream_ended",
                "gift_received",
            ].forEach((e) => socket.off(e));

            // Stop media tracks
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }

            // Close peer connections
            peersRef.current.forEach((pc) => pc.close());
            peersRef.current.clear();
        };
    }, [roomId, currentUser, streamTitle, streamCategory, streamId]);

    // Error state
    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-center p-8">
                    <p className="text-6xl mb-4">📹</p>
                    <p className="text-red-400 mb-4 max-w-md">{error}</p>
                    <button
                        onClick={onStop}
                        className="px-6 py-3 bg-white/10 rounded-lg hover:bg-white/20 transition"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-black text-white">
            {/* Top bar */}
            <div className="p-3 flex items-center gap-3 bg-black/80 border-b border-white/10">
                {/* Live badge */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isLive ? "bg-red-500" : "bg-white/20"}`}>
                    <span className={`w-2 h-2 rounded-full ${isLive ? "bg-white animate-pulse" : "bg-white/50"}`}></span>
                    <span className="font-bold text-sm">{isLive ? "LIVE" : "STARTING..."}</span>
                </div>

                {/* Duration */}
                {isLive && (
                    <span className="text-white/60 text-sm font-mono">{formatDuration(duration)}</span>
                )}

                {/* Stream title (desktop) */}
                <div className="hidden md:block flex-1 text-center">
                    <span className="text-white font-semibold">{streamTitle}</span>
                    <span className="text-white/50 ml-2">• {streamCategory}</span>
                </div>

                {/* Connection status */}
                <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="text-xs text-white/50 hidden md:inline">
                        {isConnected ? "Connected" : "Reconnecting..."}
                    </span>
                </div>

                {/* Stats */}
                <div className="ml-auto flex items-center gap-3">
                    {totalGifts > 0 && (
                        <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-lg">
                            <span>🎁</span>
                            <span className="font-semibold">{totalGifts.toLocaleString()}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 text-white/70 bg-white/10 px-3 py-1.5 rounded-lg">
                        <span>👁</span>
                        <span className="font-semibold">{viewers}</span>
                    </div>
                </div>

                {/* End button */}
                {isLive && (
                    <button
                        onClick={stopLive}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg font-semibold transition"
                    >
                        ⏹ End
                    </button>
                )}
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Video area */}
                <div className="flex-1 relative">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-contain bg-black"
                    />

                    {/* Camera off overlay */}
                    {isCameraOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                            <div className="text-center">
                                <p className="text-6xl mb-2">📷</p>
                                <p className="text-white/60">Camera Off</p>
                            </div>
                        </div>
                    )}

                    {/* Controls */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                        <button
                            onClick={toggleMute}
                            className={`p-3 rounded-full transition ${isMuted ? "bg-red-500 hover:bg-red-400" : "bg-white/20 hover:bg-white/30"}`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? "🔇" : "🎤"}
                        </button>
                        <button
                            onClick={toggleCamera}
                            className={`p-3 rounded-full transition ${isCameraOff ? "bg-red-500 hover:bg-red-400" : "bg-white/20 hover:bg-white/30"}`}
                            title={isCameraOff ? "Turn on camera" : "Turn off camera"}
                        >
                            {isCameraOff ? "📷" : "🎥"}
                        </button>
                    </div>

                    {/* Room ID badge */}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-sm">
                        <span className="text-white/50">Room: </span>
                        <span className="text-white font-mono">{roomId?.slice(0, 20)}{roomId?.length > 20 ? "..." : ""}</span>
                    </div>

                    {/* Gift overlays */}
                    <div className="absolute top-20 left-4 space-y-2 pointer-events-none max-w-[300px]">
                        {gifts.slice(-5).map((gift, i) => (
                            <div
                                key={gift.timestamp || i}
                                className={`flex items-center gap-2 bg-gradient-to-r ${gift.color || "from-purple-500/80 to-pink-500/80"} px-3 py-2 rounded-lg animate-slideIn`}
                            >
                                <span className="text-2xl animate-bounce">{gift.icon || "🎁"}</span>
                                <div>
                                    <p className="text-sm font-semibold text-white">{gift.senderUsername}</p>
                                    <p className="text-xs text-white/80">sent {gift.item || "gift"} x{gift.amount}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right chat panel (desktop) */}
                <div className="w-80 hidden lg:flex flex-col bg-white/5 border-l border-white/10">
                    <div className="p-3 border-b border-white/10">
                        <h3 className="font-semibold flex items-center gap-2">
                            💬 Live Chat
                            <span className="text-xs text-white/40">({chat.length})</span>
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {chat.length === 0 ? (
                            <p className="text-white/40 text-sm text-center py-8">No messages yet</p>
                        ) : (
                            chat.map((msg, i) => (
                                <div key={i} className={`text-sm p-2 rounded-lg ${msg.isHost ? "bg-cyan-500/20" : "bg-white/5"}`}>
                                    <span className={`font-semibold ${msg.isHost ? "text-cyan-400" : "text-purple-400"}`}>
                                        {msg.username}{msg.isHost ? " 👑" : ""}:
                                    </span>{" "}
                                    <span className="text-white/80">{msg.text}</span>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Host chat input */}
                    <form onSubmit={sendChatMessage} className="p-3 border-t border-white/10">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Say something..."
                                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm outline-none focus:border-cyan-400 transition"
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim()}
                                className="px-4 py-2 bg-cyan-500 rounded-lg font-semibold text-sm disabled:opacity-40 hover:bg-cyan-400 transition"
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(-20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slideIn { animation: slideIn 0.3s ease-out; }
            `}</style>
        </div>
    );
}