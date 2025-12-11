// src/components/LivePage.jsx - WORLD STUDIO LIVE EDITION 🎬
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/api";
import { getSocket } from "../api/socket";
import LivePublisher from "./LivePublisher";
import LiveViewer from "./LiveViewer";
import MultiGuestLive from "./MultiGuestLive";
import AudioLive from "./AudioLive";

const CATEGORIES = [
    { id: "Chat", name: "Chat", icon: "💬" },
    { id: "Music", name: "Music", icon: "🎵" },
    { id: "Gaming", name: "Gaming", icon: "🎮" },
    { id: "Talk", name: "Talk", icon: "🎙️" },
    { id: "Art", name: "Art", icon: "🎨" },
    { id: "Education", name: "Education", icon: "📚" },
    { id: "Sports", name: "Sports", icon: "⚽" },
    { id: "Cooking", name: "Cooking", icon: "🍳" },
];

const LIVE_MODES = [
    { id: "solo", name: "Solo LIVE", icon: "🎥", description: "Stream by yourself", color: "from-red-500 to-pink-600" },
    { id: "multi", name: "Multi-guest LIVE", icon: "👥", description: "Invite up to 12 guests", color: "from-purple-500 to-pink-500", featured: true },
    { id: "audio", name: "Audio LIVE", icon: "🎙️", description: "Voice-only streaming", color: "from-orange-500 to-red-500" },
];

const SEAT_OPTIONS = [4, 6, 9, 12];

