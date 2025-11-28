// src/components/MultiGuestLive.jsx
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import socket from "../api/socket";
import api from "../api/api";

// WebRTC configuration
const RTC_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

// Seat layout configurations
const SEAT_LAYOUTS = {
    4: [
        { id: 0, row: 0, col: 0, isHost: true },
        { id: 1, row: 0, col: 1 },
        { id: 2, row: 1, col: 0 },
        { id: 3, row: 1, col: 1 },
    ],
    6: [
        { id: 0, row: 0, col: 0, isHost: true },
        { id: 1, row: 0, col: 1 },
        { id: 2, row: 0, col: 2 },
        { id: 3, row: 1, col: 0 },
        { id: 4, row: 1, col: 1 },
        { id: 5, row: 1, col: 2 },
    ],
    9: [
        { id: 0, row: 0, col: 0, isHost: true },
        { id: 1, row: 0, col: 1 },
        { id: 2, row: 0, col: 2 },
        { id: 3, row: 1, col: 0 },
        { id: 4, row: 1, col: 1 },
        { id: 5, row: 1, col: 2 },
        { id: 6, row: 2, col: 0 },
        { id: 7, row: 2, col: 1 },
        { id: 8, row: 2, col: 2 },
    ],
    12: [
        { id: 0, row: 0, col: 0, isHost: true },
        { id: 1, row: 0, col: 1 },
        { id: 2, row: 0, col: 2 },
        { id: 3, row: 0, col: 3 },
        { id: 4, row: 1, col: 0 },
        { id: 5, row: 1, col: 1 },
        { id: 6, row: 1, col: 2 },
        { id: 7, row: 1, col: 3 },
        { id: 8, row: 2, col: 0 },
        { id: 9, row: 2, col: 1 },
        { id: 10, row: 2, col: 2 },
        { id: 11, row: 2, col: 3 },
    ],
};

// Empty seat component
const EmptySeat = ({ seatId, onRequestSeat, isRequesting }) => (
    <div className="relative aspect-square bg-black/40 rounded-2xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-400/50 hover:bg-white/5 transition-all group">
        <button
            onClick={() => onRequestSeat(seatId)}
            disabled={isRequesting}
            className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-cyan-500/20 transition"
        >
            {isRequesting ? (
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
                <span className="text-2xl">🪑</span>
            )}
        </button>
        <p className="text-white/40 text-xs mt-2">Seat {seatId + 1}</p>
        <p className="text-white/30 text-xs">Tap to join</p>
    </div>
);

// Occupied seat component
const OccupiedSeat = ({ user, stream, isHost, isSelf, onKick, onMute, isMuted }) => (
    <div className={`relative aspect-square rounded-2xl overflow-hidden ${isHost ? 'ring-2 ring-yellow-400' : 'ring-1 ring-white/20'}`}>
        {/* Video/Avatar */}
        {stream ? (
            <video
                autoPlay
                playsInline
                muted={isSelf}
                ref={(el) => {
                    if (el && stream) el.srcObject = stream;
                }}
                className="w-full h-full object-cover"
            />
        ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <img
                    src={user.avatar || "/defaults/default-avatar.png"}
                    alt={user.username}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
                    onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                />
            </div>
        )}

        {/* User info overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <div className="flex items-center gap-2">
                {isHost && <span className="text-yellow-400 text-xs">👑</span>}
                <span className="text-white text-sm font-medium truncate">{user.username}</span>
                {isMuted && <span className="text-red-400">🔇</span>}
            </div>
        </div>

        {/* Host controls */}
        {!isSelf && onKick && (
            <div className="absolute top-2 right-2 flex gap-1">
                <button
                    onClick={() => onMute(user.odId)}
                    className="p-1.5 bg-black/50 rounded-full hover:bg-black/70 transition"
                >
                    {isMuted ? "🔇" : "🔊"}
                </button>
                <button
                    onClick={() => onKick(user.odId)}
                    className="p-1.5 bg-red-500/50 rounded-full hover:bg-red-500/70 transition"
                >
                    ❌
                </button>
            </div>
        )}
    </div>
);

