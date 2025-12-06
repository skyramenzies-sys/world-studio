// src/components/GiftShop.jsx
// ULTIMATE FUTURISTIC GIFT SHOP - WORLD STUDIO LIVE EDITION 🎁⚡

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
    Gift,
    Search,
    Send,
    Trophy,
    Heart,
    Crown,
    Zap,
    TrendingUp,
    Users,
    Volume2,
    VolumeX,
} from "lucide-react";
import axios from "axios";
import { io } from "socket.io-client";
import { GiftReceivedAlert } from "./GiftPanel";

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
    common: {
        color: "from-gray-500 to-gray-600",
        glow: "#888",
        label: "Common",
        emoji: "⚪",
    },
    rare: {
        color: "from-blue-500 to-cyan-500",
        glow: "#0ff",
        label: "Rare",
        emoji: "🔵",
    },
    epic: {
        color: "from-purple-500 to-pink-500",
        glow: "#f0f",
        label: "Epic",
        emoji: "🟣",
    },
    legendary: {
        color: "from-yellow-500 to-orange-500",
        glow: "#ff0",
        label: "Legendary",
        emoji: "🟡",
    },
    mythic: {
        color: "from-red-500 to-pink-600",
        glow: "#f00",
        label: "Mythic",
        emoji: "🔴",
    },
    cyber: {
        color: "from-cyan-500 to-blue-600",
        glow: "#0ff",
        label: "Cyber",
        emoji: "🧬",
    },
    cosmic: {
        color: "from-indigo-500 to-purple-600",
        glow: "#aaf",
        label: "Cosmic",
        emoji: "🌌",
    },
    skyra: {
        color: "from-yellow-400 to-pink-500",
        glow: "#ffb300",
        label: "SKYRA",
        emoji: "🛡️",
    },
};

/* ============================================================
   FUTURISTIC GIFTS + LOOTBOXES + MULTIPLIERS + SKYRA MEGA GIFTS
   ============================================================ */
