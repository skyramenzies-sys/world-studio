// src/components/AudioLive.jsx
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import socket from "../api/socket";
import api from "../api/api";

export default function AudioLive({
    roomId,
    currentUser,
    streamTitle = "Audio Live",
    streamCategory = "Chat",
    isHost = false,
    onEnd,
}) {
    const [isLive, setIsLive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [viewers, setViewers] = useState(0);
    const [speakers, setSpeakers] = useState([]);
    const [chat, setChat] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [audioLevels, setAudioLevels] = useState({});

    const audioRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const streamRef = useRef(null);

    // Start audio stream
    const startAudio = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });

            streamRef.current = stream;

            // Setup audio analyser for visualizations
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            analyserRef.current.fftSize = 256;

            // Start level monitoring
            monitorAudioLevel();

            return stream;
        } catch (err) {
            console.error("Audio error:", err);
            toast.error("Failed to access microphone");
            return null;
        }
    };

    // Monitor audio levels for visualization
    const monitorAudioLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const update = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
            setAudioLevels(prev => ({
                ...prev,
                [currentUser?._id]: average / 255,
            }));

            requestAnimationFrame(update);
        };

        update();
    };

    // Go live
    const goLive = async () => {
        const stream = await startAudio();
        if (!stream) return;

        try {
            await api.post("/live/start", {
                title: streamTitle,
                category: streamCategory,
                roomId,
                type: "audio",
            });

            socket.emit("start_audio_live", {
                roomId,
                host: currentUser,
                title: streamTitle,
            });

            setSpeakers([{ ...currentUser, isHost: true }]);
            setIsLive(true);
            toast.success("You're live! 🎙️");
        } catch (err) {
            toast.error("Failed to start audio stream");
        }
    };

    // End live
    const endLive = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }

        socket.emit("end_audio_live", { roomId });
        setIsLive(false);
        onEnd?.();
    };

    // Toggle mute
    const toggleMute = () => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);
            }
        }
    };

    // Socket events
    useEffect(() => {
        socket.emit("join_audio_live", { roomId, user: currentUser });

        socket.on("speaker_joined", (speaker) => {
            setSpeakers(prev => [...prev, speaker]);
            toast.success(`${speaker.username} joined as speaker`);
        });

        socket.on("speaker_left", (userId) => {
            setSpeakers(prev => prev.filter(s => s._id !== userId));
        });

        socket.on("viewer_count", ({ count }) => {
            setViewers(count);
        });

        socket.on("chat_message", (msg) => {
            setChat(prev => [...prev.slice(-100), msg]);
        });

        socket.on("audio_live_ended", () => {
            toast.error("Stream has ended");
            onEnd?.();
        });

        return () => {
            socket.emit("leave_audio_live", { roomId });
            socket.off("speaker_joined");
            socket.off("speaker_left");
            socket.off("viewer_count");
            socket.off("chat_message");
            socket.off("audio_live_ended");
        };
    }, [roomId]);

    // Send chat
    const sendMessage = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        socket.emit("chat_message", {
            roomId,
            username: currentUser?.username,
            text: chatInput,
        });
        setChatInput("");
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-900 via-red-900 to-black text-white flex flex-col">
            {/* Header */}
            <div className="p-4 flex items-center gap-3 bg-black/40 border-b border-white/10">
                {isLive && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full">
                        <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        <span className="text-sm font-bold">LIVE</span>
                    </div>
                )}

                <div className="flex-1">
                    <h1 className="font-bold">{streamTitle}</h1>
                    <p className="text-xs text-white/50">🎙️ Audio Live</p>
                </div>

                <div className="flex items-center gap-2 text-white/70">
                    <span>👁</span>
                    <span className="font-bold">{viewers}</span>
                </div>

                {isHost && isLive && (
                    <button
                        onClick={endLive}
                        className="px-4 py-1.5 bg-red-500 rounded-full font-bold text-sm"
                    >
                        End
                    </button>
                )}
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col lg:flex-row">
                {/* Speakers area */}
                <div className="flex-1 p-6">
                    {/* Audio visualization background */}
                    <div className="relative bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-3xl p-8 border border-white/10">
                        {/* Animated waves */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-20">
                            <div className="flex gap-1">
                                {[...Array(20)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="w-1 bg-gradient-to-t from-orange-500 to-yellow-500 rounded-full animate-pulse"
                                        style={{
                                            height: `${30 + Math.sin(i * 0.5) * 50}px`,
                                            animationDelay: `${i * 0.05}s`,
                                            animationDuration: "0.5s",
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Speakers grid */}
                        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-2xl mx-auto">
                            {speakers.map((speaker) => (
                                <div
                                    key={speaker._id}
                                    className="flex flex-col items-center"
                                >
                                    {/* Avatar with audio ring */}
                                    <div
                                        className={`relative p-1 rounded-full transition-all duration-100 ${(audioLevels[speaker._id] || 0) > 0.1
                                                ? "ring-4 ring-cyan-400 ring-opacity-70"
                                                : ""
                                            }`}
                                        style={{
                                            boxShadow: (audioLevels[speaker._id] || 0) > 0.1
                                                ? `0 0 ${20 + (audioLevels[speaker._id] * 30)}px rgba(34, 211, 238, 0.5)`
                                                : "none"
                                        }}
                                    >
                                        <img
                                            src={speaker.avatar || "/defaults/default-avatar.png"}
                                            alt={speaker.username}
                                            className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                                        />

                                        {speaker.isHost && (
                                            <span className="absolute -top-1 -right-1 text-lg">👑</span>
                                        )}
                                    </div>

                                    <p className="mt-2 font-semibold text-sm">{speaker.username}</p>

                                    {speaker._id === currentUser?._id && isMuted && (
                                        <span className="text-red-400 text-xs">🔇 Muted</span>
                                    )}
                                </div>
                            ))}

                            {/* Empty slots */}
                            {[...Array(Math.max(0, 4 - speakers.length))].map((_, i) => (
                                <div
                                    key={`empty-${i}`}
                                    className="flex flex-col items-center opacity-30"
                                >
                                    <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                                        <span className="text-2xl">🎤</span>
                                    </div>
                                    <p className="mt-2 text-sm text-white/50">Empty</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex justify-center gap-4 mt-6">
                        {isHost && !isLive && (
                            <button
                                onClick={goLive}
                                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-full font-bold text-lg hover:shadow-lg transition"
                            >
                                🎙️ Go LIVE
                            </button>
                        )}

                        {isLive && (
                            <button
                                onClick={toggleMute}
                                className={`p-4 rounded-full ${isMuted
                                        ? "bg-red-500"
                                        : "bg-white/20 hover:bg-white/30"
                                    } transition`}
                            >
                                {isMuted ? "🔇" : "🎤"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Chat sidebar */}
                <div className="w-full lg:w-80 bg-black/30 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col">
                    <div className="p-3 border-b border-white/10">
                        <h3 className="font-semibold">💬 Live Chat</h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {chat.length === 0 ? (
                            <p className="text-white/40 text-center py-8">No messages yet</p>
                        ) : (
                            chat.map((msg, i) => (
                                <div key={i} className="text-sm">
                                    <span className="text-orange-400 font-semibold">{msg.username}: </span>
                                    <span className="text-white/80">{msg.text}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <form onSubmit={sendMessage} className="p-3 border-t border-white/10">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Say something..."
                                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-sm outline-none focus:border-orange-400"
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-orange-500 rounded-full font-semibold text-sm"
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}// force rebuild
