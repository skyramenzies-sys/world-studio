// src/components/GiftPanel.jsx
// ULTIMATE GIFT PANEL - WORLD STUDIO LIVE EDITION 🎁
import React, { useState, useMemo, useEffect, useRef } from "react";
import { toast } from "react-hot-toast";
import { Sparkles, Coins, X, Volume2, VolumeX, Zap } from "lucide-react";
import axios from "axios";
import { io } from "socket.io-client";

/* ============================================================
   WORLD STUDIO LIVE CONFIGURATION
   ============================================================ */
const API_BASE_URL = "https://world-studio-production.up.railway.app";
const SOCKET_URL = "https://world-studio-production.up.railway.app";

// Create API instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("ws_token") || localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Socket connection (singleton)
let socket = null;
const getSocket = () => {
    if (!socket) {
        socket = io(SOCKET_URL, {
            transports: ["websocket", "polling"],
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
    }
    return socket;
};

/* ============================================================
   GIFT TIERS & DEFINITIONS
   ============================================================ */
const GIFT_TIERS = {
    common: { color: "from-gray-500 to-gray-600", glow: "#888", border: "border-gray-500/30" },
    rare: { color: "from-blue-500 to-cyan-500", glow: "#0ff", border: "border-cyan-500/30" },
    epic: { color: "from-purple-500 to-pink-500", glow: "#f0f", border: "border-purple-500/30" },
    legendary: { color: "from-yellow-500 to-orange-500", glow: "#ff0", border: "border-yellow-500/30" },
    mythic: { color: "from-red-500 to-pink-600", glow: "#f00", border: "border-red-500/30" },
};

const GIFTS = [
    { id: 1, name: "Rose", icon: "🌹", amount: 5, tier: "common", sound: "pop" },
    { id: 2, name: "Heart", icon: "❤️", amount: 10, tier: "common", sound: "pop" },
    { id: 3, name: "Kiss", icon: "💋", amount: 15, tier: "common", sound: "kiss" },
    { id: 4, name: "Star", icon: "⭐", amount: 25, tier: "rare", sound: "sparkle" },
    { id: 5, name: "Diamond", icon: "💎", amount: 50, tier: "rare", sound: "sparkle" },
    { id: 6, name: "Gift Box", icon: "🎁", amount: 75, tier: "rare", sound: "unwrap" },
    { id: 7, name: "Crown", icon: "👑", amount: 100, tier: "epic", sound: "royal" },
    { id: 8, name: "Rocket", icon: "🚀", amount: 250, tier: "epic", sound: "rocket" },
    { id: 9, name: "Fire", icon: "🔥", amount: 300, tier: "epic", sound: "fire" },
    { id: 10, name: "Trophy", icon: "🏆", amount: 500, tier: "legendary", sound: "fanfare" },
    { id: 11, name: "Lightning", icon: "⚡", amount: 750, tier: "legendary", sound: "thunder" },
    { id: 12, name: "Rainbow", icon: "🌈", amount: 1000, tier: "legendary", sound: "magic" },
    { id: 13, name: "Universe", icon: "🌌", amount: 2500, tier: "mythic", sound: "cosmic" },
    { id: 14, name: "Dragon", icon: "🐉", amount: 5000, tier: "mythic", sound: "roar" },
    { id: 15, name: "Supernova", icon: "💥", amount: 10000, tier: "mythic", sound: "explosion" },
];

/* ============================================================
   SOUND SYSTEM
   ============================================================ */
const playSound = (soundName, volume = 0.5) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        switch (soundName) {
            case "pop":
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(volume, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                osc.start(); osc.stop(ctx.currentTime + 0.1);
                break;
            case "sparkle":
                osc.type = "sine";
                osc.frequency.setValueAtTime(1200, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.15);
                gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
                osc.start(); osc.stop(ctx.currentTime + 0.15);
                break;
            case "rocket":
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(100, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.5);
                gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                osc.start(); osc.stop(ctx.currentTime + 0.5);
                break;
            case "fanfare":
            case "royal":
                [523, 659, 784].forEach((freq, i) => {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.frequency.value = freq;
                    g.gain.setValueAtTime(volume * 0.2, ctx.currentTime + i * 0.1);
                    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.3);
                    o.start(ctx.currentTime + i * 0.1);
                    o.stop(ctx.currentTime + i * 0.1 + 0.3);
                });
                break;
            case "cosmic":
            case "magic":
                for (let i = 0; i < 5; i++) {
                    const o = ctx.createOscillator();
                    const g = ctx.createGain();
                    o.connect(g); g.connect(ctx.destination);
                    o.type = "sine";
                    o.frequency.setValueAtTime(400 + i * 200, ctx.currentTime + i * 0.08);
                    o.frequency.exponentialRampToValueAtTime(800 + i * 400, ctx.currentTime + i * 0.08 + 0.2);
                    g.gain.setValueAtTime(volume * 0.15, ctx.currentTime + i * 0.08);
                    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.08 + 0.3);
                    o.start(ctx.currentTime + i * 0.08);
                    o.stop(ctx.currentTime + i * 0.08 + 0.3);
                }
                break;
            case "thunder":
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.3);
                gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
                osc.start(); osc.stop(ctx.currentTime + 0.3);
                break;
            case "explosion":
            case "roar":
                const noise = ctx.createBufferSource();
                const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < buffer.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.1));
                noise.buffer = buffer;
                const ng = ctx.createGain();
                noise.connect(ng); ng.connect(ctx.destination);
                ng.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
                ng.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
                noise.start();
                break;
            default:
                osc.frequency.setValueAtTime(600, ctx.currentTime);
                gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
                osc.start(); osc.stop(ctx.currentTime + 0.1);
        }
    } catch (e) { /* sound not supported */ }
};

