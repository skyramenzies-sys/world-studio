// src/components/GiftShop.jsx
// ULTIMATE GIFT SHOP - WORLD STUDIO LIVE EDITION 🎁
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Gift, Search, Send, Trophy, Heart, Crown, Zap, Star, TrendingUp, Clock, Users, Sparkles, Volume2, VolumeX } from "lucide-react";
import axios from "axios";
import { io } from "socket.io-client";
import { GiftReceivedAlert } from "./GiftPanel";

/* ============================================================
   WORLD STUDIO LIVE CONFIGURATION
   ============================================================ */
const API_BASE_URL = "https://world-studio.live";
const SOCKET_URL = "https://world-studio.live";

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
    common: { color: "from-gray-500 to-gray-600", glow: "#888", label: "Common", emoji: "⚪" },
    rare: { color: "from-blue-500 to-cyan-500", glow: "#0ff", label: "Rare", emoji: "🔵" },
    epic: { color: "from-purple-500 to-pink-500", glow: "#f0f", label: "Epic", emoji: "🟣" },
    legendary: { color: "from-yellow-500 to-orange-500", glow: "#ff0", label: "Legendary", emoji: "🟡" },
    mythic: { color: "from-red-500 to-pink-600", glow: "#f00", label: "Mythic", emoji: "🔴" },
};

const GIFTS = [
    { id: 1, name: "Rose", icon: "🌹", price: 5, tier: "common", description: "A beautiful rose" },
    { id: 2, name: "Heart", icon: "❤️", price: 10, tier: "common", description: "Show your love" },
    { id: 3, name: "Kiss", icon: "💋", price: 15, tier: "common", description: "A sweet kiss" },
    { id: 4, name: "Teddy", icon: "🧸", price: 20, tier: "common", description: "Cuddly teddy bear" },
    { id: 5, name: "Star", icon: "⭐", price: 25, tier: "rare", description: "You're a star!" },
    { id: 6, name: "Diamond", icon: "💎", price: 50, tier: "rare", description: "Precious diamond" },
    { id: 7, name: "Gift Box", icon: "🎁", price: 75, tier: "rare", description: "Mystery gift" },
    { id: 8, name: "Gem", icon: "💠", price: 90, tier: "rare", description: "Rare gemstone" },
    { id: 9, name: "Crown", icon: "👑", price: 100, tier: "epic", description: "Royal crown" },
    { id: 10, name: "Rocket", icon: "🚀", price: 250, tier: "epic", description: "To the moon!" },
    { id: 11, name: "Fire", icon: "🔥", price: 300, tier: "epic", description: "You're on fire!" },
    { id: 12, name: "Unicorn", icon: "🦄", price: 400, tier: "epic", description: "Magical unicorn" },
    { id: 13, name: "Trophy", icon: "🏆", price: 500, tier: "legendary", description: "Champion trophy" },
    { id: 14, name: "Lightning", icon: "⚡", price: 750, tier: "legendary", description: "Electric power" },
    { id: 15, name: "Rainbow", icon: "🌈", price: 1000, tier: "legendary", description: "Full rainbow" },
    { id: 16, name: "Castle", icon: "🏰", price: 1500, tier: "legendary", description: "Royal castle" },
    { id: 17, name: "Universe", icon: "🌌", price: 2500, tier: "mythic", description: "The entire universe" },
    { id: 18, name: "Dragon", icon: "🐉", price: 5000, tier: "mythic", description: "Legendary dragon" },
    { id: 19, name: "Phoenix", icon: "🔥", price: 7500, tier: "mythic", description: "Rising phoenix" },
    { id: 20, name: "Supernova", icon: "💥", price: 10000, tier: "mythic", description: "Cosmic explosion" },
];

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
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(volume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } else if (type === "success") {
            [523, 659, 784].forEach((freq, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.frequency.value = freq;
                g.gain.setValueAtTime(volume, ctx.currentTime + i * 0.1);
                g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.1 + 0.2);
                o.start(ctx.currentTime + i * 0.1);
                o.stop(ctx.currentTime + i * 0.1 + 0.2);
            });
        }
    } catch (e) { }
};

