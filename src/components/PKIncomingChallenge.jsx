// src/components/PKIncomingChallenge.jsx - WORLD STUDIO LIVE ULTIMATE EDITION ⚔️
import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

import api from "../api/api"; // centrale API (zelfde als ProfilePage / PostCard)

/* ============================================================
   URL / AVATAR HELPERS
   ============================================================ */

const API_BASE_URL = (
    import.meta.env.VITE_API_URL ||
    "https://world-studio-production.up.railway.app"
)
    .replace(/\/api\/?$/, "")
    .replace(/\/$/, "");

const resolveAvatar = (url) => {
    if (!url) return `${API_BASE_URL}/defaults/default-avatar.png`;
    if (url.startsWith("http")) return url;
    return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function PKIncomingChallenge({
    challenge,
    onAccept,
    onDecline,
}) {
    const [timeLeft, setTimeLeft] = useState(30); // seconds
    const [responding, setResponding] = useState(false);
    const respondedRef = useRef(false);
    const timerRef = useRef(null);

    const pkId = challenge?.pkId || challenge?._id;

    const durationMinutes = useMemo(() => {
        if (!challenge?.duration) return 5;
        const mins = Math.round(challenge.duration / 60);
        return mins || 5;
    }, [challenge?.duration]);

    const challenger = useMemo(() => {
        const raw =
            challenge?.challenger ||
            challenge?.fromUser ||
            challenge?.user;

        if (!raw) {
            return {
                username: "Unknown challenger",
                avatar: resolveAvatar(null),
            };
        }

        return {
            username:
                raw.username ||
                raw.displayName ||
                "Unknown challenger",
            avatar: resolveAvatar(raw.avatar),
        };
    }, [challenge]);

    /* ------------------------------------------------------------
       ACCEPT
       ------------------------------------------------------------ */
    const handleAccept = async () => {
        if (!challenge || !pkId || respondedRef.current || timeLeft <= 0)
            return;

        try {
            respondedRef.current = true;
            setResponding(true);

            // LET OP: geen /api prefix, api-instance regelt /api al
            await api.post(`/pk/${pkId}/accept`);

            toast.success("PK Battle starting! ⚔️");

            onAccept?.(challenge);
        } catch (err) {
            respondedRef.current = false;
            const msg =
                err?.response?.data?.error ||
                err?.response?.data?.message ||
                err?.message ||
                "Failed to accept PK challenge";
            toast.error(msg);
        } finally {
            setResponding(false);
        }
    };

    /* ------------------------------------------------------------
       DECLINE
       ------------------------------------------------------------ */
    const handleDecline = async (auto = false) => {
        if (!challenge || !pkId || respondedRef.current) return;

        try {
            respondedRef.current = true;
            setResponding(true);

            // LET OP: geen /api prefix
            await api.post(`/pk/${pkId}/decline`);

            if (!auto) {
                toast("PK challenge declined", { icon: "⚔️" });
            }

            onDecline?.(challenge);
        } catch (err) {
            console.error("PK decline error:", err);
            // UI moet sowieso sluiten
            onDecline?.(challenge);
        } finally {
            setResponding(false);
        }
    };

    /* ------------------------------------------------------------
       TIMER (AUTO DECLINE NA 30s)
       ------------------------------------------------------------ */
    useEffect(() => {

        if (!pkId) return;

        // Reset bij nieuwe challenge
        setTimeLeft(30);
        respondedRef.current = false;


        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;

                    if (!respondedRef.current) {
                        // auto decline (stil, geen toast)
                        handleDecline(true);
                    }

                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
        // pkId is genoeg als dependency, challenge zelf is puur visueel
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pkId]);

    if (!challenge || !pkId) return null;

    const buttonsDisabled =
        responding || timeLeft <= 0 || respondedRef.current;

    /* ============================================================
       RENDER
       ============================================================ */

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -100 }}
                className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm mx-4"
            >
                <div className="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 p-1 rounded-2xl shadow-2xl">
                    <div className="bg-gray-900 rounded-xl p-4">
                        {/* HEADER + TIMER */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">⚔️</span>
                                <span className="text-white font-bold">
                                    PK CHALLENGE!
                                </span>
                            </div>
                            <div className="bg-red-500/20 px-3 py-1 rounded-full">
                                <span className="text-red-400 font-mono font-bold">
                                    {timeLeft}s
                                </span>
                            </div>
                        </div>

                        {/* CHALLENGER INFO */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="relative">
                                <img
                                    src={challenger.avatar}
                                    alt=""
                                    className="w-16 h-16 rounded-full border-4 border-orange-500 object-cover"
                                    onError={(e) => {
                                        e.target.src = `${API_BASE_URL}/defaults/default-avatar.png`;
                                    }}
                                />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "linear",
                                    }}
                                    className="absolute inset-0 border-4 border-transparent border-t-yellow-400 rounded-full"
                                />
                            </div>
                            <div>
                                <p className="text-white font-bold text-lg">
                                    {challenger.username}
                                </p>
                                <p className="text-white/50 text-sm">
                                    wants to battle you!
                                </p>

                                <p className="text-orange-400 text-sm font-semibold">
                                    Duration: {durationMinutes}{" "}
                                    {durationMinutes === 1
                                        ? "minute"
                                        : "minutes"}
                                </p>
                            </div>
                        </div>

                        {/* PROGRESS BAR */}
                        <div className="h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{
                                    duration: 30,
                                    ease: "linear",
                                }}
                            />
                        </div>

                        {/* BUTTONS */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleDecline(false)}
                                disabled={buttonsDisabled}
                                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white/80 transition-all disabled:opacity-50 disabled:hover:bg-white/10"
                            >
                                Decline
                            </button>
                            <button
                                onClick={handleAccept}
                                disabled={buttonsDisabled}
                                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl font-bold text-white transition-all transform hover:scale-105 flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {responding ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <span>⚔️</span>
                                        Accept
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
