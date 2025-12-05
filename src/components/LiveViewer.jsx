// src/components/LiveViewer.jsx - WORLD STUDIO LIVE EDITION 👁
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import axios from "axios";
import { io } from "socket.io-client";
import GiftPanel from "./GiftPanel";

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
export default function LiveViewer({ roomId, currentUser, onLeave }) {
    const videoRef = useRef(null);
    const pcRef = useRef(null);
    const broadcasterIdRef = useRef(null);
    const chatEndRef = useRef(null);
    const socketRef = useRef(null);

    const [streamInfo, setStreamInfo] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);
    const [error, setError] = useState("");
    const [viewers, setViewers] = useState(0);
    const [chat, setChat] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [showGiftPanel, setShowGiftPanel] = useState(false);
    const [gifts, setGifts] = useState([]);
    const [duration, setDuration] = useState(0);

    // Initialize socket
    useEffect(() => {
        socketRef.current = getSocket();
        return () => { };
    }, []);

    // Scroll to bottom of chat
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chat]);

    // Duration timer
    useEffect(() => {
        if (!streamInfo?.startedAt) return;

        const updateDuration = () => {
            const start = new Date(streamInfo.startedAt);
            const diff = Math.floor((Date.now() - start.getTime()) / 1000);
            setDuration(diff);
        };

        updateDuration();
        const interval = setInterval(updateDuration, 1000);
        return () => clearInterval(interval);
    }, [streamInfo?.startedAt]);

    const formatDuration = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
        }
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    // Main connection effect
    useEffect(() => {
        if (!roomId) return;

        let active = true;
        const socket = socketRef.current;

        const connectToStream = async () => {
            try {
                // 1) Fetch stream info from API
                try {
                    const res = await api.get(`/api/live/${roomId}`);
                    if (res.data) {
                        setStreamInfo(res.data);
                        setViewers(res.data.viewers || 0);
                    }
                } catch (err) {
                    console.log("Could not fetch stream info:", err);
                }

                // 2) Create PeerConnection
                const pc = new RTCPeerConnection(RTC_CONFIG);
                pcRef.current = pc;

                // Handle incoming tracks
                pc.ontrack = (event) => {
                    if (!active) return;
                    const [remoteStream] = event.streams;
                    if (videoRef.current && remoteStream) {
                        videoRef.current.srcObject = remoteStream;
                        setIsConnected(true);
                        setIsConnecting(false);
                    }
                };

                // Connection state monitoring
                pc.onconnectionstatechange = () => {
                    console.log("Connection state:", pc.connectionState);
                    if (pc.connectionState === "connected") {
                        setIsConnected(true);
                        setIsConnecting(false);
                    } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                        setIsConnected(false);
                        setError("Connection lost. Stream may have ended.");
                    }
                };

                // ICE candidates to broadcaster
                pc.onicecandidate = ({ candidate }) => {
                    if (candidate && broadcasterIdRef.current) {
                        socket.emit("candidate", {
                            target: broadcasterIdRef.current,
                            candidate,
                        });
                    }
                };

                // 3) Join rooms
                socket.emit("join_stream", { streamId: roomId, roomId });
                socket.emit("watcher", { roomId });

                // 4) WebRTC signaling

                // Offer from broadcaster
                socket.on("offer", async ({ sdp, broadcasterId }) => {
                    if (!active) return;
                    try {
                        if (broadcasterId) {
                            broadcasterIdRef.current = broadcasterId;
                        }
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);

                        socket.emit("answer", {
                            roomId,
                            sdp: answer,
                        });
                    } catch (err) {
                        console.error("Offer handling error:", err);
                        setError("Failed to establish connection");
                    }
                });

                // ICE from broadcaster
                socket.on("candidate", async ({ candidate }) => {
                    if (!active || !candidate) return;
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (err) {
                        console.warn("ICE candidate error:", err);
                    }
                });

                // Viewer count
                socket.on("viewer_count", (data) => {
                    setViewers(data.viewers || data.count || 0);
                });

                // Chat messages
                socket.on("chat_message", (message) => {
                    setChat((prev) => [...prev.slice(-100), message]);
                });

                // Gifts
                socket.on("gift_received", (gift) => {
                    setGifts((prev) => [...prev.slice(-10), { ...gift, timestamp: Date.now() }]);
                    toast.success(`🎁 ${gift.senderUsername} sent ${gift.icon || "💝"}!`);

                    // Auto-remove after 5 seconds
                    setTimeout(() => {
                        setGifts((prev) => prev.filter(g => g.timestamp !== gift.timestamp));
                    }, 5000);
                });

                // Stream ended
                socket.on("stream_ended", () => {
                    setIsConnected(false);
                    setError("Stream has ended");
                    toast.error("Stream has ended");
                });

                socket.on("live_ended", () => {
                    setIsConnected(false);
                    setError("Stream has ended");
                    toast.error("Stream has ended");
                });

                // Connection timeout
                setTimeout(() => {
                    if (active && !isConnected && isConnecting) {
                        setIsConnecting(false);
                        if (!error) {
                            setError("Could not connect to stream. It may not be live.");
                        }
                    }
                }, 15000);

            } catch (err) {
                console.error("Connection error:", err);
                setError("Failed to connect to stream");
                setIsConnecting(false);
            }
        };

        connectToStream();

        return () => {
            active = false;

            socket.off("offer");
            socket.off("candidate");
            socket.off("viewer_count");
            socket.off("chat_message");
            socket.off("stream_ended");
            socket.off("live_ended");
            socket.off("gift_received");

            socket.emit("leave_stream", { streamId: roomId, roomId });

            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
        };
    }, [roomId]);

    // Send chat message
    const sendMessage = (e) => {
        e.preventDefault();
        const text = chatInput.trim();
        if (!text) return;

        const socket = socketRef.current;
        const message = {
            streamId: roomId,
            roomId,
            username: currentUser?.username || "Anonymous",
            userId: currentUser?._id || currentUser?.id,
            text,
            timestamp: new Date().toISOString(),
        };

        socket.emit("chat_message", message);
        setChatInput("");
    };

    // Leave stream
    const handleLeave = () => {
        const socket = socketRef.current;
        socket.emit("leave_stream", { streamId: roomId, roomId });
        if (pcRef.current) pcRef.current.close();
        onLeave?.();
    };

    // Error state
    if (error && !isConnected) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-center p-8 max-w-md">
                    <p className="text-6xl mb-4">📺</p>
                    <p className="text-white/60 mb-4">{error}</p>
                    <button
                        onClick={handleLeave}
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
            <div className="p-3 flex items-center gap-3 bg-black/80 border-b border-white/10 z-10">
                <button
                    onClick={handleLeave}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition"
                >
                    ← Back
                </button>

                <div className="flex-1">
                    {streamInfo ? (
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="font-semibold text-white truncate">
                                {streamInfo.title || "Live Stream"}
                            </span>
                            {(streamInfo.host?.username || streamInfo.hostUsername) && (
                                <span className="text-white/50 hidden md:inline">
                                    • {streamInfo.host?.username || streamInfo.hostUsername}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-white/50">Room: {roomId?.slice(0, 15)}...</span>
                    )}
                </div>

                {/* Duration */}
                {streamInfo?.startedAt && (
                    <span className="text-white/60 text-sm font-mono hidden md:block">
                        {formatDuration(duration)}
                    </span>
                )}

                {/* Connection status */}
                <div className={`px-3 py-1 rounded-full text-sm ${isConnected
                        ? "bg-green-500/20 text-green-400"
                        : isConnecting
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                    }`}>
                    {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Offline"}
                </div>

                {/* Viewer count */}
                <div className="flex items-center gap-2 text-white/70 bg-white/10 px-3 py-1.5 rounded-lg">
                    <span>👁</span>
                    <span className="font-semibold">{viewers}</span>
                </div>

                {/* Gift button */}
                {currentUser && streamInfo && (
                    <button
                        onClick={() => setShowGiftPanel(!showGiftPanel)}
                        className={`px-4 py-1.5 rounded-lg flex items-center gap-2 font-semibold transition ${showGiftPanel
                                ? "bg-pink-500 text-white"
                                : "bg-pink-500/20 text-pink-400 hover:bg-pink-500/30"
                            }`}
                    >
                        🎁 Gift
                    </button>
                )}
            </div>

            {/* Main content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Video area */}
                <div className="flex-1 relative bg-black">
                    {/* Loading spinner */}
                    {isConnecting && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4" />
                                <p className="text-white/60">Connecting to stream...</p>
                            </div>
                        </div>
                    )}

                    {/* Video element */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-contain ${isConnecting ? "opacity-0" : "opacity-100"}`}
                    />

                    {/* Gift animations */}
                    <div className="absolute top-4 left-4 space-y-2 pointer-events-none max-w-[300px]">
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

                    {/* Gift Panel Overlay */}
                    {showGiftPanel && streamInfo && (
                        <div className="absolute bottom-4 right-4 w-80 z-20 bg-gray-900 rounded-xl border border-white/20 shadow-2xl overflow-hidden">
                            <div className="flex items-center justify-between p-3 border-b border-white/10">
                                <h3 className="font-semibold">🎁 Send Gift</h3>
                                <button
                                    onClick={() => setShowGiftPanel(false)}
                                    className="text-white/50 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>
                            <GiftPanel
                                recipient={{
                                    _id: streamInfo.streamerId || streamInfo.hostId || streamInfo.host?._id,
                                    username: streamInfo.streamerName || streamInfo.hostUsername || streamInfo.host?.username,
                                    avatar: streamInfo.host?.avatar || streamInfo.hostAvatar,
                                }}
                                onClose={() => setShowGiftPanel(false)}
                                onGiftSent={(gift) => {
                                    const socket = socketRef.current;
                                    socket.emit("gift_sent", {
                                        ...gift,
                                        streamId: roomId,
                                        roomId,
                                        senderUsername: currentUser?.username,
                                        senderId: currentUser?._id || currentUser?.id,
                                    });
                                    setShowGiftPanel(false);
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Chat sidebar (desktop) */}
                <div className="w-80 hidden lg:flex flex-col bg-white/5 border-l border-white/10">
                    <div className="p-3 border-b border-white/10">
                        <h3 className="font-semibold flex items-center gap-2">
                            💬 Live Chat
                            <span className="text-xs text-white/40">({chat.length})</span>
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {chat.length === 0 ? (
                            <p className="text-white/40 text-sm text-center py-8">
                                No messages yet. Say hi! 👋
                            </p>
                        ) : (
                            chat.map((msg, i) => (
                                <div key={i} className={`text-sm break-words p-2 rounded-lg ${msg.isHost ? "bg-cyan-500/20" : "bg-white/5"}`}>
                                    <span className={`font-semibold ${msg.isHost ? "text-cyan-400" : "text-purple-400"}`}>
                                        {msg.username || msg.user}{msg.isHost ? " 👑" : ""}:
                                    </span>{" "}
                                    <span className="text-white/80">{msg.text}</span>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat input */}
                    <form onSubmit={sendMessage} className="p-3 border-t border-white/10">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder={currentUser ? "Send a message..." : "Log in to chat"}
                                disabled={!currentUser}
                                maxLength={200}
                                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 outline-none focus:border-cyan-400 disabled:opacity-50 transition"
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim() || !currentUser}
                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
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