export default function LivePage() {
    const { streamId } = useParams();
    const navigate = useNavigate();
    const socketRef = useRef(null);

    const [currentUser, setCurrentUser] = useState(null);
    const [mode, setMode] = useState(null);
    const [step, setStep] = useState(1);
    const [selectedLiveMode, setSelectedLiveMode] = useState("solo");
    const [roomId, setRoomId] = useState("");
    const [streamTitle, setStreamTitle] = useState("");
    const [streamCategory, setStreamCategory] = useState("Chat");
    const [seatCount, setSeatCount] = useState(12);
    const [streamInfo, setStreamInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeStreamId, setActiveStreamId] = useState(null);
    const [cameraStatus, setCameraStatus] = useState("pending");
    const [cameraError, setCameraError] = useState(null);
    const previewStreamRef = useRef(null);
    const videoRef = useRef(null);

    useEffect(() => {
        socketRef.current = getSocket();
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentUser(user);
                if (!roomId && !streamId) {
                    setRoomId(`${user.username}-${Date.now().toString(36)}`);
                }
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        }
    }, []);

    useEffect(() => {
        if (step === 2 && selectedLiveMode !== "audio") {
            startCameraPreview();
        }
        return () => stopCameraPreview();
    }, [step, selectedLiveMode]);

    const startCameraPreview = async () => {
        setCameraStatus("pending");
        setCameraError(null);
        try {
            console.log("📷 Requesting camera access...");
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
                audio: false,
            });
            console.log("✅ Camera access granted:", stream.getTracks());
            previewStreamRef.current = stream;
            setCameraStatus("granted");
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(() => { });
            }
        } catch (err) {
            console.error("❌ Camera error:", err.name, err.message);
            setCameraStatus("denied");
            setCameraError(err.message);
            toast.error(`Camera: ${err.name}`);
        }
    };

    const stopCameraPreview = () => {
        if (previewStreamRef.current) {
            previewStreamRef.current.getTracks().forEach((t) => t.stop());
            previewStreamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
    };

    const retryCamera = () => {
        stopCameraPreview();
        startCameraPreview();
    };

    useEffect(() => {
        if (streamId) {
            setLoading(true);
            api.get(`/live/${streamId}`)
                .then((res) => {
                    const stream = res.data.stream || res.data;
                    if (!stream || !stream.isLive) {
                        toast.error("Stream not available");
                        navigate("/discover");
                        return;
                    }
                    setStreamInfo(stream);
                    setRoomId(stream.roomId || stream._id || streamId);
                    setStreamTitle(stream.title || "Live Stream");
                    setStreamCategory(stream.category || "Chat");
                    setActiveStreamId(stream._id);
                    if (stream.type === "multi") setMode("watch-multi");
                    else if (stream.type === "audio") setMode("watch-audio");
                    else setMode("watch");
                })
                .catch(() => {
                    setRoomId(streamId);
                    setMode("watch");
                })
                .finally(() => setLoading(false));
        }
    }, [streamId, navigate]);

    const startStreaming = async () => {
        if (!currentUser) {
            toast.error("Please log in to go live");
            navigate("/login");
            return;
        }
        if (!streamTitle.trim()) {
            toast.error("Please enter a stream title");
            return;
        }
        if (selectedLiveMode !== "audio" && cameraStatus !== "granted") {
            toast.error("Camera access required");
            retryCamera();
            return;
        }

        setLoading(true);
        stopCameraPreview();

        try {
            const res = await api.post("/live/start", {
                title: streamTitle.trim(),
                category: streamCategory,
                type: selectedLiveMode,
                maxSeats: selectedLiveMode === "multi" ? seatCount : 1,
                hostId: currentUser._id || currentUser.id,
                hostUsername: currentUser.username,
                hostAvatar: currentUser.avatar,
            });

            const stream = res.data.stream || res.data;
            console.log("✅ Stream created:", stream);
            setActiveStreamId(stream._id || stream.id);
            setRoomId(stream.roomId || stream._id);
            setStreamInfo(stream);

            toast.success("🔴 You're now live!");

            if (selectedLiveMode === "solo") setMode("publish");
            else if (selectedLiveMode === "multi") setMode("multi");
            else if (selectedLiveMode === "audio") setMode("audio");
        } catch (err) {
            console.error("Failed to start stream:", err);
            toast.error(err.response?.data?.error || "Failed to start stream");
        } finally {
            setLoading(false);
        }
    };

    const handleStopStream = async () => {
        try {
            if (activeStreamId) await api.post(`/live/${activeStreamId}/end`);
            socketRef.current?.emit("stop_broadcast", { roomId: activeStreamId || roomId, streamId: activeStreamId });
        } catch (err) {
            console.error("Failed to end stream:", err);
        }
        setMode(null);
        setStep(1);
        setActiveStreamId(null);
        setStreamInfo(null);
        toast.success("Stream ended");
        navigate("/discover");
    };

    const handleLeaveStream = () => {
        socketRef.current?.emit("leave_stream", { roomId, streamId: activeStreamId || streamId });
        setMode(null);
        setStep(1);
        setRoomId("");
        setStreamInfo(null);
        setActiveStreamId(null);
        navigate("/discover");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/70">Connecting...</p>
                </div>
            </div>
        );
    }

    if (mode === "publish") {
        return <LivePublisher currentUser={currentUser} roomId={roomId} streamTitle={streamTitle} streamCategory={streamCategory} streamId={activeStreamId} onStop={handleStopStream} />;
    }
    if (mode === "multi") {
        return <MultiGuestLive roomId={roomId} currentUser={currentUser} streamTitle={streamTitle} streamCategory={streamCategory} maxSeats={seatCount} streamId={activeStreamId} isHost={true} onEnd={handleStopStream} />;
    }
    if (mode === "audio") {
        return <AudioLive roomId={roomId} currentUser={currentUser} streamTitle={streamTitle} streamCategory={streamCategory} streamId={activeStreamId} isHost={true} onEnd={handleStopStream} />;
    }
    if (mode === "watch") {
        return <LiveViewer roomId={roomId} currentUser={currentUser} streamInfo={streamInfo} streamId={activeStreamId || streamId} onLeave={handleLeaveStream} />;
    }
    if (mode === "watch-multi") {
        return <MultiGuestLive roomId={roomId} currentUser={currentUser} streamTitle={streamInfo?.title} streamCategory={streamInfo?.category} maxSeats={streamInfo?.maxSeats || 12} streamId={activeStreamId || streamId} isHost={false} onEnd={handleLeaveStream} />;
    }
    if (mode === "watch-audio") {
        return <AudioLive roomId={roomId} currentUser={currentUser} streamTitle={streamInfo?.title} streamCategory={streamInfo?.category} streamId={activeStreamId || streamId} isHost={false} onEnd={handleLeaveStream} />;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white pb-24">
            {step === 1 ? (
                <div className="max-w-xl mx-auto py-8 px-4 space-y-6">
                    <div className="text-center">
                        <h1 className="text-3xl font-bold text-cyan-400 mb-2">🎥 Go Live</h1>
                        <p className="text-white/60">Choose how you want to stream</p>
                    </div>

                    <div className="space-y-3">
                        {LIVE_MODES.map((lm) => (
                            <button key={lm.id} onClick={() => { setSelectedLiveMode(lm.id); setStep(2); }}
                                className="w-full p-4 rounded-2xl border-2 border-white/10 hover:border-white/30 hover:bg-white/5 transition text-left">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${lm.color} flex items-center justify-center text-2xl`}>{lm.icon}</div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg">{lm.name}</h3>
                                        <p className="text-white/50 text-sm">{lm.description}</p>
                                    </div>
                                    <span className="text-white/30">→</span>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 mt-8">
                        <h2 className="text-lg font-semibold">👁 Watch a Stream</h2>
                        <div className="flex gap-2">
                            <input value={roomId} onChange={(e) => setRoomId(e.target.value)} placeholder="Enter Room ID"
                                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:border-cyan-400" />
                            <button disabled={!roomId?.trim()} onClick={() => setMode("watch")}
                                className="px-6 py-3 bg-cyan-500 rounded-xl font-semibold disabled:opacity-40">Join</button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-xl mx-auto py-6 px-4 space-y-6">
                    <div className="flex items-center gap-3">
                        <button onClick={() => { stopCameraPreview(); setStep(1); }} className="p-2 hover:bg-white/10 rounded-full">← Back</button>
                        <h1 className="text-xl font-bold">{LIVE_MODES.find((m) => m.id === selectedLiveMode)?.icon} {LIVE_MODES.find((m) => m.id === selectedLiveMode)?.name}</h1>
                    </div>

                    <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-white/10">
                        {selectedLiveMode !== "audio" ? (
                            <>
                                <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${cameraStatus !== "granted" ? "hidden" : ""}`} />
                                {cameraStatus === "pending" && <div className="absolute inset-0 flex items-center justify-center"><div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div></div>}
                                {cameraStatus === "denied" && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-5xl mb-3">📷❌</span>
                                        <p className="text-red-400 mb-3">{cameraError}</p>
                                        <button onClick={retryCamera} className="px-6 py-3 bg-cyan-500 rounded-xl font-bold">🔄 Retry</button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-orange-500/20 to-red-500/20 flex flex-col items-center justify-center">
                                <span className="text-6xl mb-4">🎙️</span>
                                <p className="text-white/60">Audio Only</p>
                            </div>
                        )}
                    </div>

                    <input value={streamTitle} onChange={(e) => setStreamTitle(e.target.value)} placeholder="Stream title" maxLength={100}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl outline-none focus:border-cyan-400" />

                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((cat) => (
                            <button key={cat.id} onClick={() => setStreamCategory(cat.id)}
                                className={`px-3 py-2 rounded-full text-sm ${streamCategory === cat.id ? "bg-cyan-500 text-black font-semibold" : "bg-white/10"}`}>
                                {cat.icon} {cat.name}
                            </button>
                        ))}
                    </div>

                    {selectedLiveMode === "multi" && (
                        <div className="flex gap-2">
                            {SEAT_OPTIONS.map((c) => (
                                <button key={c} onClick={() => setSeatCount(c)}
                                    className={`flex-1 py-3 rounded-xl font-bold ${seatCount === c ? "bg-gradient-to-r from-purple-500 to-pink-500" : "bg-white/10"}`}>
                                    {c} 🪑
                                </button>
                            ))}
                        </div>
                    )}

                    <button disabled={!streamTitle.trim() || !currentUser || loading || (selectedLiveMode !== "audio" && cameraStatus !== "granted")}
                        onClick={startStreaming}
                        className={`w-full py-4 rounded-xl font-bold text-lg disabled:opacity-40 bg-gradient-to-r ${LIVE_MODES.find((m) => m.id === selectedLiveMode)?.color}`}>
                        {loading ? "Starting..." : "🔴 Go LIVE"}
                    </button>
                </div>
            )}
        </div>
    );
}
// rebuild
