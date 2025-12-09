// src/components/LiveViewer.jsx - WORLD STUDIO LIVE EDITION 👁 (U.E.)
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";

// Universe Edition: centrale API + socket
import api from "../api/api";
import { getSocket } from "../api/socket";
import LiveGiftPanel from "./LiveGiftPanel";

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
/**
 * Props:
 *  - roomId: string (WebRTC room)
 *  - currentUser: ingelogde user (of null)
 *  - streamInfo: optionele initial info uit LivePage
 *  - streamId: Mongo stream-id (optioneel)
 *  - onLeave: callback bij verlaten
 */
export default function LiveViewer({
    roomId,
    currentUser,
    streamInfo: initialStreamInfo,
    streamId,
    onLeave,
}) {
    const videoRef = useRef(null);
    const pcRef = useRef(null);
    const broadcasterIdRef = useRef(null);
    const chatEndRef = useRef(null);
    const socketRef = useRef(null);

    const [streamInfo, setStreamInfo] = useState(initialStreamInfo || null);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);
    const [error, setError] = useState("");
    const [viewers, setViewers] = useState(0);
    const [chat, setChat] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [showGiftPanel, setShowGiftPanel] = useState(false);
    const [gifts, setGifts] = useState([]);
    const [duration, setDuration] = useState(0);

    // "Everyone can see each other & follow"
    const [participants, setParticipants] = useState([]); // {userId, username, avatar, isHost}
    const [followingIds, setFollowingIds] = useState([]);
    const [activeSidebarTab, setActiveSidebarTab] = useState("chat"); // "chat" | "viewers"

    /* ========================================================
       SOCKET INIT
       ======================================================== */
    useEffect(() => {
        const s = getSocket();
        socketRef.current = s;
        return () => { };
    }, []);

    /* ========================================================
       CHAT AUTO SCROLL
       ======================================================== */
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chat]);

    /* ========================================================
       DURATION TIMER
       ======================================================== */
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
            return `${h}:${m.toString().padStart(2, "0")}:${sec
                .toString()
                .padStart(2, "0")}`;
        }
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    /* ========================================================
       PARTICIPANTS HELPER
       ======================================================== */
    const addParticipant = (user) => {
        if (!user || !user.userId) return;
        setParticipants((prev) => {
            if (prev.some((p) => p.userId === user.userId)) return prev;
            return [...prev, user];
        });
    };

    // Init host + current user in participants
    useEffect(() => {
        if (streamInfo) {
            const hostId =
                streamInfo.streamerId ||
                streamInfo.hostId ||
                streamInfo.host?._id;
            const hostUsername =
                streamInfo.streamerName ||
                streamInfo.hostUsername ||
                streamInfo.host?.username ||
                "Host";
            const hostAvatar =
                streamInfo.host?.avatar || streamInfo.hostAvatar;

            if (hostId) {
                addParticipant({
                    userId: hostId,
                    username: hostUsername,
                    avatar: hostAvatar,
                    isHost: true,
                });
            }
        }
    }, [streamInfo]);

    useEffect(() => {
        if (currentUser) {
            const id = currentUser._id || currentUser.id;
            if (!id) return;
            addParticipant({
                userId: id,
                username: currentUser.username || "You",
                avatar: currentUser.avatar,
                isHost: false,
            });
        }
    }, [currentUser]);

    /* ========================================================
       LOAD STREAM INFO (als niet via props)
       ======================================================== */
    const effectiveStreamId = streamId || roomId;

    useEffect(() => {
        if (!roomId) return;
        // als al vanuit props gekregen, hoeft niet perse
        if (initialStreamInfo) return;

        const fetchInfo = async () => {
            try {
                const res = await api.get(`/api/live/${roomId}`);
                const s = res.data;
                if (s) {
                    setStreamInfo(s);
                    setViewers(s.viewers || 0);
                }
            } catch (err) {
                console.log("Could not fetch stream info:", err);
            }
        };

        fetchInfo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);

    /* ========================================================
       MAIN CONNECTION EFFECT (WebRTC + SOCKET EVENTS)
       ======================================================== */
    useEffect(() => {
        if (!roomId) return;

        let active = true;
        const socket = socketRef.current;
        if (!socket) return;

        setIsConnected(false);
        setIsConnecting(true);
        setError("");

        // 1) PeerConnection opzetten
        const pc = new RTCPeerConnection(RTC_CONFIG);
        pcRef.current = pc;

        pc.ontrack = (event) => {
            if (!active) return;
            const [remoteStream] = event.streams;
            if (videoRef.current && remoteStream) {
                if (videoRef.current.srcObject !== remoteStream) {
                    videoRef.current.srcObject = remoteStream;
                }
                setIsConnected(true);
                setIsConnecting(false);
            }
        };

        pc.onconnectionstatechange = () => {
            console.log("Viewer connection state:", pc.connectionState);
            if (pc.connectionState === "connected") {
                setIsConnected(true);
                setIsConnecting(false);
            } else if (
                pc.connectionState === "disconnected" ||
                pc.connectionState === "failed"
            ) {
                setIsConnected(false);
                setError("Connection lost. Stream may have ended.");
            }
        };

        pc.onicecandidate = ({ candidate }) => {
            if (candidate && broadcasterIdRef.current) {
                socket.emit("candidate", {
                    target: broadcasterIdRef.current,
                    candidate,
                });
            }
        };

        // 2) Join rooms
        socket.emit("join_stream", {
            streamId: effectiveStreamId,
            roomId,
        });
        socket.emit("watcher", { roomId });

        // 3) SOCKET HANDLERS
        const handleOffer = async ({ sdp, broadcasterId }) => {
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
        };

        const handleCandidate = async ({ candidate }) => {
            if (!active || !candidate) return;
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (err) {
                console.warn("ICE candidate error:", err);
            }
        };

        const handleViewerCount = (data) => {
            const count = data.viewers ?? data.count ?? 0;
            setViewers(count);
        };

        const handleChatMessage = (message) => {
            if (message.roomId && message.roomId !== roomId) return;
            setChat((prev) => [...prev.slice(-100), message]);

            const uid = message.userId;
            const uname = message.username || message.user;
            if (uid && uname) {
                addParticipant({
                    userId: uid,
                    username: uname,
                    avatar: message.avatar,
                    isHost: !!message.isHost,
                });
            }
        };

        const handleGiftReceived = (gift) => {
            const timestamp = Date.now();
            const giftObj = { ...gift, timestamp };
            setGifts((prev) => [...prev.slice(-10), giftObj]);

            toast.success(
                `🎁 ${gift.senderUsername} sent ${gift.item || gift.icon || "a gift"
                }!`
            );

            setTimeout(() => {
                setGifts((prev) =>
                    prev.filter((g) => g.timestamp !== timestamp)
                );
            }, 5000);
        };

        const handleStreamEnded = () => {
            setIsConnected(false);
            setError("Stream has ended");
            toast.error("Stream has ended");
        };

        socket.on("offer", handleOffer);
        socket.on("candidate", handleCandidate);
        socket.on("viewer_count", handleViewerCount);
        socket.on("chat_message", handleChatMessage);
        socket.on("gift_received", handleGiftReceived);
        socket.on("gift_sent", handleGiftReceived); // ook lokaal direct tonen
        socket.on("stream_ended", handleStreamEnded);
        socket.on("live_ended", handleStreamEnded);

        // Timeout failsafe
        const timeoutId = setTimeout(() => {
            if (active && !isConnected && isConnecting) {
                setIsConnecting(false);
                setError(
                    (prev) =>
                        prev ||
                        "Could not connect to stream. It may not be live."
                );
            }
        }, 15000);

        // CLEANUP
        return () => {
            active = false;
            clearTimeout(timeoutId);

            socket.emit("leave_stream", {
                streamId: effectiveStreamId,
                roomId,
            });

            socket.off("offer", handleOffer);
            socket.off("candidate", handleCandidate);
            socket.off("viewer_count", handleViewerCount);
            socket.off("chat_message", handleChatMessage);
            socket.off("gift_received", handleGiftReceived);
            socket.off("gift_sent", handleGiftReceived);
            socket.off("stream_ended", handleStreamEnded);
            socket.off("live_ended", handleStreamEnded);

            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }


            if (videoRef.current?.srcObject instanceof MediaStream) {
                videoRef.current.srcObject
                    .getTracks()
                    .forEach((t) => t.stop());
                videoRef.current.srcObject = null;

            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomId]);

    /* ========================================================
       CHAT SEND
       ======================================================== */
    const sendMessage = (e) => {
        e.preventDefault();
        const text = chatInput.trim();
        if (!text || !socketRef.current) return;

        const uid = currentUser?._id || currentUser?.id;

        const message = {
            streamId: effectiveStreamId,
            roomId,
            username: currentUser?.username || "Anonymous",
            userId: uid,
            isHost: false,
            text,
            timestamp: new Date().toISOString(),
        };

        socketRef.current.emit("chat_message", message);
        setChatInput("");
    };

    /* ========================================================
       FOLLOW LOGIC
       ======================================================== */
    const handleFollow = async (user) => {
        if (!currentUser) {
            toast.error("Log in to follow users");
            return;
        }
        const myId = currentUser._id || currentUser.id;
        const targetId = user.userId;
        if (!targetId || targetId === myId) return;

        if (followingIds.includes(targetId)) return;

        try {
            // Aanname: bestaande endpoint
            await api.post(`/api/users/${targetId}/follow`);
            setFollowingIds((prev) =>
                prev.includes(targetId) ? prev : [...prev, targetId]
            );
            toast.success(`You now follow ${user.username}`);
        } catch (err) {
            console.error("Follow failed:", err);
            toast.error(
                err.response?.data?.message || "Failed to follow user"
            );
        }
    };

    const isFollowing = (userId) => followingIds.includes(userId);

    /* ========================================================
       LEAVE STREAM
       ======================================================== */
    const handleLeave = () => {
        const socket = socketRef.current;
        socket?.emit("leave_stream", {
            streamId: effectiveStreamId,
            roomId,
        });

        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }

        if (videoRef.current?.srcObject instanceof MediaStream) {
            videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
            videoRef.current.srcObject = null;
        }

        onLeave?.();
    };

    /* ========================================================
       ERROR STATE
       ======================================================== */
    if (error && !isConnected && !isConnecting) {
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

    /* ========================================================
       RENDER
       ======================================================== */
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
                            {(streamInfo.host?.username ||
                                streamInfo.hostUsername) && (
                                    <span className="text-white/50 hidden md:inline">
                                        •{" "}
                                        {streamInfo.host?.username ||
                                            streamInfo.hostUsername}
                                    </span>
                                )}
                        </div>
                    ) : (
                        <span className="text-white/50">
                            Room: {roomId?.slice(0, 15)}...
                        </span>
                    )}
                </div>

                {/* Duration */}
                {streamInfo?.startedAt && (
                    <span className="text-white/60 text-sm font-mono hidden md:block">
                        {formatDuration(duration)}
                    </span>
                )}

                {/* Connection status */}
                <div
                    className={`px-3 py-1 rounded-full text-sm ${isConnected
                            ? "bg-green-500/20 text-green-400"
                            : isConnecting
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
                        }`}
                >
                    {isConnected
                        ? "Connected"
                        : isConnecting
                            ? "Connecting..."
                            : "Offline"}
                </div>

                {/* Viewer count */}
                <div className="flex items-center gap-2 text-white/70 bg-white/10 px-3 py-1.5 rounded-lg">
                    <span>👁</span>
                    <span className="font-semibold">{viewers}</span>
                </div>

                {/* Gift button */}
                {currentUser && streamInfo && (
                    <button
                        onClick={() => setShowGiftPanel((v) => !v)}
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
                                <p className="text-white/60">
                                    Connecting to stream...
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Video element */}
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-contain ${isConnecting ? "opacity-0" : "opacity-100"
                            }`}
                    />

                    {/* Gift animations */}
                    <div className="absolute top-4 left-4 space-y-2 pointer-events-none max-w-[300px]">
                        {gifts.slice(-5).map((gift, i) => (
                            <div
                                key={gift.timestamp || i}
                                className={`flex items-center gap-2 bg-gradient-to-r ${gift.color ||
                                    "from-purple-500/80 to-pink-500/80"
                                    } px-3 py-2 rounded-lg animate-slideIn`}
                            >
                                <span className="text-2xl animate-bounce">
                                    {gift.icon || "🎁"}
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-white">
                                        {gift.senderUsername}
                                    </p>
                                    <p className="text-xs text-white/80">
                                        sent {gift.item || "gift"} x
                                        {gift.amount}
                                    </p>
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
                            <LiveGiftPanel
                                streamId={effectiveStreamId}
                                hostId={
                                    streamInfo.streamerId ||
                                    streamInfo.hostId ||
                                    streamInfo.host?._id
                                }
                                hostUsername={
                                    streamInfo.streamerName ||
                                    streamInfo.hostUsername ||
                                    streamInfo.host?.username
                                }
                                onGiftSent={() => {
                                    // UI wordt al via socket-events geüpdatet
                                    setShowGiftPanel(false);
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Chat + Viewers sidebar (desktop) */}
                <div className="w-80 hidden lg:flex flex-col bg-white/5 border-l border-white/10">
                    {/* Tabs */}
                    <div className="p-3 border-b border-white/10 flex gap-2">
                        <button
                            onClick={() => setActiveSidebarTab("chat")}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${activeSidebarTab === "chat"
                                    ? "bg-white/20"
                                    : "bg-transparent hover:bg-white/10"
                                }`}
                        >
                            💬 Chat
                        </button>
                        <button
                            onClick={() => setActiveSidebarTab("viewers")}
                            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${activeSidebarTab === "viewers"
                                    ? "bg-white/20"
                                    : "bg-transparent hover:bg-white/10"
                                }`}
                        >
                            👥 Viewers ({participants.length})
                        </button>
                    </div>

                    {/* Content */}
                    {activeSidebarTab === "chat" ? (
                        <>
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {chat.length === 0 ? (
                                    <p className="text-white/40 text-sm text-center py-8">
                                        No messages yet. Say hi! 👋
                                    </p>
                                ) : (
                                    chat.map((msg, i) => (
                                        <div
                                            key={i}
                                            className={`text-sm break-words p-2 rounded-lg ${msg.isHost
                                                    ? "bg-cyan-500/20"
                                                    : "bg-white/5"
                                                }`}
                                        >
                                            <span
                                                className={`font-semibold ${msg.isHost
                                                        ? "text-cyan-400"
                                                        : "text-purple-400"
                                                    }`}
                                            >
                                                {msg.username || msg.user}
                                                {msg.isHost ? " 👑" : ""}:
                                            </span>{" "}
                                            <span className="text-white/80">
                                                {msg.text}
                                            </span>
                                        </div>
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Chat input */}
                            <form
                                onSubmit={sendMessage}
                                className="p-3 border-t border-white/10"
                            >
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) =>
                                            setChatInput(e.target.value)
                                        }
                                        placeholder={
                                            currentUser
                                                ? "Send a message..."
                                                : "Log in to chat"
                                        }
                                        disabled={!currentUser}
                                        maxLength={200}
                                        className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 outline-none focus:border-cyan-400 disabled:opacity-50 transition"
                                    />
                                    <button
                                        type="submit"
                                        disabled={
                                            !chatInput.trim() || !currentUser
                                        }
                                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition"
                                    >
                                        Send
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        // Viewers tab
                        <div className="flex-1 flex flex-col">
                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                {participants.length === 0 ? (
                                    <p className="text-white/40 text-sm text-center py-8">
                                        No viewers yet
                                    </p>
                                ) : (
                                    participants.map((user) => {
                                        const myId =
                                            currentUser?._id ||
                                            currentUser?.id;
                                        const self = user.userId === myId;
                                        const followed = isFollowing(
                                            user.userId
                                        );

                                        return (
                                            <div
                                                key={user.userId}
                                                className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-2"
                                            >
                                                <img
                                                    src={
                                                        user.avatar ||
                                                        "/defaults/default-avatar.png"
                                                    }
                                                    alt=""
                                                    className="w-8 h-8 rounded-full object-cover border border-white/20"
                                                    onError={(e) => {
                                                        e.target.src =
                                                            "/defaults/default-avatar.png";
                                                    }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold truncate">
                                                        {user.username}
                                                        {user.isHost &&
                                                            " 👑"}
                                                        {self && " (You)"}
                                                    </p>
                                                </div>
                                                {!self && currentUser && (
                                                    <button
                                                        onClick={() =>
                                                            handleFollow(user)
                                                        }
                                                        disabled={followed}
                                                        className={`text-xs px-2 py-1 rounded-full border transition ${followed
                                                                ? "border-green-400 text-green-400 cursor-default"
                                                                : "border-cyan-400 text-cyan-400 hover:bg-cyan-400/10"
                                                            }`}
                                                    >
                                                        {followed
                                                            ? "Following"
                                                            : "Follow"}
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}
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
