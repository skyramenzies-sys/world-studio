// src/components/LiveStreamPage.jsx - WORLD STUDIO LIVE EDITION 📺
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
   MAIN COMPONENT
   ============================================================ */
export default function LiveStreamPage() {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const socketRef = useRef(null);
    const chatEndRef = useRef(null);

    const [currentUser, setCurrentUser] = useState(null);
    const [stream, setStream] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [viewers, setViewers] = useState(0);
    const [gifts, setGifts] = useState([]);

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

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                setCurrentUser(JSON.parse(storedUser));
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        }
    }, []);

    // Fetch stream info
    useEffect(() => {
        if (!streamId) {
            setError("No stream ID provided");
            setLoading(false);
            return;
        }

        const fetchStream = async () => {
            try {
                const res = await api.get(`/api/live/${streamId}`);
                setStream(res.data);
                setViewers(res.data.viewers || 0);
            } catch (err) {
                console.error("Failed to fetch stream:", err);
                setError("Stream not found or has ended");
            } finally {
                setLoading(false);
            }
        };

        fetchStream();
    }, [streamId]);

    // Smooth autoscroll
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Join stream room and listen to events
    useEffect(() => {
        if (!streamId) return;

        const socket = socketRef.current;
        if (!socket) return;

        // Join chat room
        socket.emit("join_stream", { streamId, roomId: streamId });

        // Listen to messages
        const handleMessage = (msg) => {
            setMessages((prev) => [...prev.slice(-100), msg]);
        };

        // Viewer count updates
        const handleViewerCount = (data) => {
            setViewers(data.viewers || data.count || 0);
        };

        // Gift received
        const handleGift = (gift) => {
            setGifts((prev) => [...prev.slice(-5), { ...gift, timestamp: Date.now() }]);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                setGifts((prev) => prev.filter(g => g.timestamp !== gift.timestamp));
            }, 5000);
        };

        // Stream ended
        const handleStreamEnded = () => {
            setError("This stream has ended");
        };

        socket.on("chat_message", handleMessage);
        socket.on("viewer_count", handleViewerCount);
        socket.on("gift_received", handleGift);
        socket.on("stream_ended", handleStreamEnded);
        socket.on("live_ended", handleStreamEnded);

        // Cleanup
        return () => {
            socket.off("chat_message", handleMessage);
            socket.off("viewer_count", handleViewerCount);
            socket.off("gift_received", handleGift);
            socket.off("stream_ended", handleStreamEnded);
            socket.off("live_ended", handleStreamEnded);
            socket.emit("leave_stream", { streamId, roomId: streamId });
        };
    }, [streamId]);

    // Scroll after every new message
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Send message
    function sendMessage(e) {
        e.preventDefault();
        const messageText = input.trim();
        if (!messageText) return;

        const socket = socketRef.current;
        if (socket) {
            socket.emit("chat_message", {
                streamId: streamId,
                roomId: streamId,
                username: currentUser?.username || "Anonymous",
                userId: currentUser?._id || currentUser?.id,
                text: messageText,
                timestamp: new Date().toISOString(),
            });
        }

        setInput("");
    }

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                    <p className="text-white/70">Loading stream...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
                <div className="text-center p-8">
                    <p className="text-6xl mb-4">📺</p>
                    <p className="text-white/60 mb-4">{error}</p>
                    <button
                        onClick={() => navigate("/discover")}
                        className="px-6 py-3 bg-cyan-500 rounded-lg hover:bg-cyan-400 transition font-semibold"
                    >
                        Browse Streams
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={() => navigate("/discover")}
                        className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                    >
                        ← Back
                    </button>

                    {stream && (
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-cyan-400">
                                {stream.title || "Live Stream"}
                            </h1>
                            <p className="text-white/60 text-sm flex items-center gap-2">
                                <img
                                    src={stream.host?.avatar || stream.hostAvatar || "/defaults/default-avatar.png"}
                                    alt=""
                                    className="w-5 h-5 rounded-full"
                                    onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                                />
                                {stream.host?.username || stream.hostUsername || "Unknown"} • {stream.category || "Live"}
                            </p>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {/* Connection status */}
                        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`} />
                            <span className="text-xs text-white/60">{isConnected ? "Connected" : "..."}</span>
                        </div>

                        {/* Viewer count */}
                        <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg">
                            <span>👁</span>
                            <span className="font-semibold">{viewers}</span>
                        </div>

                        {/* Live badge */}
                        {stream?.isLive && (
                            <div className="flex items-center gap-2 bg-red-500 px-3 py-1.5 rounded-lg">
                                <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                <span className="font-bold text-sm">LIVE</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Gift overlays */}
                {gifts.length > 0 && (
                    <div className="mb-4 space-y-2">
                        {gifts.map((gift, i) => (
                            <div
                                key={gift.timestamp || i}
                                className={`flex items-center gap-3 bg-gradient-to-r ${gift.color || "from-purple-500/80 to-pink-500/80"} px-4 py-3 rounded-xl animate-slideIn`}
                            >
                                <span className="text-3xl animate-bounce">{gift.icon || "🎁"}</span>
                                <div>
                                    <p className="font-semibold">{gift.senderUsername}</p>
                                    <p className="text-sm text-white/80">sent {gift.item || "a gift"} x{gift.amount}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Chat Window */}
                <div className="bg-white/10 border border-white/20 rounded-2xl shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-white/10 flex items-center justify-between">
                        <h2 className="font-semibold flex items-center gap-2">
                            💬 Live Chat
                            <span className="text-xs text-white/40">({messages.length})</span>
                        </h2>
                    </div>

                    <div
                        className="p-4 space-y-3 overflow-y-auto"
                        style={{ height: "400px" }}
                    >
                        {messages.length === 0 ? (
                            <div className="text-white/40 text-center py-12">
                                <p className="text-4xl mb-2">💬</p>
                                <p>No messages yet — be the first! 🚀</p>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    className={`rounded-lg px-4 py-2 ${msg.isHost ? "bg-cyan-500/20 border border-cyan-500/30" : "bg-white/5"}`}
                                >
                                    <div className="flex items-baseline gap-2">
                                        <span className={`font-semibold ${msg.isHost ? "text-cyan-400" : "text-purple-400"}`}>
                                            {msg.username || msg.user}
                                            {msg.isHost && " 👑"}
                                        </span>
                                        <span className="text-xs text-white/40">
                                            {msg.timestamp
                                                ? new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                                                : ""}
                                        </span>
                                    </div>
                                    <p className="text-white/80 mt-1">{msg.text}</p>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef}></div>
                    </div>

                    {/* Input bar */}
                    <form
                        onSubmit={sendMessage}
                        className="p-4 border-t border-white/10 flex gap-3"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={currentUser ? "Type your message..." : "Log in to chat"}
                            disabled={!currentUser}
                            maxLength={200}
                            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 outline-none focus:border-cyan-400 transition disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || !currentUser}
                            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Send
                        </button>
                    </form>
                </div>

                {/* Stream info */}
                {stream && (
                    <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
                        <h3 className="font-semibold mb-3">About this stream</h3>
                        <div className="flex items-center gap-4 mb-3">
                            <img
                                src={stream.host?.avatar || stream.hostAvatar || "/defaults/default-avatar.png"}
                                alt=""
                                className="w-12 h-12 rounded-full border-2 border-white/20"
                                onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                            />
                            <div>
                                <p className="font-semibold">{stream.host?.username || stream.hostUsername}</p>
                                <p className="text-sm text-white/60">{stream.category || "Live"}</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-white/60">
                            <span className="flex items-center gap-1">👁 {stream.viewers || viewers} viewers</span>
                            <span className="flex items-center gap-1">📁 {stream.category || "Uncategorized"}</span>
                            {stream.startedAt && (
                                <span className="flex items-center gap-1">
                                    🕐 Started {new Date(stream.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            )}
                        </div>
                        {stream.description && (
                            <p className="mt-3 text-white/70 text-sm">{stream.description}</p>
                        )}
                    </div>
                )}

                {/* Not logged in notice */}
                {!currentUser && (
                    <div className="mt-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                        <p className="text-yellow-400 text-sm">
                            <button onClick={() => navigate("/login")} className="underline font-semibold">Log in</button>
                            {" "}to chat and send gifts
                        </p>
                    </div>
                )}
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