const GIFTS = [
    /* ===========================
       COMMON
    =========================== */
    {
        id: 1,
        name: "Neon Spark",
        icon: "✨",
        price: 5,
        tier: "common",
        description: "Tiny flash of energy",
    },
    {
        id: 2,
        name: "Pixel Heart",
        icon: "💟",
        price: 10,
        tier: "common",
        description: "Retro digital love",
    },
    {
        id: 3,
        name: "Hologram Rose",
        icon: "🌹",
        price: 15,
        tier: "common",
        description: "Glowing virtual rose",
    },
    {
        id: 4,
        name: "Glow Stick",
        icon: "🧪",
        price: 20,
        tier: "common",
        description: "Party lab vibes",
    },

    /* ===========================
       RARE
    =========================== */
    {
        id: 10,
        name: "Crystal Chip",
        icon: "💠",
        price: 100,
        tier: "rare",
        description: "Energy-coded crystal",
    },
    {
        id: 11,
        name: "Laser Wave",
        icon: "📡",
        price: 150,
        tier: "rare",
        description: "Send a shockwave",
    },

    /* ===========================
       EPIC
    =========================== */
    {
        id: 20,
        name: "Cyber Panther",
        icon: "🐆",
        price: 300,
        tier: "epic",
        description: "Silent neon guardian",
    },
    {
        id: 21,
        name: "Teleport Gate",
        icon: "🌀",
        price: 750,
        tier: "epic",
        description: "Warp into the stream",
    },

    /* ===========================
       LEGENDARY
    =========================== */
    {
        id: 30,
        name: "Aurora Horizon",
        icon: "🌈",
        price: 2500,
        tier: "legendary",
        description: "Sky lights explosion",
    },
    {
        id: 31,
        name: "Digital Palace",
        icon: "🏰",
        price: 4000,
        tier: "legendary",
        description: "Royal digital fortress",
    },

    /* ===========================
       MYTHIC
    =========================== */
    {
        id: 40,
        name: "Phoenix Reboot",
        icon: "🐦‍🔥",
        price: 6000,
        tier: "mythic",
        description: "Revives the energy",
    },
    {
        id: 41,
        name: "Dragon Core",
        icon: "🐉",
        price: 8000,
        tier: "mythic",
        description: "Unleash dragon power",
    },

    /* ===========================
       CYBER
    =========================== */
    {
        id: 50,
        name: "AI Core",
        icon: "🤖",
        price: 3000,
        tier: "cyber",
        description: "Summon an AI companion",
    },
    {
        id: 51,
        name: "Neon Chip Rain",
        icon: "💾",
        price: 6500,
        tier: "cyber",
        description: "Matrix chip rain",
    },

    /* ===========================
       COSMIC
    =========================== */
    {
        id: 60,
        name: "Galaxy Orb",
        icon: "🌌",
        price: 15000,
        tier: "cosmic",
        description: "Mini galaxy spinning",
    },
    {
        id: 61,
        name: "Planet Drop",
        icon: "🪐",
        price: 30000,
        tier: "cosmic",
        description: "Drop an entire planet",
    },

    /* ===========================
       SKYRA ULTRA GIFTS
    =========================== */
    {
        id: 70,
        name: "SKYRA Jetpack",
        icon: "🧥",
        price: 50000,
        tier: "skyra",
        description: "Equip with SKYRA gear",
    },
    {
        id: 71,
        name: "AIRPATH Beam",
        icon: "🛰️",
        price: 65000,
        tier: "skyra",
        description: "Satellite beam effect",
    },
    {
        id: 72,
        name: "Commander Badge",
        icon: "🎖️",
        price: 80000,
        tier: "skyra",
        description: "Crown Commander status",
    },
    {
        id: 73,
        name: "SKYRA Universe",
        icon: "✨",
        price: 100000,
        tier: "skyra",
        description: "Immersive full-universe event",
    },

    /* ============================================================
       MULTIPLIER GIFTS (GAMBLE STYLE)
       ============================================================ */
    {
        id: 100,
        name: "x2 Multiplier",
        icon: "✖️2",
        price: 2000,
        tier: "cyber",
        description: "Double your gift power",
        multiplier: 2,
    },
    {
        id: 101,
        name: "x5 Multiplier",
        icon: "✖️5",
        price: 5000,
        tier: "epic",
        description: "Fivefold impact",
        multiplier: 5,
    },
    {
        id: 102,
        name: "x10 Multiplier",
        icon: "✖️10",
        price: 12000,
        tier: "mythic",
        description: "Ten times explosion",
        multiplier: 10,
    },
    {
        id: 103,
        name: "x25 Multiplier",
        icon: "✖️25",
        price: 30000,
        tier: "legendary",
        description: "Twenty-five power surge",
        multiplier: 25,
    },
    {
        id: 104,
        name: "x100 SKYRA Multiplier",
        icon: "💯",
        price: 80000,
        tier: "skyra",
        description: "Insane 100x gift multiplier",
        multiplier: 100,
    },

    /* ============================================================
       LOOTBOXES (GAMBLE / RANDOM GIFTS)
       ============================================================ */
    {
        id: 200,
        name: "Bronze Loot Box",
        icon: "📦",
        price: 500,
        tier: "common",
        lootbox: true,
    },
    {
        id: 201,
        name: "Silver Loot Box",
        icon: "📦",
        price: 2000,
        tier: "rare",
        lootbox: true,
    },
    {
        id: 202,
        name: "Gold Loot Box",
        icon: "📦",
        price: 5000,
        tier: "epic",
        lootbox: true,
    },
    {
        id: 203,
        name: "Diamond Loot Box",
        icon: "💎",
        price: 15000,
        tier: "legendary",
        lootbox: true,
    },
    {
        id: 204,
        name: "SKYRA Quantum Box",
        icon: "⚡",
        price: 75000,
        tier: "skyra",
        lootbox: true,
        quantum: true,
    },
];

/* Lootbox config voor random resultaat (client-side FX) */
const LOOTBOX_CONFIG = {
    "Bronze Loot Box": { tiers: ["common", "rare"], label: "Bronze", bonusChance: 0.25 },
    "Silver Loot Box": { tiers: ["common", "rare", "epic"], label: "Silver", bonusChance: 0.35 },
    "Gold Loot Box": { tiers: ["rare", "epic", "legendary"], label: "Gold", bonusChance: 0.45 },
    "Diamond Loot Box": { tiers: ["epic", "legendary", "mythic", "cyber"], label: "Diamond", bonusChance: 0.55 },
    "SKYRA Quantum Box": {
        tiers: ["epic", "legendary", "mythic", "cyber", "cosmic", "skyra"],
        label: "SKYRA Quantum",
        bonusChance: 0.7,
    },
};

/* ============================================================
   SOUND SYSTEM
   ============================================================ */
const playSound = (type, volume = 0.3) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "select") {
            osc.frequency.setValueAtTime(600, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(
                800,
                ctx.currentTime + 0.1
            );
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(
                0.01,
                ctx.currentTime + 0.1
            );
            osc.start();
            osc.stop(ctx.currentTime + 0.1);
        } else if (type === "success") {
            [523, 659, 784].forEach((freq, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g);
                g.connect(ctx.destination);
                o.frequency.value = freq;
                g.gain.setValueAtTime(volume, ctx.currentTime + i * 0.1);
                g.gain.exponentialRampToValueAtTime(
                    0.01,
                    ctx.currentTime + i * 0.1 + 0.2
                );
                o.start(ctx.currentTime + i * 0.1);
                o.stop(ctx.currentTime + i * 0.1 + 0.2);
            });
        } else if (type === "lootbox") {
            osc.frequency.setValueAtTime(300, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(
                1200,
                ctx.currentTime + 0.3
            );
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(
                0.01,
                ctx.currentTime + 0.3
            );
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) {
        // ignore
    }
};

