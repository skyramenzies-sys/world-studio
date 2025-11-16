import React, { useState, useMemo } from "react";
import { Sparkles, Coins } from "lucide-react";

/* ============================================================
   1. STARFIELD (pre-generated so it doesn't flicker each render)
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
        <div aria-hidden className="absolute inset-0 z-0 pointer-events-none">
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
                    className="absolute rounded-full bg-white/80 animate-star-twinkle"
                />
            ))}
        </div>
    );
}

/* ============================================================
   2. FLOATING ICONS – no random on every render
   ============================================================ */
function FloatingIcons() {
    const icons = useMemo(() =>
        ["💎", "🌹", "🚀", "👑", "🕳️"].map(icon => ({
            icon,
            top: Math.random() * 80 + 5,
            left: Math.random() * 80 + 5,
            size: Math.random() * 1.7 + 1.3,
            opacity: 0.14 + Math.random() * 0.16,
            duration: 2 + Math.random() * 6
        })), []
    );

    return (
        <div aria-hidden className="absolute inset-0 pointer-events-none z-0">
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

            <style>{`
                @keyframes floatIcon {
                  0% { transform: translateY(0);}
                  100% { transform: translateY(-18px);}
                }
            `}</style>
        </div>
    );
}

/* ============================================================
   3. METEORS
   ============================================================ */
function CosmicMeteors() {
    const meteors = useMemo(() =>
        Array.from({ length: 8 }).map(() => ({
            top: Math.random() * 80 + 10,
            left: Math.random() * 80 + 10,
            delay: Math.random() * 4,
            duration: Math.random() * 1 + 1.5,
        })), []
    );

    return (
        <div aria-hidden className="absolute inset-0 z-0 pointer-events-none">
            {meteors.map((m, i) => (
                <div
                    key={i}
                    style={{
                        top: `${m.top}%`,
                        left: `${m.left}%`,
                        animationDelay: `${m.delay}s`,
                        animationDuration: `${m.duration}s`,
                    }}
                    className="absolute w-0.5 h-20 bg-gradient-to-b from-white/80 to-purple-500/0 rounded-full animate-meteor"
                />
            ))}

            <style>{`
                @keyframes meteor {
                  0% { transform: translateY(-100px) scaleX(1);}
                  100% { transform: translateY(100px) scaleX(1.8);}
                }
                .animate-meteor {
                  animation: meteor linear infinite;
                }
            `}</style>
        </div>
    );
}

/* ============================================================
   4. ANIMATED BLACK HOLE
   ============================================================ */
