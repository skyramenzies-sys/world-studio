// src/components/LivePublisher.jsx - WORLD STUDIO LIVE EDITION 📹 (U.E.)
import React, { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "react-hot-toast";

// ✅ Use shared instances
import api from "../api/api";
import socket from "../api/socket";
import { RTC_CONFIG, MEDIA_CONSTRAINTS, MOBILE_CONSTRAINTS } from "../api/WebrtcConfig";

// Default avatar
const DEFAULT_AVATAR = "/defaults/default-avatar.png";

// Detect mobile
const isMobileDevice = () => {
    if (typeof navigator === "undefined") return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
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


    const [viewers, setViewers] = useState(0);
    const [isLive, setIsLive] = useState(false);
    const [error, setError] = useState("");
    const [duration, setDuration] = useState(0);
    const [chat, setChat] = useState([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [gifts, setGifts] = useState([]);
    const [totalGifts, setTotalGifts] = useState(0);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [chatInput, setChatInput] = useState("");
    const [showMobileChat, setShowMobileChat] = useState(false);

    const selfId = currentUser?._id || currentUser?.id;
    const effectiveStreamId = streamId || roomId;

    /* ========================================================
       SOCKET CONNECTION STATUS
       ======================================================== */
    useEffect(() => {


        const handleConnect = () => setIsConnected(true);
        const handleDisconnect = () => setIsConnected(false);

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
        };
    }, []);

    /* ========================================================
       CLEANUP HELPERS
       ======================================================== */
    const stopMediaTracks = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => {
                track.stop();
                console.log(`🛑 Stopped publisher ${track.kind} track`);
            });
            streamRef.current = null;
        }
    }, []);

    const closeAllPeers = useCallback(() => {
        peersRef.current.forEach((pc, peerId) => {
            pc.close();
            console.log(`🔒 Closed peer: ${peerId}`);
        });
        peersRef.current.clear();
    }, []);

    /* ========================================================
       STOP LIVE STREAM
       ======================================================== */
    const stopLive = useCallback(async () => {
        setIsLive(false);

        closeAllPeers();
        stopMediaTracks();

        // Notify server & watchers
        socket.emit("stop_broadcast", { roomId, streamId: effectiveStreamId });

        try {
            await api.post(`/live/${effectiveStreamId}/end`);
        } catch (err) {
            console.error("Failed to end stream:", err);
        }

        onStop?.();
    }, [roomId, effectiveStreamId, closeAllPeers, stopMediaTracks, onStop]);

    /* ========================================================
       TOGGLE MUTE
       ======================================================== */
    const toggleMute = useCallback(() => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);

                socket.emit("host_muted", {
                    roomId,
                    isMuted: !audioTrack.enabled,
                });
            }
        }
    }, [roomId]);

    /* ========================================================
       TOGGLE CAMERA
       ======================================================== */
    const toggleCamera = useCallback(() => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);

                socket.emit("host_camera", {
                    roomId,
                    isCameraOff: !videoTrack.enabled,
                });
            }
        }
    }, [roomId]);

    /* ========================================================
       DURATION TIMER
       ======================================================== */
    useEffect(() => {
        if (!isLive) return;

        const interval = setInterval(() => setDuration((d) => d + 1), 1000);
        return () => clearInterval(interval);
    }, [isLive]);


    const formatDuration = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
        }
        return `${m}:${sec.toString().padStart(2, "0")}`;
    };

    /* ========================================================
       SEND CHAT MESSAGE (HOST)
       ======================================================== */
    const sendChatMessage = useCallback(
        (e) => {
            e?.preventDefault();
            if (!chatInput.trim()) return;


            socket.emit("chat_message", {
                streamId: effectiveStreamId,
                roomId,
                username: currentUser?.username || "Host",
                userId: selfId,
                avatar: currentUser?.avatar,
                text: chatInput.trim(),
                isHost: true,
                timestamp: new Date().toISOString(),
            });


            setChatInput("");
        },
        [chatInput, effectiveStreamId, roomId, currentUser, selfId]
    );

    /* ========================================================
       MAIN BROADCAST SETUP
       ======================================================== */
    useEffect(() => {
        if (!roomId) return;

        let active = true;





        const startBroadcast = async () => {
            // Check mediaDevices support
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                const errorMsg = "Camera/microphone not supported in this browser.";
                setError(errorMsg);
                toast.error(errorMsg);
                return;
            }

            try {
                // ✅ Use shared constraints from WebrtcConfig
                const isMobile = isMobileDevice();
                const constraints = isMobile ? MOBILE_CONSTRAINTS : MEDIA_CONSTRAINTS;

                const stream = await navigator.mediaDevices.getUserMedia(constraints);

                if (!active) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                // Create/ensure stream entry in DB
                try {
                    await api.post("/live/start", {
                        roomId,
                        title: streamTitle,
                        category: streamCategory,
                        hostId: selfId,
                        hostUsername: currentUser?.username,
                        hostAvatar: currentUser?.avatar,
                    });
                } catch (err) {
                    console.log("Stream creation error:", err?.response?.data || err);
                }

                // Socket: start_broadcast
                socket.emit("start_broadcast", {
                    roomId,
                    streamId: effectiveStreamId,
                    streamer: currentUser?.username,
                    streamerId: selfId,
                    title: streamTitle,
                    category: streamCategory,
                });

                setIsLive(true);
                toast.success("You're now live! 🔴 Your followers will be notified!");

                // =============================================
                // WebRTC Signalling Handlers
                // =============================================

                // Viewer joins - create offer
                const onWatcher = async ({ watcherId }) => {
                    if (!streamRef.current || !active) return;

                    // ✅ Use shared RTC_CONFIG
                    const pc = new RTCPeerConnection(RTC_CONFIG);

                    // Add tracks
                    streamRef.current.getTracks().forEach((track) => {
                        pc.addTrack(track, streamRef.current);
                    });

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
                        console.log(`🔌 Peer ${watcherId}: ${pc.connectionState}`);
                        if (
                            pc.connectionState === "failed" ||
                            pc.connectionState === "disconnected" ||
                            pc.connectionState === "closed"
                        ) {
                            pc.close();
                            peersRef.current.delete(watcherId);
                        }
                    };

                    pc.oniceconnectionstatechange = () => {
                        console.log(`🧊 Peer ${watcherId} ICE: ${pc.iceConnectionState}`);
                    };

                    // Create and send offer
                    try {
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);

                        socket.emit("offer", {
                            watcherId,
                            sdp: offer,
                            broadcasterId: selfId,
                        });

                        peersRef.current.set(watcherId, pc);
                        console.log(`📤 Offer sent to ${watcherId}`);
                    } catch (err) {
                        console.error("Failed to create offer:", err);
                        pc.close();
                    }
                };

                // Viewer sends answer back
                const onAnswer = async ({ watcherId, sdp }) => {
                    const pc = peersRef.current.get(watcherId);
                    if (!pc) return;

                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                        console.log(`📥 Answer received from ${watcherId}`);
                    } catch (err) {
                        console.error("setRemoteDescription error (answer):", err);
                    }
                };

                // ICE candidate from viewer
                const onCandidate = async ({ from, candidate }) => {
                    const pc = peersRef.current.get(from);
                    if (pc && candidate) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (e) {
                            console.warn("addIceCandidate error:", e?.message || e);
                        }
                    }
                };

                // Viewer left
                const onRemoveWatcher = ({ watcherId }) => {
                    const pc = peersRef.current.get(watcherId);
                    if (pc) {
                        pc.close();
                        peersRef.current.delete(watcherId);
                        console.log(`👋 Viewer ${watcherId} left`);
                    }
                };

                // Viewer count update
                const onViewerCount = (data) => {
                    const rid = data.roomId;
                    if (rid && rid !== roomId) return;
                    setViewers(data.viewers ?? data.count ?? 0);
                };

                // Chat messages
                const onChatMessage = (msg) => {
                    if (msg.roomId && msg.roomId !== roomId) return;
                    setChat((prev) => [...prev.slice(-50), msg]);
                };

                // Gift received
                const onGiftReceived = (gift) => {
                    const timestamp = Date.now();
                    const giftObj = { ...gift, timestamp };

                    setGifts((prev) => [...prev.slice(-10), giftObj]);
                    setTotalGifts((prev) => prev + (gift.amount || 1));

                    toast.success(`🎁 ${gift.senderUsername} sent ${gift.icon || "💝"} x${gift.amount || 1}!`, {
                        duration: 3000,
                    });

                    // Auto-remove gift after 5s
                    setTimeout(() => {
                        setGifts((prev) => prev.filter((g) => g.timestamp !== timestamp));
                    }, 5000);
                };

                // Stream ended (external)
                const onStreamEnded = ({ roomId: rid }) => {
                    if (rid && rid !== roomId) return;
                    toast.error("Stream ended");
                    // Don't call stopLive here to avoid circular dependency
                    setIsLive(false);
                };

                // Register listeners
                socket.on("watcher", onWatcher);
                socket.on("answer", onAnswer);
                socket.on("candidate", onCandidate);
                socket.on("remove_watcher", onRemoveWatcher);
                socket.on("viewer_count", onViewerCount);
                socket.on("chat_message", onChatMessage);
                socket.on("gift_received", onGiftReceived);
                socket.on("stream_ended", onStreamEnded);

                // Store cleanup function
                return () => {
                    socket.off("watcher", onWatcher);
                    socket.off("answer", onAnswer);
                    socket.off("candidate", onCandidate);
                    socket.off("remove_watcher", onRemoveWatcher);
                    socket.off("viewer_count", onViewerCount);
                    socket.off("chat_message", onChatMessage);
                    socket.off("gift_received", onGiftReceived);
                    socket.off("stream_ended", onStreamEnded);
                };
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

        let cleanupListeners = null;

        startBroadcast().then((cleanup) => {
            cleanupListeners = cleanup;
        });

        return () => {
            active = false;

            // Call listener cleanup if available
            if (cleanupListeners) {
                cleanupListeners();
            }

            // Stop broadcast notification
            socket.emit("stop_broadcast", { roomId, streamId: effectiveStreamId });

            // Stop media tracks
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            }

            // Close peer connections
            peersRef.current.forEach((pc) => pc.close());
            peersRef.current.clear();
        };
    }, [roomId, currentUser, selfId, streamTitle, streamCategory, effectiveStreamId]);

    /* ========================================================
       CHAT PANEL COMPONENT
       ======================================================== */
    const ChatPanel = ({ isMobile = false }) => (
        <div className={`flex flex-col ${isMobile ? "h-full" : ""}`}>
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
                        <div
                            key={i}
                            className={`text-sm p-2 rounded-lg ${msg.isHost ? "bg-cyan-500/20" : "bg-white/5"}`}
                        >
                            <span className={`font-semibold ${msg.isHost ? "text-cyan-400" : "text-purple-400"}`}>
                                {msg.username}
                                {msg.isHost ? " 👑" : ""}:
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
                        maxLength={200}
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
    );

    /* ========================================================
       ERROR STATE
       ======================================================== */
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

    /* ========================================================
       RENDER
       ======================================================== */
    return (
        <div className="w-full h-full flex flex-col bg-black text-white">
            {/* Top bar */}
            <div className="p-3 flex items-center gap-3 bg-black/80 border-b border-white/10">
                {/* Live badge */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isLive ? "bg-red-500" : "bg-white/20"}`}>
                    <span className={`w-2 h-2 rounded-full ${isLive ? "bg-white animate-pulse" : "bg-white/50"}`} />
                    <span className="font-bold text-sm">{isLive ? "LIVE" : "STARTING..."}</span>
                </div>

                {/* Duration */}
                {isLive && <span className="text-white/60 text-sm font-mono">{formatDuration(duration)}</span>}

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

                {/* Mobile chat toggle */}
                <button
                    onClick={() => setShowMobileChat(!showMobileChat)}
                    className="lg:hidden px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition"
                >
                    💬
                </button>

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
            <div className="flex-1 flex overflow-hidden relative">
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

                    {/* Controls - ✅ FIXED: was "absolute.bottom-4" */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                        <button
                            onClick={toggleMute}
                            className={`p-3 rounded-full transition ${isMuted ? "bg-red-500 hover:bg-red-400" : "bg-white/20 hover:bg-white/30"
                                }`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? "🔇" : "🎤"}
                        </button>
                        <button
                            onClick={toggleCamera}
                            className={`p-3 rounded-full transition ${isCameraOff ? "bg-red-500 hover:bg-red-400" : "bg-white/20 hover:bg-white/30"
                                }`}
                            title={isCameraOff ? "Turn on camera" : "Turn off camera"}
                        >
                            {isCameraOff ? "📷" : "🎥"}
                        </button>
                    </div>

                    {/* Room ID badge */}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-lg text-sm">
                        <span className="text-white/50">Room: </span>
                        <span className="text-white font-mono">
                            {roomId?.slice(0, 20)}
                            {roomId?.length > 20 ? "..." : ""}
                        </span>
                    </div>

                    {/* Gift overlays */}
                    <div className="absolute top-20 left-4 space-y-2 pointer-events-none max-w-[300px]">
                        {gifts.slice(-5).map((gift, i) => (
                            <div
                                key={gift.timestamp || i}
                                className={`flex items-center gap-2 bg-gradient-to-r ${gift.color || "from-purple-500/80 to-pink-500/80"
                                    } px-3 py-2 rounded-lg animate-slideIn`}
                            >
                                <span className="text-2xl animate-bounce">{gift.icon || "🎁"}</span>
                                <div>
                                    <p className="text-sm font-semibold text-white">{gift.senderUsername}</p>
                                    <p className="text-xs text-white/80">
                                        sent {gift.item || "gift"} x{gift.amount || 1}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Desktop chat panel */}
                <div className="w-80 hidden lg:flex flex-col bg-white/5 border-l border-white/10">
                    <ChatPanel />
                </div>

                {/* Mobile chat overlay */}
                {showMobileChat && (
                    <div className="absolute inset-0 bg-black/90 z-30 lg:hidden flex flex-col">
                        <div className="p-3 border-b border-white/10 flex items-center justify-between">
                            <h3 className="font-semibold">💬 Live Chat</h3>
                            <button
                                onClick={() => setShowMobileChat(false)}
                                className="px-3 py-2 bg-white/10 rounded-lg"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <ChatPanel isMobile />
                        </div>
                    </div>
                )}
            </div>

            {/* ✅ FIXED: was "0.3s.ease-out" */}
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
