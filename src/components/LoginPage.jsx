// src/components/LoginPage.jsx - WORLD STUDIO LIVE EDITION 🔐
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

// Universe Edition: gebruik centrale API-client
import api from "../api/api";

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function LoginPage() {
    const navigate = useNavigate();
    const [mode, setMode] = useState("login"); // login, register, forgot
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        username: "",
        birthDate: "",
        agreeTerms: false,
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    // Calculate age
    const calculateAge = (birthDate) => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (
            monthDiff < 0 ||
            (monthDiff === 0 && today.getDate() < birth.getDate())
        ) {
            age--;
        }
        return age;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);

        const trimmedEmail = formData.email.trim().toLowerCase();
        const trimmedUsername = formData.username.trim();

        try {
            if (!trimmedEmail) {
                toast.error("Email is required");
                setLoading(false);
                return;
            }

            if (mode === "forgot") {
                // Forgot password
                await api.post("/api/auth/forgot-password", {
                    email: trimmedEmail,
                });
                toast.success(
                    "If an account exists, you'll receive a reset link via email"
                );
                setMode("login");
                setLoading(false);
                return;
            }

            if (mode === "register") {
                // Validate username
                if (!trimmedUsername) {
                    toast.error("Username is required");
                    setLoading(false);
                    return;
                }

                if (trimmedUsername.length < 3) {
                    toast.error("Username must be at least 3 characters");
                    setLoading(false);
                    return;
                }

                // Validate birth date
                if (!formData.birthDate) {
                    toast.error("Birth date is required");
                    setLoading(false);
                    return;
                }

                // Check age
                const age = calculateAge(formData.birthDate);
                if (age < 18) {
                    toast.error("You must be 18 or older to create an account");
                    setLoading(false);
                    return;
                }

                // Check terms agreement
                if (!formData.agreeTerms) {
                    toast.error("You must agree to the Terms of Service");
                    setLoading(false);
                    return;
                }

                // Validate password
                if (!formData.password || formData.password.length < 6) {
                    toast.error("Password must be at least 6 characters");
                    setLoading(false);
                    return;
                }
            }

            let response;

            if (mode === "login") {
                response = await api.post("/api/auth/login", {
                    email: trimmedEmail,
                    password: formData.password,
                });
            } else {
                response = await api.post("/api/auth/register", {
                    email: trimmedEmail,
                    password: formData.password,
                    username: trimmedUsername,
                    birthDate: formData.birthDate,
                });
            }

            const data = response?.data || {};

            // Support meerdere backend-responses
            const token = data.token || data.accessToken;

            const rawUser =
                data.user ||
                data.profile || {
                    _id: data.userId || data._id,
                    username: data.username,
                    email: data.email,
                    avatar: data.avatar,
                    bio: data.bio,
                    followers: data.followers,
                    following: data.following,
                    wallet: data.wallet,
                    notifications: data.notifications,
                    role: data.role,
                    createdAt: data.createdAt,
                };

            const user = {
                _id: rawUser?._id || data.userId || data._id,
                id: rawUser?._id || data.userId || data._id,
                username: rawUser?.username,
                email: rawUser?.email || trimmedEmail,
                avatar: rawUser?.avatar || "",
                bio: rawUser?.bio || "",
                followers: rawUser?.followers || [],
                following: rawUser?.following || [],
                totalViews: rawUser?.totalViews || data.totalViews || 0,
                totalLikes: rawUser?.totalLikes || data.totalLikes || 0,
                earnings: rawUser?.earnings || data.earnings || 0,
                wallet:
                    rawUser?.wallet ||
                    data.wallet || {
                        balance: 100,
                        totalReceived: 0,
                        totalSpent: 0,
                    },
                notifications: rawUser?.notifications || data.notifications || [],
                role: rawUser?.role || data.role || "user",
                createdAt: rawUser?.createdAt || data.createdAt,
                token,
            };

            if (!token || !user.username) {
                throw new Error("Invalid response from server");
            }

            // Store in localStorage (WORLD STUDIO LIVE STANDARD KEYS)
            localStorage.setItem("token", token);
            localStorage.setItem("ws_token", token);
            localStorage.setItem("ws_currentUser", JSON.stringify(user));

            // Dispatch auth change event
            window.dispatchEvent(new Event("authChange"));

            toast.success(
                mode === "login"
                    ? `Welcome back, ${user.username}! 🎉`
                    : `Welcome to World-Studio, ${user.username}! 🚀 You got 100 free coins!`
            );

            navigate("/");

        } catch (err) {
            console.error("Auth error:", err);
            let message = "Authentication failed";

            if (err.response?.data?.error) {
                message = err.response.data.error;
            } else if (err.response?.data?.message) {
                message = err.response.data.message;
            } else if (err.message) {
                message = err.message;
            }

            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            email: "",
            password: "",
            username: "",
            birthDate: "",
            agreeTerms: false,
        });
        setShowPassword(false);
    };

    // Calculate max date (18 years ago)
    const maxBirthDate = new Date();
    maxBirthDate.setFullYear(maxBirthDate.getFullYear() - 18);
    const maxDateString = maxBirthDate.toISOString().split("T")[0];

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black px-4 py-8">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-cyan-400 mb-2">
                        🌌 World-Studio
                    </h1>
                    <p className="text-white/60">
                        {mode === "login" && "Sign in to your account"}
                        {mode === "register" && "Create a new account"}
                        {mode === "forgot" && "Reset your password"}
                    </p>
                </div>

                {/* Forgot Password Mode */}
                {mode === "forgot" ? (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-white/80 text-sm mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-white font-semibold transition disabled:opacity-50"
                        >
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setMode("login");
                                resetForm();
                            }}
                            className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:bg-white/10 transition"
                        >
                            ← Back to Login
                        </button>
                    </form>
                ) : (
                    /* Login/Register Form */
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username (register only) */}
                        {mode === "register" && (
                            <div>
                                <label className="block text-white/80 text-sm mb-2">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Choose a username"
                                    minLength={3}
                                    maxLength={30}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition"
                                    required
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div>
                            <label className="block text-white/80 text-sm mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition"
                                required
                            />
                        </div>

                        {/* Birth Date (register only) */}
                        {mode === "register" && (
                            <div>
                                <label className="block text-white/80 text-sm mb-2">
                                    Birth Date{" "}
                                    <span className="text-red-400">*</span>
                                    <span className="text-white/40 ml-2">
                                        (Must be 18+)
                                    </span>
                                </label>
                                <input
                                    type="date"
                                    name="birthDate"
                                    value={formData.birthDate}
                                    onChange={handleChange}
                                    max={maxDateString}
                                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition"
                                    required
                                />
                                {formData.birthDate &&
                                    calculateAge(formData.birthDate) < 18 && (
                                        <p className="text-red-400 text-sm mt-1">
                                            ⚠️ You must be 18 or older to
                                            register
                                        </p>
                                    )}
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <label className="block text-white/80 text-sm mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition"
                                >
                                    {showPassword ? "🙈" : "👁"}
                                </button>
                            </div>
                        </div>

                        {/* Terms Agreement (register only) */}
                        {mode === "register" && (
                            <div className="flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    name="agreeTerms"
                                    id="agreeTerms"
                                    checked={formData.agreeTerms}
                                    onChange={handleChange}
                                    className="mt-1 w-4 h-4 rounded border-white/20 bg-white/10 text-cyan-500 focus:ring-cyan-500"
                                />
                                <label
                                    htmlFor="agreeTerms"
                                    className="text-white/70 text-sm"
                                >
                                    I confirm that I am at least 18 years old
                                    and agree to the{" "}
                                    <a
                                        href="/terms"
                                        className="text-cyan-400 hover:underline"
                                    >
                                        Terms of Service
                                    </a>{" "}
                                    and{" "}
                                    <a
                                        href="/privacy"
                                        className="text-cyan-400 hover:underline"
                                    >
                                        Privacy Policy
                                    </a>
                                </label>
                            </div>
                        )}

                        {/* Forgot Password Link (login only) */}
                        {mode === "login" && (
                            <div className="text-right">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode("forgot");
                                        resetForm();
                                    }}
                                    className="text-cyan-400 hover:text-cyan-300 text-sm transition"
                                >
                                    Forgot password?
                                </button>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={
                                loading ||
                                (mode === "register" && !formData.agreeTerms)
                            }
                            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg
                                        className="animate-spin h-5 w-5"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="none"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                        />
                                    </svg>
                                    {mode === "login"
                                        ? "Signing in..."
                                        : "Creating account..."}
                                </>
                            ) : mode === "login" ? (
                                "Sign In"
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>
                )}

                {/* Toggle Login/Register */}
                {mode !== "forgot" && (
                    <div className="mt-6 text-center">
                        <p className="text-white/60">
                            {mode === "login"
                                ? "Don't have an account?"
                                : "Already have an account?"}
                            <button
                                type="button"
                                onClick={() => {
                                    setMode(
                                        mode === "login" ? "register" : "login"
                                    );
                                    resetForm();
                                }}
                                className="ml-2 text-cyan-400 hover:text-cyan-300 font-semibold transition"
                            >
                                {mode === "login" ? "Sign Up" : "Sign In"}
                            </button>
                        </p>
                    </div>
                )}

                {/* Social Login (placeholder) */}
                {mode !== "forgot" && (
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-transparent text-white/40">
                                    or continue with
                                </span>
                            </div>
                        </div>

                        <div className="mt-4 flex gap-3">
                            <button
                                type="button"
                                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition flex items-center justify-center gap-2"
                                onClick={() =>
                                    toast("Google login coming soon!")
                                }
                            >
                                <span>🔵</span> Google
                            </button>
                            <button
                                type="button"
                                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition flex items-center justify-center gap-2"
                                onClick={() =>
                                    toast("Apple login coming soon!")
                                }
                            >
                                <span>🍎</span> Apple
                            </button>
                        </div>
                    </div>
                )}

                {/* Info */}
                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <p className="text-white/40 text-sm">
                        {mode === "register"
                            ? "🎁 New users get 100 free WS-Coins!"
                            : "🔒 Your data is secure with us"}
                    </p>
                </div>

                {/* 18+ Warning */}
                {mode === "register" && (
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                        <p className="text-yellow-400 text-xs text-center">
                            ⚠️ World-Studio is only available for users 18 years
                            and older
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