/* ============================================================
   PARTICLE EXPLOSION
   ============================================================ */
function ParticleExplosion({ gift, onComplete }) {
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        const count = gift.tier === "mythic" ? 40 : gift.tier === "legendary" ? 25 : gift.tier === "epic" ? 15 : 8;
        const extras = ["✨", "⭐", "💫", "🌟"];
        const newParticles = [];

        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const distance = 50 + Math.random() * 100;
            newParticles.push({
                id: i,
                x: 50 + Math.cos(angle) * distance * 0.5,
                y: 50 + Math.sin(angle) * distance * 0.5,
                emoji: i % 3 === 0 ? extras[i % extras.length] : gift.icon,
                delay: Math.random() * 100,
                scale: 0.5 + Math.random() * 0.5,
            });
        }

        setParticles(newParticles);
        const timer = setTimeout(() => onComplete?.(), 1500);
        return () => clearTimeout(timer);
    }, [gift, onComplete]);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute animate-particle-fly"
                    style={{
                        left: `${p.x}%`,
                        top: `${p.y}%`,
                        animationDelay: `${p.delay}ms`,
                        transform: `scale(${p.scale})`,
                    }}
                >
                    <span className="text-2xl">{p.emoji}</span>
                </div>
            ))}
        </div>
    );
}

/* ============================================================
   CONFETTI
   ============================================================ */
function Confetti({ active }) {
    const pieces = useMemo(() =>
        Array.from({ length: 60 }).map((_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 2,
            duration: 2 + Math.random() * 2,
            color: ["#FFD700", "#FF6B6B", "#4ECDC4", "#A855F7", "#3B82F6", "#10B981"][i % 6],
            rotation: Math.random() * 360,
        })), []
    );

    if (!active) return null;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-40">
            {pieces.map((c) => (
                <div
                    key={c.id}
                    className="absolute w-3 h-3 animate-confetti-fall"
                    style={{
                        left: `${c.left}%`,
                        backgroundColor: c.color,
                        animationDelay: `${c.delay}s`,
                        animationDuration: `${c.duration}s`,
                        transform: `rotate(${c.rotation}deg)`,
                    }}
                />
            ))}
        </div>
    );
}

/* ============================================================
   COSMIC BACKGROUND
   ============================================================ */
