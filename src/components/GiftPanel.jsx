import React, { useState } from "react";
import { Sparkles, Coins } from "lucide-react";

// 1. Cosmic Stars
function CosmicStars() {
    const stars = Array.from({ length: 40 });
    return (
        <div aria-hidden className="absolute inset-0 z-0 pointer-events-none">
            {stars.map((_, i) => (
                <div
                    key={i}
                    style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 3}s`,
                        width: `${Math.random() * 2 + 1}px`,
                        height: `${Math.random() * 2 + 1}px`,
                    }}
                    className="absolute rounded-full bg-white/80 animate-star-twinkle"
                />
            ))}
        </div>
    );
}

// 2. Floating Gift Icons
function FloatingIcons() {
    const icons = ["💎", "🌹", "🚀", "👑", "🕳️"];
    return (
        <div aria-hidden className="absolute inset-0 pointer-events-none z-0">
            {icons.map((icon, idx) => (
                <div
                    key={idx}
                    style={{
                        top: `${Math.random() * 80 + 5}%`,
                        left: `${Math.random() * 80 + 5}%`,
                        fontSize: `${Math.random() * 1.7 + 1.3}rem`,
                        opacity: 0.14 + Math.random() * 0.16,
                        animation: `floatIcon ${2 + Math.random() * 6}s ease-in-out infinite alternate`,
                        position: "absolute"
                    }}
                >
                    {icon}
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

// 3. Meteor Shower
function CosmicMeteors() {
    const meteors = Array.from({ length: 8 });
    return (
        <div aria-hidden className="absolute inset-0 z-0 pointer-events-none">
            {meteors.map((_, i) => (
                <div
                    key={i}
                    style={{
                        top: `${Math.random() * 80 + 10}%`,
                        left: `${Math.random() * 80 + 10}%`,
                        animationDelay: `${Math.random() * 4}s`,
                        animationDuration: `${Math.random() * 1 + 1.5}s`,
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

// 4. Animated Black Hole
function AnimatedBlackHole({ active }) {
    return (
        <svg
            className={`absolute -top-24 right-0 w-[280px] h-[280px] z-0 pointer-events-none transition-all duration-700
        ${active ? "opacity-100 scale-110 brightness-100" : "opacity-80 scale-100 brightness-75"}
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
                fill="black"
                style={{
                    filter: "blur(7px)",
                    opacity: 0.8,
                    animation: "none",
                }}
            />
            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
      `}</style>
        </svg>
    );
}

// 5. Cosmic Avatar
function CosmicAvatar({ username }) {
    return (
        <span className="inline-block align-middle mr-2">
            <svg width="28" height="28" viewBox="0 0 32 32" className="inline-block align-middle">
                <circle cx="16" cy="16" r="13" fill="#6d28d9" />
                <ellipse cx="16" cy="16" rx="14" ry="6" fill="#c084fc77" />
                <circle cx="19" cy="13" r="2" fill="#fff" />
            </svg>
            <span className="text-white font-bold align-middle">{username}</span>
        </span>
    );
}

// 6. The Main GiftPanel
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
        let amount = Number(customAmount) || selectedGift?.amount;
        if (!recipient) return alert("No recipient selected!");
        if (!amount || amount <= 0) return alert("Please select a gift or enter a positive amount");

        onSendGift(
            selectedGift
                ? {
                    recipientId: recipient._id,
                    item: selectedGift.name,
                    icon: selectedGift.icon,
                    amount,
                    isCustom: false,
                }
                : {
                    recipientId: recipient._id,
                    item: "Coins",
                    icon: "💰",
                    amount,
                    isCustom: true,
                }
        );

        // Trigger warp tunnel if Black Hole is sent
        if (selectedGift?.name === "Black Hole") {
            setWarp(true);
            setTimeout(() => setWarp(false), 1000);
        }

        setSelectedGift(null);
        setCustomAmount("");
    };

    const isSendDisabled = !recipient || (!selectedGift && (!customAmount || Number(customAmount) <= 0));
    const blackHoleActive = selectedGift?.name === "Black Hole";

    return (
        <div
            className={`
        relative overflow-hidden rounded-xl border border-purple-800/60 p-5 mt-4
        shadow-[0_0_80px_10px_#5a189a55]
        bg-gradient-to-br from-black via-gray-900 to-purple-900
        transition-all duration-700
        ${blackHoleActive ? "ring-4 ring-purple-700 scale-105" : ""}
        ${warp ? "animate-warp" : ""}
      `}
            style={{
                filter: blackHoleActive
                    ? "brightness(0.8) contrast(1.2) saturate(1.6)"
                    : "none",
            }}
        >
            <CosmicStars />
            <FloatingIcons />
            <CosmicMeteors />
            <AnimatedBlackHole active={blackHoleActive} />

            <h3 className="text-xl font-extrabold mb-4 text-purple-200 flex items-center gap-2 z-10 relative">
                <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" aria-hidden />
                Send a Gift to{" "}
                <span className="ml-2">
                    <CosmicAvatar username={recipient?.username || "..."} />
                </span>
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4 z-10 relative">
                {gifts.map((gift) => (
                    <button
                        key={gift.id}
                        aria-label={`Select ${gift.name}`}
                        onClick={() => {
                            setSelectedGift(gift);
                            setCustomAmount("");
                        }}
                        className={`
              p-4 rounded-xl border-2 shadow-lg transition-all relative group
              outline-none
              ${selectedGift?.id === gift.id
                                ? "bg-purple-700/80 border-yellow-400 scale-110 ring-2 ring-yellow-400"
                                : "bg-black/60 border-purple-900 hover:bg-purple-900/70"
                            }
              ${gift.name === "Black Hole" ? "animate-bh-pulse" : ""}
            `}
                        tabIndex={0}
                        type="button"
                        style={{
                            boxShadow:
                                selectedGift?.id === gift.id
                                    ? "0 0 24px 8px #c084fcaa"
                                    : "0 0 10px 2px #6d28d9bb",
                            zIndex: selectedGift?.id === gift.id ? 2 : 1,
                            position: "relative",
                        }}
                    >
                        <span
                            className={`text-3xl flex justify-center transition-all
                ${selectedGift?.id === gift.id ? "drop-shadow-[0_0_12px_#fff8]" : ""}
                ${gift.name === "Black Hole" && selectedGift?.id === gift.id
                                    ? "animate-bh-wave"
                                    : ""}
              `}
                            aria-hidden
                        >
                            {gift.icon}
                        </span>
                        <div className="text-base text-purple-100 font-bold text-center">{gift.name}</div>
                        <div className="text-sm text-purple-300 text-center">{gift.amount} WS-Coins</div>
                        {gift.name === "Black Hole" && (
                            <div className="absolute bottom-2 right-2 text-xs text-purple-400 italic">Ultimate!</div>
                        )}
                    </button>
                ))}
            </div>
            <div className="flex gap-2 z-10 relative">
                <input
                    type="number"
                    min="1"
                    placeholder="Custom coin amount"
                    aria-label="Custom coin amount"
                    value={customAmount}
                    onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setSelectedGift(null);
                    }}
                    className="flex-1 bg-black/60 border border-purple-700 rounded-lg px-3 py-2 text-white placeholder-purple-300 outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                    onClick={handleSend}
                    className={`
            flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-black rounded-lg text-white font-bold shadow-lg
            transition-all duration-300
            ${blackHoleActive ? "animate-bh-pulse bg-gradient-to-r from-black via-purple-800 to-black" : ""}
          `}
                    disabled={isSendDisabled}
                    type="button"
                >
                    <Coins className="w-5 h-5 text-yellow-300" aria-hidden /> Send
                </button>
            </div>

            {/* Custom CSS for cosmic effects */}
            <style>{`
        @keyframes star-twinkle {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        .animate-star-twinkle {
          animation: star-twinkle 2.6s infinite alternate;
        }
        @keyframes bh-pulse {
          0%, 100% { box-shadow: 0 0 32px 12px #a21caf66, 0 0 0px 0 #fff0; }
          50% { box-shadow: 0 0 64px 24px #c084fcbb, 0 0 24px 8px #fff3; }
        }
        .animate-bh-pulse {
          animation: bh-pulse 2s infinite;
        }
        @keyframes bh-wave {
          0% { filter: drop-shadow(0 0 0px #fff5);}
          30% { filter: drop-shadow(0 0 18px #c084fc);}
          60% { filter: drop-shadow(0 0 6px #fff2);}
          100% { filter: drop-shadow(0 0 0px #fff5);}
        }
        .animate-bh-wave {
          animation: bh-wave 1.2s infinite;
        }
        @keyframes warp {
          0% { filter: blur(0px) brightness(1);}
          40% { filter: blur(6px) brightness(1.6) contrast(2);}
          100% { filter: blur(0px) brightness(1);}
        }
        .animate-warp { animation: warp 1s cubic-bezier(.4,2,.6,.85); }
      `}</style>
        </div>
    );
}