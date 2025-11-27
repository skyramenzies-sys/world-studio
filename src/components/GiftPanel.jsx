// src/components/GiftPanel.jsx
import React, { useState, useMemo, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Sparkles, Coins, X } from "lucide-react";
import api from "../api/api";
import socket from "../api/socket";

/* ============================================================
   1. STARFIELD
   ============================================================ */
function CosmicStars() {
    const stars = useMemo(() =>
        Array.from({ length: 40 }).map(() => ({
            top: Math.random() * 100,
            left: Math.random() * 100,
            size: Math.random() * 2 + 1,
            delay: Math.random() * 3,
        })), []
    );

    return (
        <div aria-hidden className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
            {stars.map((s, i) => (
                <div
                    key={i}
                    style={{
                        top: `${s.top}%`,
                        left: `${s.left}%`,
                        width: s.size,
                        height: s.size,
                        animationDelay: `${s.delay}s`,
                    }}
                    className="absolute rounded-full bg-white/80 animate-pulse"
                />
            ))}
        </div>
    );
}

/* ============================================================
   2. FLOATING ICONS
   ============================================================ */
function FloatingIcons() {
    const icons = useMemo(() =>
        ["💎", "🌹", "🚀", "👑", "⭐"].map(icon => ({
            icon,
            top: Math.random() * 80 + 5,
            left: Math.random() * 80 + 5,
            size: Math.random() * 1.5 + 1,
            opacity: 0.1 + Math.random() * 0.15,
            duration: 3 + Math.random() * 4
        })), []
    );

    return (
        <div aria-hidden className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
            {icons.map((i, idx) => (
                <div
                    key={idx}
                    style={{
                        top: `${i.top}%`,
                        left: `${i.left}%`,
                        fontSize: `${i.size}rem`,
                        opacity: i.opacity,
                        animation: `floatIcon ${i.duration}s ease-in-out infinite alternate`,
                    }}
                    className="absolute"
                >
                    {i.icon}
                </div>
            ))}
        </div>
    );
}

/* ============================================================
   3. AVATAR
   ============================================================ */
function CosmicAvatar({ username, avatar }) {
    return (
        <span className="inline-flex items-center gap-2">
            {avatar ? (
                <img
                    src={avatar}
                    alt={username}
                    className="w-7 h-7 rounded-full object-cover border border-purple-400"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
            ) : (
                <svg width="28" height="28" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="13" fill="#6d28d9" />
                    <ellipse cx="16" cy="16" rx="14" ry="6" fill="#c084fc77" />
                    <circle cx="19" cy="13" r="2" fill="#fff" />
                </svg>
            )}
            <span className="text-white font-bold">{username || "..."}</span>
        </span>
    );
}

/* ============================================================
   4. MAIN PANEL
   ============================================================ */
