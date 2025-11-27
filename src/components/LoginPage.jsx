// src/components/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/api";

export default function LoginPage() {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        username: "",
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let response;

            if (isLogin) {
                // LOGIN
                response = await api.post("/auth/login", {
                    email: formData.email,
                    password: formData.password,
                });
            } else {
                // REGISTER
                if (!formData.username.trim()) {
                    toast.error("Username is required");
                    setLoading(false);
                    return;
                }

                response = await api.post("/auth/register", {
                    email: formData.email,
                    password: formData.password,
                    username: formData.username,
                });
            }

            // Backend stuurt data direct (niet in user object)
            const data = response.data;

            // Extract token en user info
            const token = data.token;
            const user = {
                _id: data.userId || data._id,
                id: data.userId || data._id,
                username: data.username,
                email: data.email,
                avatar: data.avatar || "",
                bio: data.bio || "",
                followers: data.followers || [],
                following: data.following || [],
                totalViews: data.totalViews || 0,
                totalLikes: data.totalLikes || 0,
                earnings: data.earnings || 0,
                notifications: data.notifications || [],
                token: token,
            };

            // Valideer dat we token en username hebben
            if (!token || !user.username) {
                throw new Error("Invalid response from server");
            }

            // Sla op in localStorage
            localStorage.setItem("token", token);
            localStorage.setItem("ws_currentUser", JSON.stringify(user));

            // Success message
            toast.success(
                isLogin
                    ? `Welcome back, ${user.username}! 🎉`
                    : `Welcome to World-Studio, ${user.username}! 🚀`
            );

            // Redirect naar home
            navigate("/");

        } catch (err) {
            console.error("Auth error:", err);

            // Betere error handling
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-black px-4">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-cyan-400 mb-2">
                        🌌 World-Studio
                    </h1>
                    <p className="text-white/60">
                        {isLogin ? "Sign in to your account" : "Create a new account"}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Username (only for register) */}
                    {!isLogin && (
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
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition"
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

                    {/* Password */}
                    <div>
                        <label className="block text-white/80 text-sm mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-cyan-400 transition"
                            required
                            minLength={6}
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 rounded-xl text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
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
                                {isLogin ? "Signing in..." : "Creating account..."}
                            </span>
                        ) : (
                            isLogin ? "Sign In" : "Create Account"
                        )}
                    </button>
                </form>

                {/* Toggle Login/Register */}
                <div className="mt-6 text-center">
                    <p className="text-white/60">
                        {isLogin ? "Don't have an account?" : "Already have an account?"}
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setFormData({ email: "", password: "", username: "" });
                            }}
                            className="ml-2 text-cyan-400 hover:text-cyan-300 font-semibold transition"
                        >
                            {isLogin ? "Sign Up" : "Sign In"}
                        </button>
                    </p>
                </div>

                {/* Demo Hint */}
                <div className="mt-8 pt-6 border-t border-white/10 text-center">
                    <p className="text-white/40 text-sm">
                        💡 New here? Click "Sign Up" to create an account
                    </p>
                </div>
            </div>
        </div>
    );
}
