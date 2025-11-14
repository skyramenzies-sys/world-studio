// GiftPanel.jsx
import React, { useState } from "react";
import { Sparkles, Coins } from "lucide-react";

export default function GiftPanel({ recipient, onSendGift }) {
    const [selectedGift, setSelectedGift] = useState(null);
    const [customAmount, setCustomAmount] = useState("");

    const gifts = [
        { id: 1, name: "Diamond", icon: "💎", amount: 5 },
        { id: 2, name: "Rose", icon: "🌹", amount: 2 },
        { id: 3, name: "Rocket", icon: "🚀", amount: 10 },
        { id: 4, name: "Crown", icon: "👑", amount: 25 },
    ];

    const handleSend = () => {
        let amount = Number(customAmount) || selectedGift?.amount;
        if (!recipient) return alert("No recipient selected!");
        if (!amount || amount <= 0) return alert("Please select a gift or enter a positive amount");
        if (selectedGift) {
            onSendGift({
                recipientId: recipient._id,
                item: selectedGift.name,
                icon: selectedGift.icon,
                amount,
                isCustom: false,
            });
        } else {
            onSendGift({
                recipientId: recipient._id,
                item: "Coins",
                icon: "💰",
                amount,
                isCustom: true,
            });
        }
        setSelectedGift(null);
        setCustomAmount("");
    };

    const isSendDisabled = !recipient || (!selectedGift && (!customAmount || Number(customAmount) <= 0));

    return (
        <div className="bg-white/10 border border-white/20 rounded-xl p-4 mt-4">
            <h3 className="text-lg font-bold mb-3 text-white/80 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Send a Gift to <span className="ml-1 font-semibold">{recipient?.username || "..."}</span>
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
                {gifts.map((gift) => (
                    <button
                        key={gift.id}
                        onClick={() => {
                            setSelectedGift(gift);
                            setCustomAmount("");
                        }}
                        className={`p-3 rounded-xl border ${selectedGift?.id === gift.id
                            ? "bg-yellow-500/30 border-yellow-400"
                            : "bg-white/5 border-white/10 hover:bg-white/10"
                            } transition-all`}
                        type="button"
                    >
                        <div className="text-xl">{gift.icon}</div>
                        <div className="text-sm text-white/80 font-semibold">{gift.name}</div>
                        <div className="text-sm text-white/70">{gift.amount} WS-Coins</div>
                    </button>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    type="number"
                    min="1"
                    placeholder="Custom coin amount"
                    value={customAmount}
                    onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedGift(null);
                    }}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-white/50 outline-none"
                />
                <button
                    onClick={handleSend}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg text-black font-bold"
                    disabled={isSendDisabled}
                    type="button"
                >
                    <Coins className="w-4 h-4" /> Send
                </button>
            </div>
        </div>
    );
}