export default function MultiGuestLive({
    roomId,
    currentUser,
    streamTitle = "Multi-Guest Live",
    streamCategory = "Talk",
    maxSeats = 12,
    isHost = false,
    onEnd,
}) {
    const [seats, setSeats] = useState(
        SEAT_LAYOUTS[maxSeats]?.map((seat) => ({
            ...seat,
            user: null,
            stream: null,
            isMuted: false,
        })) || []
    );
    const [localStream, setLocalStream] = useState(null);
    const [isLive, setIsLive] = useState(false);
    const [viewers, setViewers] = useState(0);
    const [chat, setChat] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [seatRequests, setSeatRequests] = useState([]);
    const [gifts, setGifts] = useState([]);
    const [totalGifts, setTotalGifts] = useState(0);
    const [activeTab, setActiveTab] = useState("chat");

    const peersRef = useRef(new Map());
    const localStreamRef = useRef(null);

    // Initialize host seat
    useEffect(() => {
        if (isHost && currentUser) {
            setSeats(prev => prev.map((seat, idx) =>
                idx === 0
                    ? { ...seat, user: currentUser, isHost: true }
                    : seat
            ));
        }
    }, [isHost, currentUser]);

    // Start local stream
    const startLocalStream = async (audioOnly = false) => {
        try {
            const constraints = audioOnly
                ? { audio: true, video: false }
                : {
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
                    audio: { echoCancellation: true, noiseSuppression: true },
                };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;
            setLocalStream(stream);

            // Update host seat with stream
            setSeats(prev => prev.map((seat, idx) =>
                idx === 0 && isHost
                    ? { ...seat, stream }
                    : seat
            ));

            return stream;
        } catch (err) {
            console.error("Failed to get media:", err);
            toast.error("Failed to access camera/microphone");
            return null;
        }
    };

    // Go live
    const goLive = async () => {
        const stream = await startLocalStream();
        if (!stream) return;

        try {
            await api.post("/live/start", {
                title: streamTitle,
                category: streamCategory,
                roomId,
                type: "multi-guest",
                maxSeats,
            });

            socket.emit("start_multi_live", {
                roomId,
                host: currentUser,
                title: streamTitle,
                maxSeats,
            });

            setIsLive(true);
            toast.success("You're live! 🔴");
        } catch (err) {
            toast.error("Failed to start stream");
        }
    };

    // End live
    const endLive = () => {
        // Stop all tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
        }

        // Close all peer connections
        peersRef.current.forEach(pc => pc.close());
        peersRef.current.clear();

        socket.emit("end_multi_live", { roomId });

        setIsLive(false);
        onEnd?.();
    };

    // Request seat
    const requestSeat = (seatId) => {
        socket.emit("request_seat", {
            roomId,
            seatId,
            user: currentUser,
        });
        toast.success("Seat request sent!");
    };

    // Approve seat request (host only)
    const approveSeatRequest = async (request) => {
        socket.emit("approve_seat", {
            roomId,
            seatId: request.seatId,
            user: request.user,
        });

        setSeatRequests(prev => prev.filter(r => r.odId !== request.odId));
        toast.success(`${request.user.username} joined seat ${request.seatId + 1}`);
    };

    // Kick user from seat (host only)
    const kickFromSeat = (userId) => {
        socket.emit("kick_from_seat", { roomId, userId });
        setSeats(prev => prev.map(seat =>
            seat.user?.odId === userId
                ? { ...seat, user: null, stream: null }
                : seat
        ));
    };

    // Toggle mute
    const toggleMute = (userId) => {
        setSeats(prev => prev.map(seat =>
            seat.user?.odId === userId
                ? { ...seat, isMuted: !seat.isMuted }
                : seat
        ));
    };

    // Leave seat
    const leaveSeat = () => {
        socket.emit("leave_seat", { roomId, odId: currentUser?._id });
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
        }
    };

    // Socket events
    useEffect(() => {
        socket.emit("join_multi_live", { roomId, user: currentUser });

        // Seat request received (host only)
        socket.on("seat_request", (request) => {
            if (isHost) {
                setSeatRequests(prev => [...prev, request]);
                toast(`${request.user.username} wants to join!`, { icon: "🙋" });
            }
        });

        // Seat approved - user joins
        socket.on("seat_approved", ({ seatId, user }) => {
            setSeats(prev => prev.map((seat, idx) =>
                idx === seatId
                    ? { ...seat, user }
                    : seat
            ));
        });

        // User left seat
        socket.on("user_left_seat", ({ odId }) => {
            setSeats(prev => prev.map(seat =>
                seat.user?.odId === odId
                    ? { ...seat, user: null, stream: null }
                    : seat
            ));
        });

        // Viewer count
        socket.on("viewer_count", ({ count }) => {
            setViewers(count);
        });

        // Chat message
        socket.on("chat_message", (msg) => {
            setChat(prev => [...prev.slice(-100), msg]);
        });

        // Gift received
        socket.on("gift_received", (gift) => {
            setGifts(prev => [...prev.slice(-20), gift]);
            setTotalGifts(prev => prev + gift.coins);
            toast.success(`🎁 ${gift.from} sent ${gift.icon}!`);
        });

        // Stream ended
        socket.on("multi_live_ended", () => {
            toast.error("Stream has ended");
            onEnd?.();
        });

        return () => {
            socket.emit("leave_multi_live", { roomId });
            socket.off("seat_request");
            socket.off("seat_approved");
            socket.off("user_left_seat");
            socket.off("viewer_count");
            socket.off("chat_message");
            socket.off("gift_received");
            socket.off("multi_live_ended");
        };
    }, [roomId, isHost]);

    // Send chat message
    const sendMessage = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        socket.emit("chat_message", {
            roomId,
            username: currentUser?.username,
            text: chatInput,
            timestamp: new Date().toISOString(),
        });
        setChatInput("");
    };

    // Get grid columns based on seat count
    const getGridCols = () => {
        if (maxSeats <= 4) return "grid-cols-2";
        if (maxSeats <= 6) return "grid-cols-3";
        return "grid-cols-4";
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-black text-white flex flex-col">
            {/* Header */}
            <div className="p-3 flex items-center gap-3 bg-black/40 backdrop-blur-lg border-b border-white/10">
                {/* Live indicator */}
                {isLive && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full animate-pulse">
                        <span className="w-2 h-2 bg-white rounded-full" />
                        <span className="text-sm font-bold">LIVE</span>
                    </div>
                )}

                {/* Title */}
                <div className="flex-1">
                    <h1 className="font-bold truncate">{streamTitle}</h1>
                    <p className="text-xs text-white/50">{streamCategory}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3">
                    {totalGifts > 0 && (
                        <div className="flex items-center gap-1 text-yellow-400">
                            <span>🎁</span>
                            <span className="font-bold">{totalGifts}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1 text-white/70">
                        <span>👁</span>
                        <span className="font-bold">{viewers}</span>
                    </div>
                </div>

                {/* End button (host only) */}
                {isHost && isLive && (
                    <button
                        onClick={endLive}
                        className="px-4 py-1.5 bg-red-500 rounded-full font-bold text-sm hover:bg-red-400 transition"
                    >
                        End
                    </button>
                )}
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col lg:flex-row">
                {/* Seats grid */}
                <div className="flex-1 p-4">
                    <div className={`grid ${getGridCols()} gap-3 max-w-2xl mx-auto`}>
                        {seats.map((seat, idx) => (
                            seat.user ? (
                                <OccupiedSeat
                                    key={idx}
                                    user={seat.user}
                                    stream={seat.stream}
                                    isHost={seat.isHost}
                                    isSelf={seat.user?._id === currentUser?._id}
                                    isMuted={seat.isMuted}
                                    onKick={isHost ? kickFromSeat : null}
                                    onMute={isHost ? toggleMute : null}
                                />
                            ) : (
                                <EmptySeat
                                    key={idx}
                                    seatId={idx}
                                    onRequestSeat={requestSeat}
                                    isRequesting={false}
                                />
                            )
                        ))}
                    </div>

                    {/* Go Live button (host only, not live yet) */}
                    {isHost && !isLive && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={goLive}
                                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full font-bold text-lg hover:shadow-lg hover:shadow-cyan-500/30 transition-all"
                            >
                                🎥 Go LIVE
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar - Chat & Requests */}
                <div className="w-full lg:w-80 bg-black/30 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col">
                    {/* Tabs */}
                    <div className="flex border-b border-white/10">
                        <button
                            onClick={() => setActiveTab("chat")}
                            className={`flex-1 py-3 text-sm font-semibold ${activeTab === "chat" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-white/50"}`}
                        >
                            💬 Chat
                        </button>
                        {isHost && (
                            <button
                                onClick={() => setActiveTab("requests")}
                                className={`flex-1 py-3 text-sm font-semibold relative ${activeTab === "requests" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-white/50"}`}
                            >
                                🙋 Requests
                                {seatRequests.length > 0 && (
                                    <span className="absolute top-2 right-4 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                                        {seatRequests.length}
                                    </span>
                                )}
                            </button>
                        )}
                        <button
                            onClick={() => setActiveTab("gifts")}
                            className={`flex-1 py-3 text-sm font-semibold ${activeTab === "gifts" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-white/50"}`}
                        >
                            🎁 Gifts
                        </button>
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 overflow-y-auto p-3">
                        {activeTab === "chat" && (
                            <div className="space-y-2">
                                {chat.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">No messages yet</p>
                                ) : (
                                    chat.map((msg, i) => (
                                        <div key={i} className="text-sm">
                                            <span className="text-cyan-400 font-semibold">{msg.username}: </span>
                                            <span className="text-white/80">{msg.text}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === "requests" && isHost && (
                            <div className="space-y-2">
                                {seatRequests.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">No seat requests</p>
                                ) : (
                                    seatRequests.map((req, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                                            <img
                                                src={req.user.avatar || "/defaults/default-avatar.png"}
                                                alt=""
                                                className="w-10 h-10 rounded-full"
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold">{req.user.username}</p>
                                                <p className="text-xs text-white/50">Seat {req.seatId + 1}</p>
                                            </div>
                                            <button
                                                onClick={() => approveSeatRequest(req)}
                                                className="px-3 py-1 bg-green-500 rounded-full text-sm font-semibold"
                                            >
                                                ✓
                                            </button>
                                            <button
                                                onClick={() => setSeatRequests(prev => prev.filter((_, idx) => idx !== i))}
                                                className="px-3 py-1 bg-red-500/50 rounded-full text-sm"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === "gifts" && (
                            <div className="space-y-2">
                                {gifts.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">No gifts yet</p>
                                ) : (
                                    gifts.map((gift, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm">
                                            <span className="text-2xl">{gift.icon}</span>
                                            <span className="text-yellow-400">{gift.from}</span>
                                            <span className="text-white/50">sent</span>
                                            <span className="text-white">{gift.name}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* Chat input */}
                    {activeTab === "chat" && (
                        <form onSubmit={sendMessage} className="p-3 border-t border-white/10">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Say something..."
                                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-sm placeholder-white/40 outline-none focus:border-cyan-400"
                                />
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-cyan-500 rounded-full font-semibold text-sm hover:bg-cyan-400 transition"
                                >
                                    Send
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Bottom bar - Seat selection for host */}
            {isHost && (
                <div className="p-4 bg-black/40 border-t border-white/10">
                    <div className="flex justify-center gap-4">
                        <button className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition">
                            <span className="text-2xl">🪑</span>
                            <span className="text-xs">Seats</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition">
                            <span className="text-2xl">🎨</span>
                            <span className="text-xs">Theme</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition">
                            <span className="text-2xl">✨</span>
                            <span className="text-xs">Beauty</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition">
                            <span className="text-2xl">🪄</span>
                            <span className="text-xs">Magic</span>
                        </button>
                        <button className="flex flex-col items-center gap-1 text-white/70 hover:text-white transition">
                            <span className="text-2xl">⚙️</span>
                            <span className="text-xs">Settings</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}