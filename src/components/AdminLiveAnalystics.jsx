import React, { useEffect, useState } from "react";
import axios from "axios";
import { Radio, Eye, Gift, Activity } from "lucide-react";

export default function AdminLiveAnalytics() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 5000); // auto-refresh every 5s
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        const res = await axios.get("/api/live-analytics/stats");
        setStats(res.data);
    };

    if (!stats)
        return (
            <div className="text-center text-white/60 py-10">Loading analytics...</div>
        );

    return (
        <div className="p-8 bg-gradient-to-br from-purple-900 via-blue-900 to-black min-h-screen text-white">
            <h1 className="text-3xl font-bold text-cyan-400 mb-8">
                🎥 World-Studio LIVE+ Analytics Dashboard
            </h1>
            <div className="grid md:grid-cols-4 gap-6">
                <div className="bg-white/10 border border-cyan-400/30 rounded-xl p-6 flex flex-col items-center">
                    <Radio className="w-8 h-8 text-cyan-400 mb-2" />
                    <h3 className="text-lg font-semibold">Total Streams</h3>
                    <p className="text-3xl font-bold">{stats.totalStreams}</p>
                </div>
                <div className="bg-white/10 border border-green-400/30 rounded-xl p-6 flex flex-col items-center">
                    <Activity className="w-8 h-8 text-green-400 mb-2" />
                    <h3 className="text-lg font-semibold">Active Streams</h3>
                    <p className="text-3xl font-bold">{stats.activeStreams}</p>
                </div>
                <div className="bg-white/10 border border-yellow-400/30 rounded-xl p-6 flex flex-col items-center">
                    <Gift className="w-8 h-8 text-yellow-400 mb-2" />
                    <h3 className="text-lg font-semibold">Total Gifts ($)</h3>
                    <p className="text-3xl font-bold">${stats.totalGifts}</p>
                </div>
                <div className="bg-white/10 border border-pink-400/30 rounded-xl p-6 flex flex-col items-center">
                    <Eye className="w-8 h-8 text-pink-400 mb-2" />
                    <h3 className="text-lg font-semibold">Total Viewers</h3>
                    <p className="text-3xl font-bold">{stats.totalViewers}</p>
                </div>
            </div>
            <div className="mt-10 text-sm text-white/50">
                Last updated: {new Date(stats.updatedAt).toLocaleTimeString()}
            </div>
        </div>
    );
}
