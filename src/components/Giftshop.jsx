// src/components/GiftShop.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Gift, Search, Send, Trophy, Heart } from "lucide-react";
import api from "../api/api";

// Default gifts if API doesn't provide them
const DEFAULT_GIFTS = [
    { name: "Rose", icon: "🌹", price: 10, image: "/defaults/gifts/rose.png" },
    { name: "Heart", icon: "❤️", price: 25, image: "/defaults/gifts/heart.png" },
    { name: "Star", icon: "⭐", price: 50, image: "/defaults/gifts/star.png" },
    { name: "Diamond", icon: "💎", price: 100, image: "/defaults/gifts/diamond.png" },
    { name: "Crown", icon: "👑", price: 250, image: "/defaults/gifts/crown.png" },
    { name: "Rocket", icon: "🚀", price: 500, image: "/defaults/gifts/rocket.png" },
    { name: "Trophy", icon: "🏆", price: 1000, image: "/defaults/gifts/trophy.png" },
    { name: "Universe", icon: "🌌", price: 5000, image: "/defaults/gifts/universe.png" },
];

export default function GiftShop() {
    const navigate = useNavigate();

    // Get current user from localStorage
    const [currentUser, setCurrentUser] = useState(null);
    const [userBalance, setUserBalance] = useState(0);

    // Gift shop state
    const [availableGifts, setAvailableGifts] = useState(DEFAULT_GIFTS);
    const [recipient, setRecipient] = useState(null);
    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedGift, setSelectedGift] = useState(null);
    const [amount, setAmount] = useState(1);
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    // History
    const [sentGifts, setSentGifts] = useState([]);
    const [receivedGifts, setReceivedGifts] = useState([]);
    const [topSenders, setTopSenders] = useState([]);
    const [topReceivers, setTopReceivers] = useState([]);
    const [activeTab, setActiveTab] = useState("send"); // send | sent | received | leaderboard

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

    // Fetch available gifts
    useEffect(() => {
        const fetchGifts = async () => {
            try {
                const res = await api.get("/gifts/available-items");
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setAvailableGifts(res.data);
                }
            } catch (err) {
                console.log("Using default gifts");
            }
        };
        fetchGifts();
    }, []);

    // User search with debounce
    useEffect(() => {
        if (userSearch.length < 2) {
            setUserResults([]);
            return;
        }

        setSearching(true);
        const delay = setTimeout(async () => {
            try {
                const res = await api.get(`/users?q=${encodeURIComponent(userSearch)}&limit=5`);
                const users = res.data.users || res.data || [];
                // Filter out current user
                const filtered = users.filter(u => u._id !== currentUser?._id && u._id !== currentUser?.id);
                setUserResults(filtered);
            } catch (err) {
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
            const [sentRes, receivedRes, sendersRes, receiversRes] = await Promise.allSettled([
                api.get("/gifts/sent"),
                api.get("/gifts/received"),
                api.get("/gifts/leaderboard/senders"),
                api.get("/gifts/leaderboard/receivers"),
            ]);

            if (sentRes.status === "fulfilled") setSentGifts(sentRes.value.data || []);
            if (receivedRes.status === "fulfilled") setReceivedGifts(receivedRes.value.data || []);
            if (sendersRes.status === "fulfilled") setTopSenders(sendersRes.value.data || []);
            if (receiversRes.status === "fulfilled") setTopReceivers(receiversRes.value.data || []);
        } catch (err) {
            console.error("Failed to fetch history:", err);
        }
    }, [currentUser]);

    useEffect(() => {
        if (currentUser) fetchHistory();
    }, [currentUser, fetchHistory]);

    // Calculate total cost
    const totalCost = selectedGift ? selectedGift.price * amount : 0;
    const canAfford = userBalance >= totalCost;

    // Send gift
    const handleSendGift = async () => {
        if (!currentUser) {
            toast.error("Please log in to send gifts");
            navigate("/login");
            return;
        }

        if (!recipient) {
            toast.error("Please select a recipient");
            return;
        }

        if (!selectedGift) {
            toast.error("Please choose a gift");
            return;
        }

        if (amount < 1) {
            toast.error("Amount must be at least 1");
            return;
        }

        if (!canAfford) {
            toast.error("Insufficient balance");
            return;
        }

        setSending(true);

        try {
            await api.post("/gifts", {
                recipientId: recipient._id,
                item: selectedGift.name,
                amount,
                message: message.trim(),
            });

            toast.success(`🎁 Gift sent to ${recipient.username}!`);

            // Update balance locally
            setUserBalance(prev => prev - totalCost);

            // Reset form
            setRecipient(null);
            setUserSearch("");
            setSelectedGift(null);
            setAmount(1);
            setMessage("");

            // Refresh history
            fetchHistory();
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to send gift";
            toast.error(errorMsg);
        } finally {
            setSending(false);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return "";
        return new Date(dateString).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Not logged in
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-4">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-md">
                    <Gift className="w-16 h-16 text-pink-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-4">Gift Shop</h2>
                    <p className="text-white/60 mb-6">Please log in to send and receive gifts</p>
                    <button
                        onClick={() => navigate("/login")}
                        className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl text-white font-semibold"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Gift className="w-8 h-8 text-pink-400" />
                            Gift Shop
                        </h1>
                        <p className="text-white/60 mt-1">Send gifts to your favorite creators</p>
                    </div>

                    {/* Balance */}
                    <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl px-4 py-2">
                        <p className="text-xs text-yellow-400/80">Your Balance</p>
                        <p className="text-xl font-bold text-yellow-400">
                            💰 {userBalance.toLocaleString()} WS-Coins
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {[
                        { id: "send", label: "Send Gift", icon: "🎁" },
                        { id: "sent", label: "Sent", icon: "📤" },
                        { id: "received", label: "Received", icon: "📥" },
                        { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition ${activeTab === tab.id
                                    ? "bg-pink-500 text-white"
                                    : "bg-white/10 text-white/70 hover:bg-white/20"
                                }`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                {/* Send Gift Tab */}
                {activeTab === "send" && (
                    <div className="space-y-6">
                        {/* User Search */}
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Search className="w-5 h-5" /> Find Recipient
                            </h3>

                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search for a user..."
                                    value={userSearch}
                                    onChange={(e) => {
                                        setUserSearch(e.target.value);
                                        setRecipient(null);
                                    }}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 outline-none focus:border-pink-400 transition"
                                />

                                {searching && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-pink-400"></div>
                                    </div>
                                )}
                            </div>

                            {/* Search Results */}
                            {userResults.length > 0 && !recipient && (
                                <div className="mt-2 bg-white/10 rounded-xl overflow-hidden border border-white/20">
                                    {userResults.map((u) => (
                                        <button
                                            key={u._id}
                                            onClick={() => {
                                                setRecipient(u);
                                                setUserSearch(u.username);
                                                setUserResults([]);
                                            }}
                                            className="w-full p-3 flex items-center gap-3 hover:bg-white/10 transition text-left"
                                        >
                                            <img
                                                src={u.avatar || "/defaults/default-avatar.png"}
                                                alt={u.username}
                                                className="w-10 h-10 rounded-full object-cover"
                                                onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                                            />
                                            <div>
                                                <p className="font-semibold">{u.username}</p>
                                                {u.bio && <p className="text-sm text-white/50 truncate">{u.bio}</p>}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Selected Recipient */}
                            {recipient && (
                                <div className="mt-4 flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-3">
                                    <img
                                        src={recipient.avatar || "/defaults/default-avatar.png"}
                                        alt={recipient.username}
                                        className="w-12 h-12 rounded-full object-cover"
                                    />
                                    <div className="flex-1">
                                        <p className="font-semibold text-green-400">Sending to:</p>
                                        <p className="text-white">{recipient.username}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setRecipient(null);
                                            setUserSearch("");
                                        }}
                                        className="p-2 hover:bg-white/10 rounded-lg"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Gift Selection */}
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h3 className="text-lg font-semibold mb-4">Choose a Gift</h3>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {availableGifts.map((gift) => (
                                    <button
                                        key={gift.name}
                                        onClick={() => setSelectedGift(gift)}
                                        className={`p-4 rounded-xl text-center transition ${selectedGift?.name === gift.name
                                                ? "bg-pink-500/20 border-2 border-pink-400"
                                                : "bg-white/5 border border-white/10 hover:bg-white/10"
                                            }`}
                                    >
                                        <span className="text-4xl">{gift.icon}</span>
                                        <p className="font-semibold mt-2">{gift.name}</p>
                                        <p className="text-sm text-yellow-400">{gift.price} 💰</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amount & Message */}
                        {selectedGift && (
                            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
                                <div className="flex flex-wrap gap-4">
                                    <div>
                                        <label className="text-sm text-white/60 block mb-1">Amount</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            value={amount}
                                            onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-24 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white outline-none focus:border-pink-400"
                                        />
                                    </div>

                                    <div className="flex-1">
                                        <label className="text-sm text-white/60 block mb-1">Message (optional)</label>
                                        <input
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Add a message..."
                                            maxLength={100}
                                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 outline-none focus:border-pink-400"
                                        />
                                    </div>
                                </div>

                                {/* Total & Send */}
                                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                    <div>
                                        <p className="text-white/60 text-sm">Total Cost</p>
                                        <p className={`text-2xl font-bold ${canAfford ? "text-yellow-400" : "text-red-400"}`}>
                                            {totalCost.toLocaleString()} 💰
                                        </p>
                                        {!canAfford && (
                                            <p className="text-red-400 text-sm">Insufficient balance</p>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleSendGift}
                                        disabled={!recipient || !canAfford || sending}
                                        className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-pink-400 hover:to-purple-500 transition flex items-center gap-2"
                                    >
                                        {sending ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="w-5 h-5" />
                                                Send Gift
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Sent Gifts Tab */}
                {activeTab === "sent" && (
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-lg font-semibold mb-4">Gifts You've Sent</h3>

                        {sentGifts.length === 0 ? (
                            <p className="text-white/50 text-center py-8">No gifts sent yet</p>
                        ) : (
                            <div className="space-y-3">
                                {sentGifts.map((g) => (
                                    <div key={g._id} className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
                                        <span className="text-3xl">{g.itemIcon || "🎁"}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold">
                                                {g.item} x{g.amount}
                                            </p>
                                            <p className="text-sm text-white/60">
                                                To: {g.recipient?.username || "Unknown"}
                                            </p>
                                            {g.message && (
                                                <p className="text-sm text-white/40 truncate">"{g.message}"</p>
                                            )}
                                        </div>
                                        <div className="text-right text-sm text-white/40">
                                            {formatDate(g.createdAt)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Received Gifts Tab */}
                {activeTab === "received" && (
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                        <h3 className="text-lg font-semibold mb-4">Gifts You've Received</h3>

                        {receivedGifts.length === 0 ? (
                            <p className="text-white/50 text-center py-8">No gifts received yet</p>
                        ) : (
                            <div className="space-y-3">
                                {receivedGifts.map((g) => (
                                    <div key={g._id} className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
                                        <span className="text-3xl">{g.itemIcon || "🎁"}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold">
                                                {g.item} x{g.amount}
                                            </p>
                                            <p className="text-sm text-white/60">
                                                From: {g.sender?.username || "Unknown"}
                                            </p>
                                            {g.message && (
                                                <p className="text-sm text-white/40 truncate">"{g.message}"</p>
                                            )}
                                        </div>
                                        <div className="text-right text-sm text-white/40">
                                            {formatDate(g.createdAt)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Leaderboard Tab */}
                {activeTab === "leaderboard" && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Top Gifters */}
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-yellow-400" />
                                Top Gifters
                            </h3>

                            {topSenders.length === 0 ? (
                                <p className="text-white/50 text-center py-8">No data yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {topSenders.map((entry, i) => (
                                        <div key={entry._id?._id || i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                                            <span className="text-2xl w-8">
                                                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                                            </span>
                                            <img
                                                src={entry._id?.avatar || "/defaults/default-avatar.png"}
                                                alt=""
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold">{entry._id?.username || "Unknown"}</p>
                                                <p className="text-sm text-white/50">
                                                    {entry.count} gifts • {entry.total} 💰
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Top Receivers */}
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Heart className="w-5 h-5 text-pink-400" />
                                Most Gifted
                            </h3>

                            {topReceivers.length === 0 ? (
                                <p className="text-white/50 text-center py-8">No data yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {topReceivers.map((entry, i) => (
                                        <div key={entry._id?._id || i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                                            <span className="text-2xl w-8">
                                                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                                            </span>
                                            <img
                                                src={entry._id?.avatar || "/defaults/default-avatar.png"}
                                                alt=""
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold">{entry._id?.username || "Unknown"}</p>
                                                <p className="text-sm text-white/50">
                                                    {entry.count} gifts • {entry.total} 💰
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}