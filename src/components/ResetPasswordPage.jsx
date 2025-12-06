// src/components/ResetPasswordPage.jsx
// World-Studio.live - Reset Password (Universe Edition)

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";

// ===========================================
// API CONFIGURATION - ACTIVE SERVER
// ===========================================
const RAW_API_BASE_URL =
    import.meta.env?.VITE_API_URL ||
    "https://world-studio-production.up.railway.app";

// Normalise base URL (no trailing slash)
const API_BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, "");

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { "Content-Type": "application/json" },
});

// Attach auth token if present (not required but safe)
api.interceptors.request.use((config) => {
    const token =
        localStorage.getItem("ws_token") ||
        localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [linkValid, setLinkValid] = useState(true);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState(false);

    const [formData, setFormData] = useState({
        newPassword: "",
        confirmPassword: "",
    });

    const token = searchParams.get("token") || "";
    const email = searchParams.get("email") || "";

    // Validate link on mount
    useEffect(() => {
        if (!token || !email) {
            setLinkValid(false);
            toast.error("Invalid or expired reset link");
        }
    }, [token, email]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // ==========================================
    // Password strength checker
    // ==========================================
    const getPasswordStrength = (password) => {
        if (!password) return 0;
        let strength = 0;
        if (password.length >= 6) strength++;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(
        formData.newPassword
    );

    const strengthLabels = [
        "Very Weak",
        "Weak",
        "Fair",
        "Good",
        "Strong",
    ];
    const strengthColors = [
        "bg-red-500",
        "bg-orange-500",
        "bg-yellow-500",
        "bg-blue-500",
        "bg-green-500",
    ];

    const strengthLabel =
        passwordStrength > 0
            ? strengthLabels[passwordStrength - 1]
            : "Enter password";

    const strengthTextColor =
        passwordStrength <= 1
            ? "text-red-400"
            : passwordStrength <= 2
                ? "text-yellow-400"
                : passwordStrength <= 3
                    ? "text-blue-400"
                    : "text-green-400";

    // ==========================================
    // Submit handler
    // ==========================================
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!linkValid) {
            toast.error("Reset link is not valid.");
            return;
        }

        if (formData.newPassword.length < 6) {
            toast.error(
                "Password must be at least 6 characters"
            );
            return;
        }

        if (
            formData.newPassword !== formData.confirmPassword
        ) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            await api.post("/api/auth/reset-password", {
                email,
                token,
                newPassword: formData.newPassword,
            });

            setSuccess(true);
            toast.success("Password reset successful!");

            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate("/login");
            }, 3000);

        } catch (err) {
            console.error("Reset error:", err);
            const message =
                err.response?.data?.error ||
                err.response?.data?.message ||
                "Failed to reset password";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // SUCCESS SCREEN
    // ==========================================
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black px-4">
                <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl text-center">
                    {/* Success Animation */}
                    <div className="relative mb-6">
                        <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-bounce">
                            <svg
                                className="w-12 h-12 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                        <div className="absolute inset-0 w-24 h-24 mx-auto bg-green-400/30 rounded-full animate-ping" />
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2">
                        Password Reset!
                    </h1>
                    <p className="text-white/60 mb-6">
                        Your password has been successfully
                        changed. Redirecting to login...
                    </p>

                    {/* Progress indicator */}
                    <div className="w-full bg-white/10 rounded-full h-1 mb-6 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 animate-progress"
                            style={{
                                animation:
                                    "progress 3s linear forwards",
                            }}
                        />
                    </div>

                    <button
                        onClick={() => navigate("/login")}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-semibold hover:from-cyan-400 hover:to-blue-500 transition"
                    >
                        Go to Login Now
                    </button>
                </div>

                <style>{`
                    @keyframes progress {
                        from { width: 0%; }
                        to { width: 100%; }
                    }
                `}</style>
            </div>
        );
    }

    // ==========================================
    // INVALID LINK SCREEN
    // ==========================================
    if (!linkValid) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black px-4">
                <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-red-500/40 rounded-2xl p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-red-500/30 border border-red-400 rounded-2xl flex items-center justify-center">
                        <span className="text-3xl">⛔</span>
                    </div>
                    <h1 className="text-2xl font-bold text-red-400 mb-2">
                        Invalid Reset Link
                    </h1>
                    <p className="text-white/70 mb-6 text-sm">
                        This password reset link is invalid or
                        has expired. Please request a new one
                        from the forgot password page.
                    </p>
                    <button
                        onClick={() => navigate("/forgot-password")}
                        className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl text-white font-semibold hover:from-cyan-400 hover:to-blue-500 transition mb-3 w-full"
                    >
                        Request New Link
                    </button>
                    <button
                        onClick={() => navigate("/login")}
                        className="text-white/60 hover:text-white text-sm"
                    >
                        ← Back to Login
                    </button>
                </div>
            </div>
        );
    }

    // ==========================================
    // MAIN FORM
    // ==========================================
    const passwordsMatch =
        formData.newPassword &&
        formData.confirmPassword &&
        formData.newPassword === formData.confirmPassword;

    const canSubmit =
        !loading &&
        passwordsMatch &&
        formData.newPassword.length >= 6;

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black px-4">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center">
                        <span className="text-3xl">🔐</span>
                    </div>
                    <h1 className="text-3xl font-bold text-cyan-400 mb-2">
                        Reset Password
                    </h1>
                    <p className="text-white/60">
                        Enter your new password below
                    </p>
                </div>

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                    noValidate
                >
                    {/* Email (read-only) */}
                    <div>
                        <label className="block text-white/80 text-sm mb-2">
                            Email
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                                📧
                            </span>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/50 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* New Password */}
                    <div>
                        <label className="block text-white/80 text-sm mb-2">
                            New Password
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                                🔑
                            </span>
                            <input
                                type={
                                    showPassword ? "text" : "password"
                                }
                                name="newPassword"
                                value={formData.newPassword}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="w-full pl-12 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition"
                                required
                                minLength={6}
                                disabled={loading}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setShowPassword(
                                        (prev) => !prev
                                    )
                                }
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                                tabIndex={-1}
                            >
                                {showPassword ? "🙈" : "👁️"}
                            </button>
                        </div>

                        {/* Password Strength Indicator */}
                        {formData.newPassword && (
                            <div className="mt-2">
                                <div className="flex gap-1 mb-1">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-1 flex-1 rounded-full transition-all ${i <
                                                passwordStrength
                                                ? strengthColors[
                                                passwordStrength -
                                                1
                                                ]
                                                : "bg-white/10"
                                                }`}
                                        />
                                    ))}
                                </div>
                                <p
                                    className={`text-xs ${strengthTextColor}`}
                                >
                                    {strengthLabel}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-white/80 text-sm mb-2">
                            Confirm Password
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
                                🔑
                            </span>
                            <input
                                type={
                                    showConfirmPassword
                                        ? "text"
                                        : "password"
                                }
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className={`w-full pl-12 pr-12 py-3 bg-white/10 border rounded-xl text-white placeholder-white/40 focus:outline-none transition ${formData.confirmPassword &&
                                    formData.newPassword !==
                                    formData.confirmPassword
                                    ? "border-red-500/50 focus:border-red-400"
                                    : formData.confirmPassword &&
                                        formData.newPassword ===
                                        formData.confirmPassword
                                        ? "border-green-500/50 focus:border-green-400"
                                        : "border-white/20 focus:border-cyan-400"
                                    }`}
                                required
                                minLength={6}
                                disabled={loading}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() =>
                                    setShowConfirmPassword(
                                        (prev) => !prev
                                    )
                                }
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? "🙈" : "👁️"}
                            </button>
                        </div>
                        {formData.confirmPassword &&
                            formData.newPassword !==
                            formData.confirmPassword && (
                                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                                    <span>❌</span> Passwords do
                                    not match
                                </p>
                            )}
                        {formData.confirmPassword &&
                            formData.newPassword ===
                            formData.confirmPassword && (
                                <p className="text-green-400 text-sm mt-1 flex items-center gap-1">
                                    <span>✅</span> Passwords match
                                </p>
                            )}
                    </div>

                    {/* Password Requirements */}
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10">
                        <p className="text-xs text-white/50 mb-2">
                            Password requirements:
                        </p>
                        <ul className="text-xs space-y-1">
                            <li
                                className={
                                    formData.newPassword.length >= 6
                                        ? "text-green-400"
                                        : "text-white/40"
                                }
                            >
                                {formData.newPassword.length >= 6
                                    ? "✓"
                                    : "○"}{" "}
                                At least 6 characters
                            </li>
                            <li
                                className={
                                    /[A-Z]/.test(
                                        formData.newPassword
                                    )
                                        ? "text-green-400"
                                        : "text-white/40"
                                }
                            >
                                {/[A-Z]/.test(
                                    formData.newPassword
                                )
                                    ? "✓"
                                    : "○"}{" "}
                                One uppercase letter
                            </li>
                            <li
                                className={
                                    /[0-9]/.test(
                                        formData.newPassword
                                    )
                                        ? "text-green-400"
                                        : "text-white/40"
                                }
                            >
                                {/[0-9]/.test(
                                    formData.newPassword
                                )
                                    ? "✓"
                                    : "○"}{" "}
                                One number
                            </li>
                        </ul>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
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
                                Resetting...
                            </span>
                        ) : (
                            "Reset Password"
                        )}
                    </button>
                </form>

                {/* Back to Login */}
                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate("/login")}
                        className="text-white/60 hover:text-white transition flex items-center justify-center gap-2 mx-auto"
                    >
                        <span>←</span> Back to Login
                    </button>
                </div>

                {/* World-Studio Branding */}
                <div className="mt-8 text-center">
                    <p className="text-white/30 text-xs">
                        🌍 World-Studio.live
                    </p>
                </div>
            </div>
        </div>
    );
}