function AnimatedBlackHole({ active }) {
    return (
        <svg
            className={`absolute -top-24 right-0 w-[280px] h-[280px] pointer-events-none transition-all duration-700 z-0
            ${active ? "opacity-100 scale-110" : "opacity-80 scale-100"}
            `}
            viewBox="0 0 280 280"
        >
            <radialGradient id="bh-gradient" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.04" />
                <stop offset="60%" stopColor="#7b2ff2" stopOpacity="0.08" />
                <stop offset="90%" stopColor="#000" stopOpacity="0.7" />
            </radialGradient>

            <circle
                cx="140"
                cy="140"
                r="120"
                fill="url(#bh-gradient)"
                style={{
                    filter: "blur(4px)",
                    transformOrigin: "center",
                    animation: "spin 5s linear infinite",
                }}
            />

            <circle
                cx="140"
                cy="140"
                r="60"
                fill="#000"
                style={{ filter: "blur(7px)", opacity: 0.8 }}
            />

            <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg);}
                  to   { transform: rotate(360deg);}
                }
            `}</style>
        </svg>
    );
}

/* ============================================================
   5. AVATAR
   ============================================================ */
function CosmicAvatar({ username }) {
    return (
        <span className="inline-flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="13" fill="#6d28d9" />
                <ellipse cx="16" cy="16" rx="14" ry="6" fill="#c084fc77" />
                <circle cx="19" cy="13" r="2" fill="#fff" />
            </svg>
            <span className="text-white font-bold">{username}</span>
        </span>
    );
}

/* ============================================================
   6. MAIN PANEL
   ============================================================ */
export default function GiftPanel({ recipient, onSendGift }) {
    const [selectedGift, setSelectedGift] = useState(null);
    const [customAmount, setCustomAmount] = useState("");
    const [warp, setWarp] = useState(false);

    const gifts = [
        { id: 1, name: "Diamond", icon: "💎", amount: 5 },
        { id: 2, name: "Rose", icon: "🌹", amount: 2 },
        { id: 3, name: "Rocket", icon: "🚀", amount: 10 },
        { id: 4, name: "Crown", icon: "👑", amount: 25 },
        { id: 5, name: "Black Hole", icon: "🕳️", amount: 50 },
    ];

    const handleSend = () => {
        const amount = Number(customAmount) || selectedGift?.amount;

        if (!recipient) return alert("No recipient selected!");
        if (!amount || amount <= 0) return alert("Enter a valid amount");

        onSendGift({
            recipientId: recipient._id,
            item: selectedGift?.name || "Coins",
            icon: selectedGift?.icon || "💰",
            amount,
            isCustom: !selectedGift,
        });

        if (selectedGift?.name === "Black Hole") {
            setWarp(true);
            setTimeout(() => setWarp(false), 1000);
        }

        setSelectedGift(null);
        setCustomAmount("");
    };

    const sendDisabled = !recipient || (!selectedGift && (!customAmount || customAmount <= 0));
    const blackHole = selectedGift?.name === "Black Hole";

    return (
        <div
            className={`
                relative overflow-hidden rounded-xl border border-purple-800/60 p-5 mt-4
                bg-gradient-to-br from-black via-gray-900 to-purple-900 shadow-xl
                transition-all duration-700
                ${blackHole ? "ring-4 ring-purple-700 scale-105" : ""}
                ${warp ? "animate-warp" : ""}
            `}
        >
            {/* Background Effects */}
            <CosmicStars />
            <FloatingIcons />
            <CosmicMeteors />
            <AnimatedBlackHole active={blackHole} />

            {/* Header */}
            <h3 className="text-xl font-extrabold mb-4 text-purple-200 flex items-center gap-2 relative z-10">
                <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
                Send a Gift to <CosmicAvatar username={recipient?.username || "..."} />
            </h3>

            {/* Gift Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                {gifts.map((gift) => (
                    <button
                        key={gift.id}
                        onClick={() => {
                            setSelectedGift(gift);
                            setCustomAmount("");
                        }}
                        className={`
                            p-4 rounded-xl border-2 shadow-lg transition-all
                            ${selectedGift?.id === gift.id
                                ? "bg-purple-700/80 border-yellow-400 scale-110 ring-2 ring-yellow-400"
                                : "bg-black/60 border-purple-900 hover:bg-purple-900/70"}
                            ${gift.name === "Black Hole" ? "animate-bh-pulse" : ""}
                        `}
                        type="button"
                    >
                        <span className="text-3xl flex justify-center mb-1">
                            {gift.icon}
                        </span>
                        <div className="text-base text-purple-100 text-center font-bold">
                            {gift.name}
                        </div>
                        <div className="text-sm text-purple-300 text-center">
                            {gift.amount} WS-Coins
                        </div>
                    </button>
                ))}
            </div>

            {/* Custom amount + send */}
            <div className="flex gap-2 relative z-10">
                <input
                    type="number"
                    min="1"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedGift(null);
                    }}
                    className="flex-1 bg-black/60 border border-purple-700 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                    onClick={handleSend}
                    disabled={sendDisabled}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold
                        bg-gradient-to-r from-purple-600 to-black shadow-lg
                        ${blackHole ? "animate-bh-pulse" : ""}
                    `}
                >
                    <Coins className="w-5 h-5 text-yellow-300" /> Send
                </button>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes star-twinkle {
                  0%,100% { opacity: .7; }
                  50% { opacity: 1; }
                }
                .animate-star-twinkle { animation: star-twinkle 2.6s infinite alternate; }

                @keyframes bh-pulse {
                  0%,100% { box-shadow: 0 0 32px 12px #a21caf66; }
                  50% { box-shadow: 0 0 64px 24px #c084fcbb; }
                }
                .animate-bh-pulse { animation: bh-pulse 2s infinite; }

                @keyframes warp {
                  0% { filter: blur(0) brightness(1);}
                  40% { filter: blur(6px) brightness(1.6) contrast(2);}
                  100% { filter: blur(0) brightness(1);}
                }
                .animate-warp { animation: warp 1s cubic-bezier(.4,2,.6,.85); }
            `}</style>
        </div>
    );
}
