// src/components/LiveGiftPanel.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import api from "../api/api";
import socket from "../api/socket";

const GIFT_CATEGORIES = [
    { id: "basic", name: "Basic", icon: "🎁" },
    { id: "premium", name: "Premium", icon: "💎" },
    { id: "luxury", name: "Luxury", icon: "👑" },
    { id: "epic", name: "Epic", icon: "🚀" },
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
];

export default function LiveGiftPanel({ streamId, hostId, hostUsername, onGiftSent }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [balance, setBalance] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState("basic");
    const [selectedGift, setSelectedGift] = useState(null);
    const [sending, setSending] = useState(false);
    const [recentGifts, setRecentGifts] = useState([]);
    const [showConfirm, setShowConfirm] = useState(false);
    const [giftAnimation, setGiftAnimation] = useState(null);

    // Load user
    useEffect(() => {
        const stored = localStorage.getItem("ws_currentUser");
        if (stored) {
            try {
                const user = JSON.parse(stored);
                setCurrentUser(user);
                setBalance(user.wallet?.balance || 0);
            } catch (e) { }
        }
    }, []);

    // Listen for gifts
    useEffect(() => {
        const handleGift = (gift) => {
            setRecentGifts(prev => [...prev.slice(-4), { ...gift, timestamp: Date.now() }]);

            // Show animation
            setGiftAnimation(gift);
            setTimeout(() => setGiftAnimation(null), 3000);

            // Auto-remove after 5 seconds
            setTimeout(() => {
                setRecentGifts(prev => prev.filter(g => g.timestamp !== gift.timestamp));
            }, 5000);
        };

        socket.on("gift_received", handleGift);
        return () => socket.off("gift_received", handleGift);
    }, []);

    const filteredGifts = GIFTS.filter(g => g.category === selectedCategory);

    // Send gift
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

        // Show confirmation for expensive gifts
        if (gift.price >= 1000 && !showConfirm) {
            setSelectedGift(gift);
            setShowConfirm(true);
            return;
        }

        setSending(true);
        setShowConfirm(false);

        try {
            await api.post("/gifts", {
                recipientId: hostId,
                item: gift.name,
                amount: gift.price,
                streamId,
            });

            // Emit to socket
            socket.emit("gift_sent", {
                streamId,
                roomId: streamId,
                senderUsername: currentUser.username,
                senderAvatar: currentUser.avatar,
                recipientId: hostId,
                recipientUsername: hostUsername,
                item: gift.name,
                icon: gift.icon,
                amount: gift.price,
                color: gift.color,
                timestamp: Date.now(),
            });

            // Update local balance
            const newBalance = balance - gift.price;
            setBalance(newBalance);

            // Update localStorage
            const updatedUser = { ...currentUser, wallet: { ...currentUser.wallet, balance: newBalance } };
            localStorage.setItem("ws_currentUser", JSON.stringify(updatedUser));

            toast.success(`${gift.icon} ${gift.name} sent to ${hostUsername}!`);
            onGiftSent?.(gift);

        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to send gift");
        } finally {
            setSending(false);
            setSelectedGift(null);
        }
    };

    const formatPrice = (price) => {
        if (price >= 1000) return `${(price / 1000).toFixed(price % 1000 === 0 ? 0 : 1)}K`;
        return price;
    };

    if (!currentUser) {
        return (
            <div className="p-6 text-center">
                <p className="text-white/50">Log in to send gifts</p>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Gift Animation Overlay */}
            {giftAnimation && (
                <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center">
                    <div className="animate-bounce text-8xl">{giftAnimation.icon}</div>
                    <div className="absolute bottom-4 left-0 right-0 text-center">
                        <p className="text-white font-bold">
                            <span className="text-cyan-400">{giftAnimation.senderUsername}</span>
                            {" sent "}
                            <span className="text-yellow-400">{giftAnimation.item}</span>!
                        </p>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirm && selectedGift && (
                <div className="absolute inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-white/20">
                        <div className="text-center mb-4">
                            <span className="text-6xl">{selectedGift.icon}</span>
                            <h3 className="text-xl font-bold mt-2">{selectedGift.name}</h3>
                            <p className="text-yellow-400 font-bold text-2xl mt-1">
                                💰 {selectedGift.price.toLocaleString()}
                            </p>
                        </div>

                        <p className="text-white/60 text-center mb-4">
                            Send this gift to <span className="text-cyan-400 font-semibold">{hostUsername}</span>?
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setShowConfirm(false); setSelectedGift(null); }}
                                className="flex-1 py-3 rounded-xl bg-white/10 font-semibold hover:bg-white/20 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => sendGift(selectedGift)}
                                disabled={sending}
                                className={`flex-1 py-3 rounded-xl font-semibold bg-gradient-to-r ${selectedGift.color} hover:opacity-90 transition`}
                            >
                                {sending ? "Sending..." : "Send Gift"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Balance */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-b border-white/10">
                <span className="text-white/60 text-sm">Balance</span>
                <span className="text-yellow-400 font-bold text-lg">💰 {balance.toLocaleString()}</span>
            </div>

            {/* Category Tabs */}
            <div className="flex border-b border-white/10 overflow-x-auto">
                {GIFT_CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`flex-1 min-w-[80px] py-2 px-3 text-xs font-semibold transition whitespace-nowrap ${selectedCategory === cat.id
                                ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/10"
                                : "text-white/50 hover:text-white/80"
                            }`}
                    >
                        {cat.icon} {cat.name}
                    </button>
                ))}
            </div>

            {/* Gift Grid */}
            <div className="p-3 grid grid-cols-5 gap-2 max-h-[200px] overflow-y-auto">
                {filteredGifts.map((gift) => {
                    const canAfford = balance >= gift.price;

                    return (
                        <button
                            key={gift.id}
                            onClick={() => sendGift(gift)}
                            disabled={!canAfford || sending}
                            className={`
                                relative p-2 rounded-xl transition-all duration-200 flex flex-col items-center
                                ${canAfford
                                    ? `bg-gradient-to-br ${gift.color} bg-opacity-20 hover:scale-105 active:scale-95`
                                    : "bg-white/5 opacity-40 cursor-not-allowed"
                                }
                            `}
                        >
                            <span className="text-2xl">{gift.icon}</span>
                            <span className="text-[10px] text-white/80 truncate w-full text-center">{gift.name}</span>
                            <span className="text-[10px] text-yellow-400 font-bold">{formatPrice(gift.price)}</span>

                            {/* Luxury/Epic badge */}
                            {gift.category === "epic" && (
                                <span className="absolute -top-1 -right-1 text-[8px] bg-purple-500 px-1 rounded">✨</span>
                            )}
                            {gift.category === "luxury" && (
                                <span className="absolute -top-1 -right-1 text-[8px] bg-yellow-500 text-black px-1 rounded">VIP</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Recent Gifts */}
            {recentGifts.length > 0 && (
                <div className="p-2 border-t border-white/10 space-y-1">
                    {recentGifts.map((gift, i) => (
                        <div
                            key={gift.timestamp || i}
                            className={`flex items-center gap-2 bg-gradient-to-r ${gift.color || "from-purple-500/20 to-pink-500/20"} rounded-lg px-2 py-1 animate-pulse`}
                        >
                            <span className="text-lg">{gift.icon}</span>
                            <span className="text-xs truncate">
                                <span className="text-cyan-400 font-semibold">{gift.senderUsername}</span>
                                <span className="text-white/60"> → </span>
                                <span className="text-yellow-400">{gift.item}</span>
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Tip */}
            <p className="text-white/30 text-[10px] text-center py-2 border-t border-white/10">
                Tap a gift to send to {hostUsername || "host"} • Gifts over 1K need confirmation
            </p>
        </div>
    );
}