/* ============================================================
   ANIMATED BACKGROUND
   ============================================================ */
function AnimatedBackground() {
    const elements = useMemo(
        () =>
            [...GIFTS.slice(0, 15)].map((g) => ({
                ...g,
                top: Math.random() * 100,
                left: Math.random() * 100,
                delay: Math.random() * 10,
                duration: 15 + Math.random() * 20,
                size: 1 + Math.random() * 1.5,
            })),
        []
    );

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-black" />
            {elements.map((e, i) => (
                <div
                    key={i}
                    className="absolute opacity-10 animate-float-random"
                    style={{
                        top: `${e.top}%`,
                        left: `${e.left}%`,
                        fontSize: `${e.size}rem`,
                        animationDelay: `${e.delay}s`,
                        animationDuration: `${e.duration}s`,
                    }}
                >
                    {e.icon}
                </div>
            ))}
        </div>
    );
}

/* ============================================================
   GIFT CARD
   ============================================================ */
function GiftCard({ gift, selected, onSelect, affordable, soundEnabled }) {
    const tier = GIFT_TIERS[gift.tier] || GIFT_TIERS.common;
    const isLootbox = gift.lootbox;
    const isMultiplier = !!gift.multiplier;

    return (
        <button
            onClick={() => {
                if (affordable) {
                    onSelect(gift);
                    if (soundEnabled) playSound(isLootbox ? "lootbox" : "select");
                }
            }}
            disabled={!affordable}
            className={`
                relative p-4 rounded-2xl border-2 transition-all duration-300 group
                ${selected
                    ? `bg-gradient-to-br ${tier.color} border-white scale-105 shadow-xl shadow-purple-500/30`
                    : affordable
                        ? "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10 hover:scale-102"
                        : "bg-black/30 border-gray-800 opacity-40 cursor-not-allowed"
                }
            `}
        >
            {/* Tier badge */}
            <div
                className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r ${tier.color} text-white shadow-lg ${selected ? "scale-110" : ""
                    }`}
            >
                {tier.emoji} {tier.label}
            </div>

            {/* Lootbox / Multiplier label */}
            {isLootbox && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/70 text-[9px] text-yellow-300 uppercase tracking-wide">
                    Loot Box
                </div>
            )}
            {isMultiplier && !isLootbox && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/70 text-[9px] text-cyan-300 uppercase tracking-wide">
                    Multiplier
                </div>
            )}

            {/* Glow effect on hover */}
            <div
                className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity bg-gradient-to-br ${tier.color} blur-xl`}
            />

            {/* Icon */}
            <div className="relative">
                <span
                    className={`text-5xl block transition-transform ${selected ? "animate-bounce" : "group-hover:scale-110"
                        }`}
                >
                    {gift.icon}
                </span>
            </div>

            {/* Info */}
            <div className="mt-3 text-center relative">
                <p className="font-bold text-white">{gift.name}</p>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">
                    {gift.description}
                </p>
                <p
                    className={`text-lg font-bold mt-2 ${affordable ? "text-yellow-400" : "text-red-400"
                        }`}
                >
                    {gift.price.toLocaleString()} 💰
                </p>
            </div>
        </button>
    );
}

/* ============================================================
   LEADERBOARD CARD
   ============================================================ */