/* ============================================================
   ANIMATED BACKGROUND
   ============================================================ */
function AnimatedBackground() {
    const elements = useMemo(() =>
        [...GIFTS.slice(0, 15)].map((g, i) => ({
            ...g,
            top: Math.random() * 100,
            left: Math.random() * 100,
            delay: Math.random() * 10,
            duration: 15 + Math.random() * 20,
            size: 1 + Math.random() * 1.5,
        })), []
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
    const tier = GIFT_TIERS[gift.tier];

    return (
        <button
            onClick={() => {
                if (affordable) {
                    onSelect(gift);
                    if (soundEnabled) playSound("select");
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
            <div className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r ${tier.color} text-white shadow-lg ${selected ? "scale-110" : ""}`}>
                {tier.emoji} {tier.label}
            </div>

            {/* Glow effect on hover */}
            <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-30 transition-opacity bg-gradient-to-br ${tier.color} blur-xl`} />

            {/* Icon */}
            <div className="relative">
                <span className={`text-5xl block transition-transform ${selected ? "animate-bounce" : "group-hover:scale-110"}`}>
                    {gift.icon}
                </span>
            </div>

            {/* Info */}
            <div className="mt-3 text-center relative">
                <p className="font-bold text-white">{gift.name}</p>
                <p className="text-xs text-white/50 mt-1 line-clamp-1">{gift.description}</p>
                <p className={`text-lg font-bold mt-2 ${affordable ? "text-yellow-400" : "text-red-400"}`}>
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
        <div className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isTop3 ? "bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30" : "bg-white/5 border border-white/10"}`}>
            <div className="text-2xl w-10 text-center">
                {isTop3 ? medals[rank] : <span className="text-white/40">#{rank + 1}</span>}
            </div>
            <img
                src={entry._id?.avatar || entry.user?.avatar || "/defaults/default-avatar.png"}
                alt=""
                className={`w-12 h-12 rounded-full object-cover border-2 ${isTop3 ? "border-yellow-500" : "border-white/20"}`}
                onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
            />
            <div className="flex-1 min-w-0">
                <p className={`font-bold truncate ${isTop3 ? "text-yellow-400" : "text-white"}`}>
                    {entry._id?.username || entry.user?.username || "Anonymous"}
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
    const gift = GIFTS.find(g => g.name === item.item) || { icon: "🎁", tier: "common" };
    const tier = GIFT_TIERS[gift.tier];

    return (
        <div className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all">
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                <span className="text-3xl">{gift.icon || item.itemIcon || "🎁"}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="font-bold text-white">{item.item}</p>
                    {item.amount > 1 && <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full">x{item.amount}</span>}
                </div>
                <p className="text-sm text-white/50">
                    {type === "sent" ? "To: " : "From: "}
                    <span className="text-white/70">
                        {type === "sent" ? item.recipient?.username : item.sender?.username || "Unknown"}
                    </span>
                </p>
                {item.message && (
                    <p className="text-xs text-white/40 truncate mt-1">"{item.message}"</p>
                )}
            </div>
            <div className="text-right">
                <p className="text-yellow-400 font-bold">
                    {(item.amount * (gift.price || 1)).toLocaleString()} 💰
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
    const [stats, setStats] = useState({ totalSent: 0, totalReceived: 0, uniqueRecipients: 0 });

    const socketRef = React.useRef(null);

    // Initialize socket
    useEffect(() => {
        socketRef.current = getSocket();
        return () => {
            // Don't disconnect - it's a singleton
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
            } catch (e) { }
        }
    }, []);

    // Socket listeners
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleGift = (data) => {
            if (data.recipientId === currentUser?._id || data.recipientId === currentUser?.id) {
                setUserBalance(prev => prev + (data.amount || 0));
                const gift = GIFTS.find(g => g.name === data.item);
                toast.custom((t) => (
                    <GiftReceivedAlert
                        gift={{ ...gift, amount: data.amount, sound: "sparkle" }}
                        sender={data.senderUsername}
                        onComplete={() => toast.dismiss(t.id)}
                    />
                ), { duration: 5000 });
                fetchHistory();
            }
        };

        socket.on("gift_received", handleGift);
        socket.on("gift_sent", handleGift);
        return () => {
            socket.off("gift_received", handleGift);
            socket.off("gift_sent", handleGift);
        };
    }, [currentUser]);

    // User search
    useEffect(() => {
        if (userSearch.length < 2) { setUserResults([]); return; }

        setSearching(true);
        const delay = setTimeout(async () => {
            try {
                const res = await api.get(`/api/users?q=${encodeURIComponent(userSearch)}&limit=8`);
                const users = res.data.users || res.data || [];
                setUserResults(users.filter(u => u._id !== currentUser?._id && u._id !== currentUser?.id));
            } catch (e) { setUserResults([]); }
            finally { setSearching(false); }
        }, 300);
        return () => clearTimeout(delay);
    }, [userSearch, currentUser]);

    // Fetch history
    const fetchHistory = useCallback(async () => {
        if (!currentUser) return;
        try {
            const [sent, received, senders, receivers] = await Promise.allSettled([
                api.get("/api/gifts/sent"),
                api.get("/api/gifts/received"),
                api.get("/api/gifts/leaderboard/senders"),
                api.get("/api/gifts/leaderboard/receivers"),
            ]);

            if (sent.status === "fulfilled") setSentGifts(sent.value.data || []);
            if (received.status === "fulfilled") setReceivedGifts(received.value.data || []);
            if (senders.status === "fulfilled") setTopSenders(senders.value.data || []);
            if (receivers.status === "fulfilled") setTopReceivers(receivers.value.data || []);

            // Calculate stats
            const sentData = sent.status === "fulfilled" ? sent.value.data : [];
            const receivedData = received.status === "fulfilled" ? received.value.data : [];
            setStats({
                totalSent: sentData.reduce((sum, g) => sum + (g.amount || 1) * (GIFTS.find(x => x.name === g.item)?.price || 1), 0),
                totalReceived: receivedData.reduce((sum, g) => sum + (g.amount || 1) * (GIFTS.find(x => x.name === g.item)?.price || 1), 0),
                uniqueRecipients: new Set(sentData.map(g => g.recipient?._id)).size,
            });
        } catch (e) { }
    }, [currentUser]);

    useEffect(() => { if (currentUser) fetchHistory(); }, [currentUser, fetchHistory]);

    // Filtered gifts
    const filteredGifts = filterTier === "all" ? GIFTS : GIFTS.filter(g => g.tier === filterTier);

    const totalCost = selectedGift ? selectedGift.price * quantity : 0;
    const canAfford = userBalance >= totalCost;

    // Send gift
    const handleSendGift = async () => {
        if (!currentUser || !recipient || !selectedGift || !canAfford) {
            toast.error(!currentUser ? "Please log in" : !recipient ? "Select recipient" : !selectedGift ? "Select gift" : "Insufficient balance");
            return;
        }

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

            setUserBalance(prev => prev - totalCost);

            toast.success(
                <div className="flex items-center gap-2">
                    <span className="text-3xl">{selectedGift.icon}</span>
                    <div>
                        <p className="font-bold">Gift Sent!</p>
                        <p className="text-sm opacity-80">{quantity}x {selectedGift.name} to {recipient.username}</p>
                    </div>
                </div>
            );

            setRecipient(null);
            setUserSearch("");
            setSelectedGift(null);
            setQuantity(1);
            setMessage("");
            fetchHistory();

        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to send gift");
        } finally {
            setSending(false);
        }
    };

    // Not logged in
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-4">
                <AnimatedBackground />
                <div className="relative z-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center">
                        <Gift className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Gift Shop</h2>
                    <p className="text-white/60 mb-8">Please log in to send and receive gifts</p>
                    <button onClick={() => navigate("/login")} className="px-8 py-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-white font-bold hover:shadow-lg hover:scale-105 transition-all">
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
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <Gift className="w-7 h-7" />
                            </div>
                            Gift Shop
                        </h1>
                        <p className="text-white/60 mt-1">Send amazing gifts to your favorite creators</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => setSoundEnabled(!soundEnabled)} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 transition">
                            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                        </button>
                        <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl px-5 py-3">
                            <p className="text-xs text-yellow-400/80">Your Balance</p>
                            <p className="text-xl font-bold text-yellow-400">💰 {userBalance.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    {[
                        { icon: <Send className="w-5 h-5" />, label: "Total Sent", value: `${stats.totalSent.toLocaleString()} 💰`, color: "from-pink-500 to-rose-500" },
                        { icon: <Heart className="w-5 h-5" />, label: "Total Received", value: `${stats.totalReceived.toLocaleString()} 💰`, color: "from-red-500 to-pink-500" },
                        { icon: <Users className="w-5 h-5" />, label: "Gifted To", value: `${stats.uniqueRecipients} users`, color: "from-purple-500 to-indigo-500" },
                        { icon: <TrendingUp className="w-5 h-5" />, label: "Balance", value: `${userBalance.toLocaleString()} 💰`, color: "from-yellow-500 to-amber-500" },
                    ].map((s, i) => (
                        <div key={i} className={`bg-gradient-to-br ${s.color} p-[1px] rounded-xl`}>
                            <div className="bg-black/80 backdrop-blur rounded-xl p-4 h-full">
                                <div className="flex items-center gap-2 text-white/60 mb-1">
                                    {s.icon}
                                    <span className="text-xs">{s.label}</span>
                                </div>
                                <p className="text-lg font-bold text-white">{s.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                    {[
                        { id: "send", label: "Send Gift", icon: <Gift className="w-4 h-4" /> },
                        { id: "sent", label: "Sent", icon: <Send className="w-4 h-4" />, count: sentGifts.length },
                        { id: "received", label: "Received", icon: <Heart className="w-4 h-4" />, count: receivedGifts.length },
                        { id: "leaderboard", label: "Leaderboard", icon: <Trophy className="w-4 h-4" /> },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg"
                                : "bg-white/5 text-white/70 hover:bg-white/10"
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && tab.count > 0 && (
                                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{tab.count}</span>
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
                                    onChange={(e) => { setUserSearch(e.target.value); setRecipient(null); }}
                                    className="w-full px-5 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 transition-all"
                                />
                                {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400" />}
                            </div>

                            {/* Results */}
                            {userResults.length > 0 && !recipient && (
                                <div className="mt-3 bg-white/5 rounded-xl overflow-hidden border border-white/10 max-h-60 overflow-y-auto">
                                    {userResults.map((u) => (
                                        <button
                                            key={u._id}
                                            onClick={() => { setRecipient(u); setUserSearch(u.username); setUserResults([]); if (soundEnabled) playSound("select"); }}
                                            className="w-full p-4 flex items-center gap-3 hover:bg-white/10 transition text-left border-b border-white/5 last:border-0"
                                        >
                                            <img src={u.avatar || "/defaults/default-avatar.png"} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/50" onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }} />
                                            <div>
                                                <p className="font-semibold">{u.username}</p>
                                                {u.bio && <p className="text-sm text-white/50 truncate max-w-xs">{u.bio}</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Selected */}
                            {recipient && (
                                <div className="mt-4 flex items-center gap-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
                                    <img src={recipient.avatar || "/defaults/default-avatar.png"} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-green-500" onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }} />
                                    <div className="flex-1">
                                        <p className="text-green-400 text-sm font-medium">✓ Sending to</p>
                                        <p className="text-white text-lg font-bold">{recipient.username}</p>
                                    </div>
                                    <button onClick={() => { setRecipient(null); setUserSearch(""); }} className="p-2 hover:bg-white/10 rounded-lg text-white/60 hover:text-white">✕</button>
                                </div>
                            )}
                        </div>

                        {/* Tier Filter */}
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {[{ id: "all", label: "All Gifts" }, ...Object.entries(GIFT_TIERS).map(([id, t]) => ({ id, label: `${t.emoji} ${t.label}` }))].map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setFilterTier(t.id)}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${filterTier === t.id
                                        ? `bg-gradient-to-r ${GIFT_TIERS[t.id]?.color || "from-purple-500 to-pink-500"} text-white`
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
                                    selected={selectedGift?.id === gift.id}
                                    onSelect={setSelectedGift}
                                    affordable={userBalance >= gift.price}
                                    soundEnabled={soundEnabled}
                                />
                            ))}
                        </div>

                        {/* Quantity & Message */}
                        {selectedGift && (
                            <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 space-y-4 animate-fade-in">
                                <div className="flex flex-wrap gap-4">
                                    <div>
                                        <label className="text-sm text-white/60 block mb-2">Quantity</label>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 bg-white/10 rounded-lg hover:bg-white/20 font-bold">-</button>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={quantity}
                                                onChange={(e) => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                                className="w-20 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-center outline-none"
                                            />
                                            <button onClick={() => setQuantity(Math.min(100, quantity + 1))} className="w-10 h-10 bg-white/10 rounded-lg hover:bg-white/20 font-bold">+</button>
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="text-sm text-white/60 block mb-2">Message (optional)</label>
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Add a message..."
                                            maxLength={100}
                                            className="w-full px-4 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 outline-none focus:border-purple-500"
                                        />
                                    </div>
                                </div>

                                {/* Summary */}
                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                    <div>
                                        <p className="text-white/60">Total Cost</p>
                                        <p className={`text-3xl font-bold ${canAfford ? "text-yellow-400" : "text-red-400"}`}>
                                            {totalCost.toLocaleString()} 💰
                                        </p>
                                        {!canAfford && <p className="text-red-400 text-sm">Insufficient balance</p>}
                                    </div>
                                    <button
                                        onClick={handleSendGift}
                                        disabled={!recipient || !canAfford || sending}
                                        className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all ${!recipient || !canAfford || sending
                                            ? "bg-gray-700 cursor-not-allowed opacity-50"
                                            : "bg-gradient-to-r from-pink-500 to-purple-600 hover:shadow-xl hover:scale-105"
                                            }`}
                                    >
                                        {sending ? (
                                            <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" /> Sending...</>
                                        ) : (
                                            <><Zap className="w-5 h-5" /> Send Gift</>
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
                                <p className="text-white/50">No gifts sent yet</p>
                                <button onClick={() => setActiveTab("send")} className="mt-4 px-6 py-2 bg-purple-500/30 rounded-lg text-purple-300 hover:bg-purple-500/50">Send your first gift</button>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                {sentGifts.map((g) => <HistoryItem key={g._id} item={g} type="sent" />)}
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
                                <p className="text-white/50">No gifts received yet</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                                {receivedGifts.map((g) => <HistoryItem key={g._id} item={g} type="received" />)}
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
                                <p className="text-white/50 text-center py-8">No data yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {topSenders.slice(0, 10).map((e, i) => <LeaderboardCard key={e._id?._id || i} entry={e} rank={i} type="senders" />)}
                                </div>
                            )}
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                <Crown className="w-6 h-6 text-pink-400" />
                                Most Gifted
                            </h3>
                            {topReceivers.length === 0 ? (
                                <p className="text-white/50 text-center py-8">No data yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {topReceivers.slice(0, 10).map((e, i) => <LeaderboardCard key={e._id?._id || i} entry={e} rank={i} type="receivers" />)}
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