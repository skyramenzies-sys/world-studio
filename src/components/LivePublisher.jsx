// src/components/LivePublisher.jsx
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

export default function LivePublisher({
    currentUser,
    roomId,
    streamTitle = "Untitled Stream",
    streamCategory = "Talk",
    onStop
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

    // Stop live stream
    const stopLive = () => {
        setIsLive(false);

        // Close all peer connections
        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();

        // Stop camera/mic
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }

        // Tell server stream is ended
        socket.emit("stop_broadcast", { roomId });

        // Update database
        api.post(`/live/${roomId}/end`).catch(console.error);

        onStop?.();
    };

    // Toggle microphone
    const toggleMute = () => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
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
            }
        }
    };

    // Duration timer
    useEffect(() => {
        let interval;
        if (isLive) {
            interval = setInterval(() => {
                setDuration((d) => d + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isLive]);

    // Format duration
    const formatDuration = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0) {
            return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
        }
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    // Main effect - start broadcasting
    useEffect(() => {
        let active = true;

        const startBroadcast = async () => {
            try {
                // Request camera/mic permissions
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        facingMode: "user",
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
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

                // Create stream in database
                try {
                    await api.post("/live", {
                        roomId,
                        title: streamTitle,
                        category: streamCategory,
                        hostId: currentUser?._id || currentUser?.id,
                        hostUsername: currentUser?.username,
                    });
                } catch (err) {
                    console.log("Stream creation error (may already exist):", err);
                }

                // Tell server we are live
                socket.emit("start_broadcast", {
                    roomId,
                    streamer: currentUser?.username,
                    title: streamTitle,
                    category: streamCategory,
                });

                setIsLive(true);
                toast.success("You're now live! 🔴");

                // ---- SOCKET EVENTS ----

                // A new viewer joined
                socket.on("watcher", async ({ watcherId }) => {
                    if (!streamRef.current) return;

                    const pc = new RTCPeerConnection(RTC_CONFIG);

                    // Add tracks
                    streamRef.current.getTracks().forEach((t) => {
                        pc.addTrack(t, streamRef.current);
                    });

                    // ICE candidates → viewer
                    pc.onicecandidate = ({ candidate }) => {
                        if (candidate) {
                            socket.emit("candidate", {
                                target: watcherId,
                                candidate,
                            });
                        }
                    };

                    // Create offer
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);

                    socket.emit("offer", {
                        watcherId,
                        sdp: offer,
                    });

                    peersRef.current.set(watcherId, pc);
                });

                // Viewer answer
                socket.on("answer", async ({ watcherId, sdp }) => {
                    const pc = peersRef.current.get(watcherId);
                    if (pc) {
                        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                    }
                });

                // ICE from viewer
                socket.on("candidate", async ({ from, candidate }) => {
                    const pc = peersRef.current.get(from);
                    if (pc && candidate) {
                        try {
                            await pc.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (err) {
                            console.warn("ICE error:", err);
                        }
                    }
                });

                // Viewer left
                socket.on("remove_watcher", ({ watcherId }) => {
                    const pc = peersRef.current.get(watcherId);
                    if (pc) pc.close();
                    peersRef.current.delete(watcherId);
                });

                // Live viewer count
                socket.on("viewer_count", ({ viewers: count }) => {
                    setViewers(count);
                });

                // Chat messages
                socket.on("chat_message", (message) => {
                    setChat((prev) => [...prev.slice(-50), message]); // Keep last 50 messages
                });

                // Server force-stop
                socket.on("stream_ended", () => {
                    toast.error("Stream was ended");
                    stopLive();
                });

            } catch (err) {
                console.error("Camera/Microphone error:", err);
                setError(
                    err.name === "NotAllowedError"
                        ? "Camera/microphone access denied. Please allow permissions."
                        : err.name === "NotFoundError"
                            ? "No camera or microphone found."
                            : "Failed to start stream. Please try again."
                );
                toast.error("Failed to access camera/microphone");
            }
        };

        startBroadcast();

        return () => {
            active = false;

            // Remove ALL listeners
            socket.off("watcher");
            socket.off("answer");
            socket.off("candidate");
            socket.off("remove_watcher");
            socket.off("viewer_count");
            socket.off("chat_message");
            socket.off("stream_ended");

            // Stop stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
            peersRef.current.forEach((pc) => pc.close());
            peersRef.current.clear();
        };
    }, [roomId, currentUser, streamTitle, streamCategory]);

    // Error state
    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-center p-8 max-w-md">
                    <p className="text-6xl mb-4">📹</p>
                    <p className="text-red-400 mb-4">{error}</p>
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
        <div className="w-full h-full flex flex-col bg-black">
            {/* Top bar */}
            <div className="p-3 flex items-center gap-3 bg-black/80 border-b border-white/10 z-10">
                {/* Live indicator */}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isLive ? "bg-red-500" : "bg-white/20"
                    }`}>
                    <span className={`w-2 h-2 rounded-full ${isLive ? "bg-white animate-pulse" : "bg-white/50"}`}></span>
                    <span className="font-bold text-sm">{isLive ? "LIVE" : "STARTING..."}</span>
                </div>

                {/* Duration */}
                {isLive && (
                    <span className="text-white/60 text-sm font-mono">
                        {formatDuration(duration)}
                    </span>
                )}

                {/* Stream info */}
                <div className="hidden md:block flex-1 text-center">
                    <span className="text-white font-semibold">{streamTitle}</span>
                    <span className="text-white/50 ml-2">• {streamCategory}</span>
                </div>

                {/* Viewers */}
                <div className="ml-auto flex items-center gap-2 text-white/70 bg-white/10 px-3 py-1.5 rounded-lg">
                    <span>👁</span>
                    <span className="font-semibold">{viewers}</span>
                </div>

                {/* Stop button */}
                {isLive && (
                    <button
                        onClick={stopLive}
                        className="px-4 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg flex items-center gap-2 font-semibold transition"
                    >
                        ⏹ End Stream
                    </button>
                )}
            </div>

            {/* Main content */}
            <div className="flex-1 flex">
                {/* Video */}
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
                                <p className="text-white/60">Camera is off</p>
                            </div>
                        </div>
                    )}

                    {/* Controls overlay */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                        <button
                            onClick={toggleMute}
                            className={`p-3 rounded-full transition ${isMuted
                                    ? "bg-red-500 hover:bg-red-400"
                                    : "bg-white/20 hover:bg-white/30"
                                }`}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? "🔇" : "🎤"}
                        </button>
                        <button
                            onClick={toggleCamera}
                            className={`p-3 rounded-full transition ${isCameraOff
                                    ? "bg-red-500 hover:bg-red-400"
                                    : "bg-white/20 hover:bg-white/30"
                                }`}
                            title={isCameraOff ? "Turn on camera" : "Turn off camera"}
                        >
                            {isCameraOff ? "📷" : "🎥"}
                        </button>
                    </div>

                    {/* Room ID */}
                    <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg text-sm">
                        <span className="text-white/50">Room: </span>
                        <span className="text-white font-mono">{roomId}</span>
                    </div>
                </div>

                {/* Chat sidebar */}
                <div className="w-80 hidden lg:flex flex-col bg-white/5 border-l border-white/10">
                    <div className="p-3 border-b border-white/10">
                        <h3 className="font-semibold">💬 Live Chat</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {chat.length === 0 ? (
                            <p className="text-white/40 text-sm text-center py-8">
                                No messages yet
                            </p>
                        ) : (
                            chat.map((msg, i) => (
                                <div key={i} className="text-sm">
                                    <span className="text-cyan-400 font-semibold">
                                        {msg.username}:
                                    </span>{" "}
                                    <span className="text-white/80">{msg.text}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}