function CosmicBackground({ tier }) {
    const stars = useMemo(() =>
        Array.from({ length: 50 }).map(() => ({
            top: Math.random() * 100,
            left: Math.random() * 100,
            size: Math.random() * 2 + 1,
            delay: Math.random() * 3,
        })), []
    );

    const config = GIFT_TIERS[tier] || GIFT_TIERS.common;

    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${config.color} opacity-10`} />
            {stars.map((s, i) => (
                <div
                    key={i}
                    className="absolute rounded-full bg-white animate-twinkle"
                    style={{
                        top: `${s.top}%`,
                        left: `${s.left}%`,
                        width: s.size,
                        height: s.size,
                        animationDelay: `${s.delay}s`,
                    }}
                />
            ))}
        </div>
    );
}

/* ============================================================
   GIFT RECEIVED ALERT (Export for streams)
   ============================================================ */
export function GiftReceivedAlert({ gift, sender, onComplete }) {
    const [visible, setVisible] = useState(true);
    const tier = GIFT_TIERS[gift?.tier] || GIFT_TIERS.common;

    useEffect(() => {
        playSound(gift?.sound || "sparkle", 0.6);
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onComplete?.(), 500);
        }, 4000);
        return () => clearTimeout(timer);
    }, [gift, onComplete]);

    if (!gift) return null;

    return (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] transition-all duration-500 ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-75 -translate-y-10"}`}>
            <div className={`relative bg-gradient-to-r ${tier.color} p-1 rounded-2xl shadow-2xl animate-bounce-in`}>
                <div className="bg-black/90 backdrop-blur-xl rounded-xl px-8 py-5">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <span className="text-6xl animate-wiggle">{gift.icon}</span>
                            <div className="absolute inset-0 blur-2xl opacity-60 animate-pulse" style={{ backgroundColor: tier.glow }} />
                        </div>
                        <div>
                            <p className="text-white/60 text-sm font-medium">🎁 Gift Received!</p>
                            <p className="text-white font-bold text-xl">{sender} sent <span className={`bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`}>{gift.name}</span></p>
                            <p className="text-yellow-400 font-bold text-lg">+{gift.amount.toLocaleString()} 💰</p>
                        </div>
                    </div>
                </div>
            </div>
            <ParticleExplosion gift={gift} />
            <Confetti active={gift.tier === "legendary" || gift.tier === "mythic"} />
        </div>
    );
}

/* ============================================================
   MAIN GIFT PANEL
   ============================================================ */
