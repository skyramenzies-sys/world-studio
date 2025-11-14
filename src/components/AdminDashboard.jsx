import React, { useEffect, useState } from "react";
import axios from "axios";
import socket from "../api/socket";

export default function AdminDashboard({ token }) {
    const [users, setUsers] = useState([]);
    const [streams, setStreams] = useState([]);
    const [info, setInfo] = useState("");

    // Fetch all users and streams
    useEffect(() => {
        if (!token) return;
        axios.get("/api/users", { headers: { Authorization: `Bearer ${token}` } }).then(res => setUsers(res.data.users || res.data));
        axios.get("/api/live").then(res => setStreams(res.data));
    }, [token]);

    // Stop a live stream
    async function stopStream(streamId) {
        try {
            await axios.post(`/api/live/stop/${streamId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setStreams(streams => streams.filter(s => s._id !== streamId));
            socket.emit("admin_stop_stream", streamId);
            setInfo("Stream stopped.");
        } catch {
            setInfo("Error stopping stream.");
        }
    }

    // Ban a user
    async function banUser(userId) {
        try {
            await axios.put(`/api/admin/ban/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setUsers(users => users.map(u => u._id === userId ? { ...u, banned: true } : u));
            socket.emit("admin_ban_user", userId);
            setInfo("User banned.");
        } catch {
            setInfo("Error banning user.");
        }
    }

    // Unban user
    async function unbanUser(userId) {
        try {
            await axios.put(`/api/admin/unban/${userId}`, {}, { headers: { Authorization: `Bearer ${token}` } });
            setUsers(users => users.map(u => u._id === userId ? { ...u, banned: false } : u));
            setInfo("User unbanned.");
        } catch {
            setInfo("Error unbanning user.");
        }
    }

    // Start stream as admin (demo - creates a test stream)
    async function startStreamAsAdmin() {
        try {
            const res = await axios.post("/api/live/start", {
                title: "Admin Test Stream",
                category: "Admin",
                coverImage: ""
            }, { headers: { Authorization: `Bearer ${token}` } });
            setStreams(streams => [res.data, ...streams]);
            setInfo("Admin started a stream.");
        } catch {
            setInfo("Error starting stream.");
        }
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
            {info && <div className="mb-4 text-yellow-400">{info}</div>}

            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Users</h2>
                <table className="w-full bg-white/10 text-white rounded-lg overflow-hidden">
                    <thead>
                        <tr>
                            <th className="px-2">Username</th>
                            <th className="px-2">Role</th>
                            <th className="px-2">Banned</th>
                            <th className="px-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u._id}>
                                <td className="px-2">{u.username}</td>
                                <td className="px-2">{u.role}</td>
                                <td className="px-2">{u.banned ? "Yes" : "No"}</td>
                                <td className="px-2">
                                    {!u.banned ? (
                                        <button
                                            onClick={() => banUser(u._id)}
                                            className="px-2 py-1 bg-red-600 rounded text-white text-xs mr-2"
                                        >Ban</button>
                                    ) : (
                                        <button
                                            onClick={() => unbanUser(u._id)}
                                            className="px-2 py-1 bg-green-600 rounded text-white text-xs mr-2"
                                        >Unban</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-2">Live Streams</h2>
                <button
                    onClick={startStreamAsAdmin}
                    className="mb-3 px-4 py-2 bg-blue-500 rounded-lg text-white font-bold"
                >Start Test Stream</button>
                <table className="w-full bg-white/10 text-white rounded-lg overflow-hidden">
                    <thead>
                        <tr>
                            <th className="px-2">Title</th>
                            <th className="px-2">Category</th>
                            <th className="px-2">Host</th>
                            <th className="px-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {streams.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-4 text-gray-400">
                                    No live streams.
                                </td>
                            </tr>
                        ) : (
                            streams.map(s => (
                                <tr key={s._id}>
                                    <td className="px-2">{s.title}</td>
                                    <td className="px-2">{s.category}</td>
                                    <td className="px-2">{s.host?.username || s.host}</td>
                                    <td className="px-2">
                                        <button
                                            onClick={() => stopStream(s._id)}
                                            className="px-2 py-1 bg-red-600 rounded text-white text-xs"
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

            {/* Optionally, add more admin controls here */}

        </div>
    );
}


