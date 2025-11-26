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
            if (isLogin) {
                // Login
                const res = await api.post("/auth/login", {
                    email: formData.email,
                    password: formData.password,
                });

                const { token, user } = res.data;

                localStorage.setItem("token", token);
                localStorage.setItem("ws_currentUser", JSON.stringify({ ...user, token }));

                toast.success(`Welcome back, ${user.username}!`);
                navigate("/");
            } else {
                // Register
                if (!formData.username.trim()) {
                    toast.error("Username is required");
                    setLoading(false);
                    return;
                }

                const res = await api.post("/auth/register", {
                    email: formData.email,
                    password: formData.password,
                    username: formData.username,
                });

                const { token, user } = res.data;

                localStorage.setItem("token", token);
                localStorage.setItem("ws_currentUser", JSON.stringify({ ...user, token }));

                toast.success(`Welcome to World-Studio, ${user.username}!`);
                navigate("/");
            }
        } catch (err) {
            console.error("Auth error:", err);
            const message = err.response?.data?.message || err.message || "Authentication failed";
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
                                required={!isLogin}
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
                                <span className="animate-spin">⏳</span>
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
                            onClick={() => setIsLogin(!isLogin)}
                            className="ml-2 text-cyan-400 hover:text-cyan-300 font-semibold transition"
                        >
                            {isLogin ? "Sign Up" : "Sign In"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}