export default function GiftPanel({ recipient, onClose, onGiftSent, streamId }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [userBalance, setUserBalance] = useState(0);
    const [selectedGift, setSelectedGift] = useState(null);
    const [customAmount, setCustomAmount] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [showExplosion, setShowExplosion] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [selectedTier, setSelectedTier] = useState("all");
    const [recentGifts, setRecentGifts] = useState([]);
    const [comboCount, setComboCount] = useState(0);
    const [lastGiftTime, setLastGiftTime] = useState(0);

    const socketRef = useRef(null);

    // Initialize socket
    useEffect(() => {
        socketRef.current = getSocket();
        return () => {
            // Don't disconnect - it's a singleton
        };
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem("ws_currentUser");
        if (stored) {
            try {
                const user = JSON.parse(stored);
                setCurrentUser(user);
                setUserBalance(user.wallet?.balance || 0);
            } catch (e) { }
        }
    }, []);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleGift = (data) => {
            const isMe = data.recipientId === currentUser?._id || data.recipientId === currentUser?.id;
            if (isMe) {
                setUserBalance(prev => prev + (data.amount || 0));
                const gift = GIFTS.find(g => g.name === data.item) || { icon: "🎁", name: data.item, amount: data.amount, tier: "common", sound: "sparkle" };
                toast.custom((t) => (
                    <GiftReceivedAlert gift={gift} sender={data.senderUsername} onComplete={() => toast.dismiss(t.id)} />
                ), { duration: 5000 });
            }
            setRecentGifts(prev => [{ ...data, timestamp: Date.now() }, ...prev.slice(0, 9)]);
        };

        socket.on("gift_received", handleGift);
        socket.on("gift_sent", handleGift);
        return () => {
            socket.off("gift_received", handleGift);
            socket.off("gift_sent", handleGift);
        };
    }, [currentUser]);

    const filteredGifts = selectedTier === "all" ? GIFTS : GIFTS.filter(g => g.tier === selectedTier);
    const totalAmount = selectedGift?.amount || Number(customAmount) || 0;
    const canAfford = userBalance >= totalAmount;

    const handleSend = async () => {
        if (!currentUser || !recipient || totalAmount <= 0 || !canAfford) {
            toast.error(!currentUser ? "Please log in" : !recipient ? "No recipient" : totalAmount <= 0 ? "Select a gift" : "Insufficient balance");
            return;
        }

        setSending(true);

        try {
            const giftData = {
                recipientId: recipient._id || recipient.id,
                item: selectedGift?.name || "Coins",
                amount: totalAmount,
                message: message.trim(),
                streamId,
            };

            await api.post("/api/gifts", giftData);

            // Combo system
            const now = Date.now();
            if (now - lastGiftTime < 3000) {
                setComboCount(prev => prev + 1);
                if (comboCount >= 2 && soundEnabled) playSound("fanfare", 0.3);
            } else {
                setComboCount(1);
            }
            setLastGiftTime(now);

            if (soundEnabled && selectedGift) playSound(selectedGift.sound || "pop", 0.5);

            if (selectedGift?.tier === "mythic" || selectedGift?.tier === "legendary") {
                setShowExplosion(true);
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 4000);
            } else if (selectedGift?.tier === "epic") {
                setShowExplosion(true);
            }

            socketRef.current?.emit("gift_sent", {
                ...giftData,
                senderUsername: currentUser.username,
                senderAvatar: currentUser.avatar,
                recipientUsername: recipient.username,
                icon: selectedGift?.icon || "💰",
                tier: selectedGift?.tier || "common",
            });

            setUserBalance(prev => prev - totalAmount);

            toast.success(
                <div className="flex items-center gap-2">
                    <span className="text-2xl">{selectedGift?.icon || "🎁"}</span>
                    <span>Sent to {recipient.username}!</span>
                    {comboCount > 1 && <span className="text-orange-400 font-bold">x{comboCount} COMBO!</span>}
                </div>
            );

            setSelectedGift(null);
            setCustomAmount("");
            setMessage("");
            onGiftSent?.({ ...giftData, icon: selectedGift?.icon || "💰", tier: selectedGift?.tier });

        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to send gift");
        } finally {
            setSending(false);
            setTimeout(() => setShowExplosion(false), 1500);
        }
    };

    if (!recipient) {
        return (
            <div className="relative overflow-hidden rounded-2xl border border-purple-800/60 p-6 bg-gradient-to-br from-black via-gray-900 to-purple-900">
                <CosmicBackground tier="common" />
                <div className="relative z-10 text-center py-8">
                    <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-pulse" />
                    <p className="text-purple-300">Select a user to send them a gift</p>
                </div>
            </div>
        );
    }

    const tierConfig = GIFT_TIERS[selectedGift?.tier || "common"];

    return (
        <div className={`relative overflow-hidden rounded-2xl border ${tierConfig.border} p-5 bg-gradient-to-br from-black via-gray-900 to-purple-900 shadow-2xl transition-all duration-300 ${showExplosion ? "scale-105 ring-4 ring-purple-500" : ""}`}>
            <CosmicBackground tier={selectedGift?.tier || "common"} />
            <Confetti active={showConfetti} />
            {showExplosion && selectedGift && <ParticleExplosion gift={selectedGift} onComplete={() => setShowExplosion(false)} />}

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-4">
                <h3 className="text-xl font-extrabold text-purple-200 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                    Send Gift
                    {comboCount > 1 && <span className="text-sm bg-orange-500 text-white px-2 py-0.5 rounded-full animate-bounce">x{comboCount}</span>}
                </h3>
                <div className="flex gap-2">
                    <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20">
                        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </button>
                    {onClose && <button onClick={onClose} className="p-2 rounded-lg bg-white/10 hover:bg-white/20"><X className="w-4 h-4" /></button>}
                </div>
            </div>

            {/* Recipient */}
            <div className="relative z-10 flex items-center gap-3 mb-4 bg-black/40 rounded-xl p-3 border border-white/10">
                <img src={recipient.avatar || "/defaults/default-avatar.png"} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-purple-500" onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }} />
                <div>
                    <p className="text-white/60 text-xs">Sending to</p>
                    <p className="text-white font-bold">{recipient.username}</p>
                </div>
            </div>

            {/* Balance */}
            <div className="relative z-10 mb-4 bg-gradient-to-r from-yellow-500/20 to-amber-500/20 rounded-xl p-3 border border-yellow-500/30">
                <div className="flex items-center justify-between">
                    <span className="text-yellow-400/80 text-sm">Balance</span>
                    <span className="text-yellow-400 font-bold text-lg">💰 {userBalance.toLocaleString()}</span>
                </div>
            </div>

            {/* Tier Filter */}
            <div className="relative z-10 flex gap-1 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                {[{ id: "all", label: "All" }, { id: "common", label: "🌹" }, { id: "rare", label: "💎" }, { id: "epic", label: "👑" }, { id: "legendary", label: "🏆" }, { id: "mythic", label: "🌌" }].map((t) => (
                    <button key={t.id} onClick={() => setSelectedTier(t.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${selectedTier === t.id ? `bg-gradient-to-r ${GIFT_TIERS[t.id]?.color || "from-purple-500 to-pink-500"} text-white` : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Gifts Grid */}
            <div className="relative z-10 grid grid-cols-3 gap-2 mb-4 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {filteredGifts.map((gift) => {
                    const tc = GIFT_TIERS[gift.tier];
                    const afford = userBalance >= gift.amount;
                    return (
                        <button
                            key={gift.id}
                            onClick={() => { if (afford) { setSelectedGift(gift); setCustomAmount(""); if (soundEnabled) playSound("pop", 0.2); } }}
                            disabled={!afford}
                            className={`relative p-2.5 rounded-xl border-2 transition-all ${selectedGift?.id === gift.id ? `bg-gradient-to-br ${tc.color} border-white scale-105 shadow-lg shadow-purple-500/30` : afford ? "bg-black/60 border-white/10 hover:border-white/30" : "bg-black/30 border-gray-800 opacity-40 cursor-not-allowed"}`}
                        >
                            {gift.tier !== "common" && <div className={`absolute top-1 right-1 w-2 h-2 rounded-full bg-gradient-to-r ${tc.color}`} />}
                            <span className="text-2xl flex justify-center">{gift.icon}</span>
                            <div className="text-[10px] text-white/80 text-center font-bold truncate mt-1">{gift.name}</div>
                            <div className="text-[10px] text-yellow-400 text-center">{gift.amount} 💰</div>
                        </button>
                    );
                })}
            </div>

            {/* Custom & Message */}
            <div className="relative z-10 space-y-2">
                <input type="number" min="1" placeholder="Custom amount" value={customAmount} onChange={(e) => { setCustomAmount(e.target.value); setSelectedGift(null); }} className="w-full bg-black/60 border border-purple-700/50 rounded-xl px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500" />
                <input type="text" placeholder="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={100} className="w-full bg-black/60 border border-purple-700/50 rounded-xl px-4 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-purple-500" />
            </div>

            {/* Send */}
            <div className="relative z-10 flex items-center justify-between pt-4 mt-3 border-t border-purple-800/50">
                <div>
                    <span className="text-purple-300 text-sm">Total: </span>
                    <span className={`font-bold text-lg ${canAfford ? "text-yellow-400" : "text-red-400"}`}>{totalAmount.toLocaleString()} 💰</span>
                    {!canAfford && totalAmount > 0 && <p className="text-red-400 text-xs">Not enough coins</p>}
                </div>
                <button onClick={handleSend} disabled={!recipient || !currentUser || totalAmount <= 0 || !canAfford || sending} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-white font-bold transition-all ${(!recipient || !currentUser || totalAmount <= 0 || !canAfford || sending) ? "bg-gray-700 cursor-not-allowed opacity-50" : `bg-gradient-to-r ${tierConfig.color} hover:shadow-lg hover:scale-105`}`}>
                    {sending ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Sending...</> : <><Zap className="w-5 h-5" /> Send</>}
                </button>
            </div>

            {/* Recent */}
            {recentGifts.length > 0 && (
                <div className="relative z-10 mt-4 pt-3 border-t border-purple-800/50">
                    <p className="text-xs text-purple-400 mb-2">Recent</p>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                        {recentGifts.slice(0, 5).map((g, i) => (
                            <div key={i} className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 text-xs whitespace-nowrap animate-fade-in">
                                <span>{g.icon}</span>
                                <span className="text-white/50">{g.senderUsername?.slice(0, 6)}</span>
                                <span className="text-purple-400">→</span>
                                <span className="text-white/50">{g.recipientUsername?.slice(0, 6)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes twinkle { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                @keyframes particle-fly { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0) translateY(-50px); } }
                @keyframes confetti-fall { 0% { transform: translateY(-10px) rotate(0); opacity: 1; } 100% { transform: translateY(400px) rotate(720deg); opacity: 0; } }
                @keyframes bounce-in { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
                @keyframes wiggle { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }
                @keyframes fade-in { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
                .animate-twinkle { animation: twinkle 2s ease-in-out infinite; }
                .animate-particle-fly { animation: particle-fly 1.5s ease-out forwards; }
                .animate-confetti-fall { animation: confetti-fall 3s ease-out forwards; }
                .animate-bounce-in { animation: bounce-in 0.5s ease-out; }
                .animate-wiggle { animation: wiggle 0.5s ease-in-out infinite; }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-thin::-webkit-scrollbar { width: 4px; }
                .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.5); border-radius: 2px; }
            `}</style>
        </div>
    );
}