import React, { useEffect, useState } from "react";
import { Settings, Users, Eye, Heart, TrendingUp } from "lucide-react";
import axios from "axios";

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const res = await axios.get(
                    "https://world-studio-production.up.railway.app/api/admin/stats"
                );
                setStats(res.data);
            } catch (err) {
                console.error("Failed to load admin stats", err);
            }
        })();
    }, []);

    if (!stats) return <p className="text-center mt-20">Loading Command Center ...</p>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black text-white p-8">
            <header className="flex items-center gap-3 mb-8">
                <Settings className="w-8 h-8 text-cyan-400" />
                <h1 className="text-3xl font-bold">World-Studio Command Center</h1>
            </header>

            <div className="grid md:grid-cols-4 gap-6 mb-10">
                <Stat icon={<Users />} label="Users" value={stats.totalUsers} />
                <Stat icon={<TrendingUp />} label="Posts" value={stats.totalPosts} />
                <Stat icon={<Heart />} label="Likes" value={stats.totalLikes} />
                <Stat icon={<Eye />} label="Views" value={stats.totalViews} />
            </div>

            <section className="grid md:grid-cols-3 gap-8">
                <List title="🆕 New Users" items={stats.latestUsers.map(u => u.username)} />
                <List title="🎨 Recent Posts" items={stats.latestPosts.map(p => p.title)} />
                <List
                    title="💹 Predictions"
                    items={stats.latestPredictions.map(
                        pr => `${pr.symbol}: $${pr.predictedPrice.toFixed(2)} (${pr.confidence} %)`
                    )}
                />
            </section>
        </div>
    );
}

function Stat({ icon, label, value }) {
    return (
        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 text-center border border-white/10">
            <div className="flex justify-center mb-2 text-cyan-400">{icon}</div>
            <div className="text-3xl font-bold">{value}</div>
            <div className="text-white/70 text-sm">{label}</div>
        </div>
    );
}

function List({ title, items }) {
    return (
        <div className="bg-white/10 rounded-2xl p-6 border border-white/10">
            <h3 className="font-semibold mb-4">{title}</h3>
            <ul className="space-y-2 text-white/80 text-sm">
                {items.map((item, i) => (
                    <li key={i} className="bg-white/5 px-3 py-2 rounded">{item}</li>
                ))}
            </ul>
        </div>
    );
}
