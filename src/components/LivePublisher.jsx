// src/components/LivePublisher.jsx
import React, { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import socket from "../api/socket";
import api from "../api/api";

const RTC_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
    ],
};

export default function LivePublisher({ currentUser, roomId, streamTitle = "Untitled Stream", streamCategory = "Talk", onStop }) {
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

    const stopLive = () => {
        setIsLive(false);
        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        socket.emit("stop_broadcast", { roomId });
        api.post(`/live/${roomId}/end`).catch(console.error);
        onStop?.();
    };

    const toggleMute = () => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleCamera = () => {
        if (streamRef.current) {
            const videoTrack = streamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setIsCameraOff(!videoTrack.enabled);
            }
        }
    };

    useEffect(() => {
        let interval;
        if (isLive) interval = setInterval(() => setDuration((d) => d + 1), 1000);
        return () => clearInterval(interval);
    }, [isLive]);

    const formatDuration = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}` : `${m}:${sec.toString().padStart(2, "0")}`;
    };

    useEffect(() => {
        let active = true;

        const startBroadcast = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
                    audio: { echoCancellation: true, noiseSuppression: true },
                });

                if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }

                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;

                try {
                    await api.post("/live", {
                        roomId, title: streamTitle, category: streamCategory,
                        hostId: currentUser?._id || currentUser?.id,
                        hostUsername: currentUser?.username,
                    });
                } catch (err) { console.log("Stream creation:", err); }

                const streamerId = currentUser?._id || currentUser?.id;

                // IMPORTANT: Send streamerId so server can notify followers!
                socket.emit("start_broadcast", {
                    roomId,
                    streamer: currentUser?.username,
                    title: streamTitle,
                    category: streamCategory,
                    streamerId,
                });

                setIsLive(true);
                toast.success("You're now live! 🔴 Your followers will be notified!");

                socket.on("watcher", async ({ watcherId }) => {
                    if (!streamRef.current) return;
                    const pc = new RTCPeerConnection(RTC_CONFIG);
                    streamRef.current.getTracks().forEach((t) => pc.addTrack(t, streamRef.current));
                    pc.onicecandidate = ({ candidate }) => { if (candidate) socket.emit("candidate", { target: watcherId, candidate }); };
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit("offer", { watcherId, sdp: offer });
                    peersRef.current.set(watcherId, pc);
                });

                socket.on("answer", async ({ watcherId, sdp }) => {
                    const pc = peersRef.current.get(watcherId);
                    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(sdp));
                });

                socket.on("candidate", async ({ from, candidate }) => {
                    const pc = peersRef.current.get(from);
                    if (pc && candidate) try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (e) { }
                });

                socket.on("remove_watcher", ({ watcherId }) => {
                    const pc = peersRef.current.get(watcherId);
                    if (pc) pc.close();
                    peersRef.current.delete(watcherId);
                });

                socket.on("viewer_count", ({ viewers: count }) => setViewers(count));
                socket.on("chat_message", (msg) => setChat((prev) => [...prev.slice(-50), msg]));
                socket.on("gift_received", (gift) => {
                    setGifts((prev) => [...prev.slice(-10), gift]);
                    setTotalGifts((prev) => prev + (gift.amount || 0));
                    toast.success(`🎁 ${gift.senderUsername} sent ${gift.icon || "💝"} x${gift.amount}!`);
                });
                socket.on("stream_ended", () => { toast.error("Stream ended"); stopLive(); });

            } catch (err) {
                setError(err.name === "NotAllowedError" ? "Camera/microphone access denied." : err.name === "NotFoundError" ? "No camera or microphone found." : "Failed to start stream.");
                toast.error("Failed to access camera/microphone");
            }
        };

        startBroadcast();

        return () => {
            active = false;
            ["watcher", "answer", "candidate", "remove_watcher", "viewer_count", "chat_message", "stream_ended", "gift_received"].forEach(e => socket.off(e));
            if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
            peersRef.current.forEach((pc) => pc.close());
            peersRef.current.clear();
        };
    }, [roomId, currentUser, streamTitle, streamCategory]);

    if (error) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-black">
                <div className="text-center p-8">
                    <p className="text-6xl mb-4">📹</p>
                    <p className="text-red-400 mb-4">{error}</p>
                    <button onClick={onStop} className="px-6 py-3 bg-white/10 rounded-lg hover:bg-white/20">Go Back</button>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col bg-black">
            <div className="p-3 flex items-center gap-3 bg-black/80 border-b border-white/10">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isLive ? "bg-red-500" : "bg-white/20"}`}>
                    <span className={`w-2 h-2 rounded-full ${isLive ? "bg-white animate-pulse" : "bg-white/50"}`}></span>
                    <span className="font-bold text-sm">{isLive ? "LIVE" : "STARTING..."}</span>
                </div>
                {isLive && <span className="text-white/60 text-sm font-mono">{formatDuration(duration)}</span>}
                <div className="hidden md:block flex-1 text-center">
                    <span className="text-white font-semibold">{streamTitle}</span>
                    <span className="text-white/50 ml-2">• {streamCategory}</span>
                </div>
                <div className="ml-auto flex items-center gap-4">
                    {totalGifts > 0 && <div className="flex items-center gap-2 text-yellow-400 bg-yellow-500/10 px-3 py-1.5 rounded-lg"><span>🎁</span><span className="font-semibold">{totalGifts}</span></div>}
                    <div className="flex items-center gap-2 text-white/70 bg-white/10 px-3 py-1.5 rounded-lg"><span>👁</span><span className="font-semibold">{viewers}</span></div>
                </div>
                {isLive && <button onClick={stopLive} className="px-4 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg font-semibold">⏹ End</button>}
            </div>

            <div className="flex-1 flex">
                <div className="flex-1 relative">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain bg-black" />
                    {isCameraOff && <div className="absolute inset-0 flex items-center justify-center bg-black/80"><p className="text-6xl">📷</p></div>}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                        <button onClick={toggleMute} className={`p-3 rounded-full ${isMuted ? "bg-red-500" : "bg-white/20"}`}>{isMuted ? "🔇" : "🎤"}</button>
                        <button onClick={toggleCamera} className={`p-3 rounded-full ${isCameraOff ? "bg-red-500" : "bg-white/20"}`}>{isCameraOff ? "📷" : "🎥"}</button>
                    </div>
                    <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg text-sm">
                        <span className="text-white/50">Room: </span><span className="text-white font-mono">{roomId}</span>
                    </div>
                    <div className="absolute top-20 left-4 space-y-2 pointer-events-none">
                        {gifts.slice(-5).map((gift, i) => (
                            <div key={i} className="flex items-center gap-2 bg-black/60 px-3 py-2 rounded-lg animate-pulse">
                                <span className="text-2xl">{gift.icon || "🎁"}</span>
                                <div><p className="text-sm font-semibold text-yellow-400">{gift.senderUsername}</p><p className="text-xs text-white/60">sent x{gift.amount}</p></div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-80 hidden lg:flex flex-col bg-white/5 border-l border-white/10">
                    <div className="p-3 border-b border-white/10"><h3 className="font-semibold">💬 Live Chat</h3></div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {chat.length === 0 ? <p className="text-white/40 text-sm text-center py-8">No messages yet</p> : chat.map((msg, i) => (
                            <div key={i} className="text-sm"><span className="text-cyan-400 font-semibold">{msg.username}:</span> <span className="text-white/80">{msg.text}</span></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}