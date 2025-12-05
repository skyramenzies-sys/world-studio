// src/components/PKIncomingChallenge.jsx - WORLD STUDIO LIVE EDITION ⚔️
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import axios from "axios";

/* ============================================================
   WORLD STUDIO LIVE CONFIGURATION
   ============================================================ */
const API_BASE_URL = "https://world-studio.live";

// Create API instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("ws_token") || localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function PKIncomingChallenge({ challenge, onAccept, onDecline }) {
    const [timeLeft, setTimeLeft] = useState(30); // 30 seconds to respond
    const [responding, setResponding] = useState(false);
    const respondedRef = useRef(false);

    // Handle Accept
    const handleAccept = async () => {
        if (!challenge || respondedRef.current) return;

        try {
            respondedRef.current = true;
            setResponding(true);

            await api.post(`/api/pk/${challenge.pkId}/accept`);
            toast.success("PK Battle starting! ⚔️");

            onAccept?.(challenge);
        } catch (err) {
            respondedRef.current = false;
            const msg = err?.response?.data?.error || err?.message || "Failed to accept";
            toast.error(msg);
        } finally {
            setResponding(false);
        }
    };

    // Handle Decline
    const handleDecline = async (auto = false) => {
        if (!challenge || respondedRef.current) return;

        try {
            respondedRef.current = true;
            setResponding(true);

            await api.post(`/api/pk/${challenge.pkId}/decline`);

            if (!auto) {
                toast("PK challenge declined", { icon: "⚔️" });
            }

            onDecline?.(challenge);
        } catch (err) {
            console.error("Decline error:", err);
            onDecline?.(challenge);
        } finally {
            setResponding(false);
        }
    };

    // Timer
    useEffect(() => {
        if (!challenge) return;

        setTimeLeft(30);
        respondedRef.current = false;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);

                    if (!respondedRef.current) {
                        handleDecline(true);
                    }

                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [challenge?.pkId]);

    if (!challenge) return null;

    const durationMinutes = challenge.duration ? Math.round(challenge.duration / 60) : 5;

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
                        {/* Header with timer */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">⚔️</span>
                                <span className="text-white font-bold">PK CHALLENGE!</span>
                            </div>
                            <div className="bg-red-500/20 px-3 py-1 rounded-full">
                                <span className="text-red-400 font-mono font-bold">{timeLeft}s</span>
                            </div>
                        </div>

                        {/* Challenger info */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="relative">
                                <img
                                    src={challenge.challenger?.avatar || "/defaults/default-avatar.png"}
                                    alt=""
                                    className="w-16 h-16 rounded-full border-4 border-orange-500 object-cover"
                                    onError={(e) => { e.target.src = "/defaults/default-avatar.png"; }}
                                />
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border-4 border-transparent border-t-yellow-400 rounded-full"
                                />
                            </div>
                            <div>
                                <p className="text-white font-bold text-lg">
                                    {challenge.challenger?.username}
                                </p>
                                <p className="text-white/50 text-sm">wants to battle you!</p>
                                <p className="text-orange-400 text-sm font-semibold">
                                    Duration: {durationMinutes} {durationMinutes === 1 ? "minute" : "minutes"}
                                </p>
                            </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1 bg-white/10 rounded-full mb-4 overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-red-500 to-orange-500"
                                initial={{ width: "100%" }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 30, ease: "linear" }}
                            />
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleDecline(false)}
                                disabled={responding}
                                className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-white/80 transition-all disabled:opacity-50"
                            >
                                Decline
                            </button>
                            <button
                                onClick={handleAccept}
                                disabled={responding}
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