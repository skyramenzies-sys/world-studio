// src/components/LiveGiftPanel.jsx - WORLD STUDIO LIVE EDITION 🎁 (U.E + GAMBLE)
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";

// ✅ Use shared instances
import api from "../api/api";
import socket from "../api/socket";

/* ============================================================
   GIFT DATA
   ============================================================ */
const GIFT_CATEGORIES = [
    { id: "basic", name: "Basic", icon: "🎁" },
    { id: "premium", name: "Premium", icon: "💎" },
    { id: "luxury", name: "Luxury", icon: "👑" },
    { id: "epic", name: "Epic", icon: "🚀" },
    { id: "gamble", name: "Gamble", icon: "🎲" }, // WS-Coins only
];

const GIFTS = [
    // Basic (10-50 coins)
    { id: 1, name: "Rose", icon: "🌹", price: 10, category: "basic", color: "from-pink-500 to-red-500" },
    { id: 2, name: "Heart", icon: "❤️", price: 20, category: "basic", color: "from-red-500 to-pink-500" },
    { id: 3, name: "Star", icon: "⭐", price: 30, category: "basic", color: "from-yellow-400 to-orange-500" },
    { id: 4, name: "Fire", icon: "🔥", price: 40, category: "basic", color: "from-orange-500 to-red-600" },
    { id: 5, name: "Rainbow", icon: "🌈", price: 50, category: "basic", color: "from-purple-500 to-pink-500" },
    // Premium (100-500 coins)
    { id: 6, name: "Diamond", icon: "💎", price: 100, category: "premium", color: "from-cyan-400 to-blue-500" },
    { id: 7, name: "Crown", icon: "👑", price: 200, category: "premium", color: "from-yellow-400 to-amber-500" },
    { id: 8, name: "Trophy", icon: "🏆", price: 300, category: "premium", color: "from-yellow-500 to-orange-500" },
    { id: 9, name: "Money Bag", icon: "💰", price: 400, category: "premium", color: "from-green-400 to-emerald-600" },
    { id: 10, name: "Crystal Ball", icon: "🔮", price: 500, category: "premium", color: "from-purple-500 to-indigo-600" },
    // Luxury (1000-5000 coins)
    { id: 11, name: "Sports Car", icon: "🏎️", price: 1000, category: "luxury", color: "from-red-500 to-orange-500" },
    { id: 12, name: "Yacht", icon: "🛥️", price: 2000, category: "luxury", color: "from-blue-400 to-cyan-500" },
    { id: 13, name: "Private Jet", icon: "✈️", price: 3000, category: "luxury", color: "from-gray-400 to-blue-500" },
    { id: 14, name: "Mansion", icon: "🏰", price: 4000, category: "luxury", color: "from-amber-500 to-yellow-600" },
    { id: 15, name: "Island", icon: "🏝️", price: 5000, category: "luxury", color: "from-green-400 to-teal-500" },
    // Epic (10000-50000 coins)
    { id: 16, name: "Rocket", icon: "🚀", price: 10000, category: "epic", color: "from-orange-500 to-red-600" },
    { id: 17, name: "UFO", icon: "🛸", price: 15000, category: "epic", color: "from-green-400 to-cyan-500" },
    { id: 18, name: "Galaxy", icon: "🌌", price: 25000, category: "epic", color: "from-purple-600 to-blue-600" },
    { id: 19, name: "Black Hole", icon: "🕳️", price: 35000, category: "epic", color: "from-gray-800 to-purple-900" },
    { id: 20, name: "Universe", icon: "✨", price: 50000, category: "epic", color: "from-pink-500 via-purple-500 to-cyan-500" },

    // ========================================================
    // GAMBLE GIFTS (WS-COIN ONLY • NO REAL MONEY)
    // ========================================================
    {
        id: 101,
        name: "Coin Flip",
        icon: "🪙",
        price: 50,
        category: "gamble",
        color: "from-slate-500 to-slate-700",
        gamble: {
            winChance: 0.5,
            multiplier: 2,
            label: "50% chance • x2 bonus",
        },
    },
    {
        id: 102,
        name: "Lucky Dice",
        icon: "🎲",
        price: 100,
        category: "gamble",
        color: "from-emerald-500 to-emerald-700",
        gamble: {
            winChance: 0.25,
            multiplier: 4,
            label: "25% chance • x4 bonus",
        },
    },
    {
        id: 103,
        name: "Jackpot Spin",
        icon: "🎰",
        price: 250,
        category: "gamble",
        color: "from-red-500 to-yellow-500",
        gamble: {
            winChance: 0.1,
            multiplier: 10,
            label: "10% chance • x10 bonus",
        },
    },
    {
        id: 104,
        name: "Universe Gamble",
        icon: "🪐",
        price: 500,
        category: "gamble",
        color: "from-purple-500 to-cyan-500",
        gamble: {
            winChance: 0.01,
            multiplier: 100,
            label: "1% chance • x100 bonus",
        },
    },
];