export default function GiftPanel({ recipient, onClose, onGiftSent }) {
    // Get current user from localStorage
    const [currentUser, setCurrentUser] = useState(null);
    const [userBalance, setUserBalance] = useState(0);

    const [selectedGift, setSelectedGift] = useState(null);
    const [customAmount, setCustomAmount] = useState("");
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);
    const [warp, setWarp] = useState(false);

    // Default gifts
    const gifts = [
        { id: 1, name: "Rose", icon: "🌹", amount: 10 },
        { id: 2, name: "Heart", icon: "❤️", amount: 25 },
        { id: 3, name: "Diamond", icon: "💎", amount: 50 },
        { id: 4, name: "Crown", icon: "👑", amount: 100 },
        { id: 5, name: "Rocket", icon: "🚀", amount: 250 },
        { id: 6, name: "Universe", icon: "🌌", amount: 500 },
    ];

    // Load user from localStorage
    useEffect(() => {
        const storedUser = localStorage.getItem("ws_currentUser");
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                setCurrentUser(user);
                setUserBalance(user.wallet?.balance || 0);
            } catch (e) {
                console.error("Failed to parse user:", e);
            }
        }
    }, []);

    // Calculate total
    const totalAmount = selectedGift?.amount || Number(customAmount) || 0;
    const canAfford = userBalance >= totalAmount;

    // Send gift handler
    const handleSend = async () => {
        if (!currentUser) {
            toast.error("Please log in to send gifts");
            return;
        }

        if (!recipient) {
            toast.error("No recipient selected");
            return;
        }

        if (!totalAmount || totalAmount <= 0) {
            toast.error("Please select a gift or enter an amount");
            return;
        }

        if (!canAfford) {
            toast.error("Insufficient balance");
            return;
        }

        setSending(true);

        try {
            const giftData = {
                recipientId: recipient._id || recipient.id,
                item: selectedGift?.name || "Coins",
                amount: totalAmount,
                message: message.trim(),
            };

            await api.post("/gifts", giftData);

            // Emit socket event for realtime notification
            socket.emit("gift_sent", {
                ...giftData,
                senderUsername: currentUser.username,
                recipientUsername: recipient.username,
                icon: selectedGift?.icon || "💰",
            });

            // Update local balance
            setUserBalance(prev => prev - totalAmount);

            // Trigger warp effect for special gifts
            if (selectedGift?.name === "Universe" || totalAmount >= 500) {
                setWarp(true);
                setTimeout(() => setWarp(false), 1000);
            }

            toast.success(`🎁 Sent ${selectedGift?.icon || "💰"} to ${recipient.username}!`);

            // Reset form
            setSelectedGift(null);
            setCustomAmount("");
            setMessage("");

            // Callback
            onGiftSent?.({
                ...giftData,
                icon: selectedGift?.icon || "💰",
            });

        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to send gift";
            toast.error(errorMsg);
        } finally {
            setSending(false);
        }
    };

    const sendDisabled = !recipient || !currentUser || totalAmount <= 0 || !canAfford || sending;

    // If no recipient, show minimal state
    if (!recipient) {
        return (
            <div className="relative overflow-hidden rounded-xl border border-purple-800/60 p-5 bg-gradient-to-br from-black via-gray-900 to-purple-900">
                <CosmicStars />
                <div className="relative z-10 text-center py-8">
                    <p className="text-purple-300">Select a user to send them a gift</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`
                relative overflow-hidden rounded-xl border border-purple-800/60 p-5
                bg-gradient-to-br from-black via-gray-900 to-purple-900 shadow-xl
                transition-all duration-500
                ${warp ? "scale-105 ring-4 ring-purple-500" : ""}
            `}
        >
            {/* Background Effects */}
            <CosmicStars />
            <FloatingIcons />

            {/* Close button */}
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
                >
                    <X className="w-4 h-4" />
                </button>
            )}

            {/* Header */}
            <div className="relative z-10 mb-4">
                <h3 className="text-xl font-extrabold text-purple-200 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                    Send Gift
                </h3>
                <div className="flex items-center justify-between mt-2">
                    <span className="text-white/60">To: </span>
                    <CosmicAvatar username={recipient.username} avatar={recipient.avatar} />
                </div>
            </div>

            {/* Balance */}
            <div className="relative z-10 mb-4 bg-black/40 rounded-lg p-3 border border-yellow-500/30">
                <div className="flex items-center justify-between">
                    <span className="text-yellow-400/80 text-sm">Your Balance</span>
                    <span className="text-yellow-400 font-bold">
                        💰 {userBalance.toLocaleString()} WS-Coins
                    </span>
                </div>
            </div>

            {/* Gift Grid */}
            <div className="grid grid-cols-3 gap-2 mb-4 relative z-10">
                {gifts.map((gift) => (
                    <button
                        key={gift.id}
                        onClick={() => {
                            setSelectedGift(gift);
                            setCustomAmount("");
                        }}
                        disabled={userBalance < gift.amount}
                        className={`
                            p-3 rounded-xl border-2 transition-all
                            ${selectedGift?.id === gift.id
                                ? "bg-purple-700/80 border-yellow-400 scale-105 ring-2 ring-yellow-400"
                                : userBalance < gift.amount
                                    ? "bg-black/30 border-gray-700 opacity-50 cursor-not-allowed"
                                    : "bg-black/60 border-purple-900 hover:bg-purple-900/70 hover:border-purple-600"
                            }
                        `}
                        type="button"
                    >
                        <span className="text-2xl flex justify-center mb-1">
                            {gift.icon}
                        </span>
                        <div className="text-xs text-purple-100 text-center font-bold truncate">
                            {gift.name}
                        </div>
                        <div className="text-xs text-purple-300 text-center">
                            {gift.amount} 💰
                        </div>
                    </button>
                ))}
            </div>

            {/* Custom amount */}
            <div className="relative z-10 space-y-3">
                <div>
                    <label className="text-xs text-purple-300 block mb-1">Or enter custom amount</label>
                    <input
                        type="number"
                        min="1"
                        placeholder="Amount in WS-Coins"
                        value={customAmount}
                        onChange={(e) => {
                            setCustomAmount(e.target.value);
                            setSelectedGift(null);
                        }}
                        className="w-full bg-black/60 border border-purple-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                </div>

                {/* Message */}
                <div>
                    <label className="text-xs text-purple-300 block mb-1">Message (optional)</label>
                    <input
                        type="text"
                        placeholder="Add a message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        maxLength={100}
                        className="w-full bg-black/60 border border-purple-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                </div>

                {/* Total & Send */}
                <div className="flex items-center justify-between pt-2 border-t border-purple-800">
                    <div>
                        <span className="text-purple-300 text-sm">Total: </span>
                        <span className={`font-bold ${canAfford ? "text-yellow-400" : "text-red-400"}`}>
                            {totalAmount.toLocaleString()} 💰
                        </span>
                        {!canAfford && totalAmount > 0 && (
                            <p className="text-red-400 text-xs">Insufficient balance</p>
                        )}
                    </div>

                    <button
                        onClick={handleSend}
                        disabled={sendDisabled}
                        className={`
                            flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-bold
                            transition-all
                            ${sendDisabled
                                ? "bg-gray-700 cursor-not-allowed opacity-50"
                                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-lg hover:shadow-purple-500/30"
                            }
                        `}
                    >
                        {sending ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Sending...
                            </>
                        ) : (
                            <>
                                <Coins className="w-5 h-5 text-yellow-300" />
                                Send
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Keyframes */}
            <style>{`
                @keyframes floatIcon {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-15px); }
                }
            `}</style>
        </div>
    );
}