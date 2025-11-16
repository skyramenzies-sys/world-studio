import React, { useEffect, useState } from "react";
import axios from "axios";
import { Radio, Eye, Gift, Activity } from "lucide-react";

export default function AdminLiveAnalytics({ token }) {
    const [stats, setStats] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!token) return;

        fetchStats();

        // Auto-refresh every 5 seconds
        const interval = setInterval(fetchStats, 5000);

        return () => clearInterval(interval);
    }, [token]);

    const fetchStats = async () => {
        try {
            const res = await axios.get("/api/live-analytics/stats", {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStats(res.data);
            setError("");
        } catch (err) {
            console.error("Live analytics error:", err);
            setError("Failed to load analytics");
        }
    };

    if (error) {
        return (
            <div className="text-center text-red-400 py-10 text-lg">
                ❌ {error}
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center text-white/60 py-10 animate-pulse">
                Loading analytics...
            </div>
        );
    }

    const cards = [
        {
            label: "Total Streams",
            value: stats.totalStreams,
            icon: <Radio className="w-8 h-8 text-cyan-400 mb-2" />,
            border: "border-cyan-400/30",
        },
        {
            label: "Active Streams",
            value: stats.activeStreams,
            icon: <Activity className="w-8 h-8 text-green-400 mb-2" />,
            border: "border-green-400/30",
        },
        {
            label: "Total Gifts ($)",
            value: `$${stats.totalGifts}`,
            icon: <Gift className="w-8 h-8 text-yellow-400 mb-2" />,
            border: "border-yellow-400/30",
        },
        {
            label: "Total Viewers",
            value: stats.totalViewers,
            icon: <Eye className="w-8 h-8 text-pink-400 mb-2" />,
            border: "border-pink-400/30",
        },
    ];

    return (
        <div className="p-8 bg-gradient-to-br from-purple-900 via-blue-900 to-black min-h-screen text-white">
            <h1 className="text-3xl font-bold text-cyan-400 mb-8">
                🎥 World-Studio LIVE+ Analytics Dashboard
            </h1>

            <div className="grid md:grid-cols-4 gap-6">
                {cards.map((c, i) => (
                    <div
                        key={i}
                        className={`bg-white/10 ${c.border} border rounded-xl p-6 flex flex-col items-center backdrop-blur-md shadow-md`}
                    >
                        {c.icon}
                        <h3 className="text-lg font-semibold mb-1">{c.label}</h3>
                        <p className="text-3xl font-bold">{c.value}</p>
                    </div>
                ))}
            </div>

            <div className="mt-10 text-sm text-white/50">
                Last updated: {new Date(stats.updatedAt).toLocaleTimeString()}
            </div>
        </div>
    );
}
