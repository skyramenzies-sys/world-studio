import React, { useEffect, useState } from "react";
import axios from "axios";
import socket from "../api/socket";

export default function AdminDashboard({ token }) {
    const [users, setUsers] = useState([]);
    const [streams, setStreams] = useState([]);
    const [info, setInfo] = useState("");

    // ------------------------------------
    // Fetch Users + Streams
    // ------------------------------------
    useEffect(() => {
        if (!token) return;

        const headers = { Authorization: `Bearer ${token}` };

        const fetchData = async () => {
            try {
                const usersRes = await axios.get("/api/users", { headers });
                const streamsRes = await axios.get("/api/live");

                setUsers(usersRes.data.users || usersRes.data);
                setStreams(streamsRes.data);
            } catch (err) {
                console.error("Admin fetch error:", err);
                setInfo("Failed to load admin data.");
            }
        };

        fetchData();
    }, [token]);

    const headers = { Authorization: `Bearer ${token}` };

    // ------------------------------------
    // Stop Stream
    // ------------------------------------
    const stopStream = async (streamId) => {
        try {
            await axios.post(`/api/live/stop/${streamId}`, {}, { headers });
            setStreams((prev) => prev.filter((s) => s._id !== streamId));

            socket.emit("admin_stop_stream", streamId);
            setInfo("Stream stopped.");
        } catch (err) {
            console.error("Stop Stream Error:", err);
            setInfo("Error stopping stream.");
        }
    };

    // ------------------------------------
    // Ban / Unban User
    // ------------------------------------
    const updateBanStatus = async (userId, action) => {
        try {
            await axios.put(`/api/admin/${action}/${userId}`, {}, { headers });

            setUsers((prev) =>
                prev.map((u) =>
                    u._id === userId ? { ...u, banned: action === "ban" } : u
                )
            );

            if (action === "ban") socket.emit("admin_ban_user", userId);

            setInfo(action === "ban" ? "User banned." : "User unbanned.");
        } catch (err) {
            console.error("Ban/Unban Error:", err);
            setInfo(`Error trying to ${action} user.`);
        }
    };

    // ------------------------------------
    // Start Stream As Admin
    // ------------------------------------
    const startStreamAsAdmin = async () => {
        try {
            const res = await axios.post(
                "/api/live/start",
                {
                    title: "Admin Test Stream",
                    category: "Admin",
                    coverImage: "",
                },
                { headers }
            );

            setStreams((prev) => [res.data, ...prev]);
            setInfo("Admin started a test stream.");
        } catch (err) {
            console.error("Admin start stream error:", err);
            setInfo("Error starting admin stream.");
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto text-white">
            <h1 className="text-3xl font-bold mb-6">🛠 Admin Dashboard</h1>

            {info && (
                <div className="mb-4 p-2 bg-yellow-600/20 border border-yellow-400/50 rounded">
                    {info}
                </div>
            )}

            {/* USERS */}
            <section className="mb-10">
                <h2 className="text-2xl font-semibold mb-3">Users</h2>

                <div className="overflow-x-auto rounded-lg bg-white/10 backdrop-blur-md">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-black/20">
                            <tr>
                                <th className="p-2">Username</th>
                                <th className="p-2">Role</th>
                                <th className="p-2">Status</th>
                                <th className="p-2">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {users.map((u) => (
                                <tr key={u._id} className="border-b border-white/10">
                                    <td className="p-2">{u.username}</td>
                                    <td className="p-2">{u.role}</td>
                                    <td className="p-2">
                                        {u.banned ? "🚫 Banned" : "✅ Active"}
                                    </td>

                                    <td className="p-2">
                                        {!u.banned ? (
                                            <button
                                                onClick={() => updateBanStatus(u._id, "ban")}
                                                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                                            >
                                                Ban
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => updateBanStatus(u._id, "unban")}
                                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs"
                                            >
                                                Unban
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* STREAMS */}
            <section>
                <h2 className="text-2xl font-semibold mb-3">Live Streams</h2>

                <button
                    onClick={startStreamAsAdmin}
                    className="mb-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
                >
                    Start Test Stream
                </button>

                <div className="overflow-x-auto rounded-lg bg-white/10 backdrop-blur-md">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-black/20">
                            <tr>
                                <th className="p-2">Title</th>
                                <th className="p-2">Category</th>
                                <th className="p-2">Host</th>
                                <th className="p-2">Actions</th>
                            </tr>
                        </thead>

                        <tbody>
                            {streams.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="text-center py-4 text-gray-400"
                                    >
                                        No active live streams.
                                    </td>
                                </tr>
                            ) : (
                                streams.map((s) => (
                                    <tr key={s._id} className="border-b border-white/10">
                                        <td className="p-2">{s.title}</td>
                                        <td className="p-2">{s.category}</td>
                                        <td className="p-2">
                                            {s.host?.username || s.host}
                                        </td>

                                        <td className="p-2">
                                            <button
                                                onClick={() => stopStream(s._id)}
                                                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
                                            >
                                                Stop
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
