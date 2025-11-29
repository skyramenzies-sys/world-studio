// src/components/MultiGuestLive.jsx
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import socket from "../api/socket";
import api from "../api/api";
import LiveGiftPanel from "./LiveGiftPanel";

const RTC_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

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

const OccupiedSeat = ({ user, stream, isHost, isSelf, onKick, isMuted }) => (
    <div className={`relative aspect-square rounded-2xl overflow-hidden ${isHost ? 'ring-2 ring-yellow-400' : 'ring-1 ring-white/20'}`}>
        {stream ? (
            <video
                autoPlay
                playsInline
                muted={isSelf}
                ref={(el) => { if (el && stream) el.srcObject = stream; }}
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

        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <div className="flex items-center gap-2">
                {isHost && <span className="text-yellow-400">👑</span>}
                <span className="text-white text-sm font-semibold truncate">{user.username}</span>
                {isMuted && <span className="text-red-400">🔇</span>}
            </div>
        </div>

        {onKick && !isHost && (
            <button
                onClick={() => onKick(user._id)}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500/80 rounded-full text-xs hover:bg-red-500"
            >
                ✕
            </button>
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
    const [seats, setSeats] = useState([]);
    const [viewers, setViewers] = useState(0);
    const [isLive, setIsLive] = useState(false);
    const [chat, setChat] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [activeTab, setActiveTab] = useState("chat");
    const [seatRequests, setSeatRequests] = useState([]);
    const [gifts, setGifts] = useState([]);
    const [totalGifts, setTotalGifts] = useState(0);
    const [hostInfo, setHostInfo] = useState(null);

    const localStreamRef = useRef(null);
    const peersRef = useRef(new Map());

    // Initialize seats
    useEffect(() => {
        const layout = SEAT_LAYOUTS[maxSeats] || SEAT_LAYOUTS[12];
        const initialSeats = layout.map((seat, idx) => ({
            ...seat,
            user: idx === 0 && isHost ? currentUser : null,
            stream: null,
            isMuted: false,
        }));
        setSeats(initialSeats);

        if (isHost) {
            setHostInfo(currentUser);
        }
    }, [maxSeats, isHost, currentUser]);

    // Socket events
    useEffect(() => {
        socket.emit("join_multi_live", { roomId, user: currentUser });

        socket.on("viewer_count", ({ count }) => setViewers(count));

        socket.on("chat_message", (msg) => {
            setChat(prev => [...prev.slice(-100), msg]);
        });

        socket.on("seat_request", (req) => {
            if (isHost) {
                setSeatRequests(prev => [...prev, req]);
                toast(`🙋 ${req.user?.username} wants to join!`);
            }
        });

        socket.on("seat_approved", ({ seatId, user }) => {
            setSeats(prev => prev.map((s, idx) =>
                idx === seatId ? { ...s, user } : s
            ));
            toast.success(`${user.username} joined seat ${seatId + 1}`);
        });

        socket.on("user_left_seat", ({ odId }) => {
            setSeats(prev => prev.map(s =>
                s.user?._id === odId ? { ...s, user: null, stream: null } : s
            ));
        });

        socket.on("gift_received", (gift) => {
            setGifts(prev => [...prev.slice(-20), {
                icon: gift.icon,
                name: gift.item,
                from: gift.senderUsername,
                amount: gift.amount,
            }]);
            setTotalGifts(prev => prev + (gift.amount || 1));
            toast.success(`🎁 ${gift.senderUsername} sent ${gift.icon}!`);
        });

        socket.on("multi_live_ended", () => {
            toast("Stream has ended");
            onEnd?.();
        });

        // Get host info if viewer
        if (!isHost) {
            api.get(`/live/${roomId}`).then(res => {
                if (res.data?.host) {
                    setHostInfo(res.data.host);
                }
            }).catch(() => { });
        }

        return () => {
            socket.emit("leave_multi_live", { roomId });
            socket.off("viewer_count");
            socket.off("chat_message");
            socket.off("seat_request");
            socket.off("seat_approved");
            socket.off("user_left_seat");
            socket.off("gift_received");
            socket.off("multi_live_ended");
        };
    }, [roomId, currentUser, isHost, onEnd]);

    // Start camera for host
    const goLive = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 } },
                audio: true,
            });
            localStreamRef.current = stream;

            setSeats(prev => prev.map((s, idx) =>
                idx === 0 ? { ...s, stream } : s
            ));

            socket.emit("start_multi_live", {
                roomId,
                host: currentUser,
                title: streamTitle,
                maxSeats,
            });

            setIsLive(true);
            toast.success("You're live! 🔴");
        } catch (err) {
            toast.error("Camera access denied");
        }
    };

    const endLive = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
        }
        socket.emit("end_multi_live", { roomId });
        onEnd?.();
    };

    const requestSeat = (seatId) => {
        socket.emit("request_seat", { roomId, seatId, user: currentUser });
        toast("Request sent to host!");
    };

    const approveSeatRequest = async (req) => {
        socket.emit("approve_seat", { roomId, seatId: req.seatId, user: req.user });
        setSeatRequests(prev => prev.filter(r => r.seatId !== req.seatId));
    };

    const kickFromSeat = (userId) => {
        socket.emit("kick_from_seat", { roomId, odId: userId });
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        socket.emit("chat_message", {
            roomId,
            username: currentUser.username,
            text: chatInput.trim(),
            avatar: currentUser.avatar,
        });
        setChatInput("");
    };

    const getGridCols = () => {
        if (maxSeats <= 4) return "grid-cols-2";
        if (maxSeats <= 6) return "grid-cols-3";
        return "grid-cols-4";
    };

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 via-purple-900/30 to-gray-900 text-white">
            {/* Header */}
            <div className="flex items-center justify-between p-3 bg-black/40 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="font-bold text-sm">LIVE</span>
                    </div>
                    <div>
                        <h2 className="font-semibold text-sm">{streamTitle}</h2>
                        <p className="text-white/50 text-xs">{streamCategory}</p>
                    </div>
                </div>

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
                    {isHost && isLive && (
                        <button onClick={endLive} className="px-4 py-1.5 bg-red-500 rounded-full font-bold text-sm">
                            End
                        </button>
                    )}
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Seats grid */}
                <div className="flex-1 p-4 overflow-y-auto">
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
                                    onKick={isHost && !seat.isHost ? kickFromSeat : null}
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

                    {isHost && !isLive && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={goLive}
                                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full font-bold text-lg hover:shadow-lg transition-all"
                            >
                                🎥 Go LIVE
                            </button>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
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
                    <div className="flex-1 overflow-y-auto">
                        {activeTab === "chat" && (
                            <div className="p-3 space-y-2">
                                {chat.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">No messages yet</p>
                                ) : (
                                    chat.map((msg, i) => (
                                        <div key={i} className="flex items-start gap-2">
                                            <img
                                                src={msg.avatar || "/defaults/default-avatar.png"}
                                                className="w-6 h-6 rounded-full"
                                                alt=""
                                            />
                                            <div>
                                                <span className="text-cyan-400 text-sm font-semibold">{msg.username}</span>
                                                <p className="text-white/80 text-sm">{msg.text}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {activeTab === "requests" && isHost && (
                            <div className="p-3 space-y-2">
                                {seatRequests.length === 0 ? (
                                    <p className="text-white/40 text-center py-8">No requests</p>
                                ) : (
                                    seatRequests.map((req, i) => (
                                        <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                                            <img
                                                src={req.user?.avatar || "/defaults/default-avatar.png"}
                                                className="w-10 h-10 rounded-full"
                                                alt=""
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold">{req.user?.username}</p>
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
                            <div>
                                {/* Gift sending panel for viewers */}
                                {!isHost && hostInfo && (
                                    <LiveGiftPanel
                                        streamId={roomId}
                                        hostId={hostInfo._id || hostInfo.id}
                                        hostUsername={hostInfo.username}
                                        onGiftSent={(gift) => {
                                            setGifts(prev => [...prev, {
                                                icon: gift.icon,
                                                name: gift.name,
                                                from: currentUser.username,
                                                amount: gift.price,
                                            }]);
                                        }}
                                    />
                                )}

                                {/* Recent gifts list */}
                                <div className="p-3 border-t border-white/10">
                                    <h4 className="text-xs text-white/50 mb-2">Recent Gifts</h4>
                                    {gifts.length === 0 ? (
                                        <p className="text-white/40 text-center py-4 text-sm">No gifts yet</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {gifts.slice(-10).reverse().map((gift, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm bg-white/5 rounded-lg p-2">
                                                    <span className="text-xl">{gift.icon}</span>
                                                    <span className="text-yellow-400 font-semibold">{gift.from}</span>
                                                    <span className="text-white/50">sent</span>
                                                    <span className="text-white">{gift.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
                                    className="px-4 py-2 bg-cyan-500 rounded-full font-semibold text-sm"
                                >
                                    Send
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}