function LeaderboardCard({ entry, rank, type }) {
    const medals = ["🥇", "🥈", "🥉"];
    const isTop3 = rank < 3;

    return (
        <div
            className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isTop3
                    ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30"
                    : "bg-white/5 border border-white/10"
                }`}
        >
            <div className="text-2xl w-10 text-center">
                {isTop3 ? (
                    medals[rank]
                ) : (
                    <span className="text-white/40">#{rank + 1}</span>
                )}
            </div>
            <img
                src={
                    entry._id?.avatar ||
                    entry.user?.avatar ||
                    "/defaults/default-avatar.png"
                }
                alt=""
                className={`w-12 h-12 rounded-full object-cover border-2 ${isTop3 ? "border-yellow-500" : "border-white/20"
                    }`}
                onError={(e) => {
                    e.target.src = "/defaults/default-avatar.png";
                }}
            />
            <div className="flex-1 min-w-0">
                <p
                    className={`font-bold truncate ${isTop3 ? "text-yellow-400" : "text-white"
                        }`}
                >
                    {entry._id?.username ||
                        entry.user?.username ||
                        "Anonymous"}
                </p>
                <p className="text-sm text-white/50">
                    {entry.count?.toLocaleString() || 0} gifts
                </p>
            </div>
            <div className="text-right">
                <p className="text-yellow-400 font-bold">
                    {entry.total?.toLocaleString() || 0} 💰
                </p>
                <p className="text-xs text-white/40">
                    {type === "senders" ? "sent" : "received"}
                </p>
            </div>
        </div>
    );
}

/* ============================================================
   HISTORY ITEM
   ============================================================ */
function HistoryItem({ item, type }) {
    const gift =
        GIFTS.find((g) => g.name === item.item) || {
            icon: "🎁",
            tier: "common",
            price: 1,
        };
    const tier = GIFT_TIERS[gift.tier] || GIFT_TIERS.common;

    return (
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
            <div
                className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center`}
            >
                <span className="text-3xl">
                    {gift.icon || item.itemIcon || "🎁"}
                </span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-bold text-white">{item.item}</p>
                    {item.amount > 1 && (
                        <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full">
                            x{item.amount}
                        </span>
                    )}
                </div>
                <p className="text-sm text-white/50">
                    {type === "sent" ? "To: " : "From: "}
                    <span className="text-white/70">
                        {type === "sent"
                            ? item.recipient?.username
                            : item.sender?.username || "Unknown"}
                    </span>
                </p>
                {item.message && (
                    <p className="text-xs text.white/40 truncate mt-1">
                        "{item.message}"
                    </p>
                )}
            </div>
            <div className="text-right">
                <p className="text-yellow-400 font-bold">
                    {(
                        (item.amount || 1) *
                        (gift.price || 1)
                    ).toLocaleString()}{" "}
                    💰
                </p>
                <p className="text-xs text-white/40">
                    {new Date(item.createdAt).toLocaleDateString()}
                </p>
            </div>
        </div>
    );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function GiftShop() {
    const navigate = useNavigate();

    const [currentUser, setCurrentUser] = useState(null);
    const [userBalance, setUserBalance] = useState(0);
    const [recipient, setRecipient] = useState(null);
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedGift, setSelectedGift] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [sentGifts, setSentGifts] = useState([]);
    const [receivedGifts, setReceivedGifts] = useState([]);
    const [topSenders, setTopSenders] = useState([]);
    const [topReceivers, setTopReceivers] = useState([]);
    const [activeTab, setActiveTab] = useState("send");
    const [filterTier, setFilterTier] = useState("all");
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [stats, setStats] = useState({
        totalSent: 0,
        totalReceived: 0,
        uniqueRecipients: 0,
    });
    const [lootboxResult, setLootboxResult] = useState(null);

    const socketRef = React.useRef(null);

    // Initialize socket
    useEffect(() => {
        socketRef.current = getSocket();
        return () => {
            // Don't disconnect - singleton
        };
    }, []);

    // Load user
    useEffect(() => {
        const stored = localStorage.getItem("ws_currentUser");
        if (stored) {
            try {
                const user = JSON.parse(stored);
                setCurrentUser(user);
                setUserBalance(user.wallet?.balance || 0);
            } catch (e) {
                // ignore
            }
        }
    }, []);

    // Socket listeners (gift received)
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleGift = (data) => {
            if (
                data.recipientId === currentUser?._id ||
                data.recipientId === currentUser?.id
            ) {
                setUserBalance((prev) => prev + (data.amount || 0));
                const gift = GIFTS.find((g) => g.name === data.item);
                toast.custom(
                    (t) => (
                        <GiftReceivedAlert
                            gift={{ ...gift, amount: data.amount, sound: "sparkle" }}
                            sender={data.senderUsername}
                            onComplete={() => toast.dismiss(t.id)}
                        />
                    ),
                    { duration: 5000 }
                );
                fetchHistory();
            }
        };

        socket.on("gift_received", handleGift);
        socket.on("gift_sent", handleGift);
        return () => {
            socket.off("gift_received", handleGift);
            socket.off("gift_sent", handleGift);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // User search
    useEffect(() => {
        if (userSearch.length < 2) {
            setUserResults([]);
            return;
        }

        setSearching(true);
        const delay = setTimeout(async () => {
            try {
                const res = await api.get(
                    `/api/users?q=${encodeURIComponent(
                        userSearch
                    )}&limit=8`
                );
                const users = res.data.users || res.data || [];
                setUserResults(
                    users.filter(
                        (u) =>
                            u._id !== currentUser?._id &&
                            u._id !== currentUser?.id
                    )
                );
            } catch (e) {
                setUserResults([]);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [userSearch, currentUser]);

    // Fetch history
    const fetchHistory = useCallback(async () => {
        if (!currentUser) return;
        try {
            const [sent, received, senders, receivers] =
                await Promise.allSettled([
                    api.get("/api/gifts/sent"),
                    api.get("/api/gifts/received"),
                    api.get("/api/gifts/leaderboard/senders"),
                    api.get("/api/gifts/leaderboard/receivers"),
                ]);

            if (sent.status === "fulfilled")
                setSentGifts(sent.value.data || []);
            if (received.status === "fulfilled")
                setReceivedGifts(received.value.data || []);
            if (senders.status === "fulfilled")
                setTopSenders(senders.value.data || []);
            if (receivers.status === "fulfilled")
                setTopReceivers(receivers.value.data || []);

            // Calculate stats
            const sentData =
                sent.status === "fulfilled" ? sent.value.data : [];
            const receivedData =
                received.status === "fulfilled"
                    ? received.value.data
                    : [];
            setStats({
                totalSent: sentData.reduce((sum, g) => {
                    const gift =
                        GIFTS.find((x) => x.name === g.item) || {};
                    return (
                        sum +
                        (g.amount || 1) * (gift.price || 1)
                    );
                }, 0),
                totalReceived: receivedData.reduce((sum, g) => {
                    const gift =
                        GIFTS.find((x) => x.name === g.item) || {};
                    return (
                        sum +
                        (g.amount || 1) * (gift.price || 1)
                    );
                }, 0),
                uniqueRecipients: new Set(
                    sentData.map((g) => g.recipient?._id)
                ).size,
            });
        } catch (e) {
            // ignore
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) fetchHistory();
    }, [currentUser, fetchHistory]);

    // Filtered gifts
    const filteredGifts =
        filterTier === "all"
            ? GIFTS
            : GIFTS.filter((g) => g.tier === filterTier);

    const totalCost = selectedGift
        ? selectedGift.price * quantity
        : 0;
    const canAfford = userBalance >= totalCost;

    // Lootbox roll (client-side FX)
    const openLootbox = useCallback(
        (boxGift) => {
            const cfg = LOOTBOX_CONFIG[boxGift.name];
            if (!cfg) {
                setLootboxResult({
                    box: boxGift,
                    bonusGift: null,
                    multiplier: 1,
                    isJackpot: false,
                });
                return;
            }

            const pool = GIFTS.filter(
                (g) =>
                    !g.lootbox &&
                    g.id < 200 &&
                    cfg.tiers.includes(g.tier)
            );
            if (pool.length === 0) {
                setLootboxResult({
                    box: boxGift,
                    bonusGift: null,
                    multiplier: 1,
                    isJackpot: false,
                });
                return;
            }

            const bonusGift =
                pool[Math.floor(Math.random() * pool.length)];

            // Simple gamble feeling via multiplier
            const roll = Math.random();
            let multiplier = 1;
            if (roll > 0.97) multiplier = 10; // ~3%
            else if (roll > 0.9) multiplier = 5; // ~7%
            else if (roll > 0.75) multiplier = 3; // ~15%
            else multiplier = 1;

            const isJackpot =
                multiplier >= 10 ||
                (boxGift.quantum && multiplier >= 5);

            setLootboxResult({
                box: boxGift,
                bonusGift,
                multiplier,
                isJackpot,
            });

            if (soundEnabled) playSound("lootbox", 0.4);
        },
        [soundEnabled]
    );

    // Send gift (incl. lootboxes & multipliers UX)
    const handleSendGift = async () => {
        if (!currentUser || !recipient || !selectedGift || !canAfford) {
            toast.error(
                !currentUser
                    ? "Please log in"
                    : !recipient
                        ? "Select recipient"
                        : !selectedGift
                            ? "Select gift"
                            : "Insufficient balance"
            );
            return;
        }

        const isLootbox = selectedGift.lootbox === true;

        setSending(true);
        try {
            await api.post("/api/gifts", {
                recipientId: recipient._id,
                item: selectedGift.name,
                amount: quantity,
                message: message.trim(),
            });

            if (soundEnabled) playSound("success");

            socketRef.current?.emit("gift_sent", {
                recipientId: recipient._id,
                recipientUsername: recipient.username,
                senderUsername: currentUser.username,
                item: selectedGift.name,
                amount: quantity * selectedGift.price,
                icon: selectedGift.icon,
                tier: selectedGift.tier,
            });

            setUserBalance((prev) => prev - totalCost);

            toast.success(
                <div className="flex items-center gap-2">
                    <span className="text-3xl">
                        {selectedGift.icon}
                    </span>
                    <div>
                        <p className="font-bold">Gift Sent!</p>
                        <p className="text-sm opacity-80">
                            {quantity}x {selectedGift.name} to{" "}
                            {recipient.username}
                        </p>
                    </div>
                </div>
            );

            // Lootbox FX (gamble feeling)
            if (isLootbox) {
                openLootbox(selectedGift);
            }

            setRecipient(null);
            setUserSearch("");
            setSelectedGift(null);
            setQuantity(1);
            setMessage("");
            fetchHistory();
        } catch (e) {
            toast.error(
                e.response?.data?.message || "Failed to send gift"
            );
        } finally {
            setSending(false);
        }
    };

    // Not logged in
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-4">
                <AnimatedBackground />
                <div className="relative z-10 bg.white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <Gift className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">
                        Gift Shop
                    </h2>
                    <p className="text-white/60 mb-8">
                        Please log in to send and receive gifts
                    </p>
                    <button
                        onClick={() => navigate("/login")}
                        className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-white font-bold hover:shadow-lg hover:scale-105 transition-all"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white">
            <AnimatedBackground />

            <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-8">
                {/* Lootbox result overlay */}
                {lootboxResult && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
                        <div className="bg-gradient-to-br from-purple-700 to-blue-700 p-6 rounded-3xl border border-white/20 text-center max-w-sm mx-4 animate-fade-in">
                            <p className="text-xs text-white/60 mb-1">
                                Lootbox Opened
                            </p>
                            <h3 className="text-xl font-bold mb-3">
                                {lootboxResult.box.icon}{" "}
                                {lootboxResult.box.name}
                            </h3>

                            {lootboxResult.bonusGift ? (
                                <>
                                    <p className="text-sm text-white/60 mb-2">
                                        BONUS DROP:
                                    </p>
                                    <div className="flex flex-col items-center mb-3">
                                        <span className="text-4xl mb-1">
                                            {lootboxResult.bonusGift.icon}
                                        </span>
                                        <p className="font-semibold">
                                            {
                                                lootboxResult.bonusGift
                                                    .name
                                            }
                                        </p>
                                        <p className="text-xs text-white/60 mt-1">
                                            Base value:{" "}
                                            {lootboxResult.bonusGift.price.toLocaleString()}{" "}
                                            💰
                                        </p>
                                    </div>
                                    <p className="text-lg font-bold text-yellow-300 mb-2">
                                        Multiplier x
                                        {lootboxResult.multiplier}
                                    </p>
                                    <p className="text-sm text-white/70 mb-4">
                                        Total streamer value:{" "}
                                        {(
                                            lootboxResult.bonusGift
                                                .price *
                                            lootboxResult.multiplier
                                        ).toLocaleString()}{" "}
                                        💰
                                    </p>
                                    {lootboxResult.isJackpot && (
                                        <p className="text-xs text-pink-300 mb-2">
                                            JACKPOT DROP! 🔥
                                        </p>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm text-white/60 mb-4">
                                    No bonus gift this time — but the box
                                    still hyped the stream! ⚡
                                </p>
                            )}

                            <button
                                onClick={() => setLootboxResult(null)}
                                className="mt-2 px-6 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <Gift className="w-7 h-7" />
                            </div>
                            Gift Shop
                        </h1>
                        <p className="text-white/60 mt-1">
                            Send futuristic gifts, lootboxes & SKYRA
                            power-ups
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() =>
                                setSoundEnabled(!soundEnabled)
                            }
                            className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition"
                        >
                            {soundEnabled ? (
                                <Volume2 className="w-5 h-5" />
                            ) : (
                                <VolumeX className="w-5 h-5" />
                            )}
                        </button>
                        <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl px-5 py-3">
                            <p className="text-xs text-yellow-400/80">
                                Your Balance
                            </p>
                            <p className="text-xl font-bold text-yellow-400">
                                💰 {userBalance.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {[
                        {
                            icon: <Send className="w-5 h-5" />,
                            label: "Total Sent",
                            value: `${stats.totalSent.toLocaleString()} 💰`,
                            color: "from-pink-500 to-rose-500",
                        },
                        {
                            icon: <Heart className="w-5 h-5" />,
                            label: "Total Received",
                            value: `${stats.totalReceived.toLocaleString()} 💰`,
                            color: "from-red-500 to-pink-500",
                        },
                        {
                            icon: <Users className="w-5 h-5" />,
                            label: "Gifted To",
                            value: `${stats.uniqueRecipients} users`,
                            color: "from-purple-500 to-indigo-500",
                        },
                        {
                            icon: <TrendingUp className="w-5 h-5" />,
                            label: "Balance",
                            value: `${userBalance.toLocaleString()} 💰`,
                            color: "from-yellow-500 to-amber-500",
                        },
                    ].map((s, i) => (
                        <div
                            key={i}
                            className={`bg-gradient-to-br ${s.color} p-[1px] rounded-xl`}
                        >
                            <div className="bg-black/80 backdrop-blur rounded-xl p-4 h-full">
                                <div className="flex items-center gap-2 text-white/60 mb-1">
                                    {s.icon}
                                    <span className="text-xs">
                                        {s.label}
                                    </span>
                                </div>
                                <p className="text-lg font-bold text-white">
                                    {s.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                        {
                            id: "send",
                            label: "Send Gift",
                            icon: <Gift className="w-4 h-4" />,
                        },
                        {
                            id: "sent",
                            label: "Sent",
                            icon: <Send className="w-4 h-4" />,
                            count: sentGifts.length,
                        },
                        {
                            id: "received",
                            label: "Received",
                            icon: <Heart className="w-4 h-4" />,
                            count: receivedGifts.length,
                        },
                        {
                            id: "leaderboard",
                            label: "Leaderboard",
                            icon: <Trophy className="w-4 h-4" />,
                        },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() =>
                                setActiveTab(tab.id)
                            }
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                                    : "bg-white/5 text-white/70 hover:bg-white/10"
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined &&
                                tab.count > 0 && (
                                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                        {tab.count}
                                    </span>
                                )}
                        </button>
                    ))}
                </div>

                {/* Send Tab */}
                {activeTab === "send" && (
                    <div className="space-y-6">
                        {/* User Search */}
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Search className="w-5 h-5 text-purple-400" />
                                Find Recipient
                            </h3>

                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search username..."
                                    value={userSearch}
                                    onChange={(e) => {
                                        setUserSearch(e.target.value);
                                        setRecipient(null);
                                    }}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all"
                                />
                                {searching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400" />
                                )}
                            </div>

                            {/* Results */}
                            {userResults.length > 0 && !recipient && (
                                <div className="mt-3 bg-white/5 rounded-xl overflow-hidden border border-white/10 max-h-60 overflow-y-auto">
                                    {userResults.map((u) => (
                                        <button
                                            key={u._id}
                                            onClick={() => {
                                                setRecipient(u);
                                                setUserSearch(
                                                    u.username
                                                );
                                                setUserResults([]);
                                                if (soundEnabled)
                                                    playSound(
                                                        "select"
                                                    );
                                            }}
                                            className="w-full p-4 flex items-center gap-3 hover:bg-white/10 transition text-left border-b border-white/5 last:border-0"
                                        >
                                            <img
                                                src={
                                                    u.avatar ||
                                                    "/defaults/default-avatar.png"
                                                }
                                                alt=""
                                                className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/50"
                                                onError={(e) => {
                                                    e.target.src =
                                                        "/defaults/default-avatar.png";
                                                }}
                                            />
                                            <div>
                                                <p className="font-semibold">
                                                    {u.username}
                                                </p>
                                                {u.bio && (
                                                    <p className="text-sm text-white/50 truncate max-w-xs">
                                                        {u.bio}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Selected */}
                            {recipient && (
                                <div className="mt-4 flex items-center gap-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                                    <img
                                        src={
                                            recipient.avatar ||
                                            "/defaults/default-avatar.png"
                                        }
                                        alt=""
                                        className="w-14 h-14 rounded-full object-cover border-2 border-green-500"
                                        onError={(e) => {
                                            e.target.src =
                                                "/defaults/default-avatar.png";
                                        }}
                                    />
                                    <div className="flex-1">
                                        <p className="text-green-400 text-sm font-medium">
                                            ✓ Sending to
                                        </p>
                                        <p className="text-white text-lg font-bold">
                                            {recipient.username}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setRecipient(null);
                                            setUserSearch("");
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Tier Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {[
                                {
                                    id: "all",
                                    label: "All Gifts",
                                },
                                ...Object.entries(GIFT_TIERS).map(
                                    ([id, t]) => ({
                                        id,
                                        label: `${t.emoji} ${t.label}`,
                                    })
                                ),
                            ].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() =>
                                        setFilterTier(t.id)
                                    }
                                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${filterTier === t.id
                                            ? `bg-gradient-to-r ${GIFT_TIERS[t.id]
                                                ?.color ||
                                            "from-purple-500 to-pink-500"
                                            } text-white`
                                            : "bg-white/5 text-white/60 hover:bg-white/10"
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Gifts Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {filteredGifts.map((gift) => (
                                <GiftCard
                                    key={gift.id}
                                    gift={gift}
                                    selected={
                                        selectedGift?.id === gift.id
                                    }
                                    onSelect={setSelectedGift}
                                    affordable={
                                        userBalance >= gift.price
                                    }
                                    soundEnabled={soundEnabled}
                                />
                            ))}
                        </div>

                        {/* Quantity & Message */}
                        {selectedGift && (
                            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-4 animate-fade-in">
                                <div className="flex flex-wrap gap-4">
                                    <div>
                                        <label className="text-sm text-white/60 block mb-2">
                                            Quantity
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() =>
                                                    setQuantity(
                                                        Math.max(
                                                            1,
                                                            quantity - 1
                                                        )
                                                    )
                                                }
                                                className="w-10 h-10 bg-white/10 rounded-lg hover:bg-white/20 font-bold"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={quantity}
                                                onChange={(e) =>
                                                    setQuantity(
                                                        Math.max(
                                                            1,
                                                            Math.min(
                                                                100,
                                                                parseInt(
                                                                    e
                                                                        .target
                                                                        .value
                                                                ) || 1
                                                            )
                                                        )
                                                    )
                                                }
                                                className="w-20 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center outline-none"
                                            />
                                            <button
                                                onClick={() =>
                                                    setQuantity(
                                                        Math.min(
                                                            100,
                                                            quantity + 1
                                                        )
                                                    )
                                                }
                                                className="w-10 h-10 bg-white/10 rounded-lg hover:bg-white/20 font-bold"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-sm text-white/60 block mb-2">
                                            Message (optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) =>
                                                setMessage(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Add a message..."
                                            maxLength={100}
                                            className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                    <div>
                                        <p className="text-white/60">
                                            Total Cost
                                        </p>
                                        <p
                                            className={`text-3xl font-bold ${canAfford
                                                    ? "text-yellow-400"
                                                    : "text-red-400"
                                                }`}
                                        >
                                            {totalCost.toLocaleString()}{" "}
                                            💰
                                        </p>
                                        {!canAfford && (
                                            <p className="text-red-400 text-sm">
                                                Insufficient balance
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleSendGift}
                                        disabled={
                                            !recipient ||
                                            !canAfford ||
                                            sending
                                        }
                                        className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all ${!recipient ||
                                                !canAfford ||
                                                sending
                                                ? "bg-gray-700 cursor-not-allowed opacity-50"
                                                : "bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-xl hover:scale-105"
                                            }`}
                                    >
                                        {sending ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />{" "}
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="w-5 h-5" />{" "}
                                                Send Gift
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Sent Tab */}
                {activeTab === "sent" && (
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Send className="w-5 h-5 text-pink-400" />
                            Gifts You've Sent
                        </h3>
                        {sentGifts.length === 0 ? (
                            <div className="text-center py-12">
                                <Gift className="w-16 h-16 text-white/20 mx-auto mb-4" />
                                <p className="text-white/50">
                                    No gifts sent yet
                                </p>
                                <button
                                    onClick={() =>
                                        setActiveTab("send")
                                    }
                                    className="mt-4 px-6 py-2 bg-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/50"
                                >
                                    Send your first gift
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                {sentGifts.map((g) => (
                                    <HistoryItem
                                        key={g._id}
                                        item={g}
                                        type="sent"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Received Tab */}
                {activeTab === "received" && (
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <Heart className="w-5 h-5 text-red-400" />
                            Gifts You've Received
                        </h3>
                        {receivedGifts.length === 0 ? (
                            <div className="text-center py-12">
                                <Heart className="w-16 h-16 text-white/20 mx-auto mb-4" />
                                <p className="text-white/50">
                                    No gifts received yet
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                {receivedGifts.map((g) => (
                                    <HistoryItem
                                        key={g._id}
                                        item={g}
                                        type="received"
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Leaderboard Tab */}
                {activeTab === "leaderboard" && (
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Trophy className="w-6 h-6 text-yellow-400" />
                                Top Gifters
                            </h3>
                            {topSenders.length === 0 ? (
                                <p className="text-white/50 text-center py-8">
                                    No data yet
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {topSenders
                                        .slice(0, 10)
                                        .map((e, i) => (
                                            <LeaderboardCard
                                                key={
                                                    e._id?._id || i
                                                }
                                                entry={e}
                                                rank={i}
                                                type="senders"
                                            />
                                        ))}
                                </div>
                            )}
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Crown className="w-6 h-6 text-pink-400" />
                                Most Gifted
                            </h3>
                            {topReceivers.length === 0 ? (
                                <p className="text-white/50 text-center py-8">
                                    No data yet
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {topReceivers
                                        .slice(0, 10)
                                        .map((e, i) => (
                                            <LeaderboardCard
                                                key={
                                                    e._id?._id || i
                                                }
                                                entry={e}
                                                rank={i}
                                                type="receivers"
                                            />
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes float-random {
                    0%, 100% { transform: translateY(0) rotate(0deg); }
                    25% { transform: translateY(-20px) rotate(5deg); }
                    75% { transform: translateY(10px) rotate(-5deg); }
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-float-random { animation: float-random 20s ease-in-out infinite; }
                .animate-fade-in { animation: fade-in 0.3s ease-out; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .hover\\:scale-102:hover { transform: scale(1.02); }
            `}</style>
        </div>
    );
}
