// src/components/LiveViewer.jsx
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import socket from "../api/socket";
import api from "../api/api";

// WebRTC configuration
const RTC_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
    ],
};

export default function LiveViewer({ roomId, currentUser, onLeave }) {
    const videoRef = useRef(null);
    const pcRef = useRef(null);
    const chatEndRef = useRef(null);

    const [streamInfo, setStreamInfo] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);
    const [error, setError] = useState("");
    const [viewers, setViewers] = useState(0);
    const [chat, setChat] = useState([]);
    const [chatInput, setChatInput] = useState("");

    // Scroll chat to bottom
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chat]);

    // Main effect - connect to stream
    useEffect(() => {
        if (!roomId) return;

        let active = true;

        const connectToStream = async () => {
            try {
                // Fetch stream info from API
                try {
                    const res = await api.get(`/live/${roomId}`);
                    if (res.data) {
                        setStreamInfo(res.data);
                    }
                } catch (err) {
                    console.log("Could not fetch stream info:", err);
                }

                // Create peer connection
                const pc = new RTCPeerConnection(RTC_CONFIG);
                pcRef.current = pc;

                // Handle incoming stream
                pc.ontrack = (event) => {
                    if (videoRef.current && event.streams[0]) {
                        videoRef.current.srcObject = event.streams[0];
                        setIsConnected(true);
                        setIsConnecting(false);
                    }
                };

                // Connection state changes
                pc.onconnectionstatechange = () => {
                    if (pc.connectionState === "connected") {
                        setIsConnected(true);
                        setIsConnecting(false);
                    } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
                        setIsConnected(false);
                        setError("Connection lost. Stream may have ended.");
                    }
                };

                // ICE candidates → broadcaster
                pc.onicecandidate = ({ candidate }) => {
                    if (candidate) {
                        socket.emit("candidate", {
                            target: roomId,
                            candidate,
                        });
                    }
                };

                // Join the stream room
                socket.emit("join_stream", roomId);
                socket.emit("watch", { roomId });

                // ---- SOCKET EVENTS ----

                // Receive offer from broadcaster
                socket.on("offer", async ({ sdp }) => {
                    if (!active) return;
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        socket.emit("answer", { roomId, sdp: answer });
                    } catch (err) {
                        console.error("Offer handling error:", err);
                    }
                });

                // ICE candidates from broadcaster
                socket.on("candidate", async ({ candidate }) => {
                    if (!active || !candidate) return;
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (err) {
                        console.warn("ICE candidate error:", err);
                    }
                });

                // Viewer count updates
                socket.on("viewer_count", ({ viewers: count }) => {
                    setViewers(count);
                });

                // Chat messages
                socket.on("chat_message", (message) => {
                    setChat((prev) => [...prev.slice(-100), message]);
                });

                // Stream ended
                socket.on("stream_ended", () => {
                    setIsConnected(false);
                    setError("Stream has ended");
                    toast.error("Stream has ended");
                });

                // Timeout for connection
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

            // Cleanup socket listeners
            socket.off("offer");
            socket.off("candidate");
            socket.off("viewer_count");
            socket.off("chat_message");
            socket.off("stream_ended");

            // Leave stream room
            socket.emit("leave_stream", roomId);

            // Close peer connection
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

        const message = {
            streamId: roomId,
            username: currentUser?.username || "Anonymous",
            text,
            timestamp: new Date().toISOString(),
        };

        socket.emit("chat_message", message);
        setChatInput("");
    };

    // Leave stream
    const handleLeave = () => {
        socket.emit("leave_stream", roomId);
        if (pcRef.current) {
            pcRef.current.close();
        }
        onLeave?.();
    };

    // Error/Offline state
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
        <div className="w-full h-full flex flex-col bg-black">
            {/* Top bar */}
            <div className="p-3 flex items-center gap-3 bg-black/80 border-b border-white/10 z-10">
                {/* Back button */}
                <button
                    onClick={handleLeave}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition"
                >
                    ← Back
                </button>

                {/* Stream info */}
                <div className="flex-1">
                    {streamInfo ? (
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                            <span className="font-semibold text-white">
                                {streamInfo.title || "Live Stream"}
                            </span>
                            {streamInfo.host?.username && (
                                <span className="text-white/50">
                                    • {streamInfo.host.username}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-white/50">Room: {roomId}</span>
                    )}
                </div>

                {/* Connection status */}
                <div className={`px-3 py-1 rounded-full text-sm ${isConnected
                        ? "bg-green-500/20 text-green-400"
                        : isConnecting
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                    }`}>
                    {isConnected ? "Connected" : isConnecting ? "Connecting..." : "Offline"}
                </div>

                {/* Viewers */}
                <div className="flex items-center gap-2 text-white/70 bg-white/10 px-3 py-1.5 rounded-lg">
                    <span>👁</span>
                    <span className="font-semibold">{viewers}</span>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex">
                {/* Video */}
                <div className="flex-1 relative bg-black">
                    {isConnecting && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
                                <p className="text-white/60">Connecting to stream...</p>
                            </div>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-contain ${isConnecting ? "opacity-0" : "opacity-100"}`}
                    />
                </div>

                {/* Chat sidebar */}
                <div className="w-80 hidden lg:flex flex-col bg-white/5 border-l border-white/10">
                    <div className="p-3 border-b border-white/10">
                        <h3 className="font-semibold">💬 Live Chat</h3>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {chat.length === 0 ? (
                            <p className="text-white/40 text-sm text-center py-8">
                                No messages yet. Say hi! 👋
                            </p>
                        ) : (
                            chat.map((msg, i) => (
                                <div key={i} className="text-sm break-words">
                                    <span className="text-cyan-400 font-semibold">
                                        {msg.username || msg.user}:
                                    </span>{" "}
                                    <span className="text-white/80">{msg.text}</span>
                                </div>
                            ))
                        )}
                        <div ref={chatEndRef}></div>
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
                                className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 outline-none focus:border-cyan-400 disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim() || !currentUser}
                                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg font-semibold text-black text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Mobile chat toggle could be added here */}
        </div>
    );
}