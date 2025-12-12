// src/components/AudioLive.jsx - WORLD STUDIO LIVE EDITION 🎙️🚀
import React, { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-hot-toast";

import GiftPanel, { GiftReceivedAlert } from "./GiftPanel";

// ✅ Use shared instances
import api from "../api/api";
import socket from "../api/socket";

// ============================================
// SIMPLE GIFT MAP (voor overlay & tiers)
// ============================================
const GIFT_MAP = {
    "Neon Spark": { icon: "✨", tier: "common", sound: "pop" },
    "Pixel Heart": { icon: "💟", tier: "common", sound: "pop" },
    "Hologram Rose": { icon: "🌹", tier: "common", sound: "pop" },
    "Glow Stick": { icon: "🧪", tier: "common", sound: "pop" },

    "Crystal Chip": { icon: "💠", tier: "rare", sound: "sparkle" },
    "Laser Wave": { icon: "📡", tier: "rare", sound: "sparkle" },

    "Cyber Panther": { icon: "🐆", tier: "epic", sound: "magic" },






    "Teleport Gate": { icon: "🌀", tier: "epic", sound: "magic" },

    "Aurora Horizon": { icon: "🌈", tier: "legendary", sound: "magic" },
    "Digital Palace": { icon: "🏰", tier: "legendary", sound: "fanfare" },

    "Phoenix Reboot": { icon: "🐦‍🔥", tier: "mythic", sound: "cosmic" },
    "Dragon Core": { icon: "🐉", tier: "mythic", sound: "roar" },

    "AI Core": { icon: "🤖", tier: "cyber", sound: "sparkle" },
    "Neon Chip Rain": { icon: "💾", tier: "cyber", sound: "magic" },


    "Galaxy Orb": { icon: "🌌", tier: "cosmic", sound: "cosmic" },
    "Planet Drop": { icon: "🪐", tier: "cosmic", sound: "explosion" },


    "SKYRA Jetpack": { icon: "🧥", tier: "skyra", sound: "rocket" },
    "AIRPATH Beam": { icon: "🛰️", tier: "skyra", sound: "magic" },
    "Commander Badge": { icon: "🎖️", tier: "skyra", sound: "fanfare" },
    "SKYRA Universe": { icon: "✨", tier: "skyra", sound: "cosmic" },
};

// ============================================
// DEFAULT PLAYLIST (HOST PANEL) 🎧
// ============================================
const DEFAULT_PLAYLIST = [
    {
        id: "track-1",
        title: "Skyra Intro Theme",
        artist: "World Studio",
        url: "/audio/skyra-intro.mp3",
        emoji: "🚀",
    },
    {
        id: "track-2",
        title: "AirPath Lounge Vibes",
        artist: "World Studio",
        url: "/audio/airpath-lounge.mp3",
        emoji: "🌌",
    },
    {
        id: "track-3",
        title: "Commander Focus",
        artist: "World Studio",
        url: "/audio/commander-focus.mp3",
        emoji: "🎧",
    },
];

const DEFAULT_AVATAR = "/defaults/default-avatar.png";

// ============================================
// AUDIO VISUALIZER COMPONENT
// ============================================
const AudioVisualizer = ({ level = 0, isActive = false }) => {
    const bars = 12;

    return (
        <div className="flex items-end justify-center gap-0.5 h-8">
            {[...Array(bars)].map((_, i) => {
                const baseHeight = Math.sin((i / bars) * Math.PI) * 0.7 + 0.3;
                const animatedHeight = isActive ? baseHeight * (0.3 + level * 0.7) : 0.1;

                return (
                    <div
                        key={i}
                        className="w-1 bg-gradient-to-t from-orange-500 to-yellow-400 rounded-full transition-all duration-75"
                        style={{
                            height: `${Math.max(4, animatedHeight * 32)}px`,
                            opacity: isActive ? 0.8 + level * 0.2 : 0.3,
                        }}
                    />
                );
            })}
        </div>
    );
};

// ============================================
// SPEAKER CARD COMPONENT
// ============================================
const SpeakerCard = ({ speaker, audioLevel, currentUserId, isMuted }) => {
    const isSpeaking = audioLevel > 0.1;
    const isCurrentUser = speaker._id === currentUserId;

    return (
        <div className="flex flex-col items-center">
            {/* Avatar with audio ring */}
            <div
                className={`relative p-1 rounded-full transition-all duration-150 ${isSpeaking ? "ring-4 ring-cyan-400/70 scale-105" : ""
                    }`}
                style={{
                    boxShadow: isSpeaking
                        ? `0 0 ${20 + audioLevel * 40}px rgba(34, 211, 238, ${0.3 + audioLevel * 0.4})`
                        : "none",
                }}
            >
                <img
                    src={speaker.avatar || DEFAULT_AVATAR}
                    alt={speaker.username}
                    className="w-20 h-20 rounded-full object-cover border-2 border-white/20"
                    onError={(e) => {
                        e.target.src = DEFAULT_AVATAR;
                    }}
                />

                {/* Host crown */}
                {speaker.isHost && (
                    <span className="absolute -top-1 -right-1 text-lg drop-shadow-lg">👑</span>
                )}

                {/* Speaking indicator */}
                {isSpeaking && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
                        <div className="flex gap-0.5">
                            {[...Array(3)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 h-2 bg-cyan-400 rounded-full animate-pulse"
                                    style={{ animationDelay: `${i * 0.1}s` }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Username */}
            <p className="mt-2 font-semibold text-sm truncate max-w-[80px]">{speaker.username}</p>

            {/* Status badges */}
            <div className="flex items-center gap-1 mt-1">
                {isCurrentUser && isMuted && (
                    <span className="px-2 py-0.5 bg-red-500/30 text-red-400 rounded-full text-xs">
                        🔇 Muted
                    </span>
                )}
                {speaker.isHost && (
                    <span className="px-2 py-0.5 bg-orange-500/30 text-orange-400 rounded-full text-xs">
                        Host
                    </span>
                )}
            </div>

            {/* Mini visualizer */}
            {isSpeaking && (
                <div className="mt-2">
                    <AudioVisualizer level={audioLevel} isActive={isSpeaking} />
                </div>
            )}
        </div>
    );
};

// ============================================
// CHAT MESSAGE COMPONENT
// ============================================
const ChatMessage = ({ message, isSystem = false }) => {
    if (isSystem) {
        return (
            <div className="text-center py-1">
                <span className="text-xs text-white/40 italic">{message.text}</span>
            </div>
        );
    }

    return (
        <div className="text-sm py-1 hover:bg-white/5 px-2 -mx-2 rounded transition">
            <span className="text-orange-400 font-semibold">{message.username}: </span>
            <span className="text-white/80">{message.text}</span>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================
export default function AudioLive({
    roomId,
    currentUser,
    streamTitle = "Audio Live",
    streamCategory = "Chat",
    isHost = false,
    onEnd,
    onViewerCountChange,
}) {
    // State
    const [isLive, setIsLive] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [viewers, setViewers] = useState(0);
    const [speakers, setSpeakers] = useState([]);
    const [chat, setChat] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [audioLevels, setAudioLevels] = useState({});
    const [isConnecting, setIsConnecting] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(socket.connected ? "connected" : "disconnected");
    const [streamDuration, setStreamDuration] = useState(0);
    const [gifts, setGifts] = useState([]);
    const [totalGifts, setTotalGifts] = useState(0);

    // Likes / tap hearts
    const [likes, setLikes] = useState(0);
    const [tapHearts, setTapHearts] = useState([]);

    // Gift overlay state
    const [overlayGift, setOverlayGift] = useState(null);
    const [overlaySender, setOverlaySender] = useState("");
    const [showGiftPanel, setShowGiftPanel] = useState(false);

    // Playlist state (HOST PANEL)
    const [playlist] = useState(DEFAULT_PLAYLIST);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
    const [isPlaylistPlaying, setIsPlaylistPlaying] = useState(false);

    // Refs


    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const streamRef = useRef(null);
    const chatEndRef = useRef(null);
    const durationIntervalRef = useRef(null);
    const animationFrameRef = useRef(null);
    const audioPlayerRef = useRef(null);

    const selfId = currentUser?._id || currentUser?.id;

    // ============================================
    // CHAT: SYSTEM MESSAGE HELPER
    // ============================================
    const addSystemMessage = useCallback((text) => {
        setChat((prev) => [...prev.slice(-100), { text, isSystem: true }]);
    }, []);

    // ============================================
    // CLEANUP FUNCTION
    // ============================================
    const cleanup = useCallback(() => {
        // Stop audio tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => {
                t.stop();
                console.log(`🛑 Stopped audio track`);
            });
            streamRef.current = null;
        }

        // Close audio context
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Cancel animation frame
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Clear duration interval
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }

        setIsLive(false);
        setStreamDuration(0);
        setAudioLevels({});
    }, []);

    // ============================================
    // SOCKET CONNECTION STATUS
    // ============================================
    useEffect(() => {
        const handleConnect = () => setConnectionStatus("connected");
        const handleDisconnect = () => setConnectionStatus("disconnected");
        const handleError = () => setConnectionStatus("error");

        socket.on("connect", handleConnect);
        socket.on("disconnect", handleDisconnect);
        socket.on("connect_error", handleError);

        return () => {
            socket.off("connect", handleConnect);
            socket.off("disconnect", handleDisconnect);
            socket.off("connect_error", handleError);
        };
    }, []);

    // ============================================
    // SOCKET EVENTS
    // ============================================
    useEffect(() => {
        if (!roomId) return;

        // Join audio live room
        socket.emit("join_audio_live", { roomId, user: currentUser });
        console.log(`🎙️ Joined audio live: ${roomId}`);

        // Speaker events
        const handleSpeakerJoined = (speaker) => {
            setSpeakers((prev) => {
                if (prev.find((s) => s._id === speaker._id)) return prev;
                return [...prev, speaker];
            });
            addSystemMessage(`${speaker.username} joined as speaker`);
            toast.success(`${speaker.username} joined as speaker 🎤`);
        };

        const handleSpeakerLeft = (userId) => {
            setSpeakers((prev) => {
                const speaker = prev.find((s) => s._id === userId);
                if (speaker) {
                    addSystemMessage(`${speaker.username} left`);
                }
                return prev.filter((s) => s._id !== userId);
            });
        };

        const handleSpeakersList = (speakersList) => {
            setSpeakers(speakersList);
        };

        // Viewer count
        const handleViewerCount = (data) => {
            const count = data.count ?? data.viewers ?? 0;
            setViewers(count);
            onViewerCountChange?.(count);
        };

        // Chat
        const handleChatMessage = (msg) => {
            if (msg.roomId && msg.roomId !== roomId) return;
            setChat((prev) => [...prev.slice(-100), msg]);
        };

        // Gifts
        const handleGiftReceived = (giftData) => {
            // Filter by roomId if present
            if (giftData.roomId && giftData.roomId !== roomId) return;

            const senderName =
                giftData.from || giftData.senderUsername || giftData.sender || "Someone";
            const giftName = giftData.giftName || giftData.item || giftData.name || "Gift";
            const value = giftData.value ?? giftData.amount ?? giftData.total ?? 0;

            const mapConfig = GIFT_MAP[giftName] || {};
            const icon = giftData.icon || mapConfig.icon || "🎁";
            const tier = mapConfig.tier || giftData.tier || "common";
            const sound = mapConfig.sound || "sparkle";

            const normalizedGift = {
                ...giftData,
                senderName,
                giftName,
                value,
                emoji: giftData.emoji || icon,
                icon,
                tier,
            };

            setGifts((prev) => [...prev.slice(-10), { ...normalizedGift, timestamp: Date.now() }]);
            setTotalGifts((prev) => prev + (value || 0));

            // Overlay animation
            setOverlayGift({ name: giftName, icon, tier, sound, amount: value || 0 });
            setOverlaySender(senderName);

            toast.success(`🎁 ${senderName} sent ${giftName}!`);
        };

        // Stream ended
        const handleStreamEnded = (data) => {
            if (data?.roomId && data.roomId !== roomId) return;
            toast("Stream has ended", { icon: "⚫" });
            cleanup();
            onEnd?.();
        };

        // Audio level updates from other speakers
        const handleAudioLevel = ({ speakerId, level }) => {
            setAudioLevels((prev) => ({ ...prev, [speakerId]: level }));
        };

        // Likes from taps
        const handleAudioLike = ({ userId }) => {
            setLikes((prev) => prev + 1);



            const id = Date.now() + Math.random();
            setTapHearts((prev) => [
                ...prev,
                { id, left: 50 + (Math.random() * 20 - 10), top: 40 + (Math.random() * 20 - 10) },
            ]);
            setTimeout(() => {
                setTapHearts((prev) => prev.filter((h) => h.id !== id));
            }, 800);
        };

        // Register listeners
        socket.on("speaker_joined", handleSpeakerJoined);
        socket.on("speaker_left", handleSpeakerLeft);
        socket.on("speakers_list", handleSpeakersList);
        socket.on("viewer_count", handleViewerCount);
        socket.on("chat_message", handleChatMessage);
        socket.on("gift_received", handleGiftReceived);
        socket.on("audio_live_ended", handleStreamEnded);
        socket.on("stream_ended", handleStreamEnded);
        socket.on("audio_level", handleAudioLevel);
        socket.on("audio_like", handleAudioLike);

        return () => {
            socket.off("speaker_joined", handleSpeakerJoined);
            socket.off("speaker_left", handleSpeakerLeft);
            socket.off("speakers_list", handleSpeakersList);
            socket.off("viewer_count", handleViewerCount);
            socket.off("chat_message", handleChatMessage);
            socket.off("gift_received", handleGiftReceived);
            socket.off("audio_live_ended", handleStreamEnded);
            socket.off("stream_ended", handleStreamEnded);
            socket.off("audio_level", handleAudioLevel);
            socket.off("audio_like", handleAudioLike);

            socket.emit("leave_audio_live", { roomId, userId: selfId });
            console.log(`👋 Left audio live: ${roomId}`);
        };
    }, [roomId, currentUser, selfId, onViewerCountChange, onEnd, addSystemMessage, cleanup]);

    // ============================================
    // PLAYLIST EFFECT (HOST: CURRENT TRACK)
    // ============================================
    useEffect(() => {
        if (!isHost) return;
        const audioEl = audioPlayerRef.current;
        if (!audioEl) return;

        if (!isPlaylistPlaying) {
            audioEl.pause();
            return;
        }

        const track = playlist[currentTrackIndex];
        if (!track || !track.url) return;

        audioEl.src = track.url;
        audioEl.play().catch((err) => {
            console.error("Playlist play error:", err);
            toast.error("Cannot autoplay track (browser blocked).");
            setIsPlaylistPlaying(false);
        });
    }, [isHost, isPlaylistPlaying, currentTrackIndex, playlist]);

    // ============================================
    // AUDIO SETUP (MIC)
    // ============================================
    const monitorAudioLevel = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

        const update = () => {
            if (!analyserRef.current) return;

            analyserRef.current.getByteFrequencyData(dataArray);

            // Calculate RMS for better level detection
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i] * dataArray[i];
            }
            const rms = Math.sqrt(sum / dataArray.length);
            const normalizedLevel = Math.min(1, rms / 128);

            setAudioLevels((prev) => ({ ...prev, [selfId]: normalizedLevel }));

            // Emit to others (only if level > threshold)
            if (normalizedLevel > 0.05) {
                socket.emit("audio_level", {
                    roomId,
                    speakerId: selfId,
                    level: normalizedLevel,
                });
            }

            animationFrameRef.current = requestAnimationFrame(update);
        };

        update();
    }, [selfId, roomId]);

    const startAudio = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                },
                video: false,
            });

            streamRef.current = stream;

            // Setup audio analyser
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);
            analyserRef.current.fftSize = 256;
            analyserRef.current.smoothingTimeConstant = 0.8;

            // Start monitoring
            monitorAudioLevel();

            return stream;
        } catch (err) {
            console.error("Audio error:", err);

            if (err.name === "NotAllowedError") {
                toast.error("Microphone access denied. Please allow microphone access.");
            } else if (err.name === "NotFoundError") {
                toast.error("No microphone found. Please connect a microphone.");
            } else {
                toast.error("Failed to access microphone");
            }

            return null;
        }
    };



    // ============================================
    // GO LIVE
    // ============================================
    const goLive = async () => {
        setIsConnecting(true);

        const stream = await startAudio();
        if (!stream) {
            setIsConnecting(false);
            return;
        }

        try {


            await api.post("/live/start", {
                title: streamTitle,
                category: streamCategory,
                roomId,
                type: "audio",
                hostId: selfId,
                hostUsername: currentUser?.username,
                hostAvatar: currentUser?.avatar,
            });

            socket.emit("start_audio_live", {
                roomId,
                host: currentUser,
                title: streamTitle,
                category: streamCategory,
            });

            setSpeakers([{ ...currentUser, isHost: true }]);
            setIsLive(true);



            durationIntervalRef.current = setInterval(() => {
                setStreamDuration((prev) => prev + 1);
            }, 1000);

            toast.success("You're live! 🎙️");
        } catch (err) {
            console.error("Start stream error:", err);
            toast.error(err.response?.data?.message || "Failed to start audio stream");
            cleanup();
        } finally {
            setIsConnecting(false);
        }
    };

    // ============================================
    // END LIVE
    // ============================================
    const endLive = async () => {
        if (!window.confirm("Are you sure you want to end the stream?")) return;

        try {
            await api.post(`/live/${roomId}/end`);
        } catch (err) {
            console.error("End stream error:", err);
        }

        socket.emit("end_audio_live", { roomId });
        cleanup();
        onEnd?.();
    };



    // ============================================
    // TOGGLE MUTE
    // ============================================
    const toggleMute = () => {
        if (streamRef.current) {
            const audioTrack = streamRef.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setIsMuted(!audioTrack.enabled);

                socket.emit("speaker_muted", {
                    roomId,
                    speakerId: selfId,
                    muted: !audioTrack.enabled,
                });

                toast(audioTrack.enabled ? "Microphone on 🎤" : "Microphone muted 🔇");
            }
        }
    };

    // ============================================
    // CHAT
    // ============================================
    const sendMessage = useCallback(
        (e) => {
            e.preventDefault();
            if (!chatInput.trim()) return;

            socket.emit("chat_message", {
                roomId,
                username: currentUser?.username,
                userId: selfId,
                text: chatInput.trim(),
                timestamp: new Date().toISOString(),
            });

            setChatInput("");
        },
        [chatInput, roomId, currentUser, selfId]
    );

    // Auto scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat]);

    // ============================================
    // FORMAT HELPERS
    // ============================================
    const formatDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
        }
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const hostUser = speakers.find((s) => s.isHost) || speakers[0] || null;

    // ============================================
    // TAP-LIKE HANDLER
    // ============================================
    const handleTapLike = (event) => {
        if (!isLive) return;

        const containerRect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - containerRect.left) / containerRect.width) * 100;
        const y = ((event.clientY - containerRect.top) / containerRect.height) * 100;

        const id = Date.now() + Math.random();
        setTapHearts((prev) => [...prev, { id, left: x, top: y }]);
        setTimeout(() => {
            setTapHearts((prev) => prev.filter((h) => h.id !== id));
        }, 800);

        socket.emit("audio_like", { roomId, userId: selfId });
    };

    // ============================================
    // PLAYLIST CONTROLS (HOST)
    // ============================================
    const currentTrack = playlist[currentTrackIndex] || null;

    const handleTogglePlaylist = () => {
        if (!isHost || !currentTrack) return;
        setIsPlaylistPlaying((prev) => !prev);
    };

    const handleNextTrack = () => {
        if (!isHost) return;
        setCurrentTrackIndex((prev) => (prev + 1) % playlist.length);
        setIsPlaylistPlaying(true);
    };

    const handlePrevTrack = () => {
        if (!isHost) return;
        setCurrentTrackIndex((prev) => (prev - 1 + playlist.length) % playlist.length);
        setIsPlaylistPlaying(true);
    };

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="min-h-screen bg-gradient-to-b from-orange-900 via-red-900 to-black text-white flex flex-col">
            {/* Hidden audio element (HOST PLAYLIST) */}
            <audio ref={audioPlayerRef} className="hidden" />

            {/* Gift overlay */}
            {overlayGift && (
                <GiftReceivedAlert
                    gift={overlayGift}
                    sender={overlaySender}
                    onComplete={() => setOverlayGift(null)}
                />
            )}

            {/* Header */}
            <div className="p-4 flex items-center gap-3 bg-black/40 border-b border-white/10 backdrop-blur-sm">
                {/* Live badge */}
                {isLive && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500 rounded-full animate-pulse">
                        <span className="w-2 h-2 bg-white rounded-full" />
                        <span className="text-sm font-bold">LIVE</span>
                    </div>
                )}

                {/* Stream info */}
                <div className="flex-1 min-w-0">
                    <h1 className="font-bold truncate">{streamTitle}</h1>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                        <span>🎙️ Audio Live</span>
                        {isLive && (
                            <>
                                <span>•</span>
                                <span>⏱️ {formatDuration(streamDuration)}</span>
                            </>
                        )}
                        <span>•</span>
                        <span className="px-2 py-0.5 bg-white/10 rounded">{streamCategory}</span>
                        {likes > 0 && (
                            <>
                                <span>•</span>
                                <span>❤️ {likes.toLocaleString()}</span>
                            </>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-white/70">
                    <div className="flex items-center gap-1">
                        <span>👁</span>
                        <span className="font-bold">{viewers}</span>
                    </div>
                    {totalGifts > 0 && (
                        <div className="flex items-center gap-1">
                            <span>🎁</span>
                            <span className="font-bold text-yellow-400">
                                💰 {totalGifts.toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Connection status */}
                <div
                    className={`w-2 h-2 rounded-full ${connectionStatus === "connected"
                            ? "bg-green-500"
                            : connectionStatus === "error"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                        }`}
                    title={`Connection: ${connectionStatus}`}
                />

                {/* End button */}
                {isHost && isLive && (
                    <button
                        onClick={endLive}
                        className="px-4 py-1.5 bg-red-500 hover:bg-red-600 rounded-full font-bold text-sm transition"
                    >
                        End Stream
                    </button>
                )}
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col lg:flex-row">
                {/* Speakers area */}
                <div className="flex-1 p-4 lg:p-6 flex flex-col">
                    {/* Audio visualization background */}
                    <div
                        className="relative flex-1 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-3xl p-6 lg:p-8 border border-white/10 overflow-hidden cursor-pointer"
                        onClick={handleTapLike}
                    >
                        {/* Animated background waves */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                            <div className="flex gap-1">
                                {[...Array(30)].map((_, i) => {
                                    const maxSpeakerLevel = Math.max(...Object.values(audioLevels), 0);
                                    const height =
                                        20 +
                                        Math.sin(i * 0.3 + Date.now() * 0.001) *
                                        40 *
                                        (0.3 + maxSpeakerLevel * 0.7);

                                    return (
                                        <div
                                            key={i}
                                            className="w-1 bg-gradient-to-t from-orange-500 to-yellow-500 rounded-full transition-all duration-150"
                                            style={{ height: `${height}px` }}
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        {/* Tap hearts animation */}
                        {tapHearts.map((heart) => (
                            <div
                                key={heart.id}
                                className="absolute text-3xl animate-bounce pointer-events-none"
                                style={{
                                    left: `${heart.left}%`,
                                    top: `${heart.top}%`,
                                    transform: "translate(-50%, -50%)",
                                }}
                            >
                                ❤️
                            </div>
                        ))}

                        {/* Gift emojis floating */}
                        {gifts.slice(-5).map((gift, i) => (
                            <div
                                key={`${gift.timestamp || i}`}
                                className="absolute animate-bounce text-4xl"
                                style={{
                                    left: `${20 + Math.random() * 60}%`,
                                    top: `${20 + Math.random() * 40}%`,
                                    animationDuration: "2s",
                                }}
                            >
                                {gift.emoji || gift.icon || "🎁"}
                            </div>
                        ))}

                        {/* Speakers grid */}
                        <div className="relative z-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 max-w-2xl mx-auto">
                            {speakers.map((speaker) => (
                                <SpeakerCard
                                    key={speaker._id}
                                    speaker={speaker}
                                    audioLevel={audioLevels[speaker._id] || 0}
                                    currentUserId={selfId}
                                    isMuted={isMuted}

                                />
                            ))}

                            {/* Empty slots */}
                            {speakers.length < 4 &&
                                [...Array(Math.max(0, 4 - speakers.length))].map((_, i) => (
                                    <div key={`empty-${i}`} className="flex flex-col items-center opacity-30">
                                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/20 flex items-center justify-center">
                                            <span className="text-2xl">🎤</span>
                                        </div>
                                        <p className="mt-2 text-sm text-white/50">Invite</p>
                                    </div>
                                ))}
                        </div>

                        {/* No speakers state */}
                        {speakers.length === 0 && !isLive && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="text-center">
                                    <span className="text-6xl mb-4 block">🎙️</span>
                                    <p className="text-white/60">Ready to go live?</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap justify-center items-center gap-4 mt-6">
                        {/* Go Live button */}
                        {isHost && !isLive && (
                            <button
                                onClick={goLive}
                                disabled={isConnecting}
                                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-600 rounded-full font-bold text-lg hover:shadow-lg hover:scale-105 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                            >
                                {isConnecting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Connecting...
                                    </>
                                ) : (
                                    <>🎙️ Go LIVE</>
                                )}
                            </button>
                        )}

                        {/* Live controls */}
                        {isLive && (
                            <>
                                {/* Mute button */}
                                <button
                                    onClick={toggleMute}
                                    className={`p-4 rounded-full transition-all ${isMuted
                                            ? "bg-red-500 hover:bg-red-600 ring-4 ring-red-500/30"
                                            : "bg-white/20 hover:bg-white/30"
                                        }`}
                                    title={isMuted ? "Unmute" : "Mute"}
                                >
                                    <span className="text-2xl">{isMuted ? "🔇" : "🎤"}</span>
                                </button>

                                {/* Volume indicator */}
                                <div className="px-4">
                                    <AudioVisualizer
                                        level={audioLevels[selfId] || 0}
                                        isActive={!isMuted && isLive}
                                    />
                                </div>

                                {/* Gift button */}
                                {hostUser && (
                                    <button
                                        onClick={() => setShowGiftPanel(true)}
                                        className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 font-semibold text-sm hover:shadow-lg hover:scale-105 transition flex items-center gap-2"
                                    >
                                        <span>🎁</span>
                                        <span>Send Gift</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* Gift panel */}
                    {isLive && showGiftPanel && hostUser && (
                        <div className="mt-6">
                            <GiftPanel
                                recipient={hostUser}
                                streamId={roomId}
                                onClose={() => setShowGiftPanel(false)}
                                onGiftSent={() => { }}
                            />
                        </div>
                    )}

                    {/* HOST PLAYLIST PANEL */}
                    {isHost && (
                        <div className="mt-6 bg-black/40 border border-white/10 rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span>🎧</span>
                                    <h3 className="font-semibold text-sm">Host Playlist</h3>
                                </div>
                                {currentTrack && (
                                    <span className="text-xs text-white/50">
                                        {currentTrackIndex + 1}/{playlist.length}
                                    </span>
                                )}
                            </div>

                            {currentTrack ? (
                                <>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-xl">
                                            {currentTrack.emoji || "🎵"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">
                                                {currentTrack.title}
                                            </p>
                                            <p className="text-xs text-white/50 truncate">
                                                {currentTrack.artist}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={handlePrevTrack}
                                            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-sm"
                                        >
                                            ⏮
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleTogglePlaylist}
                                            className="px-4 py-1.5 rounded-full bg-orange-500 hover:bg-orange-600 text-sm font-semibold"
                                        >
                                            {isPlaylistPlaying ? "⏸ Pause" : "▶ Play"}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleNextTrack}
                                            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-sm"
                                        >
                                            ⏭
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-xs text-white/50">No tracks in playlist.</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Chat sidebar */}
                <div className="w-full lg:w-80 bg-black/30 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col max-h-[400px] lg:max-h-none">
                    {/* Chat header */}
                    <div className="p-3 border-b border-white/10 flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                            💬 Live Chat
                            <span className="text-xs text-white/40">({chat.length})</span>
                        </h3>
                    </div>

                    {/* Chat messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-[200px]">
                        {chat.length === 0 ? (
                            <div className="text-white/40 text-center py-8">
                                <span className="text-3xl block mb-2">💬</span>
                                <p>No messages yet</p>
                                <p className="text-sm">Be the first to say hi!</p>
                            </div>
                        ) : (
                            <>
                                {chat.map((msg, i) => (
                                    <ChatMessage key={i} message={msg} isSystem={msg.isSystem} />
                                ))}
                                <div ref={chatEndRef} />
                            </>
                        )}
                    </div>

                    {/* Chat input */}
                    <form onSubmit={sendMessage} className="p-3 border-t border-white/10">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Say something..."
                                maxLength={200}
                                className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-sm outline-none focus:border-orange-400 transition placeholder-white/40"
                            />
                            <button
                                type="submit"
                                disabled={!chatInput.trim()}
                                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-semibold text-sm transition"
                            >
                                Send
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Footer stats (mobile) */}
            <div className="lg:hidden p-3 bg-black/40 border-t border-white/10 flex justify-around text-center">
                <div>
                    <p className="text-lg font-bold">{viewers}</p>
                    <p className="text-xs text-white/50">Viewers</p>
                </div>
                <div>
                    <p className="text-lg font-bold">{speakers.length}</p>
                    <p className="text-xs text-white/50">Speakers</p>
                </div>
                <div>
                    <p className="text-lg font-bold text-yellow-400">💰 {totalGifts.toLocaleString()}</p>
                    <p className="text-xs text-white/50">Gifts</p>
                </div>
                <div>
                    <p className="text-lg font-bold">{formatDuration(streamDuration)}</p>
                    <p className="text-xs text-white/50">Duration</p>
                </div>
            </div>
        </div>
    );
}
