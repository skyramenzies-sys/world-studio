// src/components/PKBattle.jsx - WORLD STUDIO LIVE ULTIMATE EDITION ⚔️
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import socket from "../api/socket";

/* ============================================================
   WORLD STUDIO LIVE CONFIGURATION
   ============================================================ */

// Basis-URL uit env of fallback (voor avatars)
const RAW_BASE_URL =
    import.meta.env.VITE_API_URL ||
    "https://world-studio-production.up.railway.app";

// Strip eventueel /api en trailing slash
const BASE_URL = RAW_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");



// Avatar helper
const resolveAvatar = (url) => {
    if (!url) return `${BASE_URL}/defaults/default-avatar.png`;
    if (url.startsWith("http")) return url;
    return `${BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};



/* ============================================================
   GIFT DEFINITIONS
   ============================================================ */
const GIFTS = [
    { id: "rose", name: "Rose", emoji: "🌹", coins: 1 },
    { id: "heart", name: "Heart", emoji: "💖", coins: 5 },
    { id: "star", name: "Star", emoji: "⭐", coins: 10 },
    { id: "fire", name: "Fire", emoji: "🔥", coins: 50 },
    { id: "diamond", name: "Diamond", emoji: "💎", coins: 100 },
    { id: "crown", name: "Crown", emoji: "👑", coins: 500 },
    { id: "rocket", name: "Rocket", emoji: "🚀", coins: 1000 },
    { id: "universe", name: "Universe", emoji: "🌌", coins: 5000 },
];

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
/**
 * Props:
 * - pk: {
 *     _id, status: "active" | "finished",
 *     endTime,
 *     challenger: { user, score },
 *     opponent: { user, score },
 *     winner: { user } | user
 *   }
 * - currentUserId: string
 * - onSendGift?: (payload) => void
 * - onEndPK?: (pk) => void
 * - challengerStream?: ReactNode (optioneel video component)
 * - opponentStream?: ReactNode (optioneel video component)
 */
export default function PKBattle({
    pk,
    currentUserId,
    onSendGift,
    onEndPK,
    challengerStream,
    opponentStream,
}) {

    const [timeRemaining, setTimeRemaining] = useState(0);
    const [showGiftPanel, setShowGiftPanel] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [giftAnimation, setGiftAnimation] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const timerRef = useRef(null);



    if (!pk) return null;

    /* ------------------------------------------------------------
       NORMALIZE USERS & SCORES
       ------------------------------------------------------------ */
    const challengerUserRaw = pk?.challenger?.user || pk?.challenger || {};
    const opponentUserRaw = pk?.opponent?.user || pk?.opponent || {};

    const challengerUser = {
        ...challengerUserRaw,
        _id: challengerUserRaw._id || challengerUserRaw.id,
        avatar: resolveAvatar(challengerUserRaw.avatar),
    };

    const opponentUser = {
        ...opponentUserRaw,
        _id: opponentUserRaw._id || opponentUserRaw.id,
        avatar: resolveAvatar(opponentUserRaw.avatar),
    };

    const challengerScore = pk?.challenger?.score ?? 0;
    const opponentScore = pk?.opponent?.score ?? 0;

    const totalScoreRaw = challengerScore + opponentScore;
    const totalScore = totalScoreRaw > 0 ? totalScoreRaw : 1;

    const challengerPercent = (challengerScore / totalScore) * 100;
    const opponentPercent = (opponentScore / totalScore) * 100;

    const challengerWinning = challengerScore > opponentScore;
    const opponentWinning = opponentScore > challengerScore;
    const isDraw = challengerScore === opponentScore;

    const isActive = pk.status === "active";

    const challengerId = challengerUser._id;
    const opponentId = opponentUser._id;

    /* ------------------------------------------------------------
       TIMER
       ------------------------------------------------------------ */
    useEffect(() => {
        if (pk?.status === "active" && pk?.endTime) {
            const updateTimer = () => {
                const remaining = Math.max(
                    0,
                    Math.floor(
                        (new Date(pk.endTime) - new Date()) / 1000
                    )
                );
                setTimeRemaining(remaining);

                if (remaining <= 0 && timerRef.current) {
                    clearInterval(timerRef.current);
                }
            };

            updateTimer();
            timerRef.current = setInterval(updateTimer, 1000);

            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        } else {
            setTimeRemaining(0);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    }, [pk?.endTime, pk?.status]);

    /* ------------------------------------------------------------
       RESULT VISIBILITY
       ------------------------------------------------------------ */
    useEffect(() => {
        if (pk?.status === "finished") {
            setShowResult(true);
        }
    }, [pk?.status]);

    /* ------------------------------------------------------------
       HELPERS
       ------------------------------------------------------------ */
    const formatTime = (seconds) => {
        const s = Math.max(0, seconds || 0);
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
    };


    const getStreak = (score1, score2) => {
        if (score1 <= score2) return 0;
        const ratio = score1 / Math.max(score2, 1);
        if (ratio >= 3) return 3;
        if (ratio >= 2) return 2;
        if (ratio > 1) return 1;
        return 0;
    };

    const challengerStreak = getStreak(
        challengerScore,
        opponentScore
    );
    const opponentStreak = getStreak(
        opponentScore,
        challengerScore
    );



    const handleSendGift = (gift) => {
        if (!selectedTarget || !isActive || timeRemaining <= 0)
            return;

        setGiftAnimation({
            gift,
            target: selectedTarget,
        });

        setTimeout(() => setGiftAnimation(null), 1500);

        // Emit via socket (PK-specific event)
        socket.emit("pk_gift", {
            pkId: pk._id,
            targetUserId: selectedTarget,
            giftType: gift.id,
            amount: 1,
            coins: gift.coins,
        });

        onSendGift?.({
            targetUserId: selectedTarget,
            giftType: gift.id,
            amount: 1,
            coins: gift.coins,
        });

        setShowGiftPanel(false);
    };



    const handleOpenGiftPanel = (targetUserId) => {
        if (!isActive || timeRemaining <= 0 || !targetUserId) return;
        setSelectedTarget(targetUserId);
        setShowGiftPanel(true);
    };

    const selectedUser =
        selectedTarget &&
        (String(selectedTarget) === String(challengerId)
            ? challengerUser
            : String(selectedTarget) === String(opponentId)
                ? opponentUser
                : null);

    const handleCloseResult = () => {
        setShowResult(false);
        onEndPK?.(pk);
    };

    const isChallengerYou =
        challengerId &&
        currentUserId &&
        String(challengerId) === String(currentUserId);
    const isOpponentYou =
        opponentId &&
        currentUserId &&
        String(opponentId) === String(currentUserId);

    // Winner user normaliseren
    const winnerRaw =
        pk?.winner?.user ||
        pk?.winner ||
        (challengerWinning
            ? challengerUser
            : opponentWinning
                ? opponentUser
                : null);

    const winnerUser = winnerRaw
        ? {
            ...winnerRaw,
            avatar: resolveAvatar(winnerRaw.avatar),
        }
        : null;

    /* ------------------------------------------------------------
       RENDER
       ------------------------------------------------------------ */
    return (
        <div className="relative w-full h-full bg-black overflow-hidden rounded-2xl">
            {/* Split Screen Container */}
            <div className="flex h-full">
                {/* Challenger Side (Left) */}
                <div className="relative w-1/2 h-full border-r-2 border-yellow-400/50">
                    {/* Video/Stream */}
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-purple-500/20">
                        {challengerStream || (
                            <div className="w-full h-full flex items-center justify-center">
                                <img
                                    src={
                                        challengerUser.avatar ||
                                        `${BASE_URL}/defaults/default-avatar.png`
                                    }
                                    alt=""
                                    className="w-32 h-32 rounded-full border-4 border-pink-500 object-cover"
                                    onError={(e) => {
                                        e.target.src = `${BASE_URL}/defaults/default-avatar.png`;
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Winner Crown */}
                    <AnimatePresence>
                        {challengerWinning && !isDraw && (
                            <motion.div
                                initial={{ scale: 0, y: -50 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0 }}
                                className="absolute top-16 left-1/2 -translate-x-1/2 z-20"
                            >
                                <div className="text-6xl animate-bounce">
                                    👑
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Streak Badge */}
                    {challengerStreak > 0 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-4 right-4 z-20"
                        >
                            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 rounded-full text-white font-bold text-sm flex items-center gap-1">
                                <span className="text-yellow-300">
                                    🔥
                                </span>
                                {challengerStreak} Streak
                            </div>
                        </motion.div>
                    )}

                    {/* Overpower Effect */}
                    <AnimatePresence>
                        {challengerScore > opponentScore * 2 &&
                            challengerScore > 100 && (
                                <motion.div
                                    initial={{
                                        scale: 0,
                                        rotate: -10,
                                    }}
                                    animate={{
                                        scale: 1,
                                        rotate: 0,
                                    }}
                                    exit={{ scale: 0 }}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
                                >
                                    <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 px-6 py-2 rounded-lg transform -rotate-12 shadow-2xl">
                                        <span className="text-white font-black text-2xl italic tracking-wider drop-shadow-lg">
                                            OVERPOWER
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                    </AnimatePresence>

                    {/* Username */}
                    <div className="absolute bottom-4 left-4 z-10">
                        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                            <img
                                src={
                                    challengerUser.avatar ||
                                    `${BASE_URL}/defaults/default-avatar.png`
                                }
                                alt=""
                                className="w-8 h-8 rounded-full border-2 border-pink-500 object-cover"
                                onError={(e) => {
                                    e.target.src = `${BASE_URL}/defaults/default-avatar.png`;
                                }}
                            />
                            <span className="text-white font-semibold text-sm">
                                {challengerUser.username ||
                                    "Challenger"}
                            </span>
                            {isChallengerYou && (
                                <span className="text-xs text-cyan-300 font-bold ml-1">
                                    (YOU)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Gift Target Button */}
                    <button
                        onClick={() =>
                            handleOpenGiftPanel(challengerId)
                        }
                        disabled={
                            !isActive ||
                            timeRemaining <= 0 ||
                            !challengerId
                        }
                        className="absolute bottom-4 right-4 z-10 bg-pink-500 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-full font-semibold text-sm transition-all transform hover:scale-105"
                    >
                        🎁 Support
                    </button>
                </div>

                {/* Opponent Side (Right) */}
                <div className="relative w-1/2 h-full">
                    {/* Video/Stream */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
                        {opponentStream || (
                            <div className="w-full h-full flex items-center justify-center">
                                <img
                                    src={
                                        opponentUser.avatar ||
                                        `${BASE_URL}/defaults/default-avatar.png`
                                    }
                                    alt=""
                                    className="w-32 h-32 rounded-full border-4 border-cyan-500 object-cover"
                                    onError={(e) => {
                                        e.target.src = `${BASE_URL}/defaults/default-avatar.png`;
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Winner Crown */}
                    <AnimatePresence>
                        {opponentWinning && !isDraw && (
                            <motion.div
                                initial={{ scale: 0, y: -50 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0 }}
                                className="absolute top-16 left-1/2 -translate-x-1/2 z-20"
                            >
                                <div className="text-6xl animate-bounce">
                                    👑
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Streak Badge */}
                    {opponentStreak > 0 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-4 left-4 z-20"
                        >
                            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1 rounded-full text-white font-bold text-sm flex items-center gap-1">
                                <span className="text-yellow-300">
                                    🔥
                                </span>
                                {opponentStreak} Streak
                            </div>
                        </motion.div>
                    )}

                    {/* Overpower Effect */}
                    <AnimatePresence>
                        {opponentScore >
                            challengerScore * 2 &&
                            opponentScore > 100 && (
                                <motion.div
                                    initial={{
                                        scale: 0,
                                        rotate: 10,
                                    }}
                                    animate={{
                                        scale: 1,
                                        rotate: 0,
                                    }}
                                    exit={{ scale: 0 }}
                                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
                                >
                                    <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 px-6 py-2 rounded-lg transform rotate-12 shadow-2xl">
                                        <span className="text-white font-black text-2xl italic tracking-wider drop-shadow-lg">
                                            OVERPOWER
                                        </span>
                                    </div>
                                </motion.div>
                            )}
                    </AnimatePresence>

                    {/* Username */}
                    <div className="absolute bottom-4 right-4 z-10">
                        <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                            <span className="text-white font-semibold text-sm">
                                {opponentUser.username ||
                                    "Opponent"}
                            </span>
                            {isOpponentYou && (
                                <span className="text-xs text-cyan-300 font-bold">
                                    (YOU)
                                </span>
                            )}
                            <img
                                src={
                                    opponentUser.avatar ||
                                    `${BASE_URL}/defaults/default-avatar.png`
                                }
                                alt=""
                                className="w-8 h-8 rounded-full border-2 border-cyan-500 object-cover"
                                onError={(e) => {
                                    e.target.src = `${BASE_URL}/defaults/default-avatar.png`;
                                }}
                            />
                        </div>
                    </div>

                    {/* Gift Target Button */}
                    <button
                        onClick={() =>
                            handleOpenGiftPanel(opponentId)
                        }
                        disabled={
                            !isActive ||
                            timeRemaining <= 0 ||
                            !opponentId
                        }
                        className="absolute bottom-4 left-4 z-10 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-full font-semibold text-sm transition-all transform hover:scale-105"
                    >
                        🎁 Support
                    </button>
                </div>

                {/* Center Timer / PK Badge */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20">
                    <div className="bg-black/80 backdrop-blur-sm px-4 py-2 rounded-b-xl border-x-2 border-b-2 border-yellow-500/50">
                        <div className="flex items-center gap-2">
                            <span className="bg-gradient-to-r from-pink-500 to-orange-500 text-white font-black px-2 py-0.5 rounded text-sm">
                                PK
                            </span>
                            <span
                                className={`font-mono font-bold text-lg ${timeRemaining <= 30 && isActive
                                    ? "text-red-400 animate-pulse"
                                    : "text-white"
                                    }`}
                            >
                                {formatTime(timeRemaining)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Score Bar (Top) */}
            <div className="absolute top-0 left-0 right-0 z-10">
                <div className="flex h-8">
                    {/* Challenger Score Bar */}
                    <motion.div
                        className="h-full bg-gradient-to-r from-pink-600 to-pink-400 flex items-center justify-start pl-3"
                        initial={{ width: "50%" }}
                        animate={{ width: `${challengerPercent}%` }}
                        transition={{
                            type: "spring",
                            stiffness: 100,
                            damping: 20,
                        }}
                    >
                        <span className="text-white font-bold text-sm drop-shadow-lg">
                            {challengerScore.toLocaleString()}
                        </span>
                    </motion.div>

                    {/* Opponent Score Bar */}
                    <motion.div
                        className="h-full bg-gradient-to-l from-cyan-600 to-cyan-400 flex items-center justify-end pr-3"
                        initial={{ width: "50%" }}
                        animate={{ width: `${opponentPercent}%` }}
                        transition={{
                            type: "spring",
                            stiffness: 100,
                            damping: 20,
                        }}
                    >
                        <span className="text-white font-bold text-sm drop-shadow-lg">
                            {opponentScore.toLocaleString()}
                        </span>
                    </motion.div>
                </div>
            </div>

            {/* Gift Animation */}
            <AnimatePresence>
                {giftAnimation && (
                    <motion.div
                        initial={{ scale: 0, y: 100 }}
                        animate={{ scale: 1.5, y: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                    >
                        <div className="text-8xl">
                            {giftAnimation.gift.emoji}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Gift Panel */}
            <AnimatePresence>
                {showGiftPanel && selectedUser && (
                    <motion.div
                        initial={{ y: 300 }}
                        animate={{ y: 0 }}
                        exit={{ y: 300 }}
                        className="absolute bottom-0 left-0 right-0 z-40 bg-gray-900/95 backdrop-blur-lg rounded-t-3xl p-4 border-t border-white/10"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-bold text-lg">
                                Send Gift to{" "}
                                {selectedUser.username || "Streamer"}
                            </h3>
                            <button
                                onClick={() =>
                                    setShowGiftPanel(false)
                                }
                                className="text-white/60 hover:text-white text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <div className="grid grid-cols-4 gap-3">
                            {GIFTS.map((gift) => (
                                <button
                                    key={gift.id}
                                    onClick={() =>
                                        handleSendGift(gift)
                                    }
                                    disabled={
                                        !isActive ||
                                        timeRemaining <= 0
                                    }
                                    className="flex flex-col items-center p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <span className="text-4xl mb-1">
                                        {gift.emoji}
                                    </span>
                                    <span className="text-white/80 text-xs">
                                        {gift.name}
                                    </span>
                                    <span className="text-yellow-400 text-xs font-bold flex items-center gap-1">
                                        🪙 {gift.coins}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="mt-4 text-center text-white/40 text-sm">
                            Supporting:{" "}
                            <span className="font-semibold text-white/80">
                                {selectedUser.username || "Streamer"}
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* PK Result Modal */}
            <AnimatePresence>
                {showResult && pk.status === "finished" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-center max-w-sm mx-4 border border-white/10"
                        >
                            {isDraw ? (
                                <>
                                    <div className="text-6xl mb-4">
                                        🤝
                                    </div>
                                    <h2 className="text-3xl font-bold text-white mb-2">
                                        DRAW!
                                    </h2>
                                    <p className="text-white/60">
                                        Both players tied!
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="text-6xl mb-4">
                                        🏆
                                    </div>
                                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">
                                        WINNER!
                                    </h2>
                                    <div className="flex items-center justify-center gap-3 mb-4">
                                        <img
                                            src={
                                                winnerUser?.avatar ||
                                                `${BASE_URL}/defaults/default-avatar.png`
                                            }
                                            alt=""
                                            className="w-16 h-16 rounded-full border-4 border-yellow-500 object-cover"
                                            onError={(e) => {
                                                e.target.src = `${BASE_URL}/defaults/default-avatar.png`;
                                            }}
                                        />
                                        <span className="text-white font-bold text-xl">
                                            {winnerUser?.username ||
                                                "Winner"}
                                        </span>
                                    </div>
                                </>
                            )}

                            <div className="flex justify-between mt-6 text-sm">
                                <div className="text-center">
                                    <div className="text-pink-400 font-bold">
                                        {challengerScore.toLocaleString()}
                                    </div>
                                    <div className="text-white/40">
                                        {challengerUser.username ||
                                            "Challenger"}
                                    </div>
                                </div>
                                <div className="text-white/20">
                                    VS
                                </div>

                                <div className="text-center">
                                    <div className="text-cyan-400 font-bold">
                                        {opponentScore.toLocaleString()}
                                    </div>
                                    <div className="text-white/40">
                                        {opponentUser.username ||
                                            "Opponent"}
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleCloseResult}
                                className="mt-6 w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-xl font-bold text-white"
                            >
                                Close
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
