// src/components/LiveStreamPage.jsx
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket from "../api/socket";
import api from "../api/api";

export default function LiveStreamPage() {
    const { streamId } = useParams();
    const navigate = useNavigate();

    // Get current user from localStorage
    const [currentUser, setCurrentUser] = useState(null);
    const [stream, setStream] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const chatEndRef = useRef(null);

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
                const res = await api.get(`/live/${streamId}`);
                setStream(res.data);
            } catch (err) {
                console.error("Failed to fetch stream:", err);
                setError("Stream not found");
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

    // Join stream room and listen to messages
    useEffect(() => {
        if (!streamId) return;

        // Join chat room
        socket.emit("join_stream", streamId);

        // Listen to messages
        const handleMessage = (msg) => {
            setMessages((prev) => [...prev.slice(-100), msg]); // Keep last 100 messages
        };

        socket.on("chat_message", handleMessage);

        // Stream ended
        socket.on("stream_ended", () => {
            setError("Stream has ended");
        });

        // Cleanup
        return () => {
            socket.off("chat_message", handleMessage);
            socket.off("stream_ended");
            socket.emit("leave_stream", streamId);
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

        socket.emit("chat_message", {
            streamId: streamId,
            username: currentUser?.username || "Anonymous",
            user: currentUser?.username || "Anonymous", // For compatibility
            text: messageText,
            timestamp: new Date().toISOString(),
        });

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
                        className="px-6 py-3 bg-cyan-500 rounded-lg hover:bg-cyan-400 transition"
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
                            <p className="text-white/60 text-sm">
                                {stream.host?.username || "Unknown"} • {stream.category || "Live"}
                            </p>
                        </div>
                    )}

                    {stream?.isLive && (
                        <div className="flex items-center gap-2 bg-red-500 px-3 py-1.5 rounded-lg">
                            <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                            <span className="font-bold text-sm">LIVE</span>
                        </div>
                    )}
                </div>

                {/* Chat Window */}
                <div className="bg-white/10 border border-white/20 rounded-2xl shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-white/10">
                        <h2 className="font-semibold flex items-center gap-2">
                            💬 Live Chat
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
                                    className="bg-white/5 rounded-lg px-4 py-2"
                                >
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-cyan-400 font-semibold">
                                            {msg.username || msg.user}
                                        </span>
                                        <span className="text-xs text-white/40">
                                            {msg.timestamp
                                                ? new Date(msg.timestamp).toLocaleTimeString()
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
                            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 outline-none focus:border-cyan-400 transition disabled:opacity-50"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || !currentUser}
                            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 rounded-lg font-bold text-black transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Send
                        </button>
                    </form>
                </div>

                {/* Stream info */}
                {stream && (
                    <div className="mt-6 bg-white/5 rounded-xl p-4 border border-white/10">
                        <h3 className="font-semibold mb-2">About this stream</h3>
                        <div className="flex items-center gap-4 text-sm text-white/60">
                            <span>👁 {stream.viewers || 0} viewers</span>
                            <span>📁 {stream.category || "Uncategorized"}</span>
                            {stream.host?.username && (
                                <span>🎙 {stream.host.username}</span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}