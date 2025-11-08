import React, { useState } from "react";
import { Sparkles, Coins } from "lucide-react";

export default function GiftPanel({ onSendGift }) {
    const [selectedGift, setSelectedGift] = useState(null);
    const [customAmount, setCustomAmount] = useState("");

    const gifts = [
        { id: 1, name: "💎 Diamond", amount: 5 },
        { id: 2, name: "🌹 Rose", amount: 2 },
        { id: 3, name: "🚀 Rocket", amount: 10 },
        { id: 4, name: "👑 Crown", amount: 25 },
    ];

    const handleSend = () => {
        const amount = customAmount || selectedGift?.amount;
        if (!amount) return alert("Select a gift or enter amount");
        onSendGift(amount, selectedGift?.name || "💰 Custom Gift");
        setSelectedGift(null);
        setCustomAmount("");
    };

    return (
        <div className="bg-white/10 border border-white/20 rounded-xl p-4 mt-4">
            <h3 className="text-lg font-bold mb-3 text-white/80 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Send a Gift
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
                {gifts.map((gift) => (
                    <button
                        key={gift.id}
                        onClick={() => setSelectedGift(gift)}
                        className={`p-3 rounded-xl border ${selectedGift?.id === gift.id
                                ? "bg-yellow-500/30 border-yellow-400"
                                : "bg-white/5 border-white/10 hover:bg-white/10"
                            } transition-all`}
                    >
                        <div className="text-xl">{gift.name}</div>
                        <div className="text-sm text-white/70">${gift.amount}</div>
                    </button>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="number"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 outline-none"
                />
                <button
                    onClick={handleSend}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg text-black font-bold"
                >
                    <Coins className="w-4 h-4" /> Send
                </button>
            </div>
        </div>
    );
}
