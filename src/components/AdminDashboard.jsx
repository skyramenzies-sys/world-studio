// src/components/AdminDashboard.jsx - ADMIN ULTIMATE EDITION 🌌
import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { adminApi } from "../api/api";

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [streams, setStreams] = useState([]);
    const [withdrawals, setWithdrawals] = useState([]);
    const [reports, setReports] = useState([]);
    const [revenue, setRevenue] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                setLoading(true);

                const [
                    statsRes,
                    usersRes,
                    streamsRes,
                    withdrawalsRes,
                    reportsRes,
                    revenueRes,
                ] = await Promise.all([
                    adminApi.getStats(),
                    adminApi.getUsers(),
                    adminApi.getStreams(),
                    adminApi.getWithdrawals(),
                    adminApi.getReports(),
                    adminApi.getRevenue(),
                ]);

                if (cancelled) return;

                setStats(statsRes.data || {});
                setUsers(usersRes.data.users || []);
                setStreams(streamsRes.data.streams || []);
                setWithdrawals(withdrawalsRes.data.withdrawals || []);
                setReports(reportsRes.data.reports || []);
                setRevenue(revenueRes.data || {});
            } catch (err) {
                console.error("ADMIN LOAD ERROR", err);
                toast.error("Failed loading admin data");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => (cancelled = true);
    }, []);

    if (loading) return <div className="text-white p-4">Loading admin…</div>;

    return (
        <div className="text-white p-4">
            <h1 className="text-2xl font-bold mb-4">🌌 Admin Dashboard</h1>

            <div className="grid grid-cols-3 gap-4">
                <div className="bg-black/40 p-3 rounded">
                    <h2>Users</h2>
                    <p>Total: {stats.totalUsers ?? 0}</p>
                    <p>Today: {stats.newUsersToday ?? 0}</p>
                </div>

                <div className="bg-black/40 p-3 rounded">
                    <h2>Streams</h2>
                    <p>Active: {stats.activeStreams ?? 0}</p>
                    <p>Total: {stats.totalStreams ?? 0}</p>
                </div>

                <div className="bg-black/40 p-3 rounded">
                    <h2>Revenue</h2>
                    <p>Total: {revenue?.totalRevenue ?? 0}</p>
                    <p>Today: {revenue?.revenueToday ?? 0}</p>
                </div>
            </div>

        </div>
    );
}