/* ============================================================
   GIFT ANIMATION COMPONENT
   ============================================================ */
const GiftAnimation = ({ gift, onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(() => onComplete?.(), 3000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="text-center animate-bounce">
                <span className="text-8xl block mb-4">{gift.icon}</span>
                <p className="text-white font-bold text-lg">
                    <span className="text-cyan-400">{gift.senderUsername}</span>
                    {" sent "}
                    <span className="text-yellow-400">{gift.item}</span>!
                </p>
                {gift.gambleResult ? (
                    <p
                        className={`font-bold text-2xl mt-2 ${gift.gambleResult === "win" ? "text-green-400" : "text-red-400"
                            }`}
                    >
                        {gift.gambleResult === "win"
                            ? `WIN +${gift.bonus?.toLocaleString()} 💰`
                            : "No bonus this time 💔"}
                    </p>
                ) : (
                    <p className="text-yellow-400 font-bold text-2xl mt-2">
                        +{gift.amount?.toLocaleString()} 💰
                    </p>
                )}
            </div>
        </div>
    );
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function LiveGiftPanel({ streamId, hostId, hostUsername, onGiftSent }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [balance, setBalance] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState("basic");
    const [selectedGift, setSelectedGift] = useState(null);
    const [sending, setSending] = useState(false);
    const [recentGifts, setRecentGifts] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [giftAnimation, setGiftAnimation] = useState(null);

    const selfId = currentUser?._id || currentUser?.id;

    /* ========================================================
       LOAD CURRENT USER + WALLET
       ======================================================== */
    useEffect(() => {
        const stored = localStorage.getItem("ws_currentUser");
        if (stored) {
            try {
                const user = JSON.parse(stored);
                setCurrentUser(user);
                setBalance(user.wallet?.balance || 0);
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        }
    }, []);

    /* ========================================================
       SOCKET EVENTS FOR GIFTS (REAL-TIME)
       ======================================================== */
    useEffect(() => {


        const handleGift = (gift) => {
            // Filter by streamId if provided
            if (gift.streamId && streamId && gift.streamId !== streamId) return;

            const giftData = { ...gift, timestamp: Date.now() };
            setRecentGifts((prev) => [...prev.slice(-4), giftData]);
            setGiftAnimation(giftData);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                setRecentGifts((prev) => prev.filter((g) => g.timestamp !== giftData.timestamp));
            }, 5000);
        };

        socket.on("gift_received", handleGift);
        socket.on("gift_sent", handleGift);

        return () => {
            socket.off("gift_received", handleGift);
            socket.off("gift_sent", handleGift);
        };
    }, [streamId]);

    /* ========================================================
       HELPERS
       ======================================================== */
    const filteredGifts = GIFTS.filter((g) => g.category === selectedCategory);

    const formatPrice = useCallback(
        (price) => (price >= 1000 ? `${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}K` : price),
        []
    );

    /* ========================================================
       SEND GIFT
       ======================================================== */
    const sendGift = async (gift) => {
        if (!currentUser) {
            toast.error("Log in to send gifts");
            return;
        }
        if (!hostId) {
            toast.error("No host to send gift to");
            return;
        }
        if (balance < gift.price) {
            toast.error("Not enough coins! 💰");
            return;
        }

        // High value confirm (also for gamble)
        if (gift.price >= 1000 && !showConfirm) {
            setSelectedGift(gift);
            setShowConfirm(true);
            return;
        }

        setSending(true);
        setShowConfirm(false);

        // ---------- GAMBLE LOGIC ----------
        const isGamble = !!gift.gamble;
        const stake = gift.price;
        let win = false;
        let bonus = 0;

        if (isGamble) {
            win = Math.random() < (gift.gamble.winChance || 0);
            if (win) {
                bonus = Math.round(stake * ((gift.gamble.multiplier || 1) - 1));
            }
        }

        try {
            // 🎁 API-call: host gets stake as gift
            await api.post("/gifts", {
                recipientId: hostId,
                item: gift.name,
                amount: stake,
                streamId,
            });

            // Update local wallet: stake removed, bonus added if win
            const newBalance = balance - stake + bonus;
            setBalance(newBalance);

            const updatedUser = {
                ...currentUser,
                wallet: {
                    ...currentUser.wallet,
                    balance: newBalance,
                },
            };
            localStorage.setItem("ws_currentUser", JSON.stringify(updatedUser));
            setCurrentUser(updatedUser);

            // Socket payload (for overlay + recent list)
            const payload = {
                streamId,
                roomId: streamId,
                senderUsername: currentUser.username,
                senderAvatar: currentUser.avatar,
                senderId: selfId,
                recipientId: hostId,
                recipientUsername: hostUsername,
                item: gift.name,
                icon: gift.icon,
                amount: stake,
                color: gift.color,
                timestamp: Date.now(),
            };

            if (isGamble) {
                payload.isGamble = true;
                payload.gambleResult = win ? "win" : "lose";
                payload.bonus = bonus;
            }

            socket.emit("gift_sent", payload);

            if (isGamble) {
                if (win) {
                    toast.success(
                        `🎲 WIN! You sent ${gift.name} to ${hostUsername} and won +${bonus.toLocaleString()} WS-Coins!`
                    );
                } else {
                    toast(`🎲 No bonus this time… You sent ${gift.name} to ${hostUsername}`, { icon: "💔" });
                }
            } else {
                toast.success(`${gift.icon} ${gift.name} sent to ${hostUsername}!`);
            }

            onGiftSent?.(gift);
        } catch (err) {
            console.error("Gift error:", err);
            toast.error(err.response?.data?.message || "Failed to send gift");
        } finally {
            setSending(false);
            setSelectedGift(null);
        }
    };

    /* ========================================================
       NOT LOGGED IN STATE
       ======================================================== */
    if (!currentUser) {
        return (
            <div className="p-6 text-center">
                <p className="text-4xl mb-3">🎁</p>
                <p className="text-white/50 mb-3">Log in to send gifts</p>
                <a href="/login" className="text-cyan-400 hover:underline text-sm">
                    Login now →
                </a>
            </div>
        );
    }

    /* ========================================================
       RENDER
       ======================================================== */
    return (
        <div className="relative">
            {/* Gift Animation Overlay */}
            {giftAnimation && <GiftAnimation gift={giftAnimation} onComplete={() => setGiftAnimation(null)} />}

            {/* Confirm Modal */}
            {showConfirm && selectedGift && (
                <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-white/20">
                        <div className="text-center mb-4">
                            <span className="text-6xl block">{selectedGift.icon}</span>
                            <h3 className="text-xl font-bold mt-2">{selectedGift.name}</h3>
                            <p className="text-yellow-400 font-bold text-2xl mt-1">
                                💰 {selectedGift.price.toLocaleString()}
                            </p>
                            {selectedGift.gamble && (
                                <p className="text-cyan-400 text-xs mt-2">{selectedGift.gamble.label}</p>
                            )}
                        </div>
                        <p className="text-white/60 text-center mb-4">
                            Send this gift to <span className="text-cyan-400 font-semibold">{hostUsername}</span>?
                        </p>
                        {/* ✅ FIXED: was "hover:bg.white/20" */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowConfirm(false);
                                    setSelectedGift(null);
                                }}
                                className="flex-1 py-3 rounded-xl bg-white/10 font-semibold hover:bg-white/20 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => sendGift(selectedGift)}
                                disabled={sending}
                                className={`flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r ${selectedGift.color} hover:opacity-90 transition disabled:opacity-50`}
                            >
                                {sending ? "Sending..." : "Send Gift"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Balance header */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-b border-white/10">
                <span className="text-white/60 text-sm">Your Balance</span>
                <span className="text-yellow-400 font-bold text-lg">💰 {balance.toLocaleString()}</span>
            </div>

            {/* Category tabs - ✅ FIXED: was "flex-1.min-w-[80px]" */}
            <div className="flex border-b border-white/10 overflow-x-auto scrollbar-hide">
                {GIFT_CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex-1 min-w-[80px] py-2.5 px-3 text-xs font-semibold transition whitespace-nowrap ${selectedCategory === cat.id
                                ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/10"
                                : "text-white/50 hover:text-white/80 hover:bg-white/5"
                            }`}
                    >
                        <span className="block text-lg mb-0.5">{cat.icon}</span>
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* Gift grid */}
            <div className="p-3 grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto scrollbar-thin">
                {filteredGifts.map((gift) => {
                    const canAfford = balance >= gift.price;
                    const isGamble = !!gift.gamble;

                    return (
                        <button
                            key={gift.id}
                            onClick={() => sendGift(gift)}
                            disabled={!canAfford || sending}
                            className={`relative p-2 rounded-xl transition-all duration-200 flex flex-col items-center group ${canAfford
                                    ? `bg-gradient-to-br ${gift.color} bg-opacity-20 hover:scale-105 hover:shadow-lg active:scale-95`
                                    : "bg-white/5 opacity-40 cursor-not-allowed"
                                }`}
                        >
                            <span
                                className={`text-2xl transition-transform ${canAfford ? "group-hover:scale-110" : ""}`}
                            >
                                {gift.icon}
                            </span>
                            <span className="text-[10px] text-white/80 truncate w-full text-center mt-1">
                                {gift.name}
                            </span>
                            <span className="text-[10px] text-yellow-400 font-bold">{formatPrice(gift.price)}</span>

                            {gift.category === "epic" && (
                                <span className="absolute -top-1 -right-1 text-[8px] bg-purple-500 px-1 rounded animate-pulse">
                                    ✨
                                </span>
                            )}
                            {gift.category === "luxury" && (
                                <span className="absolute -top-1 -right-1 text-[8px] bg-yellow-500 text-black px-1 rounded font-bold">
                                    VIP
                                </span>
                            )}
                            {isGamble && (
                                <span className="absolute -bottom-1 -right-1 text-[8px] bg-slate-900/80 px-1 rounded-full border border-cyan-400/60">
                                    🎲
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Recent gifts - ✅ FIXED: was "font.medium" */}
            {recentGifts.length > 0 && (
                <div className="p-2 border-t border-white/10 space-y-1 max-h-[100px] overflow-y-auto">
                    <p className="text-white/40 text-[10px] px-1">Recent Gifts</p>
                    {recentGifts.map((gift, i) => (
                        <div
                            key={gift.timestamp || i}
                            className={`flex items-center gap-2 bg-gradient-to-r ${gift.color || "from-purple-500/20 to-pink-500/20"
                                } rounded-lg px-2 py-1.5 animate-slideIn`}
                        >
                            <span className="text-lg">{gift.icon}</span>
                            <span className="text-xs truncate flex-1">
                                <span className="text-cyan-400 font-semibold">{gift.senderUsername}</span>
                                <span className="text-white/40"> → </span>
                                <span className="text-yellow-400 font-medium">{gift.item}</span>
                                {gift.isGamble && (
                                    <span className="ml-1 text-[9px] text-white/70">
                                        ({gift.gambleResult === "win" ? "WIN" : "lose"})
                                    </span>
                                )}
                            </span>
                            <span className="text-yellow-400 text-xs font-bold">{formatPrice(gift.amount)}</span>
                        </div>
                    ))}
                </div>
            )}

            <p className="text-white/30 text-[10px] text-center py-2 border-t border-white/10">
                Tap a gift to send to {hostUsername || "host"} • Gamble gifts use only WS-Coins (no real money)
            </p>

            {/* ✅ FIXED: was "0.3s.ease-out" */}
            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-thin::-webkit-scrollbar { width: 4px; }
                .scrollbar-thin::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.2);
                    border-radius: 2px;
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateX(-10px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-slideIn { animation: slideIn 0.3s ease-out; }
            `}</style>
        </div>
    );
}
